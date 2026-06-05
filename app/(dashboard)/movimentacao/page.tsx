import { prisma } from "@/lib/prisma"
import MovimentacaoClient from "./MovimentacaoClient"

export default async function MovimentacaoPage() {
  const [movimentacoes, produtos] = await Promise.all([
    prisma.movimentacao.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        usuario: { select: { name: true } },
        itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
      },
    }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, codigo: true, descricao: true, unidade: true } }),
  ])

  return <MovimentacaoClient movimentacoes={movimentacoes} produtos={produtos} />
}
