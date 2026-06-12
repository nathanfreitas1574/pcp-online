import { prisma } from "@/lib/prisma"
import EstoqueContabilClient from "./EstoqueContabilClient"

export const dynamic = "force-dynamic"

export default async function EstoqueContabilPage() {
  const [clientes, armazens, totalGeral, porSentido, ultimo, produtos, coberturaAgg] = await Promise.all([
    prisma.estoqueContabil.findMany({
      where: { razaoSocial: { not: null } }, distinct: ["razaoSocial"],
      select: { razaoSocial: true }, orderBy: { razaoSocial: "asc" }, take: 300,
    }),
    prisma.estoqueContabil.findMany({
      where: { armazem: { not: null } }, distinct: ["armazem"],
      select: { armazem: true }, orderBy: { armazem: "asc" },
    }),
    prisma.estoqueContabil.aggregate({ _count: { id: true }, _sum: { quantidade: true } }),
    prisma.estoqueContabil.groupBy({ by: ["sentido"], _count: { id: true }, _sum: { quantidade: true } }),
    prisma.estoqueContabil.findFirst({ orderBy: { importadoEm: "desc" }, select: { importadoEm: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { descricao: true }, orderBy: { descricao: "asc" } }),
    prisma.coberturaPendente.aggregate({ where: { status: "PENDENTE" }, _sum: { volume: true }, _count: { id: true } }),
  ])

  return (
    <EstoqueContabilClient
      clientes={clientes.map(c => c.razaoSocial!).filter(Boolean)}
      armazens={armazens.map(a => a.armazem!).filter(Boolean)}
      totalGeral={{ count: totalGeral._count.id, quantidade: totalGeral._sum.quantidade ?? 0 }}
      porSentido={porSentido.map(s => ({ sentido: s.sentido ?? "—", count: s._count.id, quantidade: s._sum.quantidade ?? 0 }))}
      importadoEm={ultimo?.importadoEm ? ultimo.importadoEm.toISOString() : null}
      produtosVistoria={[...new Set(produtos.map(p => p.descricao).filter(Boolean))]}
      coberturaPendente={{ volume: Math.round(coberturaAgg._sum.volume ?? 0), count: coberturaAgg._count.id }}
    />
  )
}
