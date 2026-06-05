import { prisma } from "@/lib/prisma"
import FinanceiroClient from "./FinanceiroClient"

export default async function FinanceiroPage() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioAno = new Date(hoje.getFullYear(), 0, 1)

  const [consignacoes, consignacoesMes, consignacoesPorCliente, consignacoesPorStatus] = await Promise.all([
    // Total geral
    prisma.consignacao.aggregate({
      _sum: { valorTotal: true },
      _count: { id: true },
    }),
    // Este mês
    prisma.consignacao.aggregate({
      where: { createdAt: { gte: inicioMes } },
      _sum: { valorTotal: true },
      _count: { id: true },
    }),
    // Por cliente (top 10)
    prisma.consignacao.groupBy({
      by: ["clienteId"],
      _sum: { valorTotal: true },
      _count: { id: true },
      orderBy: { _sum: { valorTotal: "desc" } },
      take: 10,
    }),
    // Por status
    prisma.consignacao.groupBy({
      by: ["status"],
      _sum: { valorTotal: true },
      _count: { id: true },
    }),
  ])

  // Buscar nomes dos clientes
  const clienteIds = consignacoesPorCliente.map((c) => c.clienteId)
  const clientes = await prisma.cliente.findMany({ where: { id: { in: clienteIds } }, select: { id: true, nome: true, codigo: true } })
  const clienteMap = new Map(clientes.map((c) => [c.id, c]))

  const rankingClientes = consignacoesPorCliente.map((c) => ({
    nome: clienteMap.get(c.clienteId)?.nome ?? c.clienteId,
    codigo: clienteMap.get(c.clienteId)?.codigo ?? "?",
    valor: c._sum.valorTotal ?? 0,
    count: c._count.id,
  }))

  const statusMap = Object.fromEntries(consignacoesPorStatus.map((s) => [s.status, { valor: s._sum.valorTotal ?? 0, count: s._count.id }]))

  return (
    <FinanceiroClient
      totalGeral={consignacoes._sum.valorTotal ?? 0}
      totalNFs={consignacoes._count.id}
      totalMes={consignacoesMes._sum.valorTotal ?? 0}
      totalNFsMes={consignacoesMes._count.id}
      pendente={statusMap["PENDENTE"] ?? { valor: 0, count: 0 }}
      faturado={statusMap["FATURADA"] ?? { valor: 0, count: 0 }}
      cancelado={statusMap["CANCELADA"] ?? { valor: 0, count: 0 }}
      rankingClientes={rankingClientes}
    />
  )
}
