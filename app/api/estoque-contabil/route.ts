import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — lista paginada com filtros + totais por armazém (agregados no banco)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cliente = searchParams.get("cliente") || undefined
  const produto = searchParams.get("produto") || undefined
  const armazem = searchParams.get("armazem") || undefined
  const sentido = searchParams.get("sentido") || undefined
  const busca   = searchParams.get("busca")   || undefined
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim    = searchParams.get("dataFim")    || undefined
  const natureza   = searchParams.get("natureza")   || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (cliente) where.razaoSocial = { contains: cliente, mode: "insensitive" }
  if (produto) where.descricao   = { contains: produto, mode: "insensitive" }
  if (armazem) where.armazem     = armazem
  if (sentido) where.sentido     = sentido
  if (dataInicio || dataFim) {
    where.dtEmissao = {}
    if (dataInicio) where.dtEmissao.gte = new Date(dataInicio)
    if (dataFim)    { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.dtEmissao.lte = d }
  }
  // filtro por NATUREZA da operação (via gerenciador de TES)
  if (natureza) {
    const tesDaNatureza = await prisma.tesNatureza.findMany({ where: { natureza }, select: { tes: true } })
    where.tes = { in: tesDaNatureza.length ? tesDaNatureza.map(t => t.tes) : ["__nenhuma__"] }
  }
  if (busca) where.OR = [
    { docOriginal: { contains: busca, mode: "insensitive" } },
    { razaoSocial: { contains: busca, mode: "insensitive" } },
    { descricao:   { contains: busca, mode: "insensitive" } },
    { produto:     { contains: busca, mode: "insensitive" } },
  ]

  const [itens, totalFiltrado, agg, ultimo, porSentidoF, naturezasCad] = await Promise.all([
    prisma.estoqueContabil.findMany({ where, orderBy: { quantidade: "desc" }, take: 500 }),
    prisma.estoqueContabil.aggregate({ where, _count: { id: true }, _sum: { quantidade: true, saldo: true } }),
    prisma.estoqueContabil.groupBy({ by: ["armazem"], _count: { id: true }, _sum: { quantidade: true } }),
    prisma.estoqueContabil.findFirst({ orderBy: { importadoEm: "desc" }, select: { importadoEm: true } }),
    // entradas/saídas RESPEITANDO os filtros (os cards do topo atualizam junto)
    prisma.estoqueContabil.groupBy({ by: ["sentido"], where, _count: { id: true }, _sum: { quantidade: true } }),
    prisma.tesNatureza.findMany({ select: { natureza: true }, distinct: ["natureza"], orderBy: { natureza: "asc" } }),
  ])

  // Pico de estoque no período filtrado: acumulado diário (entradas − saídas) → dia do máximo
  let pico: { dia: string; valor: number } | null = null
  if (dataInicio || dataFim) {
    const movs = await prisma.estoqueContabil.findMany({
      where, select: { dtEmissao: true, quantidade: true, sentido: true },
    })
    const porDia = new Map<string, number>()
    for (const m of movs) {
      if (!m.dtEmissao) continue
      const d = m.dtEmissao.toISOString().slice(0, 10)
      const v = (m.sentido === "SAIDA" ? -1 : 1) * (m.quantidade || 0)
      porDia.set(d, (porDia.get(d) ?? 0) + v)
    }
    let acumulado = 0
    for (const dia of [...porDia.keys()].sort()) {
      acumulado += porDia.get(dia)!
      if (!pico || acumulado > pico.valor) pico = { dia, valor: Math.round(acumulado * 10) / 10 }
    }
  }

  const entradasF = porSentidoF.find(x => x.sentido === "ENTRADA")
  const saidasF = porSentidoF.find(x => x.sentido === "SAIDA")

  return NextResponse.json({
    itens,
    totalFiltrado: { count: totalFiltrado._count.id, quantidade: totalFiltrado._sum.quantidade ?? 0, saldo: totalFiltrado._sum.saldo ?? 0 },
    porSentidoFiltrado: {
      entradas: { count: entradasF?._count.id ?? 0, quantidade: entradasF?._sum.quantidade ?? 0 },
      saidas: { count: saidasF?._count.id ?? 0, quantidade: saidasF?._sum.quantidade ?? 0 },
    },
    pico,
    naturezas: naturezasCad.map(n => n.natureza),
    porArmazem: agg.map(a => ({ armazem: a.armazem ?? "—", count: a._count.id, quantidade: a._sum.quantidade ?? 0 })),
    importadoEm: ultimo?.importadoEm ?? null,
  })
}
