"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Gauge, Upload, X, TrendingUp, TrendingDown } from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const
const MES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const CORES = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6"]

type Ind = {
  id: string; ano: number; area: string; indicador: string; recursoMedido: string
  meta: number | null; unidade: string | null; sentidoIdeal: string | null; desdobramento: string | null
  obs: string | null
  jan: number; fev: number; mar: number; abr: number; mai: number; jun: number
  jul: number; ago: number; set: number; out: number; nov: number; dez: number
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })

export default function IndicadoresClient() {
  const [itens, setItens] = useState<Ind[]>([])
  const [anos, setAnos] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [area, setArea] = useState("PCP")
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/indicadores?ano=${ano}&area=${encodeURIComponent(area)}`)
    const d = await r.json()
    setItens(d.itens ?? [])
    if (d.anos?.length) setAnos(d.anos)
    if (d.areas?.length) setAreas(d.areas)
    setLoading(false)
  }, [ano, area])
  useEffect(() => { carregar() }, [carregar])

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file); fd.append("area", area)
    try {
      const r = await fetch("/api/indicadores/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) { setAviso(`✅ ${d.criados} criados, ${d.atualizados} atualizados (${d.ano} · aba "${d.aba}").`); if (d.ano) setAno(d.ano); await carregar() }
      else setAviso(`❌ ${d.error ?? "Falha na importação."}`)
    } catch { setAviso("❌ Erro de rede ao importar.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() + 1 : 12
  const ytd = (r: Ind) => MESES.slice(0, mesAtual).reduce((s, m) => s + (r[m] || 0), 0)
  const total = (r: Ind) => MESES.reduce((s, m) => s + (r[m] || 0), 0)

  // agrupa por indicador
  const grupos = new Map<string, Ind[]>()
  for (const it of itens) { const g = grupos.get(it.indicador) ?? []; g.push(it); grupos.set(it.indicador, g) }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center"><Gauge className="text-emerald-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Indicadores {area}</h1>
            <p className="text-sm text-gray-500">Acompanhamento mensal com meta, YTD e total do ano</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={area} onChange={e => setArea(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
            {[...new Set(["PCP", ...areas])].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
            {[...new Set([ano, ...anos])].sort((a, b) => b - a).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={() => fileRef.current?.click()} disabled={importando} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"><Upload size={15} /> {importando ? "Importando…" : "Importar Excel"}</button>
        </div>
      </div>

      {aviso && (
        <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700"><span className="flex-1">{aviso}</span><button onClick={() => setAviso("")}><X size={15} className="opacity-60 hover:opacity-100" /></button></div>
      )}

      {!loading && grupos.size === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
          <Gauge size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum indicador para {area} / {ano}. Use <strong>Importar Excel</strong> (aba do setor).</p>
        </div>
      )}

      <div className="space-y-5">
        {[...grupos.entries()].map(([indicador, rows]) => {
          const numericos = rows.filter(r => !/observ/i.test(r.recursoMedido))
          const obs = rows.find(r => /observ/i.test(r.recursoMedido))?.obs
          const meta = numericos.find(r => r.meta != null)?.meta ?? null
          const sentido = numericos[0]?.sentidoIdeal
          const unidade = numericos[0]?.unidade
          const chartData = MES_LBL.map((lbl, i) => {
            const o: Record<string, string | number> = { mes: lbl }
            numericos.forEach(r => { o[r.recursoMedido] = Math.round((r[MESES[i]] || 0) * 100) / 100 })
            return o
          })
          return (
            <div key={indicador} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-gray-800">{indicador}</h3>
                  {rows[0]?.desdobramento && <p className="text-xs text-gray-500">{rows[0].desdobramento}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {meta != null && <span className="text-gray-500">Meta: <strong className="text-gray-800">{fmt(meta)}{unidade ? ` ${unidade}` : ""}</strong></span>}
                  {sentido && <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${sentido === "MAIOR" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                    {sentido === "MAIOR" ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {sentido === "MAIOR" ? "Maior melhor" : "Menor melhor"}
                  </span>}
                </div>
              </div>

              {/* Gráfico */}
              {numericos.length > 0 && (
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) : v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {numericos.map((r, i) => <Bar key={r.id} dataKey={r.recursoMedido} fill={CORES[i % CORES.length]} radius={[3, 3, 0, 0]} maxBarSize={26} />)}
                      {meta != null && <ReferenceLine y={meta} stroke="#dc2626" strokeDasharray="5 4" label={{ value: "Meta", fontSize: 10, fill: "#dc2626", position: "right" }} />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabela */}
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50">Recurso</th>
                      {MES_LBL.map(m => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                      <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD</th>
                      <th className="text-right px-3 py-2 font-semibold bg-gray-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {numericos.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="text-left px-3 py-1.5 font-medium text-gray-700 sticky left-0 bg-white">{r.recursoMedido}</td>
                        {MESES.map((m, i) => <td key={m} className={`text-right px-2 py-1.5 tabular-nums ${i < mesAtual ? "text-gray-700" : "text-gray-300"}`}>{r[m] ? fmt(r[m]) : "—"}</td>)}
                        <td className="text-right px-3 py-1.5 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{fmt(ytd(r))}</td>
                        <td className="text-right px-3 py-1.5 tabular-nums font-bold bg-gray-50">{fmt(total(r))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {obs && <p className="px-5 py-2 text-xs text-gray-500 border-t border-gray-100"><strong>Obs:</strong> {obs}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
