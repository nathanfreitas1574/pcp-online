"use client"

import { useState, useMemo } from "react"
import { Plus, Lock, AlertTriangle, CheckCircle, ExternalLink, Pencil, Trash2, X, Calendar } from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

type Lacre = {
  id: string
  status: string
  codigoLacre: string | null
  observacao: string | null
  nomeLacrador?: string | null
  createdAt: string | Date
  box: { codigo: string; descricao: string }
  usuario: { name: string } | null
}

type Box = { id: string; codigo: string; descricao: string }

const EMPTY_FORM = { boxId: "", status: "FECHADO", codigoLacre: "", observacao: "" }

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function LacresClient({ lacres: initialLacres, boxes }: { lacres: Lacre[]; boxes: Box[] }) {
  const [lacres, setLacres]           = useState<Lacre[]>(initialLacres)
  const [showModal, setShowModal]     = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [loading, setLoading]         = useState(false)
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [dataInicio, setDataInicio]   = useState("")
  const [dataFim, setDataFim]         = useState("")

  // ── Filtros aplicados ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return lacres.filter((l) => {
      if (filtroStatus !== "TODOS" && l.status !== filtroStatus) return false
      const dt = new Date(l.createdAt)
      if (dataInicio) {
        if (dt < startOfDay(parseISO(dataInicio))) return false
      }
      if (dataFim) {
        if (dt > endOfDay(parseISO(dataFim))) return false
      }
      return true
    })
  }, [lacres, filtroStatus, dataInicio, dataFim])

  // ── Abrir modal novo ───────────────────────────────────────────────────────
  function openNovo() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  // ── Abrir modal editar ─────────────────────────────────────────────────────
  function openEditar(l: Lacre) {
    const boxId = boxes.find(b => b.codigo === l.box.codigo)?.id ?? ""
    setEditId(l.id)
    setForm({ boxId, status: l.status, codigoLacre: l.codigoLacre ?? "", observacao: l.observacao ?? "" })
    setShowModal(true)
  }

  // ── Salvar (criar ou editar) ───────────────────────────────────────────────
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (editId) {
      // PATCH
      const res = await fetch(`/api/lacres/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const d = await res.json()
        setLacres(prev => prev.map(l => l.id === editId ? { ...l, ...d.lacre } : l))
      }
    } else {
      // POST
      const res = await fetch("/api/lacres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        window.location.reload()
        return
      }
    }

    setLoading(false)
    setShowModal(false)
  }

  // ── Excluir ────────────────────────────────────────────────────────────────
  async function handleExcluir(id: string) {
    if (!confirm("Excluir este lacre?")) return
    const res = await fetch(`/api/lacres/${id}`, { method: "DELETE" })
    if (res.ok) setLacres(prev => prev.filter(l => l.id !== id))
  }

  // ── Helpers visuais ────────────────────────────────────────────────────────
  const statusIcon = (s: string) => {
    if (s === "FECHADO")      return <CheckCircle  size={14} className="text-green-600" />
    if (s === "NAO_CONFORME") return <AlertTriangle size={14} className="text-red-600" />
    return <Lock size={14} className="text-yellow-600" />
  }

  const statusBadge = (s: string) => {
    if (s === "FECHADO")      return "bg-green-100 text-green-700"
    if (s === "NAO_CONFORME") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const statusLabel = (s: string) =>
    s === "NAO_CONFORME" ? "Não Conforme" : s.charAt(0) + s.slice(1).toLowerCase()

  const limparDatas = () => { setDataInicio(""); setDataFim("") }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lacres</h2>
          <p className="text-gray-500 text-sm mt-0.5">Abertura e fechamento diário</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/registrar-lacre" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-blue-300 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
            <ExternalLink size={14} />Link público
          </a>
          <button onClick={openNovo}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={16} />Registrar Lacre
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status */}
        {["TODOS", "FECHADO", "ABERTO", "NAO_CONFORME"].map((s) => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroStatus === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {s === "NAO_CONFORME" ? "Não Conforme" : s === "TODOS" ? "Todos" : statusLabel(s)}
          </button>
        ))}

        {/* Separador */}
        <div className="h-6 w-px bg-gray-200 mx-1" />

        {/* Filtro de data */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-xs">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(dataInicio || dataFim) && (
            <button onClick={limparDatas} className="text-gray-400 hover:text-red-500 transition">
              <X size={14} />
            </button>
          )}
        </div>

        <span className="ml-auto text-xs text-gray-400">{filtered.length} registro(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Box</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Código Lacre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Observação</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Responsável</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((lacre) => (
              <tr key={lacre.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {lacre.box.codigo}
                  <span className="text-gray-400 font-normal ml-1">— {lacre.box.descricao}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{lacre.codigoLacre ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(lacre.status)}`}>
                    {statusIcon(lacre.status)}
                    {statusLabel(lacre.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{lacre.observacao ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {lacre.usuario?.name ?? lacre.nomeLacrador ?? "—"}
                  {!lacre.usuario && lacre.nomeLacrador && (
                    <span className="ml-1 text-xs text-gray-400">(externo)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {format(new Date(lacre.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditar(lacre)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleExcluir(lacre.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhum lacre encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal criar / editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">
                {editId ? "Editar Lacre" : "Registrar Lacre"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-3">
              {/* Box — só no criar */}
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Box <span className="text-red-500">*</span></label>
                  <select value={form.boxId} onChange={(e) => setForm(f => ({ ...f, boxId: e.target.value }))} required className={inp}>
                    <option value="">Selecione…</option>
                    {boxes.map((b) => (
                      <option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "FECHADO",      label: "Fechado",      ring: "ring-green-400 bg-green-50 text-green-700" },
                    { value: "ABERTO",       label: "Aberto",       ring: "ring-yellow-400 bg-yellow-50 text-yellow-700" },
                    { value: "NAO_CONFORME", label: "Não conforme", ring: "ring-red-400 bg-red-50 text-red-700" },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition ${
                        form.status === opt.value ? `ring-2 ${opt.ring}` : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Código do lacre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código do Lacre</label>
                <input type="text" value={form.codigoLacre} onChange={(e) => setForm(f => ({ ...f, codigoLacre: e.target.value }))}
                  placeholder="Ex: L-00123 (opcional)" className={inp} />
              </div>

              {/* Observação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                  rows={2} placeholder="Opcional" className={inp} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60 transition">
                  {loading ? "Salvando…" : editId ? "Salvar alterações" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
