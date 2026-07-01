import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, normCliente } from "@/lib/texto"
import { ehCheckout, ehCarga } from "@/lib/programacao"

// Realizado do forecast = só o que passou por NAVE ou BAG MÓVEL
function ehNaveOuBag(local: string | null | undefined): boolean {
  const l = (local ?? "").toUpperCase()
  return l.includes("NAVE") || l.includes("BAG")
}

// GET — forecast por cliente no mês + realizado (nave/bag) + desvio
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const ano = Number(req.nextUrl.searchParams.get("ano")) || now.getUTCFullYear()
  const mes = Number(req.nextUrl.searchParams.get("mes")) || now.getUTCMonth() + 1
  if (mes < 1 || mes > 12) return NextResponse.json({ error: "mês inválido" }, { status: 400 })
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) return NextResponse.json({ error: "ano inválido" }, { status: 400 })

  const ini = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1) - 1)

  const [marcRaw, forecasts, clientesCad] = await Promise.all([
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, operacao: true, status: true, pesoLiquido: true, local: true },
    }),
    prisma.expedicaoForecast.findMany({ where: { ano, mes } }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { nome: true, abreviado: true }, orderBy: { nome: "asc" } }),
  ])

  // agrupa realizado (só nave/bag, CHECKOUT · CARGA) por cliente normalizado
  const gmap = new Map<string, { display: string; total: number }>()
  for (const m of marcRaw) {
    if (!ehCheckout(m.status) || ehCarga(m.operacao) !== true) continue
    if (!ehNaveOuBag(m.local)) continue
    const disp = m.clienteDestino || m.cliente || "—"
    const key = normCliente(disp)
    if (!key) continue
    const cur = gmap.get(key) ?? { display: disp, total: 0 }
    cur.total += m.pesoLiquido || 0
    gmap.set(key, cur)
  }
  const grupos = [...gmap.entries()].map(([key, v]) => ({ key, ...v }))

  // ordem estável → o casamento de cada grupo com o forecast é determinístico
  const forecastsOrd = [...forecasts].sort((a, b) => a.clienteNome.localeCompare(b.clienteNome))
  const consumed = new Set<string>()
  const rows = forecastsOrd.map((f) => {
    let realizado = 0
    for (const g of grupos) {
      // cada grupo conta para no máx. 1 forecast → linha não infla e bate com o total
      if (consumed.has(g.key)) continue
      if (clienteMatch(g.display, f.clienteNome)) { realizado += g.total; consumed.add(g.key) }
    }
    const desvio = f.forecast > 0 ? ((realizado - f.forecast) / f.forecast) * 100 : null
    return { clienteNome: f.clienteNome, forecast: f.forecast, realizado, desvio }
  })
  // realizado sem forecast cadastrado → aparece com forecast 0
  for (const g of grupos) {
    if (consumed.has(g.key)) continue
    rows.push({ clienteNome: g.display, forecast: 0, realizado: g.total, desvio: null })
  }
  rows.sort((a, b) => b.forecast - a.forecast || b.realizado - a.realizado)

  const totalForecast = rows.reduce((s, r) => s + r.forecast, 0)
  const totalRealizado = grupos.reduce((s, g) => s + g.total, 0) // total real (sem dupla contagem)
  const clientes = [...new Set(clientesCad.flatMap((c) => [c.nome, c.abreviado].filter(Boolean) as string[]))]
  return NextResponse.json({ ano, mes, rows, totalForecast, totalRealizado, clientes })
}

// PATCH — salva o forecast de um cliente no mês
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const mes = Number(b.mes)
  const clienteNome = String(b.clienteNome ?? "").trim()
  const forecast = Number(b.forecast) || 0
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099 || !Number.isInteger(mes) || mes < 1 || mes > 12 || !clienteNome || forecast < 0)
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    await prisma.expedicaoForecast.upsert({
      where: { ano_mes_clienteNome: { ano, mes, clienteNome } },
      update: { forecast },
      create: { ano, mes, clienteNome, forecast },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar forecast", detail: String(err) }, { status: 500 })
  }
}
