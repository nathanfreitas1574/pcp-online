"use client"

import { useState } from "react"
import { Plus, Lock, AlertTriangle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Lacre = {
  id: string
  status: string
  codigoLacre: string | null
  observacao: string | null
  createdAt: string | Date
  box: { codigo: string; descricao: string }
  usuario: { name: string }
}

type Box = { id: string; codigo: string; descricao: string }

export default function LacresClient({ lacres, boxes }: { lacres: Lacre[]; boxes: Box[] }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    boxId: "",
    status: "FECHADO",
    codigoLacre: "",
    observacao: "",
  })
  const [loading, setLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState("TODOS")

  const filtered =
    filtroStatus === "TODOS" ? lacres : lacres.filter((l) => l.status === filtroStatus)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/lacres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setShowModal(false)
    window.location.reload()
  }

  const statusIcon = (status: string) => {
    if (status === "FECHADO") return <CheckCircle size={16} className="text-green-600" />
    if (status === "NAO_CONFORME") return <AlertTriangle size={16} className="text-red-600" />
    return <Lock size={16} className="text-yellow-600" />
  }

  const statusBadge = (status: string) => {
    if (status === "FECHADO") return "bg-green-100 text-green-700"
    if (status === "NAO_CONFORME") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lacres</h2>
          <p className="text-gray-500 text-sm mt-1">Abertura e fechamento diário</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Registrar Lacre
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["TODOS", "FECHADO", "ABERTO", "NAO_CONFORME"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroStatus === s
                ? "bg-blue-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "NAO_CONFORME" ? "Não Conforme" : s === "TODOS" ? "Todos" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((lacre) => (
              <tr key={lacre.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {lacre.box.codigo}
                  <span className="text-gray-400 font-normal ml-1">— {lacre.box.descricao}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{lacre.codigoLacre ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(lacre.status)}`}>
                    {statusIcon(lacre.status)}
                    {lacre.status === "NAO_CONFORME" ? "Não Conforme" : lacre.status.charAt(0) + lacre.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{lacre.observacao ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{lacre.usuario.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {format(new Date(lacre.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Nenhum lacre encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Registrar Lacre</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Box</label>
                <select
                  value={form.boxId}
                  onChange={(e) => setForm((f) => ({ ...f, boxId: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codigo} — {b.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FECHADO">Fechado</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="NAO_CONFORME">Não Conforme</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código do Lacre</label>
                <input
                  type="text"
                  value={form.codigoLacre}
                  onChange={(e) => setForm((f) => ({ ...f, codigoLacre: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
