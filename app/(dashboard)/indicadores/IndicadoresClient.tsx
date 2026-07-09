"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Gauge, Upload, X, TrendingUp, TrendingDown, Pencil, ChevronDown, ChevronUp, Plus } from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const
const MES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
// paleta padrão dos indicadores — azul Fertalvo primeiro
const CORES = ["#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6"]
const COR_META = "#dc2626"

type Ind = {
  id: string; ano: number; area: string; indicador: string; recursoMedido: string
  meta: number | null; unidade: string | null; sentidoIdeal: string | null; desdobramento: string | null
  obs: string | null
  jan: number; fev: number; mar: number; abr: number; mai: number; jun: number
  jul: number; ago: number; set: number; out: number; nov: number; dez: number
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
const ehMetaRow = (r: Ind) => /\bmeta\b/i.test(r.recursoMedido)
const INP = "w-full text-xs border border-gray-200 rounded px-1 py-1 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

export default function IndicadoresClient() {
  const [itens, setItens] = useState<Ind[]>([])
  const [anos, setAnos] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [area, setArea] = useState("PCP")
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState("")
  const [abertos, setAbertos] = useState<Record<string, boolean>>({}) // tabela de lançamento por indicador
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

  // lançamento inline (célula mês) — otimista + PATCH
  async function salvarMes(id: string, mes: typeof MESES[number], valor: string) {
    const v = Number(valor) || 0
    setItens((prev) => prev.map((r) => (r.id === id ? { ...r, [mes]: v } : r)))
    await fetch(`/api/indicadores/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [mes]: v }) }).catch(() => {})
  }
  // cria a linha de META MENSAL do indicador (valores digitáveis mês a mês)
  async function criarLinhaMeta(indicador: string, metaFixa: number | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { ano, area, indicador, recursoMedido: "Meta mensal", ordem: 99 }
    if (metaFixa != null) for (const m of MESES) body[m] = metaFixa // pré-preenche com a meta fixa, se houver
    await fetch("/api/indicadores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {})
    await carregar()
    setAbertos((p) => ({ ...p, [indicador]: true }))
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
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center"><Gauge className="text-blue-700" size={22} /></div>
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
          const numericos = rows.filter(r => !/observ/i.test(r.recursoMedido) && !ehMetaRow(r))
          const metaRow = rows.find(ehMetaRow) ?? null // linha de meta MENSAL (digitável)
          const obs = rows.find(r => /observ/i.test(r.recursoMedido))?.obs
          const meta = numericos.find(r => r.meta != null)?.meta ?? null
          const sentido = numericos[0]?.sentidoIdeal
          const unidade = numericos[0]?.unidade
          const aberto = abertos[indicador] ?? false

          // 12 meses + colunas finais Total e YTD (docx item 1)
          const chartData: Record<string, string | number | null>[] = MES_LBL.map((lbl, i) => {
            const o: Record<string, string | number | null> = { mes: lbl }
            numericos.forEach(r => { o[r.recursoMedido] = Math.round((r[MESES[i]] || 0) * 100) / 100 })
            if (metaRow) o["Meta mensal"] = Math.round((metaRow[MESES[i]] || 0) * 100) / 100
            return o
          })
          const colTotal: Record<string, string | number | null> = { mes: "Total" }
          const colYtd: Record<string, string | number | null> = { mes: "YTD" }
          numericos.forEach(r => { colTotal[r.recursoMedido] = Math.round(total(r) * 100) / 100; colYtd[r.recursoMedido] = Math.round(ytd(r) * 100) / 100 })
          if (metaRow) { colTotal["Meta mensal"] = null; colYtd["Meta mensal"] = null } // meta não soma
          chartData.push(colTotal, colYtd)

          const linhas = [...numericos, ...(metaRow ? [metaRow] : [])]
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

              {/* Gráfico: meses + Total + YTD; meta mensal como linha */}
              {numericos.length > 0 && (
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={230}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) : v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {numericos.map((r, i) => <Bar key={r.id} dataKey={r.recursoMedido} fill={CORES[i % CORES.length]} radius={[3, 3, 0, 0]} maxBarSize={26} />)}
                      {metaRow && <Line dataKey="Meta mensal" stroke={COR_META} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2 }} connectNulls={false} />}
                      {!metaRow && meta != null && <ReferenceLine y={meta} stroke={COR_META} strokeDasharray="5 4" label={{ value: "Meta", fontSize: 10, fill: COR_META, position: "right" }} />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Lançamento: tabela recolhível (docx: “meio que oculta, expande p/ lançar”) */}
              <div className="px-4 pb-3 flex items-center gap-2">
                <button onClick={() => setAbertos((p) => ({ ...p, [indicador]: !aberto }))}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                  <Pencil size={13} /> {aberto ? "Ocultar lançamento" : "Lançar volumes"} {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {!metaRow && (
                  <button onClick={() => criarLinhaMeta(indicador, meta)}
                    className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50" title="Cria a linha de meta mensal (digitável mês a mês)">
                    <Plus size={13} /> Linha de meta mensal
                  </button>
                )}
              </div>

              {aberto && (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 min-w-[150px]">Recurso</th>
                        {MES_LBL.map(m => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                        <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD</th>
                        <th className="text-right px-3 py-2 font-semibold bg-gray-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {linhas.map(r => {
                        const metaLinha = ehMetaRow(r)
                        return (
                          <tr key={r.id} className={metaLinha ? "bg-red-50/40" : "hover:bg-gray-50"}>
                            <td className={`text-left px-3 py-1 font-medium sticky left-0 ${metaLinha ? "text-red-700 bg-red-50/40" : "text-gray-700 bg-white"}`}>{r.recursoMedido}</td>
                            {MESES.map((m) => (
                              <td key={m} className="px-1 py-1">
                                <input type="number" step="0.01" defaultValue={r[m] || ""} placeholder="0"
                                  onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r[m]) salvarMes(r.id, m, e.target.value) }}
                                  className={`${INP} ${metaLinha ? "border-red-200 text-red-700" : ""}`} />
                              </td>
                            ))}
                            <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{metaLinha ? "—" : fmt(ytd(r))}</td>
                            <td className="text-right px-3 py-1 tabular-nums font-bold bg-gray-50">{metaLinha ? "—" : fmt(total(r))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-[11px] text-gray-400">Valores salvam ao sair da célula. A linha vermelha é a <strong>meta mensal</strong> (digitável); YTD considera até o mês atual.</p>
                </div>
              )}
              {obs && <p className="px-5 py-2 text-xs text-gray-500 border-t border-gray-100"><strong>Obs:</strong> {obs}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
