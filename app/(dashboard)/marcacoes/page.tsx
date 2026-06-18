import { prisma } from "@/lib/prisma"
import MarcacoesClient from "./MarcacoesClient"

export const dynamic = "force-dynamic"

export default async function MarcacoesPage() {
  const [safras, clientes, produtos, transportadoras, agregadoOperacao] = await Promise.all([
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true, safra: { not: null } },
      distinct: ["safra"],
      select: { safra: true },
      orderBy: { safra: "desc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, clienteDestino: { not: null } },
      distinct: ["clienteDestino"],
      select: { clienteDestino: true },
      orderBy: { clienteDestino: "asc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, produto: { not: null } },
      distinct: ["produto"],
      select: { produto: true },
      orderBy: { produto: "asc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, transportadora: { not: null } },
      distinct: ["transportadora"],
      select: { transportadora: true },
      orderBy: { transportadora: "asc" },
    }),
    prisma.marcacaoVeiculo.groupBy({
      by: ["operacao"],
      where: { ativo: true },
      _count: { id: true },
      _sum: { pesoLiquido: true },
    }),
  ])

  return (
    <MarcacoesClient
      safras={safras.map(s => s.safra!).filter(Boolean)}
      clientes={clientes.map(c => c.clienteDestino!).filter(Boolean)}
      produtos={produtos.map(p => p.produto!).filter(Boolean)}
      transportadoras={transportadoras.map(t => t.transportadora!).filter(Boolean)}
      agregadoOperacao={agregadoOperacao.map(a => ({
        operacao: a.operacao ?? "—",
        count: a._count.id,
        pesoLiquido: a._sum.pesoLiquido ?? 0,
      }))}
    />
  )
}
