import { prisma } from "@/lib/prisma"
import ContratosClient from "./ContratosClient"

export const dynamic = "force-dynamic"

export default async function ContratosPage() {
  const [safras, clientes, tabelas, totaisGeral] = await Promise.all([
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true, safra: { not: null } },
      distinct: ["safra"],
      select: { safra: true },
      orderBy: { safra: "desc" },
    }),
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true },
      distinct: ["clienteNome"],
      select: { clienteNome: true },
      orderBy: { clienteNome: "asc" },
    }),
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true, descTabela: { not: null } },
      distinct: ["descTabela"],
      select: { descTabela: true },
      orderBy: { descTabela: "asc" },
    }),
    prisma.contratoArmazenagem.groupBy({
      by: ["descTabela"],
      where: { ativo: true },
      _count: { id: true },
      _sum:   { qtdContratada: true },
    }),
  ])

  return (
    <ContratosClient
      safras={safras.map(s => s.safra!)}
      clientes={clientes.map(c => c.clienteNome)}
      tabelas={tabelas.map(t => t.descTabela!)}
      totaisGeral={totaisGeral.map(t => ({
        descTabela: t.descTabela ?? "—",
        count: t._count.id,
        totalQtd: t._sum.qtdContratada ?? 0,
      }))}
    />
  )
}
