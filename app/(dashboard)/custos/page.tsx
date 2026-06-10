import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import CustosClient from "./CustosClient"

export const dynamic = "force-dynamic"

export default async function CustosPage() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role)) redirect("/")

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`

  const [custos, armazens, resumo] = await Promise.all([
    prisma.custoOperacional.findMany({
      orderBy: { data: "desc" },
      take: 200,
      include: { armazem: { select: { nome: true, codigo: true } } },
    }),
    prisma.armazem.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" }, select: { id: true, nome: true, codigo: true } }),
    // Volume recebido por mês (últimos 6 meses)
    prisma.descargaRegistro.groupBy({
      by: ["createdAt"],
      where: { dtPortaria: { gte: new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1) } },
      _sum: { pesoEntrada: true },
    }),
  ])

  // Agrupar custo por mês
  const custosPorMes = custos.reduce<Record<string, number>>((acc, c) => {
    acc[c.mes] = (acc[c.mes] ?? 0) + c.valor; return acc
  }, {})

  return (
    <CustosClient
      custos={custos.map(c => ({
        id: c.id, data: c.data.toISOString(), mes: c.mes,
        tipo: c.tipo as string, descricao: c.descricao,
        valor: c.valor, armazemId: c.armazemId,
        armazemNome: c.armazem?.nome ?? null,
        criadoPorNome: c.criadoPorNome,
      }))}
      armazens={armazens}
      custosPorMes={custosPorMes}
      mesAtual={mesAtual}
    />
  )
}
