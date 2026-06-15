"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Brush, Upload, X, Scale, ArrowUpFromLine, Recycle, Target, Trash2,
} from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

type Semana = {
  id: string; ano: number; mesNum: number; mesLabel: string; semana: string
  medSegundaVarredura: number; medSextaVarredura: number; medSegundaCalcario: number; medSextaCalcario: number
  expedicaoSemana: number; geracaoIntervalo: number; geracaoCalcario: number; geracaoMP: number
  houveExpedicao: boolean; calcarioFisico: number; compraCalcario: number; saldoAcumulado: number
}
type ResumoMes = { ano: number; mesNum: number; mesLabel: string; geracao: number; expedicao: number; saldoFinal: number }

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export default function VarreduraClient() {
  const [itens, setItens] = useState<Semana[]>([])
  const [resumo, setResumo] = useState<ResumoMes[]>([])
  const [totais, setTotais] = useState({ geracao: 0, expedicao: 0, saldoAtual: 0 })
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/varredura")
    const d = await r.json()
    setItens(d.itens ?? [])
    setResumo(d.resumoMensal ?? [])
    setTotais(d.totais ?? { geracao: 0, expedicao: 0, saldoAtual: 0 })
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file)
    try {
      const r = await fetch("/api/varredura/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) { setAviso(`✅ ${d.criados} criadas, ${d.atualizados} atualizadas (aba "${d.aba}").`); await carregar() }
      else setAviso(`❌ ${d.error ?? "Falha na importação."}`)
    } catch { setAviso("❌ Erro de rede ao importar.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function excluir(s: Semana) {
    if (!confirm(`Excluir ${s.semana}/${s.ano}?`)) return
    await fetch(`/api/varredura/${s.id}`, { method: "DELETE" })
    setItens(prev => prev.filter(x => x.id !== s.id))
  }

  const chartData = resumo.map(m => ({
    label: `${MES_ABREV[m.mesNum - 1]}/${String(m.ano).slice(2)}`,
    Geração: Math.round(m.geracao * 10) / 10,
    Expedição: Math.round(m.expedicao * 10) / 10,
    Saldo: Math.round(m.saldoFinal * 10) / 10,
  }))

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-lime-100 rounded-xl flex items-center justify-center">
            <Brush className="text-lime-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Controle de Varredura</h1>
            <p className="text-sm text-gray-500">Calcário/varredura — medição semanal, geração, expedição e saldo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/plano-acao" className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
            <Target size={15} /> Plano de Ação
          </a>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
            <Upload size={15} /> {importando ? "Importando…" : "Importar Excel"}
          </button>
        </div>
      </div>

      {aviso && (
        <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700">
          <span className="flex-1">{aviso}</span><button onClick={() => setAviso("")}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-lime-600 text-xs font-medium mb-1"><Recycle size={14}/> Geração total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.geracao)} <span className="text-sm font-medium text-gray-400">t</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1"><ArrowUpFromLine size={14}/> Expedição total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.expedicao)} <span className="text-sm font-medium text-gray-400">t</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Scale size={14}/> Saldo atual</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.saldoAtual)} <span className="text-sm font-medium text-gray-400">t</span></p>
        </div>
      </div>

      {/* Gráfico mensal */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Geração × Expedição por mês (com saldo acumulado)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) + " t" : v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Geração" fill="#84cc16" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Expedição" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Line type="monotone" dataKey="Saldo" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumo mensal */}
      {resumo.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-700 text-sm">Resumo mensal</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold">Mês</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Geração</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Expedição</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Saldo final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumo.map(m => (
                  <tr key={`${m.ano}-${m.mesNum}`} className="hover:bg-lime-50/30">
                    <td className="px-3 py-2 text-gray-700">{m.mesLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-lime-700 font-semibold">{fmt(m.geracao)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-700 font-semibold">{fmt(m.expedicao)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800">{fmt(m.saldoFinal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Semanas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-700 text-sm">Controle semanal ({itens.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Semana</th>
                <th className="text-left px-3 py-2.5 font-semibold">Mês</th>
                <th className="text-right px-3 py-2.5 font-semibold">Med. Seg</th>
                <th className="text-right px-3 py-2.5 font-semibold">Med. Sex</th>
                <th className="text-right px-3 py-2.5 font-semibold">Geração</th>
                <th className="text-right px-3 py-2.5 font-semibold">Expedição</th>
                <th className="text-center px-3 py-2.5 font-semibold">Exped.?</th>
                <th className="text-right px-3 py-2.5 font-semibold">Saldo</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map(s => (
                <tr key={s.id} className="hover:bg-lime-50/30">
                  <td className="px-3 py-2 font-semibold text-gray-700">{s.semana}</td>
                  <td className="px-3 py-2 text-gray-600">{s.mesLabel}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fmt(s.medSegundaVarredura)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fmt(s.medSextaVarredura)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-lime-700">{fmt(s.geracaoIntervalo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-blue-700">{fmt(s.expedicaoSemana)}</td>
                  <td className="px-3 py-2 text-center">{s.houveExpedicao ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800">{fmt(s.saldoAcumulado)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => excluir(s)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {!loading && itens.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  Nenhuma semana. Use <strong>Importar Excel</strong> (aba "Controle Semanal").
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
