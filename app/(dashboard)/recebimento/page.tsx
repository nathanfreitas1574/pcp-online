import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import RecebimentoClient from "./RecebimentoClient"

export default async function RecebimentoPage() {
  const session = await auth()

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1

  const [kpis, programacoes, registros, pontosDescarga] = await Promise.all([
    // KPIs do mês atual
    prisma.descargaRegistro.aggregate({
      _sum: { pesoSaida: true, pesoEntrada: true },
      _count: { id: true },
      where: {
        dtPortaria: {
          gte: new Date(anoAtual, mesAtual - 1, 1),
          lt: new Date(anoAtual, mesAtual, 1),
        },
      },
    }),
    // Programações recentes
    prisma.descargaProgramacao.findMany({
      take: 50,
      orderBy: { data: "desc" },
      include: { contrato: { include: { cliente: true } } },
    }),
    // Últimos registros de descarga
    prisma.descargaRegistro.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    // Contratos com volume planejado vs realizado
    prisma.contratoDescarga.groupBy({
      by: ["status"],
      _sum: { volConfirmado: true, realizado: true },
    }),
  ])

  const totalPlanejado = pontosDescarga.reduce((s, p) => s + (p._sum.volConfirmado ?? 0), 0)
  const totalRealizado = pontosDescarga.reduce((s, p) => s + (p._sum.realizado ?? 0), 0)
  const tmpMedio = registros
    .filter((r) => r.tmpMinutos)
    .reduce((s, r, _, a) => s + (r.tmpMinutos ?? 0) / a.length, 0)

  return (
    <RecebimentoClient
      programacoes={programacoes}
      registros={registros}
      totalPlanejado={totalPlanejado}
      totalRealizado={totalRealizado}
      totalRegistros={kpis._count.id}
      tmpMedio={Math.round(tmpMedio)}
    />
  )
}
