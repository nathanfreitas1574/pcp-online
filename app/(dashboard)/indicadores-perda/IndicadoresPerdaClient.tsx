"use client"

import { useState, useEffect, useCallback } from "react"
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts"
import { TrendingDown, ChevronDown, ChevronUp, Pencil } from "lucide-react"

const MES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const OK = "#16a34a", RUIM = "#dc2626", META = "#f59e0b"
const pct = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`)
const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })

type Mes = { mes: number; base: number; perda: number; s1: number; s2: number; s3: number; s4: number; s5: number; perdaEfetiva: number; resultado: number | null; obs: string | null }
type Indicador = { tipo: string; titulo: string; subtitulo: string; labelBase: string; labelPerda: string; usaSemanas: boolean; meta: number; meses: Mes[]; ytd: { base: number; perda: number; pct: number | null } }

const INP = "w-full text-xs border border-gray-200 rounded px-1 py-1 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"

export default function IndicadoresPerdaClient() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [inds, setInds] = useState<Indicador[]>([])
  const [loading, setLoading] = useState(true)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/indicadores-perda?ano=${ano}`)
    const d = await r.json()
    setInds(d.indicadores ?? [])
    setLoading(false)
  }, [ano])
  useEffect(() => { carregar() }, [carregar])

  async function salvarCelula(tipo: string, mes: number, campo: string, valor: string) {
    await fetch("/api/indicadores-perda", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ano, tipo, mes, campo, valor }) }).catch(() => {})
    carregar()
  }
  async function salvarMeta(tipo: string, valor: string) {
    await fetch("/api/indicadores-perda", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ano, tipo, meta: valor }) }).catch(() => {})
    carregar()
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center"><TrendingDown className="text-red-600" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Indicadores de Perda</h1>
            <p className="text-sm text-gray-500">Quebra de embalagens, quebra de aditivo e geração de varredura — % mensal vs meta, YTD ponderado</p>
          </div>
        </div>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
          {[ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}

      <div className="space-y-5">
        {inds.map((ind) => {
          const aberto = abertos[ind.tipo] ?? false
          const dentro = ind.ytd.pct != null && ind.ytd.pct <= ind.meta
          const chartData = ind.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], resultado: m.resultado, base: m.base, perda: m.perdaEfetiva, meta: ind.meta }))
          return (
            <div key={ind.tipo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* cabeçalho */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-gray-800">{ind.titulo}</h3>
                  <p className="text-xs text-gray-500">{ind.subtitulo}</p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1 text-gray-500">Meta (%):
                    <input type="number" step="0.01" min="0" defaultValue={ind.meta} onBlur={(e) => { if (Number(e.target.value) !== ind.meta) salvarMeta(ind.tipo, e.target.value) }}
                      className="w-16 text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" title="Meta parametrizável" />
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1"><TrendingDown size={12} /> Menor é melhor</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${dentro ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    YTD {pct(ind.ytd.pct)} · {dentro ? "dentro da meta" : "fora da meta"}
                  </span>
                </div>
              </div>

              {/* gráfico % vs meta */}
              <div className="p-4">
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={chartData} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<TipTip ind={ind} />} />
                    <ReferenceLine y={ind.meta} stroke={META} strokeDasharray="5 4" label={{ value: `Meta ${ind.meta}%`, fontSize: 10, fill: META, position: "right" }} />
                    <Bar dataKey="resultado" name="Resultado (%)" radius={[3, 3, 0, 0]} maxBarSize={30}>
                      {chartData.map((c, i) => <Cell key={i} fill={c.resultado != null && c.resultado > ind.meta ? RUIM : OK} />)}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* botão expandir tabela de lançamento */}
              <div className="px-4 pb-3">
                <button onClick={() => setAbertos((p) => ({ ...p, [ind.tipo]: !aberto }))}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                  <Pencil size={13} /> {aberto ? "Ocultar lançamento" : "Lançar volumes"} {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* tabela editável (recolhível) */}
              {aberto && (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 min-w-[180px]">Recurso</th>
                        {MES_LBL.map((m) => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                        <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD/Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {/* base (movimentado) */}
                      <LinhaNum ind={ind} label={ind.labelBase} campo="base" salvar={salvarCelula} valorTotal={fmt(ind.ytd.base)} />
                      {/* perda: varredura por semanas, senão direto */}
                      {ind.usaSemanas ? (
                        <>
                          {(["s1", "s2", "s3", "s4", "s5"] as const).map((s, i) => (
                            <LinhaNum key={s} ind={ind} label={`Varredura Semana ${i + 1}`} campo={s} salvar={salvarCelula} valorTotal="" indent />
                          ))}
                          <tr className="bg-amber-50/40 font-semibold">
                            <td className="text-left px-3 py-1.5 text-gray-700 sticky left-0 bg-amber-50/40">Varredura gerada (Σ semanas)</td>
                            {ind.meses.map((m) => <td key={m.mes} className="text-right px-2 py-1.5 tabular-nums text-gray-700">{m.perdaEfetiva ? fmt(m.perdaEfetiva) : "—"}</td>)}
                            <td className="text-right px-3 py-1.5 tabular-nums font-bold bg-amber-50">{fmt(ind.ytd.perda)}</td>
                          </tr>
                        </>
                      ) : (
                        <LinhaNum ind={ind} label={ind.labelPerda} campo="perda" salvar={salvarCelula} valorTotal={fmt(ind.ytd.perda)} />
                      )}
                      {/* resultado % (calculado) */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="text-left px-3 py-1.5 text-gray-800 sticky left-0 bg-gray-50">Resultado (%)</td>
                        {ind.meses.map((m) => (
                          <td key={m.mes} className={`text-right px-2 py-1.5 tabular-nums ${m.resultado == null ? "text-gray-300" : m.resultado > ind.meta ? "text-red-600" : "text-green-700"}`}>{pct(m.resultado)}</td>
                        ))}
                        <td className={`text-right px-3 py-1.5 tabular-nums font-bold bg-blue-50 ${dentro ? "text-green-700" : "text-red-600"}`}>{pct(ind.ytd.pct)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-[11px] text-gray-400">YTD ponderado = Σ perda ÷ Σ movimentado × 100 (não é média dos %). Meta é parametrizável no cabeçalho.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LinhaNum({ ind, label, campo, salvar, valorTotal, indent }: { ind: Indicador; label: string; campo: "base" | "perda" | "s1" | "s2" | "s3" | "s4" | "s5"; salvar: (t: string, m: number, c: string, v: string) => void; valorTotal: string; indent?: boolean }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className={`text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white ${indent ? "pl-6 text-gray-500" : ""}`}>{label}</td>
      {ind.meses.map((m) => (
        <td key={m.mes} className="px-1 py-1">
          <input type="number" min="0" step="0.01" defaultValue={(m[campo] as number) || ""} placeholder="0"
            onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== (m[campo] as number)) salvar(ind.tipo, m.mes, campo, e.target.value) }}
            className={INP} />
        </td>
      ))}
      <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{valorTotal}</td>
    </tr>
  )
}

// tooltip: movimentado / quebrado / resultado / meta / status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipTip({ active, payload, label, ind }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { base: number; perda: number; resultado: number | null }
  const dentro = d.resultado == null || d.resultado <= ind.meta
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-bold text-gray-800 mb-1">{label}</p>
      <p className="text-gray-600">{ind.labelBase}: <strong>{fmt(d.base)}</strong></p>
      <p className="text-gray-600">{ind.usaSemanas ? "Varredura gerada" : ind.labelPerda}: <strong>{fmt(d.perda)}</strong></p>
      <p className="text-gray-600">Resultado: <strong>{pct(d.resultado)}</strong></p>
      <p className="text-gray-600">Meta: <strong>{ind.meta}%</strong></p>
      <p className={`font-semibold mt-0.5 ${dentro ? "text-green-700" : "text-red-600"}`}>{dentro ? "✓ Dentro da meta" : "✕ Fora da meta"}</p>
    </div>
  )
}
