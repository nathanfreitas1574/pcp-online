"use client"

import { useState, useEffect, useCallback } from "react"
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from "recharts"
import { TrendingDown, ChevronDown, ChevronUp, Pencil, Gauge, CheckCircle2, XCircle, MinusCircle } from "lucide-react"

const MES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const OK = "#16a34a", RUIM = "#dc2626", META = "#f59e0b"
const pct = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`)
const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })

type Mes = { mes: number; base: number; perda: number; s1: number; s2: number; s3: number; s4: number; s5: number; perdaEfetiva: number; resultado: number | null; obs: string | null }
type Indicador = { tipo: string; titulo: string; subtitulo: string; labelBase: string; labelPerda: string; usaSemanas: boolean; meta: number; meses: Mes[]; ytd: { base: number; perda: number; pct: number | null } }
type TolMes = { mes: number; veiculos: number; retorno: number; metaMensal: number; kpi: number | null; obs: string | null }
type Tolerancia = { metaKg: number; meses: TolMes[]; ytd: { meta: number; retorno: number; kpi: number | null } }
type ViraMes = { mes: number; gasto: number; retorno: number; saldo: number; atingimento: number | null; dentro: boolean | null; economia: number | null; obs: string | null }
type Vira = { meta: number; meses: ViraMes[]; ytd: { gasto: number; retorno: number; saldo: number } }
type BalMes = { mes: number; recebido: number; bigbag: number; granel: number; acabado: number; expedido: number; quebraGerada: number; varredura: number; saldoSeguranca: number; consumo: number | null; obs: string | null }
type Balanco = { pctQuebraTecnica: number; meses: BalMes[]; ytd: { recebido: number; expedido: number; quebraGerada: number; varredura: number; saldoSeguranca: number } }
const fmtR$ = (n: number) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const INP = "w-full text-xs border border-gray-200 rounded px-1 py-1 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"

export default function IndicadoresPerdaClient() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [inds, setInds] = useState<Indicador[]>([])
  const [tol, setTol] = useState<Tolerancia | null>(null)
  const [vira, setVira] = useState<Vira | null>(null)
  const [bal, setBal] = useState<Balanco | null>(null)
  const [loading, setLoading] = useState(true)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/indicadores-perda?ano=${ano}`)
    const d = await r.json()
    setInds(d.indicadores ?? [])
    setTol(d.tolerancia ?? null)
    setVira(d.vira ?? null)
    setBal(d.balanco ?? null)
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
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center"><Gauge className="text-blue-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">KPI PCP</h1>
            <p className="text-sm text-gray-500">Painel gerencial — metas, resultados e faróis dos indicadores do PCP</p>
          </div>
        </div>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
          {[ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}

      {/* ── Resumo executivo: farol de cada KPI (YTD × meta) — clique desce ao indicador ── */}
      {!loading && inds.length > 0 && (() => {
        const rotulo: Record<string, string> = { EMBALAGEM: "Quebra Embalagens", ADITIVO: "Quebra Aditivo", VARREDURA: "Varredura" }
        const ultimoVira = vira ? [...vira.meses].reverse().find((m) => m.dentro != null) : null
        const resumo: { id: string; titulo: string; valor: string; meta: string; ok: boolean | null }[] = [
          ...inds.map((i) => ({
            id: i.tipo, titulo: rotulo[i.tipo] ?? i.tipo,
            valor: pct(i.ytd.pct), meta: `meta ${i.meta}%`,
            ok: i.ytd.pct == null ? null : i.ytd.pct <= i.meta,
          })),
          ...(tol ? [{
            id: "TOLERANCIA", titulo: "Tolerância Carreg.",
            valor: tol.ytd.kpi == null ? "—" : `${tol.ytd.kpi.toLocaleString("pt-BR")}%`, meta: "meta ≥ 100%",
            ok: tol.ytd.kpi == null ? null : tol.ytd.kpi >= 100,
          }] : []),
          ...(vira ? [{
            id: "VIRA", titulo: "Custo Vira Interno",
            valor: ultimoVira ? fmtR$(ultimoVira.saldo) : "—", meta: `meta ≤ ${fmtR$(vira.meta)}/mês`,
            ok: ultimoVira ? ultimoVira.dentro : null,
          }] : []),
          ...(bal ? [{
            id: "BALANCO", titulo: "Saldo de Segurança",
            valor: bal.ytd.quebraGerada || bal.ytd.varredura ? `${bal.ytd.saldoSeguranca >= 0 ? "+" : ""}${fmt(bal.ytd.saldoSeguranca)} t` : "—", meta: "meta ≥ 0 t",
            ok: bal.ytd.quebraGerada || bal.ytd.varredura ? bal.ytd.saldoSeguranca >= 0 : null,
          }] : []),
        ]
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
            {resumo.map((r) => (
              <button key={r.id} onClick={() => document.getElementById(`kpi-${r.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className={`text-left bg-white rounded-xl border shadow-sm p-3 transition hover:shadow-md border-l-4 ${r.ok == null ? "border-gray-200 border-l-gray-300" : r.ok ? "border-green-100 border-l-green-500" : "border-red-100 border-l-red-500"}`}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] text-gray-500 leading-tight">{r.titulo}</p>
                  {r.ok == null ? <MinusCircle size={15} className="text-gray-300 shrink-0" /> : r.ok ? <CheckCircle2 size={15} className="text-green-600 shrink-0" /> : <XCircle size={15} className="text-red-500 shrink-0" />}
                </div>
                <p className={`text-lg font-bold leading-tight mt-0.5 ${r.ok == null ? "text-gray-400" : r.ok ? "text-green-700" : "text-red-600"}`}>{r.valor}</p>
                <p className="text-[10px] text-gray-400">{r.meta}{r.ok != null && <span className={`ml-1 font-semibold ${r.ok ? "text-green-600" : "text-red-500"}`}>· {r.ok ? "no alvo" : "fora"}</span>}</p>
              </button>
            ))}
          </div>
        )
      })()}

      <div className="space-y-5">
        {inds.map((ind) => {
          const aberto = abertos[ind.tipo] ?? false
          const dentro = ind.ytd.pct != null && ind.ytd.pct <= ind.meta
          const chartData = ind.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], resultado: m.resultado, base: m.base, perda: m.perdaEfetiva, meta: ind.meta }))
          return (
            <div key={ind.tipo} id={`kpi-${ind.tipo}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-4">
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
                      <LabelList dataKey="resultado" position="top" style={{ fontSize: 9, fill: "#6b7280" }}
                        formatter={(v: string | number | boolean | null | undefined) => (v == null || v === "" ? "" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`)} />
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

        {/* ── 4. Controle de Tolerância de Carregamento (maior é melhor) ── */}
        {tol && (
          <div id="kpi-TOLERANCIA" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-gray-800">Controle de Tolerância de Carregamento</h3>
                <p className="text-xs text-gray-500">Meta mensal = veículos carregados × meta (kg) ÷ 1.000 · Resultado = retorno na pesagem</p>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-gray-500">Meta (kg/veículo):
                  <input type="number" step="1" min="0" defaultValue={tol.metaKg} onBlur={(e) => { if (Number(e.target.value) !== tol.metaKg) salvarMeta("TOLERANCIA", e.target.value) }}
                    className="w-16 text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </span>
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">Maior é melhor</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${tol.ytd.kpi != null && tol.ytd.kpi >= 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  YTD {tol.ytd.kpi == null ? "—" : `${tol.ytd.kpi.toLocaleString("pt-BR")}%`} · {fmt(tol.ytd.retorno)} / {fmt(tol.ytd.meta)} t
                </span>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={tol.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], "Meta mensal": m.metaMensal || null, "Retorno na pesagem": m.retorno || null, kpi: m.kpi }))} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? `${fmt(v)} t` : v)} />
                  <Bar dataKey="Meta mensal" fill="#1d4ed8" radius={[3, 3, 0, 0]} maxBarSize={26}>
                    <LabelList dataKey="Meta mensal" position="top" style={{ fontSize: 9, fill: "#1d4ed8" }}
                      formatter={(v: string | number | boolean | null | undefined) => (v ? fmt(Number(v)) : "")} />
                  </Bar>
                  <Bar dataKey="Retorno na pesagem" radius={[3, 3, 0, 0]} maxBarSize={26}>
                    {tol.meses.map((m, i) => <Cell key={i} fill={m.kpi != null && m.kpi >= 100 ? OK : "#f59e0b"} />)}
                    <LabelList dataKey="Retorno na pesagem" position="top" style={{ fontSize: 9, fill: "#374151" }}
                      formatter={(v: string | number | boolean | null | undefined) => (v ? fmt(Number(v)) : "")} />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => setAbertos((p) => ({ ...p, TOLERANCIA: !(p.TOLERANCIA ?? false) }))}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                <Pencil size={13} /> {abertos.TOLERANCIA ? "Ocultar lançamento" : "Lançar volumes"} {abertos.TOLERANCIA ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            {abertos.TOLERANCIA && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 min-w-[170px]">Recurso</th>
                      {MES_LBL.map((m) => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                      <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white">Veículos carregados (qtd)</td>
                      {tol.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input type="number" min="0" defaultValue={m.veiculos || ""} placeholder="0" onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== m.veiculos) salvarCelula("TOLERANCIA", m.mes, "base", e.target.value) }} className={INP} /></td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{fmt(tol.meses.reduce((s, m) => s + m.veiculos, 0))}</td>
                    </tr>
                    <tr className="bg-blue-50/30">
                      <td className="text-left px-3 py-1 font-medium text-blue-800 sticky left-0 bg-blue-50/30">Meta mensal (t) — automática</td>
                      {tol.meses.map((m) => <td key={m.mes} className="text-right px-2 py-1 tabular-nums text-blue-800">{m.metaMensal ? fmt(m.metaMensal) : "—"}</td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-bold bg-blue-50">{fmt(tol.ytd.meta)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white">Retorno na pesagem (t)</td>
                      {tol.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input type="number" min="0" step="0.01" defaultValue={m.retorno || ""} placeholder="0" onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== m.retorno) salvarCelula("TOLERANCIA", m.mes, "perda", e.target.value) }} className={INP} /></td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{fmt(tol.ytd.retorno)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="text-left px-3 py-1 text-gray-800 sticky left-0 bg-gray-50">KPI (%) — retorno ÷ meta</td>
                      {tol.meses.map((m) => <td key={m.mes} className={`text-right px-2 py-1 tabular-nums ${m.kpi == null ? "text-gray-300" : m.kpi >= 100 ? "text-green-700" : "text-amber-600"}`}>{m.kpi == null ? "—" : `${m.kpi.toLocaleString("pt-BR")}%`}</td>)}
                      <td className={`text-right px-3 py-1 tabular-nums font-bold bg-blue-50 ${tol.ytd.kpi != null && tol.ytd.kpi >= 100 ? "text-green-700" : "text-amber-600"}`}>{tol.ytd.kpi == null ? "—" : `${tol.ytd.kpi.toLocaleString("pt-BR")}%`}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[11px] text-gray-400">Meta acumulada = soma das metas mensais (a meta muda conforme os veículos do mês). KPI acumulado = retorno acumulado ÷ meta acumulada.</p>
              </div>
            )}
          </div>
        )}

        {/* ── 5. Controle de Custo do Vira Interno (menor gasto líquido é melhor) ── */}
        {vira && (
          <div id="kpi-VIRA" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-gray-800">Controle de Custo do Vira Interno</h3>
                <p className="text-xs text-gray-500">Custo mensal, retorno cobrado do cliente e saldo líquido da movimentação interna</p>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-gray-500">Meta mensal (R$):
                  <input type="number" step="500" min="0" defaultValue={vira.meta} onBlur={(e) => { if (Number(e.target.value) !== vira.meta) salvarMeta("VIRA", e.target.value) }}
                    className="w-24 text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Saldo líquido = gasto − retorno</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${vira.ytd.saldo <= vira.meta * 12 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  YTD saldo {fmtR$(vira.ytd.saldo)}
                </span>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={vira.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], "Gasto realizado": m.gasto || null, "Retorno cobrado": m.retorno || null, "Saldo líquido": m.gasto || m.retorno ? m.saldo : null }))} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? fmtR$(v) : v)} />
                  <ReferenceLine y={vira.meta} stroke={META} strokeDasharray="5 4" label={{ value: `Meta ${fmtR$(vira.meta)}`, fontSize: 10, fill: META, position: "right" }} />
                  <Bar dataKey="Gasto realizado" fill="#64748b" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Retorno cobrado" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Saldo líquido" radius={[3, 3, 0, 0]} maxBarSize={22}>
                    {vira.meses.map((m, i) => <Cell key={i} fill={m.dentro === false ? RUIM : OK} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => setAbertos((p) => ({ ...p, VIRA: !(p.VIRA ?? false) }))}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                <Pencil size={13} /> {abertos.VIRA ? "Ocultar lançamento" : "Lançar valores"} {abertos.VIRA ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            {abertos.VIRA && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 min-w-[170px]">Recurso</th>
                      {MES_LBL.map((m) => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                      <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white">Gasto realizado (R$)</td>
                      {vira.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input type="number" min="0" step="100" defaultValue={m.gasto || ""} placeholder="0" onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== m.gasto) salvarCelula("VIRA", m.mes, "base", e.target.value) }} className={INP} /></td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{fmtR$(vira.ytd.gasto)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white">Retorno cobrado (R$)</td>
                      {vira.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input type="number" min="0" step="100" defaultValue={m.retorno || ""} placeholder="0" onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== m.retorno) salvarCelula("VIRA", m.mes, "perda", e.target.value) }} className={INP} /></td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{fmtR$(vira.ytd.retorno)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="text-left px-3 py-1 text-gray-800 sticky left-0 bg-gray-50">Saldo líquido (R$)</td>
                      {vira.meses.map((m) => <td key={m.mes} className={`text-right px-2 py-1 tabular-nums ${m.dentro == null ? "text-gray-300" : m.dentro ? "text-green-700" : "text-red-600"}`}>{m.dentro == null ? "—" : fmtR$(m.saldo)}</td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-bold bg-blue-50">{fmtR$(vira.ytd.saldo)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-600 sticky left-0 bg-gray-50">Atingimento da meta (%)</td>
                      {vira.meses.map((m) => <td key={m.mes} className={`text-right px-2 py-1 tabular-nums ${m.atingimento == null ? "text-gray-300" : m.dentro ? "text-green-700" : "text-red-600"}`}>{m.atingimento == null ? "—" : `${m.atingimento.toLocaleString("pt-BR")}%`}</td>)}
                      <td className="text-right px-3 py-1 text-gray-300">—</td>
                    </tr>
                    <tr>
                      <td className="text-left px-3 py-1 font-medium text-gray-600 sticky left-0 bg-white">Observação do mês</td>
                      {vira.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input defaultValue={m.obs ?? ""} placeholder="justificativa…" title={m.obs ?? ""} onBlur={(e) => { if (e.target.value !== (m.obs ?? "")) salvarCelula("VIRA", m.mes, "obs", e.target.value) }} className="w-full text-[10px] border border-gray-200 rounded px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" /></td>)}
                      <td />
                    </tr>
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[11px] text-gray-400">Dentro da meta: saldo líquido ≤ meta mensal. Observação p/ justificar (movimentação cobrada, retrabalho, bloqueio de box, reorganização…).</p>
              </div>
            )}
          </div>
        )}

        {/* ── 7. Balanço Operacional (recebido → quebra técnica → varredura → saldo de segurança → expedição) ── */}
        {bal && (
          <div id="kpi-BALANCO" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-gray-800">Balanço Operacional — Movimentação Geral</h3>
                <p className="text-xs text-gray-500">Recebido → quebra técnica gerada → varredura → saldo de segurança → expedição (Big Bag · Granel · Prod. Acabado)</p>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-gray-500">% quebra técnica:
                  <input type="number" step="0.05" min="0" defaultValue={bal.pctQuebraTecnica} onBlur={(e) => { if (Number(e.target.value) !== bal.pctQuebraTecnica) salvarMeta("BALANCO", e.target.value) }}
                    className="w-16 text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" title="Percentual parametrizável aplicado ao volume recebido" />
                </span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${bal.ytd.saldoSeguranca >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  Saldo de Segurança YTD {bal.ytd.saldoSeguranca >= 0 ? "+" : ""}{fmt(bal.ytd.saldoSeguranca)} t
                </span>
              </div>
            </div>
            {/* cabeçalho com números do ano */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-4 pt-3">
              {[
                { l: "Recebido", v: `${fmt(bal.ytd.recebido)} t`, c: "text-blue-700" },
                { l: "Expedido", v: `${fmt(bal.ytd.expedido)} t`, c: "text-gray-700" },
                { l: "Quebra técnica gerada", v: `${fmt(bal.ytd.quebraGerada)} t`, c: "text-amber-600" },
                { l: "Varredura gerada", v: `${fmt(bal.ytd.varredura)} t`, c: "text-orange-600" },
                { l: "Saldo de segurança", v: `${bal.ytd.saldoSeguranca >= 0 ? "+" : ""}${fmt(bal.ytd.saldoSeguranca)} t`, c: bal.ytd.saldoSeguranca >= 0 ? "text-green-700" : "text-red-600" },
              ].map((k) => (
                <div key={k.l} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 leading-tight">{k.l}</p>
                  <p className={`text-sm font-bold ${k.c}`}>{k.v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Quebra técnica × Varredura × Saldo de segurança (t)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={bal.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], "Quebra gerada": m.quebraGerada || null, Varredura: m.varredura || null, Saldo: m.quebraGerada || m.varredura ? m.saldoSeguranca : null }))} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => (typeof v === "number" ? `${fmt(v)} t` : v)} />
                    <Bar dataKey="Quebra gerada" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Varredura" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Saldo" radius={[3, 3, 0, 0]} maxBarSize={20}>
                      {bal.meses.map((m, i) => <Cell key={i} fill={m.saldoSeguranca >= 0 ? OK : RUIM} />)}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Movimentação: Recebido × Expedido (composição da expedição)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={bal.meses.map((m) => ({ mes: MES_LBL[m.mes - 1], Recebido: m.recebido || null, "Big Bag": m.bigbag || null, Granel: m.granel || null, "Prod. Acabado": m.acabado || null }))} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => (typeof v === "number" ? `${fmt(v)} t` : v)} />
                    <Bar dataKey="Recebido" fill="#1d4ed8" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Big Bag" stackId="exp" fill="#22c55e" maxBarSize={18} />
                    <Bar dataKey="Granel" stackId="exp" fill="#eab308" maxBarSize={18} />
                    <Bar dataKey="Prod. Acabado" stackId="exp" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => setAbertos((p) => ({ ...p, BALANCO: !(p.BALANCO ?? false) }))}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                <Pencil size={13} /> {abertos.BALANCO ? "Ocultar lançamento" : "Lançar volumes"} {abertos.BALANCO ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            {abertos.BALANCO && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 min-w-[190px]">Recurso</th>
                      {MES_LBL.map((m) => <th key={m} className="text-right px-2 py-2 font-semibold">{m}</th>)}
                      <th className="text-right px-3 py-2 font-semibold bg-blue-50 text-blue-700">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {([
                      { label: "Volume recebido (t)", campo: "base" as const, get: (m: BalMes) => m.recebido, tot: bal.ytd.recebido },
                      { label: "Expedição Big Bag (t)", campo: "s1" as const, get: (m: BalMes) => m.bigbag, tot: null },
                      { label: "Expedição Granel (t)", campo: "s2" as const, get: (m: BalMes) => m.granel, tot: null },
                      { label: "Expedição Prod. Acabado (t)", campo: "s3" as const, get: (m: BalMes) => m.acabado, tot: null },
                    ]).map((linha) => (
                      <tr key={linha.campo} className="hover:bg-gray-50">
                        <td className="text-left px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white">{linha.label}</td>
                        {bal.meses.map((m) => <td key={m.mes} className="px-1 py-1"><input type="number" min="0" step="0.01" defaultValue={linha.get(m) || ""} placeholder="0" onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== linha.get(m)) salvarCelula("BALANCO", m.mes, linha.campo, e.target.value) }} className={INP} /></td>)}
                        <td className="text-right px-3 py-1 tabular-nums font-semibold bg-blue-50/50 text-blue-700">{linha.tot != null ? fmt(linha.tot) : fmt(bal.meses.reduce((s, m) => s + linha.get(m), 0))}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50/40">
                      <td className="text-left px-3 py-1 font-medium text-amber-700 sticky left-0 bg-amber-50/40">Quebra técnica gerada (t) — auto</td>
                      {bal.meses.map((m) => <td key={m.mes} className="text-right px-2 py-1 tabular-nums text-amber-700">{m.quebraGerada ? fmt(m.quebraGerada) : "—"}</td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-bold bg-amber-50">{fmt(bal.ytd.quebraGerada)}</td>
                    </tr>
                    <tr className="bg-orange-50/40">
                      <td className="text-left px-3 py-1 font-medium text-orange-700 sticky left-0 bg-orange-50/40">Varredura gerada (t) — do indicador</td>
                      {bal.meses.map((m) => <td key={m.mes} className="text-right px-2 py-1 tabular-nums text-orange-700">{m.varredura ? fmt(m.varredura) : "—"}</td>)}
                      <td className="text-right px-3 py-1 tabular-nums font-bold bg-orange-50">{fmt(bal.ytd.varredura)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="text-left px-3 py-1 text-gray-800 sticky left-0 bg-gray-50">Saldo de segurança (t)</td>
                      {bal.meses.map((m) => <td key={m.mes} className={`text-right px-2 py-1 tabular-nums ${!m.quebraGerada && !m.varredura ? "text-gray-300" : m.saldoSeguranca >= 0 ? "text-green-700" : "text-red-600"}`}>{!m.quebraGerada && !m.varredura ? "—" : `${m.saldoSeguranca >= 0 ? "+" : ""}${fmt(m.saldoSeguranca)}`}</td>)}
                      <td className={`text-right px-3 py-1 tabular-nums font-bold bg-blue-50 ${bal.ytd.saldoSeguranca >= 0 ? "text-green-700" : "text-red-600"}`}>{bal.ytd.saldoSeguranca >= 0 ? "+" : ""}{fmt(bal.ytd.saldoSeguranca)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="text-left px-3 py-1 font-medium text-gray-600 sticky left-0 bg-gray-50">Consumo da quebra técnica (%)</td>
                      {bal.meses.map((m) => <td key={m.mes} className={`text-right px-2 py-1 tabular-nums ${m.consumo == null ? "text-gray-300" : m.consumo <= 100 ? "text-green-700" : "text-red-600"}`}>{m.consumo == null ? "—" : `${m.consumo.toLocaleString("pt-BR")}%`}</td>)}
                      <td className="text-right px-3 py-1 text-gray-300">—</td>
                    </tr>
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[11px] text-gray-400">Quebra gerada = recebido × % quebra técnica. Varredura vem automática do indicador de Geração de Varredura (não digite 2×). Saldo positivo = margem de segurança; negativo = perda acima da quebra técnica (risco de falta). Consumo ≤ 100% = varredura coberta pela quebra.</p>
              </div>
            )}
          </div>
        )}
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
