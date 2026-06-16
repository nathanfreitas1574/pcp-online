"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  FileX2, Plus, Search, Save, X, Pencil, Trash2, Upload, FileSpreadsheet, AlertTriangle, Ban, Hash,
} from "lucide-react"

type Nota = {
  id: string; data: string | null; usuario: string | null; numero: string; cliente: string | null
  tipo: string; codigoOperacao: string | null; descricao: string | null; numeroNF: string | null
  motivoErro: string | null; observacao: string | null; alertaContabil: boolean
}
type Props = { clientes: string[]; usuarios: string[] }

const dt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const VAZIO = { data: "", usuario: "", numero: "", cliente: "", tipo: "CANCELAMENTO", numeroNF: "", motivoErro: "", observacao: "" }

export default function ControleNotasClient({ clientes, usuarios }: Props) {
  const [itens, setItens] = useState<Nota[]>([])
  const [porTipo, setPorTipo] = useState<{ tipo: string; count: number }[]>([])
  const [alertas, setAlertas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipoF, setTipoF] = useState("")
  const [busca, setBusca] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [importando, setImportando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (tipoF) qs.set("tipo", tipoF)
    if (busca) qs.set("busca", busca)
    const r = await fetch("/api/controle-notas?" + qs.toString())
    const d = await r.json()
    setItens(d.itens ?? [])
    setPorTipo(d.porTipo ?? [])
    setAlertas(d.alertas ?? 0)
    setLoading(false)
  }, [tipoF, busca])
  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() { setForm({ ...VAZIO }); setEditId(null); setErro("") }
  function abrirEdit(n: Nota) {
    setForm({ data: n.data ? n.data.slice(0, 10) : "", usuario: n.usuario ?? "", numero: n.numero, cliente: n.cliente ?? "", tipo: n.tipo, numeroNF: n.numeroNF ?? "", motivoErro: n.motivoErro ?? "", observacao: n.observacao ?? "" })
    setEditId(n.id); setErro("")
  }

  async function salvar() {
    if (!form.numero.trim()) { setErro("Informe o número."); return }
    setSalvando(true); setErro("")
    const url = editId ? `/api/controle-notas/${editId}` : "/api/controle-notas"
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json().catch(() => ({}))
    setSalvando(false)
    if (r.ok) {
      setForm(null)
      if (d.alertaContabil) setAviso(`⚠️ Atenção: a NF ${form.numeroNF || form.numero} ainda está lançada no Estoque Contábil — confira se foi realmente cancelada no sistema.`)
      await carregar()
    } else setErro(d.error ?? "Erro ao salvar.")
  }

  async function excluir(n: Nota) {
    if (!confirm(`Excluir o registro ${n.numero}?`)) return
    await fetch(`/api/controle-notas/${n.id}`, { method: "DELETE" })
    setItens(prev => prev.filter(x => x.id !== n.id))
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file)
    try {
      const r = await fetch("/api/controle-notas/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) { setAviso(`✅ ${d.criados} importadas${d.alertas ? ` · ${d.alertas} com alerta (NF ainda no contábil)` : ""}.`); await carregar() }
      else setAviso(`❌ ${d.error ?? "Falha na importação."}`)
    } catch { setAviso("❌ Erro de rede ao importar.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function exportar() {
    const qs = new URLSearchParams()
    if (tipoF) qs.set("tipo", tipoF)
    if (busca) qs.set("busca", busca)
    window.open("/api/controle-notas/export?" + qs.toString(), "_blank")
  }

  const nCancel = porTipo.find(t => t.tipo === "CANCELAMENTO")?.count ?? 0
  const nInut = porTipo.find(t => t.tipo === "INUTILIZACAO")?.count ?? 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center"><FileX2 className="text-rose-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Controle de Notas Canceladas / Inutilizadas</h1>
            <p className="text-sm text-gray-500">Registro da Balança — cancelamentos e numerações inutilizadas, com validação no contábil</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportar} disabled={itens.length === 0} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"><FileSpreadsheet size={15} className="text-green-600" /> Exportar</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={() => fileRef.current?.click()} disabled={importando} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"><Upload size={15} /> {importando ? "Importando…" : "Importar Excel"}</button>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"><Plus size={16} /> Registrar</button>
        </div>
      </div>

      {aviso && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${aviso.startsWith("⚠️") ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-gray-50 border border-gray-200 text-gray-700"}`}>
          <span className="flex-1">{aviso}</span><button onClick={() => setAviso("")}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><Ban size={14}/> Cancelamentos</div>
          <p className="text-2xl font-bold text-gray-800">{nCancel}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Hash size={14}/> Inutilizações</div>
          <p className="text-2xl font-bold text-gray-800">{nInut}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${alertas > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><AlertTriangle size={14}/> Alertas (NF ainda no contábil)</div>
          <p className={`text-2xl font-bold ${alertas > 0 ? "text-amber-700" : "text-gray-800"}`}>{alertas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {[["", "Todos"], ["CANCELAMENTO", "Cancelamentos"], ["INUTILIZACAO", "Inutilizações"]].map(([v, l]) => (
            <button key={v} onClick={() => setTipoF(v)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tipoF === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar número, NF, cliente, usuário…" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="text-sm text-gray-500">{loading ? "Carregando…" : `${itens.length} registro(s)`}</div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Data</th>
                <th className="text-left px-3 py-2.5 font-semibold">Usuário</th>
                <th className="text-left px-3 py-2.5 font-semibold">Número</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2.5 font-semibold">Nº NF</th>
                <th className="text-left px-3 py-2.5 font-semibold">Motivo</th>
                <th className="text-center px-3 py-2.5 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map(n => (
                <tr key={n.id} className={n.alertaContabil ? "bg-amber-50/60" : "hover:bg-rose-50/30"}>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{dt(n.data)}</td>
                  <td className="px-3 py-2 text-gray-600">{n.usuario || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{n.numero}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={n.cliente ?? ""}>{n.cliente || "—"}</td>
                  <td className="px-3 py-2">
                    {n.tipo === "CANCELAMENTO"
                      ? <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">Cancelamento</span>
                      : <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Inutilização</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {n.numeroNF || "—"}
                    {n.alertaContabil && <span className="ml-1 text-amber-600" title="NF ainda lançada no contábil"><AlertTriangle size={12} className="inline" /></span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{n.motivoErro || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirEdit(n)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => excluir(n)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && itens.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhum registro. Use <strong>Registrar</strong> ou <strong>Importar Excel</strong>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">{editId ? "Editar registro" : "Registrar nota / numeração"}</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Data</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className={inp} /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inp}>
                  <option value="CANCELAMENTO">Cancelamento (015-CA)</option>
                  <option value="INUTILIZACAO">Inutilização (030-INA)</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Número *</label><input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} className={inp + " font-mono"} /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nº NF {form.tipo === "CANCELAMENTO" && <span className="text-amber-600">(valida no contábil)</span>}</label>
                <input value={form.numeroNF} onChange={e => setForm({ ...form, numeroNF: e.target.value })} className={inp + " font-mono"} disabled={form.tipo === "INUTILIZACAO"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Usuário</label>
                <input list="cn-usuarios" value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} className={inp} />
                <datalist id="cn-usuarios">{usuarios.map(u => <option key={u} value={u} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
                <input list="cn-clientes" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={inp} />
                <datalist id="cn-clientes">{clientes.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo do erro</label>
                <select value={form.motivoErro} onChange={e => setForm({ ...form, motivoErro: e.target.value })} className={inp}>
                  <option value="">—</option>
                  <option value="ERRO OPERACIONAL">Erro operacional</option>
                  <option value="ERRO SISTEMA">Erro de sistema</option>
                </select>
              </div>
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Observação</label><textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} className={inp} /></div>
            </div>
            {erro && <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
