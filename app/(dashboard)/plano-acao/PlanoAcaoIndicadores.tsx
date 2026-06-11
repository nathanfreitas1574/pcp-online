"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target, Users, DollarSign } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { PlanoAcaoItem } from "./PlanoAcaoClient"
import DrillBarChart from "@/components/DrillBarChart"
import DrillPieChart from "@/components/DrillPieChart"

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado",
}
const PRIO_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" }
const STATUS_CORES: Record<string, string> = {
  "Pendente": "#f59e0b", "Em andamento": "#3b82f6", "Concluído": "#22c55e", "Cancelado": "#9ca3af",
}
const PRIO_CORES: Record<string, string> = { "Alta": "#ef4444", "Média": "#f59e0b", "Baixa": "#22c55e" }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(v: number) {
  if (v >= 75) return { text: "text-green-600", bg: "bg-green-50", ring: "#22c55e", label: "Excelente" }
  if (v >= 50) return { text: "text-yellow-600", bg: "bg-yellow-50", ring: "#f59e0b", label: "Regular" }
  return { text: "text-red-600", bg: "bg-red-50", ring: "#ef4444", label: "Crítico" }
}

function Gauge({ value, size = 140 }: { value: number; size?: number }) {
  const { ring, text, label } = scoreColor(value)
  const r = (size / 2) * 0.72
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75            // 270° arc
  const filled = arc * (value / 100)
  const dash = `${filled} ${circ}`
  const offset = circ * 0.125        // start at ~225° (bottom-left)

  return (
    <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`} className="overflow-visible">
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={size*0.1}
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(135 ${size/2} ${size/2})`}
      />
      {/* Value arc */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={ring} strokeWidth={size*0.1}
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(135 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size * 0.22, fontWeight: 700, fill: ring }}>
        {value}
      </text>
      <text x={size/2} y={size/2 + size*0.19} textAnchor="middle"
        style={{ fontSize: size * 0.09, fill: "#6b7280" }}>
        {label}
      </text>
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoAcaoIndicadores({ planos }: { planos: PlanoAcaoItem[] }) {
  const hoje = useMemo(() => new Date(), [])

  const metrics = useMemo(() => {
    const ativos   = planos.filter(p => p.status !== "CANCELADO")
    const concluidos = planos.filter(p => p.status === "CONCLUIDO")
    const emAndamento = planos.filter(p => p.status === "EM_ANDAMENTO")
    const pendentes  = planos.filter(p => p.status === "PENDENTE")
    const cancelados = planos.filter(p => p.status === "CANCELADO")

    const vencidos = ativos.filter(p =>
      p.status !== "CONCLUIDO" && new Date(p.quando) < hoje
    )
    const vencidosAlta = vencidos.filter(p => p.prioridade === "ALTA")

    // Concluídos no prazo
    const concluidosNoPrazo = concluidos.filter(p =>
      p.dataConclusao && new Date(p.dataConclusao) <= new Date(p.quando)
    )

    // Execution Score (0-100)
    const taxaConclusao  = ativos.length > 0 ? concluidos.length / ativos.length : 0
    const taxaNoPrazo    = concluidos.length > 0 ? concluidosNoPrazo.length / concluidos.length : 1
    const altasAtivas    = ativos.filter(p => p.prioridade === "ALTA" && p.status !== "CONCLUIDO")
    const penalidade     = altasAtivas.length > 0 ? vencidosAlta.length / altasAtivas.length : 0
    const rawScore       = (taxaConclusao * 0.40 + taxaNoPrazo * 0.40 + (1 - penalidade) * 0.20) * 100
    const execScore      = Math.round(Math.min(100, Math.max(0, rawScore)))

    // Custo
    const custoTotal = planos.reduce((s, p) => s + (p.quantoCusta ?? 0), 0)
    const custoConcluido = concluidos.reduce((s, p) => s + (p.quantoCusta ?? 0), 0)

    // Distribuição de status (para o donut)
    const statusDist = [
      { name: "Em andamento", value: emAndamento.length, color: "#3b82f6" },
      { name: "Pendente",     value: pendentes.length,   color: "#f59e0b" },
      { name: "Concluído",    value: concluidos.length,  color: "#22c55e" },
      { name: "Cancelado",    value: cancelados.length,  color: "#9ca3af" },
    ].filter(d => d.value > 0)

    // Distribuição por prioridade (ativos)
    const prioDist = [
      { name: "Alta",  value: ativos.filter(p => p.prioridade === "ALTA").length,  color: "#ef4444" },
      { name: "Média", value: ativos.filter(p => p.prioridade === "MEDIA").length, color: "#f59e0b" },
      { name: "Baixa", value: ativos.filter(p => p.prioridade === "BAIXA").length, color: "#22c55e" },
    ].filter(d => d.value > 0)

    // Ranking por responsável
    const byQuem: Record<string, { total: number; concluidos: number; vencidos: number; emAndamento: number; score: number }> = {}
    ativos.forEach(p => {
      if (!byQuem[p.quem]) byQuem[p.quem] = { total: 0, concluidos: 0, vencidos: 0, emAndamento: 0, score: 0 }
      byQuem[p.quem].total++
      if (p.status === "CONCLUIDO") byQuem[p.quem].concluidos++
      if (p.status === "EM_ANDAMENTO") byQuem[p.quem].emAndamento++
      if (p.status !== "CONCLUIDO" && new Date(p.quando) < hoje) byQuem[p.quem].vencidos++
    })
    const ranking = Object.entries(byQuem)
      .map(([quem, d]) => ({
        quem,
        ...d,
        score: d.total > 0 ? Math.round((d.concluidos / d.total) * 100) : 0,
        abertos: d.total - d.concluidos,
      }))
      .sort((a, b) => b.vencidos - a.vencidos || b.abertos - a.abertos)

    // Barras por responsável (recharts)
    const barData = ranking.slice(0, 8).map(r => ({
      name: r.quem.split(" ")[0],          // só primeiro nome no eixo
      nomeCompleto: r.quem,
      Concluídos:   r.concluidos,
      "Em andamento": r.emAndamento,
      Pendentes:    r.total - r.concluidos - r.emAndamento - r.vencidos,
      Vencidos:     r.vencidos,
    }))

    // Ações críticas (ALTA + vencidas, ordenadas por dias de atraso)
    const criticas = ativos
      .filter(p => p.prioridade === "ALTA" && p.status !== "CONCLUIDO")
      .map(p => ({
        ...p,
        diasAtraso: differenceInDays(hoje, new Date(p.quando)),
        atrasada: new Date(p.quando) < hoje,
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 5)

    // Progresso médio das ações em andamento
    const progressoMedio = emAndamento.length > 0
      ? Math.round(emAndamento.reduce((s, p) => s + p.progresso, 0) / emAndamento.length)
      : 0

    return {
      execScore, taxaConclusao, taxaNoPrazo, vencidos, vencidosAlta,
      statusDist, prioDist, ranking, barData, criticas,
      custoTotal, custoConcluido, progressoMedio,
      totais: { todos: planos.length, ativos: ativos.length, concluidos: concluidos.length, vencidos: vencidos.length },
    }
  }, [planos, hoje])

  const { text: scoreText, bg: scoreBg } = scoreColor(metrics.execScore)

  // Dados detalhados (1 registro por ação) para os gráficos drill-down
  const acoesDetalhe = planos.map(p => ({
    responsavel: p.quem || "—",
    prioridade: PRIO_LABEL[p.prioridade] ?? p.prioridade,
    status: STATUS_LABEL[p.status] ?? p.status,
    acao: p.oQue,
    qtd: 1,
  }))

  return (
    <div className="space-y-6">

      {/* ── Linha 1: Score + 4 KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        {/* Gauge principal */}
        <div className={`md:col-span-1 rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center ${scoreBg}`}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Índice de Execução</p>
          <Gauge value={metrics.execScore} size={130} />
          <p className={`text-xs font-medium mt-1 ${scoreText}`}>
            {metrics.execScore >= 75 ? "Portfólio saudável" : metrics.execScore >= 50 ? "Atenção necessária" : "Intervenção urgente"}
          </p>
        </div>

        {/* KPIs */}
        {[
          {
            label: "Taxa de Conclusão",
            value: `${Math.round(metrics.taxaConclusao * 100)}%`,
            sub: `${metrics.totais.concluidos} de ${metrics.totais.ativos} ações`,
            icon: CheckCircle2,
            color: metrics.taxaConclusao >= 0.6 ? "text-green-600" : metrics.taxaConclusao >= 0.3 ? "text-yellow-600" : "text-red-600",
            bg: metrics.taxaConclusao >= 0.6 ? "bg-green-50" : metrics.taxaConclusao >= 0.3 ? "bg-yellow-50" : "bg-red-50",
          },
          {
            label: "Entregas no Prazo",
            value: `${Math.round(metrics.taxaNoPrazo * 100)}%`,
            sub: "das ações concluídas",
            icon: Target,
            color: metrics.taxaNoPrazo >= 0.8 ? "text-green-600" : metrics.taxaNoPrazo >= 0.5 ? "text-yellow-600" : "text-red-600",
            bg: metrics.taxaNoPrazo >= 0.8 ? "bg-green-50" : metrics.taxaNoPrazo >= 0.5 ? "bg-yellow-50" : "bg-red-50",
          },
          {
            label: "Ações Vencidas",
            value: metrics.totais.vencidos,
            sub: `${metrics.vencidosAlta.length} de alta prioridade`,
            icon: AlertTriangle,
            color: metrics.totais.vencidos === 0 ? "text-green-600" : metrics.totais.vencidos <= 2 ? "text-yellow-600" : "text-red-600",
            bg: metrics.totais.vencidos === 0 ? "bg-green-50" : metrics.totais.vencidos <= 2 ? "bg-yellow-50" : "bg-red-50",
          },
          {
            label: "Custo Comprometido",
            value: metrics.custoTotal > 0
              ? `R$ ${metrics.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
              : "—",
            sub: metrics.custoConcluido > 0
              ? `R$ ${metrics.custoConcluido.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} executado`
              : "Nenhum custo concluído",
            icon: DollarSign,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border border-gray-100 shadow-sm p-5 ${bg}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
              </div>
              <Icon size={20} className={`${color} opacity-60 shrink-0`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Linha 2: Donuts + Ações críticas ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Donut — Status (drill: Status → Responsável → Ação) */}
        <DrillPieChart
          titulo="Distribuição por Status — clique para detalhar"
          dados={acoesDetalhe}
          niveis={[
            { campo: "status", titulo: "Status" },
            { campo: "responsavel", titulo: "Responsável" },
            { campo: "acao", titulo: "Ação" },
          ]}
          cores={STATUS_CORES}
          semDados="Sem dados"
        />

        {/* Donut — Prioridade (drill: Prioridade → Responsável → Ação) */}
        <DrillPieChart
          titulo="Distribuição por Prioridade — clique para detalhar"
          dados={acoesDetalhe}
          niveis={[
            { campo: "prioridade", titulo: "Prioridade" },
            { campo: "responsavel", titulo: "Responsável" },
            { campo: "acao", titulo: "Ação" },
          ]}
          cores={PRIO_CORES}
          semDados="Sem dados"
        />

        {/* Ações críticas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            🔴 Ações Críticas (Alta prioridade)
          </p>
          {metrics.criticas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={28} className="text-green-400" />
              <p className="text-sm text-gray-400 text-center">Nenhuma ação crítica em aberto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.criticas.map(p => (
                <div key={p.id} className={`rounded-xl px-3 py-2 flex items-start gap-2 ${
                  p.atrasada ? "bg-red-50 border border-red-100" : "bg-orange-50 border border-orange-100"
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.oQue}</p>
                    <p className="text-xs text-gray-500">👤 {p.quem}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {p.atrasada ? (
                      <span className="text-xs font-bold text-red-700">
                        {p.diasAtraso}d atraso
                      </span>
                    ) : (
                      <span className="text-xs text-orange-600">
                        {format(new Date(p.quando), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                    <p className="text-xs text-gray-400">{p.status === "EM_ANDAMENTO" ? "Em andamento" : "Pendente"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Carga por responsável (drill: Responsável → Prioridade → Status → Ação) ── */}
      <DrillBarChart
        titulo="Carga por responsável — clique para detalhar"
        dados={acoesDetalhe}
        niveis={[
          { campo: "responsavel", titulo: "Responsável" },
          { campo: "prioridade", titulo: "Prioridade" },
          { campo: "status", titulo: "Status" },
          { campo: "acao", titulo: "Ação" },
        ]}
        medidas={[{ campo: "qtd", nome: "Ações", cor: "#7c3aed" }]}
        semDados="Sem ações cadastradas."
      />

      {/* ── Linha 4: Ranking de responsáveis ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={15} className="text-blue-700" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ranking de Responsáveis</p>
        </div>
        {metrics.ranking.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["#", "Responsável", "Total", "Concluídos", "Em andamento", "Vencidos", "Taxa", "Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metrics.ranking.map((r, i) => {
                  const alert = r.vencidos > 0 ? "bg-red-50" : r.abertos > 3 ? "bg-yellow-50" : ""
                  return (
                    <tr key={r.quem} className={`hover:bg-gray-50 transition ${alert}`}>
                      <td className="px-4 py-3 text-xs font-bold text-gray-400">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {r.quem.charAt(0).toUpperCase()}
                          </span>
                          {r.quem}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">{r.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-700 font-semibold">{r.concluidos}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-blue-700 font-semibold">{r.emAndamento}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.vencidos > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            ⚠ {r.vencidos}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-12">
                            <div className="h-1.5 rounded-full" style={{
                              width: `${r.score}%`,
                              background: r.score >= 75 ? "#22c55e" : r.score >= 50 ? "#f59e0b" : "#ef4444",
                            }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-8 text-right">{r.score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.vencidos > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700">
                            <TrendingDown size={12} /> Atraso
                          </span>
                        ) : r.score >= 75 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <TrendingUp size={12} /> No prazo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Minus size={12} /> Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <p className="text-xs text-gray-400 text-center">
        Índice de Execução = 40% taxa de conclusão + 40% entregas no prazo + 20% ausência de atraso em alta prioridade
      </p>
    </div>
  )
}
