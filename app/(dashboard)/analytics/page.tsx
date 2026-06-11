import { prisma } from "@/lib/prisma"
import AnalyticsClient from "./AnalyticsClient"

export default async function AnalyticsPage() {
  // Últimos 12 meses de movimentações
  const dozeAtras = new Date()
  dozeAtras.setMonth(dozeAtras.getMonth() - 12)

  const [movimentacoes, descargasRegistro, tmpHistorico, clientes] = await Promise.all([
    prisma.movimentacao.findMany({
      where: { createdAt: { gte: dozeAtras } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.descargaRegistro.findMany({
      where: { createdAt: { gte: dozeAtras } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tmpRegistro.findMany({
      where: { status: "CONCLUIDO", createdAt: { gte: dozeAtras } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cliente.findMany({ where: { ativo: true } }),
  ])

  // Ranking de clientes por volume de descarga
  const rankingMap = new Map<string, number>()
  for (const r of descargasRegistro) {
    const atual = rankingMap.get(r.clienteNome) ?? 0
    rankingMap.set(r.clienteNome, atual + (r.pesoSaida ?? 0))
  }
  const ranking = [...rankingMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nome, volume]) => ({ nome, volume }))

  // TMP médio por mês
  const tmpPorMes = new Map<string, { total: number; count: number }>()
  for (const t of tmpHistorico) {
    const mes = new Date(t.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    const atual = tmpPorMes.get(mes) ?? { total: 0, count: 0 }
    tmpPorMes.set(mes, { total: atual.total + (t.tmpMinutos ?? 0), count: atual.count + 1 })
  }
  const tmpMensal = [...tmpPorMes.entries()].map(([mes, { total, count }]) => ({
    label: mes, tmp: count > 0 ? Math.round(total / count) : 0
  }))

  // Movimentações por mês
  const movPorMes = new Map<string, { programadas: number; concluidas: number }>()
  for (const m of movimentacoes) {
    const mes = new Date(m.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    const atual = movPorMes.get(mes) ?? { programadas: 0, concluidas: 0 }
    if (m.status === "PROGRAMADA") atual.programadas++
    if (m.status === "CONCLUIDA") atual.concluidas++
    movPorMes.set(mes, atual)
  }
  const movMensal = [...movPorMes.entries()].map(([mes, v]) => ({ label: mes, ...v }))

  // Detalhe de descargas para o gráfico drill-down (Cliente → Produto → Transportadora → Placa)
  const descargaDetalhe = descargasRegistro.map((r) => ({
    cliente: r.clienteNome,
    produto: r.produto,
    transportadora: r.transportadora ?? "—",
    placa: r.placa ?? "—",
    peso: Math.round(r.pesoSaida ?? 0),
  }))

  return (
    <AnalyticsClient
      ranking={ranking}
      tmpMensal={tmpMensal}
      movMensal={movMensal}
      descargaDetalhe={descargaDetalhe}
      totalDescarga={descargasRegistro.length}
      totalTMP={tmpHistorico.length}
      tmpMedioGeral={tmpHistorico.length > 0 ? Math.round(tmpHistorico.reduce((s, t) => s + (t.tmpMinutos ?? 0), 0) / tmpHistorico.length) : 0}
    />
  )
}
