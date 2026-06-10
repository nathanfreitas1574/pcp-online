import { prisma } from "@/lib/prisma"
import HistoricoBoxesClient from "./HistoricoBoxesClient"

export const dynamic = "force-dynamic"

export default async function HistoricoBoxesPage() {
  // Busca todos os boxes ativos e produtos distintos para os filtros
  const [boxes, produtosDistintos, clientesDistintos] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      select: { id: true, codigo: true, descricao: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.historicoBox.findMany({
      where: { produto: { not: null } },
      distinct: ["produto"],
      select: { produto: true },
      orderBy: { produto: "asc" },
    }),
    prisma.historicoBox.findMany({
      where: { clienteNome: { not: null } },
      distinct: ["clienteNome"],
      select: { clienteNome: true },
      orderBy: { clienteNome: "asc" },
    }),
  ])

  return (
    <HistoricoBoxesClient
      boxes={boxes}
      produtos={produtosDistintos.map(p => p.produto!).filter(Boolean)}
      clientes={clientesDistintos.map(c => c.clienteNome!).filter(Boolean)}
    />
  )
}
