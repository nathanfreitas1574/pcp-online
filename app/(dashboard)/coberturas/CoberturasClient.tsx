"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ShieldQuestion, Plus, Search, Save, X, Pencil, Trash2, CheckCircle2, RotateCcw, Scale, ClipboardList,
  Upload, RefreshCw, FileSpreadsheet, FileText,
} from "lucide-react"

type Cobertura = {
  id: string; codigoRomaneio: string; numeroDocumento: string | null; placa: string | null
  produto: string; cliente: string
  volume: number; observacao: string | null; boxCodigo: string | null
  dataDescarga: string | null; numeroNota: string | null; dataSolicitacao: string | null
  status: string; createdAt: string
}
type Props = { clientes: string[]; produtos: string[]; boxes: string[] }

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const dt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const VAZIO = { codigoRomaneio: "", numeroDocumento: "", placa: "", produto: "", cliente: "", volume: "", boxCodigo: "", observacao: "", dataDescarga: "", numeroNota: "", dataSolicitacao: "" }

export default function CoberturasClient({ clientes, produtos, boxes }: Props) {
  const [itens, setItens] = useState<Cobertura[]>([])
  const [pendente, setPendente] = useState({ count: 0, volume: 0 })
  const [coberto, setCoberto] = useState({ count: 0, volume: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFiltro, setStatusFiltro] = useState("PENDENTE")
  const [busca, setBusca] = useState("")
  // modal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [importando, setImportando] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  const [aviso, setAviso] = useState("")
  const [sel, setSel] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (statusFiltro) qs.set("status", statusFiltro)
    if (busca) qs.set("busca", busca)
    const r = await fetch("/api/coberturas?" + qs.toString())
    const d = await r.json()
    setItens(d.itens ?? [])
    setPendente(d.pendente ?? { count: 0, volume: 0 })
    setCoberto(d.coberto ?? { count: 0, volume: 0 })
    setSel(new Set())
    setLoading(false)
  }, [statusFiltro, busca])
  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() { setForm({ ...VAZIO }); setEditId(null); setErro("") }
  function abrirEdit(c: Cobertura) {
    setForm({
      codigoRomaneio: c.codigoRomaneio, numeroDocumento: c.numeroDocumento ?? "", placa: c.placa ?? "",
      produto: c.produto, cliente: c.cliente, volume: String(c.volume),
      boxCodigo: c.boxCodigo ?? "", observacao: c.observacao ?? "", numeroNota: c.numeroNota ?? "",
      dataDescarga: c.dataDescarga ? c.dataDescarga.slice(0, 10) : "", dataSolicitacao: c.dataSolicitacao ? c.dataSolicitacao.slice(0, 10) : "",
    })
    setEditId(c.id); setErro("")
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file)
    try {
      const r = await fetch("/api/coberturas/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) { setAviso(`✅ ${d.criados} importadas${d.jaCobertos ? ` · ${d.jaCobertos} já cobertas (NF no contábil)` : ""}${d.pulados ? ` · ${d.pulados} ignoradas (duplicadas)` : ""}.`); await carregar() }
      else setAviso(`❌ ${d.error ?? "Falha na importação."}`)
    } catch { setAviso("❌ Erro de rede ao importar.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function conferir() {
    setConferindo(true); setAviso("")
    const r = await fetch("/api/coberturas/conferir", { method: "POST" })
    const d = await r.json()
    setConferindo(false)
    if (r.ok) { setAviso(`✅ ${d.finalizadas} de ${d.conferidas} finalizada(s) (NF encontrada no contábil).`); await carregar() }
    else setAviso(`❌ ${d.error ?? "Erro ao conferir."}`)
  }

  async function salvar() {
    if (!form.codigoRomaneio.trim()) { setErro("Informe o código do romaneio."); return }
    if (!form.produto.trim()) { setErro("Informe o produto."); return }
    setSalvando(true); setErro("")
    const url = editId ? `/api/coberturas/${editId}` : "/api/coberturas"
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json().catch(() => ({}))
    setSalvando(false)
    if (r.ok) {
      setForm(null)
      if (d.autoCoberto) setAviso("✅ NF encontrada no estoque contábil — cobertura finalizada automaticamente.")
      await carregar()
    } else setErro(d.error ?? "Erro ao salvar.")
  }

  async function alterarStatus(c: Cobertura, status: string) {
    await fetch(`/api/coberturas/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    await carregar()
  }
  async function excluir(c: Cobertura) {
    if (!confirm(`Excluir a cobertura do romaneio ${c.codigoRomaneio}?`)) return
    await fetch(`/api/coberturas/${c.id}`, { method: "DELETE" })
    setItens(prev => prev.filter(x => x.id !== c.id))
  }

  function exportarExcel() {
    const qs = new URLSearchParams()
    if (statusFiltro) qs.set("status", statusFiltro)
    if (busca) qs.set("busca", busca)
    window.open("/api/coberturas/export?" + qs.toString(), "_blank")
  }

  function exportarPDF() {
    const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))
    const linhas = itens.map(c => `<tr><td>${esc(c.codigoRomaneio)}</td><td>${esc(c.numeroDocumento ?? "")}</td><td>${esc(c.placa ?? "")}</td><td>${esc(c.produto)}</td><td>${esc(c.cliente)}</td><td style="text-align:right">${fmt(c.volume)}</td><td>${dt(c.dataDescarga)}</td><td>${esc(c.numeroNota ?? "")}</td><td>${dt(c.dataSolicitacao)}</td><td>${c.status === "COBERTO" ? "Coberto" : "Pendente"}</td></tr>`).join("")
    const total = itens.reduce((s, c) => s + c.volume, 0)
    const html = `<html><head><meta charset="utf-8"><title>Coberturas</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:18px;color:#111}h1{font-size:16px;margin:0}p{color:#555;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}tfoot td{font-weight:bold;background:#fafafa}</style></head><body><h1>Coberturas ${statusFiltro === "PENDENTE" ? "pendentes" : statusFiltro === "COBERTO" ? "cobertas" : ""}</h1><p>${itens.length} registro(s) &middot; ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Romaneio</th><th>Documento</th><th>Placa</th><th>Produto</th><th>Cliente</th><th>Volume (t)</th><th>Descarga</th><th>N&ordm; Nota</th><th>Solicita&ccedil;&atilde;o</th><th>Status</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="5">Total</td><td style="text-align:right">${fmt(total)}</td><td colspan="4"></td></tr></tfoot></table></body></html>`
    const w = window.open("", "_blank")
    if (!w) { alert("Permita pop-ups para exportar em PDF."); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 300)
  }

  const toggleSel = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleTodos = () => setSel(prev => prev.size === itens.length ? new Set() : new Set(itens.map(i => i.id)))

  async function excluirLote() {
    if (sel.size === 0) return
    if (!confirm(`Excluir ${sel.size} registro(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return
    const r = await fetch("/api/coberturas/excluir-lote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel] }) })
    const d = await r.json()
    if (r.ok) { setAviso(`✅ ${d.excluidos} registro(s) excluído(s).`); setSel(new Set()); await carregar() }
    else setAviso(`❌ ${d.error ?? "Erro ao excluir."}`)
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
            <ShieldQuestion className="text-amber-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gerenciador de Coberturas</h1>
            <p className="text-sm text-gray-500">Produtos descarregados (no físico) sem NF para entrar no contábil — cobertura pendente</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportarExcel} disabled={itens.length === 0}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition" title="Exportar para Excel">
            <FileSpreadsheet size={15} className="text-green-600" /> Excel
          </button>
          <button onClick={exportarPDF} disabled={itens.length === 0}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition" title="Exportar para PDF (impressão)">
            <FileText size={15} className="text-red-600" /> PDF
          </button>
          <button onClick={conferir} disabled={conferindo}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition" title="Conferir NFs no estoque contábil e finalizar as cobertas">
            <RefreshCw size={15} className={conferindo ? "animate-spin" : ""} /> {conferindo ? "Conferindo…" : "Conferir notas"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
            <Upload size={15} /> {importando ? "Importando…" : "Importar Excel"}
          </button>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
            <Plus size={16} /> Nova cobertura
          </button>
        </div>
      </div>

      {aviso && (
        <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700">
          <span className="flex-1">{aviso}</span>
          <button onClick={() => setAviso("")}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><Scale size={14}/> Cobertura pendente</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(pendente.volume)} <span className="text-sm font-medium text-gray-400">t · {pendente.count} reg.</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><CheckCircle2 size={14}/> Já coberto</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(coberto.volume)} <span className="text-sm font-medium text-gray-400">t · {coberto.count} reg.</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><ClipboardList size={14}/> Total registros</div>
          <p className="text-2xl font-bold text-gray-800">{pendente.count + coberto.count}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {[["PENDENTE", "Pendentes"], ["COBERTO", "Cobertas"], ["", "Todas"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFiltro(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${statusFiltro === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar romaneio, produto, cliente…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {sel.size > 0 && (
          <button onClick={excluirLote}
            className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
            <Trash2 size={15} /> Excluir selecionados ({sel.size})
          </button>
        )}
        <div className="text-sm text-gray-500">{loading ? "Carregando…" : `${itens.length} registro(s)`}</div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" checked={itens.length > 0 && sel.size === itens.length}
                    ref={el => { if (el) el.indeterminate = sel.size > 0 && sel.size < itens.length }}
                    onChange={toggleTodos} title="Selecionar todos" />
                </th>
                <th className="text-left px-3 py-2.5 font-semibold">Romaneio</th>
                <th className="text-left px-3 py-2.5 font-semibold">Documento</th>
                <th className="text-left px-3 py-2.5 font-semibold">Placa</th>
                <th className="text-left px-3 py-2.5 font-semibold">Descarga</th>
                <th className="text-left px-3 py-2.5 font-semibold">Produto</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-right px-3 py-2.5 font-semibold">Volume</th>
                <th className="text-left px-3 py-2.5 font-semibold">Nº Nota</th>
                <th className="text-left px-3 py-2.5 font-semibold">Solicitação</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                <th className="text-center px-3 py-2.5 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map(c => (
                <tr key={c.id} className={sel.has(c.id) ? "bg-blue-50/60" : "hover:bg-amber-50/30"}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggleSel(c.id)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{c.codigoRomaneio}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{c.numeroDocumento || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{c.placa || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{dt(c.dataDescarga)}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={c.produto}>{c.produto}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={c.cliente}>{c.cliente || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800 tabular-nums">{fmt(c.volume)} t</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{c.numeroNota || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{dt(c.dataSolicitacao)}</td>
                  <td className="px-3 py-2">
                    {c.status === "PENDENTE"
                      ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Pendente</span>
                      : <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">Coberto</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {c.status === "PENDENTE" ? (
                        <button onClick={() => alterarStatus(c, "COBERTO")} className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600" title="Marcar como coberto"><CheckCircle2 size={14} /></button>
                      ) : (
                        <button onClick={() => alterarStatus(c, "PENDENTE")} className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Reabrir"><RotateCcw size={14} /></button>
                      )}
                      <button onClick={() => abrirEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => excluir(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && itens.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  Nenhuma cobertura {statusFiltro === "PENDENTE" ? "pendente" : ""}. Clique em <strong>Nova cobertura</strong> para registrar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal criar/editar */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editId ? "Editar cobertura" : "Nova cobertura pendente"}</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Código do romaneio *</label>
                <input value={form.codigoRomaneio} onChange={e => setForm({ ...form, codigoRomaneio: e.target.value })} className={inp + " font-mono"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Volume (t)</label>
                <input type="number" step="0.01" value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número do documento</label>
                <input value={form.numeroDocumento} onChange={e => setForm({ ...form, numeroDocumento: e.target.value })} className={inp + " font-mono"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Placa</label>
                <input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} className={inp + " font-mono"} placeholder="ABC1D23" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Data da descarga</label>
                <input type="date" value={form.dataDescarga} onChange={e => setForm({ ...form, dataDescarga: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nº da nota</label>
                <input value={form.numeroNota} onChange={e => setForm({ ...form, numeroNota: e.target.value })} placeholder="confere no contábil ao salvar" className={inp + " font-mono"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Data da solicitação ao cliente</label>
                <input type="date" value={form.dataSolicitacao} onChange={e => setForm({ ...form, dataSolicitacao: e.target.value })} className={inp} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Produto *</label>
                <input list="cob-produtos" value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} className={inp} />
                <datalist id="cob-produtos">{produtos.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
                <input list="cob-clientes" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={inp} />
                <datalist id="cob-clientes">{clientes.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Box (opcional)</label>
                <input list="cob-boxes" value={form.boxCodigo} onChange={e => setForm({ ...form, boxCodigo: e.target.value })} className={inp} />
                <datalist id="cob-boxes">{boxes.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} className={inp} />
              </div>
            </div>
            {erro && <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                <Save size={15} /> {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
