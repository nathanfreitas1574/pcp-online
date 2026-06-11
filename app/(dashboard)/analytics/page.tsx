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

  // Detalhe de descargas para o gráfico drill-down (Cliente → Produto → Transportadora → Placa)
  const descargaDetalhe = descargasRegistro.map((r) => ({
    cliente: r.clienteNome,
    produto: r.produto,
    transportadora: r.transportadora ?? "—",
    placa: r.placa ?? "—",
    peso: Math.round(r.pesoSaida ?? 0),
  }))

  // Detalhe para drill-down dos gráficos mensais (ordem cronológica preservada)
  const mesLabel = (d: Date) => new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
  const MOV_LABEL: Record<string, string> = {
    PROGRAMADA: "Programada", CONCLUIDA: "Concluída", EM_ANDAMENTO: "Em andamento", CANCELADA: "Cancelada",
  }
  const tmpDetalhe = tmpHistorico.map((t) => ({
    mes: mesLabel(t.createdAt), cliente: t.clienteNome, produto: t.produto ?? "—", tmp: t.tmpMinutos ?? 0,
  }))
  const movDetalhe = movimentacoes.map((m) => ({
    mes: mesLabel(m.createdAt), status: MOV_LABEL[m.status] ?? m.status, qtd: 1,
  }))

  return (
    <AnalyticsClient
      ranking={ranking}
      descargaDetalhe={descargaDetalhe}
      tmpDetalhe={tmpDetalhe}
      movDetalhe={movDetalhe}
      totalDescarga={descargasRegistro.length}
      totalTMP={tmpHistorico.length}
      tmpMedioGeral={tmpHistorico.length > 0 ? Math.round(tmpHistorico.reduce((s, t) => s + (t.tmpMinutos ?? 0), 0) / tmpHistorico.length) : 0}
    />
  )
}
