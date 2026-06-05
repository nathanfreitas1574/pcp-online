import { prisma } from "@/lib/prisma"
import FilaClient from "./FilaClient"

export default async function FilaPage() {
  const [fila, clientes, produtos] = await Promise.all([
    prisma.filaCaminhao.findMany({
      where: { status: { not: "FINALIZADO" } },
      orderBy: [{ status: "asc" }, { dtChegada: "asc" }],
    }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { id: true, nome: true, codigo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, codigo: true, descricao: true } }),
  ])
  const historico = await prisma.filaCaminhao.findMany({
    where: { status: "FINALIZADO" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })
  return <FilaClient fila={fila} historico={historico} clientes={clientes} produtos={produtos} />
}
