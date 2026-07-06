import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { ehCheckout, ehCarga, ymd } from "@/lib/programacao"

function parseData(s: unknown): Date {
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [a, m, d] = s.slice(0, 10).split("-").map(Number)
    return new Date(Date.UTC(a, m - 1, d, 12))
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12))
}

// GET — linhas do Dia a Dia no mês + realizado total (auto) vindo da Marcação
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const mesParam = req.nextUrl.searchParams.get("mes") // YYYY-MM
  const [ano, mes] =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? (mesParam.split("-").map(Number) as [number, number])
      : [now.getUTCFullYear(), now.getUTCMonth() + 1]
  const ini = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1) - 1)

  const [linhas, marcRaw, clientesCad, produtosCad] = await Promise.all([
    prisma.expedicaoDiaDia.findMany({ where: { data: { gte: ini, lte: fim } }, orderBy: [{ data: "asc" }, { createdAt: "asc" }] }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, produto: true, operacao: true, status: true, pesoLiquido: true, dataCarregamento: true },
    }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { nome: true, abreviado: true }, orderBy: { nome: "asc" } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { descricao: true, abreviado: true }, orderBy: { descricao: "asc" } }),
  ])

  // marcações CHECKOUT · CARGA bucketizadas por dia
  const bucket = new Map<string, { cliente: string | null; produto: string | null; peso: number }[]>()
  for (const m of marcRaw) {
    if (!m.dataCarregamento || !ehCheckout(m.status) || ehCarga(m.operacao) !== true) continue
    const k = ymd(new Date(m.dataCarregamento))
    if (!bucket.has(k)) bucket.set(k, [])
    bucket.get(k)!.push({ cliente: m.clienteDestino || m.cliente, produto: m.produto, peso: m.pesoLiquido || 0 })
  }

  const rows = linhas.map((r) => {
    const dia = ymd(r.data)
    let realizado = 0
    for (const m of bucket.get(dia) ?? []) {
      if (clienteMatch(m.cliente, r.clienteNome) && produtoMatch(m.produto, r.produto)) realizado += m.peso
    }
    return {
      id: r.id, data: dia, clienteNome: r.clienteNome, produto: r.produto,
      tipoOperacao: r.tipoOperacao, operacao: r.operacao, linhaProducao: r.linhaProducao,
      forecast: r.forecast, turnoA: r.turnoA, turnoB: r.turnoB, turnoC: r.turnoC,
      obs: r.obs, realizadoMarcacao: Math.round(realizado * 10) / 10,
    }
  })

  const clientes = [...new Set(clientesCad.flatMap((c) => [c.nome, c.abreviado].filter(Boolean) as string[]))]
  const produtos = [...new Set(produtosCad.flatMap((p) => [p.descricao, p.abreviado].filter(Boolean) as string[]))]
  return NextResponse.json({ ano, mes, rows, clientes, produtos })
}

// POST — cria uma linha em branco (data informada ou hoje)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const linha = await prisma.expedicaoDiaDia.create({ data: { data: parseData(b.data) } })
  return NextResponse.json({ ...linha, data: linha.data.toISOString().slice(0, 10), realizadoMarcacao: 0 }, { status: 201 })
}
