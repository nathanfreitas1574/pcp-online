import { prisma } from "@/lib/prisma"
import CoberturasClient from "./CoberturasClient"

export const dynamic = "force-dynamic"

export default async function CoberturasPage() {
  const [clientes, produtos, boxes] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, select: { nome: true }, orderBy: { nome: "asc" } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { descricao: true }, orderBy: { descricao: "asc" } }),
    prisma.box.findMany({ where: { ativo: true }, select: { codigo: true }, orderBy: { codigo: "asc" } }),
  ])
  return (
    <CoberturasClient
      clientes={[...new Set(clientes.map(c => c.nome).filter(Boolean))]}
      produtos={[...new Set(produtos.map(p => p.descricao).filter(Boolean))]}
      boxes={boxes.map(b => b.codigo)}
    />
  )
}
