"use client"

import { useState, useEffect } from "react"
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const COR = { orcado: "#94a3b8", forecast: "#f97316", realizado: "#16a34a", programado: "#0ea5e9", barra: "#16a34a" }
const PIE = ["#16a34a", "#0ea5e9", "#f59e0b"]

type NV = { nome: string; valor: number }
type Bi = {
  ano: number; mes: number; mesDiario: string
  kpis: { orcado: number; forecast: number; realizado: number; capacidade: number; gap: number; aderenciaForecast: number; aderenciaOrcado: number; performance: number }
  mensal: { mes: string; orcado: number; forecast: number; realizado: number; ritmo: number | null }[]
  semanal: { semana: number; programado: number; realizado: number; aderencia: number | null }[]
  diario: { dia: number; realizado: number; forecast: number }[]
  porCliente: NV[]; porProduto: NV[]; porLinha: NV[]; porOperacao: NV[]; porTurno: NV[]
  aderenciaCliente: { nome: string; realizado: number; forecast: number; aderencia: number | null }[]
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-green-100 shadow-sm p-3 ${className}`}>
      <p className="text-xs font-semibold text-gray-600 mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function BiExpedicao() {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [mes, setMes] = useState(0)
  const [d, setD] = useState<Bi | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/expedicao/bi?ano=${ano}&mes=${mes}`)
      .then((r) => r.json()).then((j) => setD(j.error ? null : j)).catch(() => {}).finally(() => setLoading(false))
  }, [ano, mes])

  const k = d?.kpis
  const kpiCards = [
    { t: "Orçado × Realizado", a: k ? fmt(k.orcado) : "—", b: k ? `${k.aderenciaOrcado.toFixed(1)}%` : "", la: "Orçado", lb: "Aderência" },
    { t: "Forecast × Realizado", a: k ? fmt(k.forecast) : "—", b: k ? `${k.aderenciaForecast.toFixed(1)}%` : "", la: "Forecast", lb: "Aderência" },
    { t: "Realizado", a: k ? fmt(k.realizado) : "—", b: "t", la: "Marcação", lb: "" },
    { t: "Capacidade", a: k ? fmt(k.capacidade) : "—", b: k ? `${k.performance.toFixed(1)}%` : "", la: "Total", lb: "Performance" },
    { t: "Gap Forecast × Realizado", a: k ? (k.gap >= 0 ? "+" : "") + fmt(k.gap) : "—", b: "t", la: "realiz − forecast", lb: "" },
  ]

  return (
    <div className="bg-green-800 rounded-2xl p-3 md:p-4">
      {/* barra de período */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-white font-bold text-lg mr-2">Dashboard Expedição</h3>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="text-xs rounded-lg px-2 py-1.5 border border-green-600 bg-green-700 text-white">
          {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="text-xs rounded-lg px-2 py-1.5 border border-green-600 bg-green-700 text-white">
          <option value={0}>Ano todo</option>
          {MESES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
        </select>
        {loading && <span className="text-xs text-green-200">carregando…</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        {kpiCards.map((c) => (
          <div key={c.t} className="bg-white rounded-xl border border-green-100 p-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1 leading-tight">{c.t}</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl font-bold text-green-700">{c.a}</span>
              {c.b && <span className="text-sm font-semibold text-gray-600">{c.b}</span>}
            </div>
            <div className="flex justify-center gap-2 text-[10px] text-gray-400">
              <span>{c.la}</span>{c.lb && <span>· {c.lb}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* linha 1: Mensal + Ritmo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
        <Card title="Expedição Mensal (Orçado · Forecast · Realizado)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={d?.mensal ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={44} />
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="orcado" name="Orçado" fill={COR.orcado} radius={[3, 3, 0, 0]} />
              <Bar dataKey="forecast" name="Forecast" fill={COR.forecast} radius={[3, 3, 0, 0]} />
              <Line dataKey="realizado" name="Realizado" stroke={COR.realizado} strokeWidth={2.5} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Ritmo Mês (Realizado / Orçado %)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d?.mensal ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={34} />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              <Bar dataKey="ritmo" name="Ritmo %">
                {(d?.mensal ?? []).map((m, i) => <Cell key={i} fill={(m.ritmo ?? 0) >= 95 ? "#16a34a" : (m.ritmo ?? 0) >= 60 ? "#f59e0b" : "#ef4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* linha 2: Semanal + Diária */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
        <Card title="Aderência à Programação Semanal (Programado × Realizado)">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={d?.semanal ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="semana" tickFormatter={(s) => `S${s}`} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={44} />
              <Tooltip formatter={(v) => fmt1(Number(v))} labelFormatter={(l) => `Semana ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="programado" name="Programado" fill={COR.programado} radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill={COR.realizado} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title={`Expedição Diária — ${d?.mesDiario ?? ""}`}>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={d?.diario ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={40} />
              <Tooltip formatter={(v) => fmt1(Number(v))} labelFormatter={(l) => `Dia ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="realizado" name="Realizado" fill={COR.realizado} radius={[2, 2, 0, 0]} />
              <Line dataKey="forecast" name="Forecast" stroke={COR.forecast} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* linha 3: cliente / produto / turno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
        <Card title="Volume por Cliente">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d?.porCliente ?? []} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmt} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 9 }} width={110} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + "…" : v} />
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Bar dataKey="valor" name="Realizado (t)" fill={COR.barra} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Volume por Produto">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d?.porProduto ?? []} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmt} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 9 }} width={110} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + "…" : v} />
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Bar dataKey="valor" name="Realizado (t)" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Volume por Turno (Dia a Dia)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={(d?.porTurno ?? []).filter((t) => t.valor > 0)} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(e: any) => `${e.nome}: ${fmt(Number(e.value))}`} labelLine={false}>
                {(d?.porTurno ?? []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {(d?.porTurno ?? []).every((t) => t.valor === 0) && (
            <p className="text-[11px] text-gray-400 text-center -mt-8">Sem turnos lançados no Dia a Dia.</p>
          )}
        </Card>
      </div>

      {/* linha 4: linha / operação / aderência cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <Card title="Volume por Linha de Produção">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={d?.porLinha ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="nome" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={42} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={40} />
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Bar dataKey="valor" name="Realizado (t)" fill={COR.realizado} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Volume por Operação">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={d?.porOperacao ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="nome" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={42} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={40} />
              <Tooltip formatter={(v) => fmt1(Number(v))} />
              <Bar dataKey="valor" name="Realizado (t)" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Aderência por Cliente (Realizado / Forecast)">
          <div className="overflow-y-auto" style={{ maxHeight: 230 }}>
            <table className="w-full text-xs">
              <tbody>
                {(d?.aderenciaCliente ?? []).map((c) => (
                  <tr key={c.nome} className="border-b border-gray-50">
                    <td className="py-1 pr-2 text-gray-700 truncate max-w-32" title={c.nome}>{c.nome.length > 22 ? c.nome.slice(0, 22) + "…" : c.nome}</td>
                    <td className="py-1 text-right font-medium text-green-700 tabular-nums">{fmt1(c.realizado)}</td>
                    <td className="py-1 pl-2 text-right tabular-nums w-14">
                      {c.aderencia == null ? <span className="text-gray-300">—</span> :
                        <span className={c.aderencia >= 95 ? "text-green-600 font-semibold" : c.aderencia >= 60 ? "text-amber-600" : "text-red-500"}>{c.aderencia}%</span>}
                    </td>
                  </tr>
                ))}
                {!(d?.aderenciaCliente?.length) && <tr><td className="py-6 text-center text-gray-400">Sem dados no período.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
