import { prisma } from "@/lib/prisma"
import ConsignacaoClient from "./ConsignacaoClient"

export default async function ConsignacaoPage() {
  const [consignacoes, clientes, produtos] = await Promise.all([
    prisma.consignacao.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        cliente: { select: { nome: true, codigo: true } },
        itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
      },
    }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { id: true, codigo: true, nome: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, codigo: true, descricao: true } }),
  ])

  return <ConsignacaoClient consignacoes={consignacoes} clientes={clientes} produtos={produtos} />
}
