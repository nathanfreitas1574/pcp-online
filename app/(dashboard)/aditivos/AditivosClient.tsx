"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  FlaskConical, Plus, Upload, Save, X, Trash2, Scale, TrendingDown, DollarSign, Search,
} from "lucide-react"

type Aditivo = {
  id: string; cliente: string; produto: string
  fisico: number; contabil: number; custoUnitario: number; observacao: string | null
}
type Totais = { fisico: number; contabil: number; diferenca: number; custoPerda: number }

const fmt = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d })
const fmtR = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const cell = "w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 tabular-nums"
const VAZIO = { cliente: "", produto: "", fisico: "", contabil: "", custoUnitario: "", observacao: "" }

export default function AditivosClient() {
  const [itens, setItens] = useState<Aditivo[]>([])
  const [totais, setTotais] = useState<Totais>({ fisico: 0, contabil: 0, diferenca: 0, custoPerda: 0 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/aditivos")
    const d = await r.json()
    setItens(d.itens ?? [])
    setTotais(d.totais ?? { fisico: 0, contabil: 0, diferenca: 0, custoPerda: 0 })
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // edição inline (físico / contábil / custo) → PATCH on blur
  async function salvarCampo(a: Aditivo, campo: "fisico" | "contabil" | "custoUnitario", valor: string) {
    const num = Number(valor.replace(",", ".")) || 0
    if (num === a[campo]) return
    setItens(prev => prev.map(x => x.id === a.id ? { ...x, [campo]: num } : x))
    await fetch(`/api/aditivos/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: num }) })
    await carregar()
  }

  async function salvarNovo() {
    if (!form.produto.trim()) { setErro("Informe o produto."); return }
    setSalvando(true); setErro("")
    const r = await fetch("/api/aditivos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSalvando(false)
    if (r.ok) { setForm(null); await carregar() }
    else { const d = await r.json().catch(() => ({})); setErro(d.error ?? "Erro ao salvar.") }
  }

  async function excluir(a: Aditivo) {
    if (!confirm(`Excluir ${a.cliente} ${a.produto}?`)) return
    await fetch(`/api/aditivos/${a.id}`, { method: "DELETE" })
    setItens(prev => prev.filter(x => x.id !== a.id))
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file)
    try {
      const r = await fetch("/api/aditivos/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) { setAviso(`✅ ${d.criados} criados, ${d.atualizados} atualizados (aba "${d.aba}").`); await carregar() }
      else setAviso(`❌ ${d.error ?? "Falha na importação."}`)
    } catch { setAviso("❌ Erro de rede ao importar.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const filtradas = itens.filter(a => !busca || `${a.cliente} ${a.produto}`.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-cyan-100 rounded-xl flex items-center justify-center">
            <FlaskConical className="text-cyan-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Controle de Aditivos</h1>
            <p className="text-sm text-gray-500">Físico × Contábil dos aditivos (armazém 20) + custo de perda</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
            <Upload size={15} /> {importando ? "Importando…" : "Importar Excel"}
          </button>
          <button onClick={() => { setForm({ ...VAZIO }); setErro("") }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
            <Plus size={16} /> Novo aditivo
          </button>
        </div>
      </div>

      {aviso && (
        <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700">
          <span className="flex-1">{aviso}</span><button onClick={() => setAviso("")}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Scale size={14}/> Físico total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.fisico)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1"><Scale size={14}/> Contábil total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.contabil)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><TrendingDown size={14}/> Diferença total</div>
          <p className={`text-2xl font-bold ${totais.diferenca < 0 ? "text-red-600" : "text-green-600"}`}>{totais.diferenca > 0 ? "+" : ""}{fmt(totais.diferenca)}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><DollarSign size={14}/> Custo de perda</div>
          <p className="text-2xl font-bold text-amber-700">{fmtR(totais.custoPerda)}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-3 max-w-md">
        <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou produto…"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Produto</th>
                <th className="text-right px-3 py-2.5 font-semibold">Físico</th>
                <th className="text-right px-3 py-2.5 font-semibold">Contábil</th>
                <th className="text-right px-3 py-2.5 font-semibold">Diferença</th>
                <th className="text-right px-3 py-2.5 font-semibold">Custo un.</th>
                <th className="text-right px-3 py-2.5 font-semibold">Custo perda</th>
                <th className="text-center px-3 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(a => {
                const dif = a.fisico - a.contabil
                const perda = dif < 0 ? -dif * (a.custoUnitario || 0) : 0
                return (
                  <tr key={a.id} className="hover:bg-cyan-50/30">
                    <td className="px-3 py-2 text-gray-700 font-medium">{a.cliente || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{a.produto}</td>
                    <td className="px-2 py-1.5 text-right">
                      <input defaultValue={a.fisico || ""} onBlur={e => salvarCampo(a, "fisico", e.target.value)} className={cell} />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input defaultValue={a.contabil || ""} onBlur={e => salvarCampo(a, "contabil", e.target.value)} className={cell} />
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${Math.abs(dif) < 0.005 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-amber-600"}`}>
                      {dif > 0 ? "+" : ""}{fmt(dif)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input defaultValue={a.custoUnitario || ""} onBlur={e => salvarCampo(a, "custoUnitario", e.target.value)} className={cell} placeholder="R$/un" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-700 tabular-nums">{perda > 0 ? fmtR(perda) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => excluir(a)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
              {!loading && filtradas.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  Nenhum aditivo. Use <strong>Importar Excel</strong> (aba FÍSICO × CONTÁBIL) ou <strong>Novo aditivo</strong>.
                </td></tr>
              )}
              {filtradas.length > 0 && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="px-3 py-2.5 text-xs text-gray-600" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totais.fisico)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{fmt(totais.contabil)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${totais.diferenca < 0 ? "text-red-600" : "text-green-600"}`}>{totais.diferenca > 0 ? "+" : ""}{fmt(totais.diferenca)}</td>
                  <td></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{fmtR(totais.custoPerda)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Novo aditivo</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label><input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={inp} placeholder="LDC, CIBRA…" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Produto *</label><input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} className={inp} placeholder="SUPERSELEN…" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Físico</label><input type="number" step="0.01" value={form.fisico} onChange={e => setForm({ ...form, fisico: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contábil</label><input type="number" step="0.01" value={form.contabil} onChange={e => setForm({ ...form, contabil: e.target.value })} className={inp} /></div>
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Custo unitário (R$/un)</label><input type="number" step="0.01" value={form.custoUnitario} onChange={e => setForm({ ...form, custoUnitario: e.target.value })} className={inp} /></div>
            </div>
            {erro && <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={salvarNovo} disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
