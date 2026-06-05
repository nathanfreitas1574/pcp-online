import { prisma } from "@/lib/prisma"
import TmpClient from "./TmpClient"

export default async function TmpPage() {
  const [ativos, boxes, clientes, produtos] = await Promise.all([
    prisma.tmpRegistro.findMany({
      where: { status: "EM_ANDAMENTO" },
      orderBy: { dtEntrada: "asc" },
    }),
    prisma.box.findMany({ where: { ativo: true }, select: { id: true, codigo: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { id: true, nome: true, codigo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, descricao: true, codigo: true } }),
  ])

  const historico = await prisma.tmpRegistro.findMany({
    where: { status: "CONCLUIDO" },
    orderBy: { dtSaida: "desc" },
    take: 20,
  })

  return <TmpClient ativos={ativos} historico={historico} boxes={boxes} clientes={clientes} produtos={produtos} />
}
