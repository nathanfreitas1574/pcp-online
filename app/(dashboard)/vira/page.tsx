import { prisma } from "@/lib/prisma"
import ViraClient from "./ViraClient"

export const dynamic = "force-dynamic"

export default async function ViraPage() {
  const [viras, boxes, clientes, produtos] = await Promise.all([
    prisma.viraProgramacao.findMany({ orderBy: [{ prioridade: "asc" }, { createdAt: "asc" }] }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { codigo: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { nome: true, abreviado: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" }, select: { descricao: true, abreviado: true } }),
  ])

  return (
    <ViraClient
      inicial={viras.map((v) => ({
        id: v.id, prioridade: v.prioridade, data: v.data.toISOString().slice(0, 10),
        clienteNome: v.clienteNome, produto: v.produto, boxOrigem: v.boxOrigem, boxDestino: v.boxDestino,
        volume: v.volume, turno: v.turno, obs: v.obs, status: v.status,
      }))}
      boxes={boxes.map((b) => b.codigo)}
      clientes={[...new Set(clientes.flatMap((c) => [c.nome, c.abreviado].filter(Boolean) as string[]))]}
      produtos={[...new Set(produtos.flatMap((p) => [p.descricao, p.abreviado].filter(Boolean) as string[]))]}
    />
  )
}
