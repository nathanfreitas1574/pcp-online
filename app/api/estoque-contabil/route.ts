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
  if (busca) where.OR = [
    { docOriginal: { contains: busca, mode: "insensitive" } },
    { razaoSocial: { contains: busca, mode: "insensitive" } },
    { descricao:   { contains: busca, mode: "insensitive" } },
    { produto:     { contains: busca, mode: "insensitive" } },
  ]

  const [itens, totalFiltrado, agg, ultimo] = await Promise.all([
    prisma.estoqueContabil.findMany({ where, orderBy: { quantidade: "desc" }, take: 500 }),
    prisma.estoqueContabil.aggregate({ where, _count: { id: true }, _sum: { quantidade: true, saldo: true } }),
    prisma.estoqueContabil.groupBy({ by: ["armazem"], _count: { id: true }, _sum: { quantidade: true } }),
    prisma.estoqueContabil.findFirst({ orderBy: { importadoEm: "desc" }, select: { importadoEm: true } }),
  ])

  return NextResponse.json({
    itens,
    totalFiltrado: { count: totalFiltrado._count.id, quantidade: totalFiltrado._sum.quantidade ?? 0, saldo: totalFiltrado._sum.saldo ?? 0 },
    porArmazem: agg.map(a => ({ armazem: a.armazem ?? "—", count: a._count.id, quantidade: a._sum.quantidade ?? 0 })),
    importadoEm: ultimo?.importadoEm ?? null,
  })
}
