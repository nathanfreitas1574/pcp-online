import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import InventarioClient from "./InventarioClient"

export default async function InventarioPage() {
  const session = await auth()

  const [inventarios, boxes, produtos, clientes] = await Promise.all([
    prisma.inventario.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        itens: {
          include: {
            produto: { select: { codigo: true, descricao: true, unidade: true } },
            usuario: { select: { name: true } },
          },
        },
      },
    }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true, descricao: true, localizacao: true, capacidade: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" }, select: { id: true, codigo: true, descricao: true, unidade: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, codigo: true, nome: true } }),
  ])

  return (
    <InventarioClient
      inventarios={inventarios}
      boxes={boxes}
      produtos={produtos}
      clientes={clientes}
      userId={session?.user?.id ?? ""}
    />
  )
}
