import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, normCliente } from "@/lib/texto"
import { ehCheckout, ehCarga, diasDaSemana, ddMM, DIA, dedupePorRomaneio } from "@/lib/programacao"

// Tipos de forecast e como cada um casa o realizado na Marcação (campo tipoServico)
const TIPOS = [
  { tipo: "ENVASE", match: (ts: string) => ts.includes("BIG BAG") },   // envase = ensacado
  { tipo: "GRANEL", match: (ts: string) => ts.includes("GRANEL") },
  { tipo: "PRODUTO ACABADO", match: (ts: string) => ts.includes("ACABADO") || ts.includes("PROD ACAB") },
]
const TIPO_NOMES = TIPOS.map((t) => t.tipo)

function tipoMatchMarcacao(tipoFiltro: string, tipoServico: string | null): boolean {
  if (tipoFiltro === "TODOS") return true
  const ts = (tipoServico ?? "").toUpperCase()
  const cfg = TIPOS.find((t) => t.tipo === tipoFiltro)
  return cfg ? cfg.match(ts) : false
}

function periodo(gran: string, ano: number, mes: number, semana: number): { ini: Date; fim: Date; label: string } {
  if (gran === "ano") return { ini: new Date(Date.UTC(ano, 0, 1)), fim: new Date(Date.UTC(ano + 1, 0, 1) - 1), label: `Ano ${ano}` }
  if (gran === "semana") {
    const dias = diasDaSemana(ano, semana)
    return { ini: dias[0], fim: new Date(dias[6].getTime() + DIA - 1), label: `Semana ${semana} · ${ddMM(dias[0])}–${ddMM(dias[6])}` }
  }
  return { ini: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1) - 1), label: `${String(mes).padStart(2, "0")}/${ano}` }
}

const diaUTC = (ano: number, mes: number, dia: number) => new Date(Date.UTC(ano, mes - 1, dia, 12))

// entradas do mês que casam (fuzzy) com o cliente — mantém a leitura/limpeza coerente com a tabela
async function entradasMesFuzzy(ano: number, mes: number, clienteNome: string, tipo: string) {
  const ini = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1) - 1)
  const todas = await prisma.expedicaoForecast.findMany({ where: { data: { gte: ini, lte: fim }, tipo } })
  return todas.filter((e) => clienteMatch(e.clienteNome, clienteNome))
}

// junta nomes do mesmo cliente (fuzzy), mantendo o mais curto
function dedupeClientes(nomes: string[]): string[] {
  const uniq: string[] = []
  for (const n of nomes.filter(Boolean)) {
    const idx = uniq.findIndex((u) => clienteMatch(u, n))
    if (idx === -1) uniq.push(n)
    else if (n.length < uniq[idx].length) uniq[idx] = n
  }
  return uniq.sort((a, b) => a.localeCompare(b))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const now = new Date()
  const ano = Number(sp.get("ano")) || now.getUTCFullYear()
  const mes = Number(sp.get("mes")) || now.getUTCMonth() + 1
  const semana = Number(sp.get("semana")) || 1
  const tipo = (sp.get("tipo") || "TODOS").toUpperCase()
  const gran = sp.get("gran") || "mes"
  if (mes < 1 || mes > 12) return NextResponse.json({ error: "mês inválido" }, { status: 400 })
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) return NextResponse.json({ error: "ano inválido" }, { status: 400 })

  // modo "dias" — detalhe diário de um cliente/tipo no mês (para o modal)
  const clienteDet = sp.get("cliente")
  if (sp.get("modo") === "dias" && clienteDet) {
    const tp = tipo === "TODOS" ? "ENVASE" : tipo
    const entradas = await entradasMesFuzzy(ano, mes, clienteDet, tp)
    const mapa = new Map<number, number>()
    for (const e of entradas) mapa.set(e.data.getUTCDate(), (mapa.get(e.data.getUTCDate()) ?? 0) + e.forecast)
    const nDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    const dias = Array.from({ length: nDias }, (_, i) => {
      const d = i + 1
      return { dia: d, dow: new Date(Date.UTC(ano, mes - 1, d)).getUTCDay(), forecast: mapa.get(d) ?? 0 }
    })
    return NextResponse.json({ ano, mes, cliente: clienteDet, tipo: tp, dias })
  }

  // eslint-disable-next-line prefer-const
  let { ini, fim, label } = periodo(gran, ano, mes, semana)
  // intervalo de meses (de/até) — só na granularidade "mes"
  const mesAte = Number(sp.get("mesAte")) || mes
  if (gran === "mes" && mesAte > mes && mesAte <= 12) {
    fim = new Date(Date.UTC(ano, mesAte, 1) - 1)
    label = `${String(mes).padStart(2, "0")}–${String(mesAte).padStart(2, "0")}/${ano}`
  }

  const [entradas, marcRaw, clientesCad] = await Promise.all([
    prisma.expedicaoForecast.findMany({ where: { data: { gte: ini, lte: fim }, ...(tipo === "TODOS" ? {} : { tipo }) } }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, operacao: true, status: true, pesoLiquido: true, tipoServico: true, romaneio: true, ordem: true },
    }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { nome: true, abreviado: true }, orderBy: { nome: "asc" } }),
  ])

  // forecast agrupado por cliente
  const fMap = new Map<string, { display: string; total: number }>()
  for (const e of entradas) {
    const key = normCliente(e.clienteNome)
    if (!key) continue
    const cur = fMap.get(key) ?? { display: e.clienteNome, total: 0 }
    cur.total += e.forecast
    if (e.clienteNome.length < cur.display.length) cur.display = e.clienteNome
    fMap.set(key, cur)
  }

  // realizado por cliente (CHECKOUT · CARGA, filtrado pelo tipo)
  const rMap = new Map<string, { display: string; total: number }>()
  const cargas = dedupePorRomaneio(marcRaw.filter((m) => ehCheckout(m.status) && ehCarga(m.operacao) === true))
  for (const m of cargas) {
    if (!tipoMatchMarcacao(tipo, m.tipoServico)) continue
    const disp = m.clienteDestino || m.cliente || "—"
    const key = normCliente(disp)
    if (!key) continue
    const cur = rMap.get(key) ?? { display: disp, total: 0 }
    cur.total += m.pesoLiquido || 0
    rMap.set(key, cur)
  }
  const rGrupos = [...rMap.entries()].map(([key, v]) => ({ key, ...v }))

  // une forecast + realizado (cada grupo de realizado conta p/ no máx. 1 cliente)
  const consumed = new Set<string>()
  const rows = [...fMap.values()]
    .sort((a, b) => a.display.localeCompare(b.display))
    .map((f) => {
      let realizado = 0
      for (const g of rGrupos) {
        if (consumed.has(g.key)) continue
        if (clienteMatch(g.display, f.display)) { realizado += g.total; consumed.add(g.key) }
      }
      const desvio = f.total > 0 ? ((realizado - f.total) / f.total) * 100 : null
      return { clienteNome: f.display, forecast: f.total, realizado, desvio }
    })
  for (const g of rGrupos) {
    if (consumed.has(g.key)) continue
    rows.push({ clienteNome: g.display, forecast: 0, realizado: g.total, desvio: null })
  }

  const totalForecast = rows.reduce((s, r) => s + r.forecast, 0)
  const totalRealizado = rGrupos.reduce((s, g) => s + g.total, 0)
  const clientes = dedupeClientes(clientesCad.flatMap((c) => [c.nome, c.abreviado].filter(Boolean) as string[]))
  return NextResponse.json({ gran, ano, mes, semana, tipo, label, rows, totalForecast, totalRealizado, clientes, tipos: TIPO_NOMES })
}

// PATCH — grava forecast: escopo "mes" (reseta o mês no dia 1) ou "dia" (um dia)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const escopo = b.escopo === "dia" ? "dia" : "mes"
  const ano = Number(b.ano)
  const mes = Number(b.mes)
  const clienteNome = String(b.clienteNome ?? "").trim()
  const tipo = String(b.tipo ?? "ENVASE").trim().toUpperCase()
  const forecast = Number(b.forecast) || 0
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099 || !Number.isInteger(mes) || mes < 1 || mes > 12 || !clienteNome || !TIPO_NOMES.includes(tipo) || forecast < 0)
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    if (escopo === "dia") {
      const dia = Number(b.dia)
      const nDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
      if (!Number.isInteger(dia) || dia < 1 || dia > nDias) return NextResponse.json({ error: "dia inválido para o mês" }, { status: 400 })
      const data = diaUTC(ano, mes, dia)
      await prisma.expedicaoForecast.upsert({ where: { data_clienteNome_tipo: { data, clienteNome, tipo } }, update: { forecast }, create: { data, clienteNome, tipo, forecast } })
    } else {
      // reseta o mês (limpa as entradas do cliente — fuzzy) e grava o total no dia 1
      const entradas = await entradasMesFuzzy(ano, mes, clienteNome, tipo)
      if (entradas.length) await prisma.expedicaoForecast.deleteMany({ where: { id: { in: entradas.map((e) => e.id) } } })
      if (forecast > 0) await prisma.expedicaoForecast.create({ data: { data: diaUTC(ano, mes, 1), clienteNome, tipo, forecast } })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar forecast", detail: String(err) }, { status: 500 })
  }
}

// POST — "explodir": distribui um total mensal pelos dias úteis (seg–sáb)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const mes = Number(b.mes)
  const clienteNome = String(b.clienteNome ?? "").trim()
  const tipo = String(b.tipo ?? "ENVASE").trim().toUpperCase()
  const total = Number(b.total) || 0
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099 || !Number.isInteger(mes) || mes < 1 || mes > 12 || !clienteNome || !TIPO_NOMES.includes(tipo) || total < 0)
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    const nDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    const uteis: number[] = []
    for (let d = 1; d <= nDias; d++) if (new Date(Date.UTC(ano, mes - 1, d)).getUTCDay() !== 0) uteis.push(d) // exclui domingo
    // limpa o mês do cliente (fuzzy) antes de distribuir
    const entradas = await entradasMesFuzzy(ano, mes, clienteNome, tipo)
    if (entradas.length) await prisma.expedicaoForecast.deleteMany({ where: { id: { in: entradas.map((e) => e.id) } } })
    if (total > 0 && uteis.length) {
      // distribui preservando o total: resto acumula no último dia
      const base = Math.floor((total / uteis.length) * 100) / 100
      const resto = Math.round((total - base * uteis.length) * 100) / 100
      await prisma.expedicaoForecast.createMany({
        data: uteis.map((d, i) => ({ data: diaUTC(ano, mes, d), clienteNome, tipo, forecast: i === uteis.length - 1 ? Math.round((base + resto) * 100) / 100 : base })),
      })
    }
    return NextResponse.json({ ok: true, dias: uteis.length })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao explodir forecast", detail: String(err) }, { status: 500 })
  }
}
