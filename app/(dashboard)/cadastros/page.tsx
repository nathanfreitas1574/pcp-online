import { prisma } from "@/lib/prisma"
import CadastrosClient from "./CadastrosClient"

export const dynamic = "force-dynamic"

export default async function CadastrosPage() {
  const [produtos, clientes, boxes, depara, checklists, motivos] = await Promise.all([
    prisma.produto.findMany({ orderBy: { descricao: "asc" } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }),
    prisma.produtoDePara.findMany({
      orderBy: { produto: { descricao: "asc" } },
      include: { produto: { select: { id: true, codigo: true, descricao: true, unidade: true } } },
    }),
    prisma.checklistTemplate.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: { itens: { orderBy: { ordem: "asc" } } },
    }),
    prisma.motivoCancelamento.findMany({ orderBy: [{ ordem: "asc" }, { descricao: "asc" }] }),
  ])
  return (
    <CadastrosClient
      produtos={produtos} clientes={clientes} boxes={boxes}
      depara={depara} checklists={checklists} motivos={motivos}
    />
  )
}
