"use client"

import { useState } from "react"
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell, Plus, Download } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Alerta = {
  id: string
  tipo: string
  severidade: string
  status: string
  titulo: string
  descricao: string
  referencia: string | null
  createdAt: Date | string
  resolvidoPor: string | null
  resolvidoEm: Date | string | null
  box: { codigo: string } | null
  usuario: { name: string } | null
}

const TIPO_LABELS: Record<string, string> = {
  BOX_CAPACIDADE_CRITICA: "Box Capacidade Crítica",
  BOX_CAPACIDADE_ALTA: "Box Capacidade Alta",
  LACRE_NAO_CONFORME: "Lacre Não Conforme",
  INVENTARIO_DIVERGENCIA: "Divergência Inventário",
  MOVIMENTACAO_ATRASADA: "Movimentação Atrasada",
  ESTOQUE_BAIXO: "Estoque Baixo",
  NAO_CONFORMIDADE: "Não Conformidade",
}

function SeveridadeIcon({ s }: { s: string }) {
  if (s === "CRITICO") return <AlertCircle size={18} className="text-red-600" />
  if (s === "AVISO") return <AlertTriangle size={18} className="text-yellow-600" />
  return <Info size={18} className="text-blue-500" />
}

function severidadeBadge(s: string) {
  if (s === "CRITICO") return "bg-red-100 text-red-700 border-red-200"
  if (s === "AVISO") return "bg-yellow-100 text-yellow-700 border-yellow-200"
  return "bg-blue-100 text-blue-700 border-blue-200"
}

function statusBadge(s: string) {
  if (s === "ABERTO") return "bg-red-50 text-red-600"
  if (s === "LIDO") return "bg-yellow-50 text-yellow-600"
  return "bg-green-50 text-green-600"
}

export default function AlertasClient({
  alertas,
  abertos,
  criticos,
  avisos,
}: {
  alertas: Alerta[]
  abertos: number
  criticos: number
  avisos: number
}) {
  const [filtroStatus, setFiltroStatus] = useState("ABERTO")
  const [filtroSev, setFiltroSev] = useState("TODOS")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ tipo: "NAO_CONFORMIDADE", severidade: "AVISO", titulo: "", descricao: "", referencia: "" })
  const [saving, setSaving] = useState(false)

  const filtered = alertas.filter((a) => {
    const matchStatus = filtroStatus === "TODOS" || a.status === filtroStatus
    const matchSev = filtroSev === "TODOS" || a.severidade === filtroSev
    return matchStatus && matchSev
  })

  async function marcarStatus(id: string, status: string) {
    await fetch(`/api/alertas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  async function criarAlerta(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowModal(false)
    window.location.reload()
  }

  async function marcarTodosLidos() {
    const abertosIds = alertas.filter((a) => a.status === "ABERTO").map((a) => a.id)
    await Promise.all(
      abertosIds.map((id) =>
        fetch(`/api/alertas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "LIDO" }),
        })
      )
    )
    window.location.reload()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={28} className="text-gray-700" />
            {abertos > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {abertos > 9 ? "9+" : abertos}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Central de Alertas</h2>
            <p className="text-gray-500 text-sm mt-0.5">Notificações e não-conformidades do sistema</p>
          </div>
        </div>
        <div className="flex gap-2">
          {abertos > 0 && (
            <button
              onClick={marcarTodosLidos}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Marcar todos como lidos
            </button>
          )}
          <button
            onClick={() => window.open("/api/exportar/alertas", "_blank")}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            <Download size={16} /> Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} /> Novo Alerta
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={28} className="text-red-600 shrink-0" />
          <div>
            <p className="text-xs text-red-500 font-medium">CRÍTICOS ABERTOS</p>
            <p className="text-3xl font-bold text-red-700">{criticos}</p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={28} className="text-yellow-600 shrink-0" />
          <div>
            <p className="text-xs text-yellow-600 font-medium">AVISOS ABERTOS</p>
            <p className="text-3xl font-bold text-yellow-700">{avisos}</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={28} className="text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-green-600 font-medium">RESOLVIDOS (TOTAL)</p>
            <p className="text-3xl font-bold text-green-700">{alertas.filter((a) => a.status === "RESOLVIDO").length}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["ABERTO", "LIDO", "RESOLVIDO", "TODOS"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroStatus === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s}
            <span className="ml-1.5 text-xs opacity-70">
              ({alertas.filter((a) => s === "TODOS" || a.status === s).length})
            </span>
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(["TODOS", "CRITICO", "AVISO", "INFO"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroSev(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroSev === s
                ? s === "CRITICO" ? "bg-red-600 text-white"
                  : s === "AVISO" ? "bg-yellow-500 text-white"
                  : "bg-blue-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`bg-white rounded-xl border shadow-sm p-4 flex gap-4 items-start transition ${
              a.status === "ABERTO" && a.severidade === "CRITICO"
                ? "border-red-200 shadow-red-100"
                : a.status === "RESOLVIDO"
                ? "opacity-60 border-gray-100"
                : "border-gray-100"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <SeveridadeIcon s={a.severidade} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-800">{a.titulo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{a.descricao}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severidadeBadge(a.severidade)}`}>
                    {a.severidade}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(a.status)}`}>
                    {a.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                {a.box && <span className="bg-gray-100 px-2 py-0.5 rounded">Box: {a.box.codigo}</span>}
                {a.referencia && <span>{a.referencia}</span>}
                <span>{format(new Date(a.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                {a.usuario && <span>por {a.usuario.name}</span>}
                {a.resolvidoPor && <span>✓ Resolvido por {a.resolvidoPor}</span>}
              </div>
            </div>

            {/* Ações */}
            {a.status !== "RESOLVIDO" && (
              <div className="flex gap-1.5 shrink-0">
                {a.status === "ABERTO" && (
                  <button
                    onClick={() => marcarStatus(a.id, "LIDO")}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
                  >
                    Lido
                  </button>
                )}
                <button
                  onClick={() => marcarStatus(a.id, "RESOLVIDO")}
                  className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                >
                  Resolver
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum alerta {filtroStatus !== "TODOS" ? filtroStatus.toLowerCase() : ""}</p>
            <p className="text-gray-400 text-sm mt-1">O sistema está operando normalmente.</p>
          </div>
        )}
      </div>

      {/* Modal criar alerta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Registrar Alerta / Não Conformidade</h3>
            <form onSubmit={criarAlerta} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(TIPO_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
                  <select
                    value={form.severidade}
                    onChange={(e) => setForm((f) => ({ ...f, severidade: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CRITICO">Crítico</option>
                    <option value="AVISO">Aviso</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  required
                  placeholder="Descreva o problema resumidamente"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição detalhada</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  required
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referência (box, NF, contrato...)</label>
                <input
                  type="text"
                  value={form.referencia}
                  onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
