import { prisma } from "@/lib/prisma"
import CadastrosClient from "./CadastrosClient"

export default async function CadastrosPage() {
  const [produtos, clientes, boxes] = await Promise.all([
    prisma.produto.findMany({ orderBy: { descricao: "asc" } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }),
  ])
  return <CadastrosClient produtos={produtos} clientes={clientes} boxes={boxes} />
}
