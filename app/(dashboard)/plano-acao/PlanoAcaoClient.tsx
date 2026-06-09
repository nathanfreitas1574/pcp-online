"use client"

import { useState } from "react"
import { Target, Plus, ChevronDown, ChevronUp, Trash2, Pencil, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, BarChart2, List } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import PlanoAcaoIndicadores from "./PlanoAcaoIndicadores"

export type PlanoAcaoItem = {
  id: string
  oQue: string
  porQue: string
  quem: string
  onde: string
  quando: string | Date
  como: string
  quantoCusta: number | null
  prioridade: "ALTA" | "MEDIA" | "BAIXA"
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO"
  progresso: number
  observacao: string | null
  dataConclusao: string | Date | null
  criadoPor: { id: string; name: string }
  createdAt: string | Date
}

const PRIORIDADE_CONFIG = {
  ALTA:  { label: "Alta",  color: "text-red-700",    bg: "bg-red-50",    border: "border-red-300",    dot: "bg-red-500"    },
  MEDIA: { label: "Média", color: "text-yellow-700",  bg: "bg-yellow-50", border: "border-yellow-300", dot: "bg-yellow-500" },
  BAIXA: { label: "Baixa", color: "text-green-700",  bg: "bg-green-50",  border: "border-green-300",  dot: "bg-green-500"  },
}

const STATUS_CONFIG = {
  PENDENTE:     { label: "Pendente",     color: "text-gray-600",  bg: "bg-gray-100",   icon: Clock        },
  EM_ANDAMENTO: { label: "Em andamento", color: "text-blue-700",  bg: "bg-blue-50",    icon: Loader2      },
  CONCLUIDO:    { label: "Concluído",    color: "text-green-700", bg: "bg-green-50",   icon: CheckCircle2 },
  CANCELADO:    { label: "Cancelado",    color: "text-red-600",   bg: "bg-red-50",     icon: XCircle      },
}

const EMPTY_FORM = {
  oQue: "", porQue: "", quem: "", onde: "",
  quando: "", como: "", quantoCusta: "", prioridade: "MEDIA" as "ALTA"|"MEDIA"|"BAIXA",
  observacao: "",
}

export default function PlanoAcaoClient({ initialPlanos }: { initialPlanos: PlanoAcaoItem[] }) {
  const [planos, setPlanos] = useState<PlanoAcaoItem[]>(initialPlanos)
  const [aba, setAba] = useState<"acoes" | "indicadores">("acoes")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS")
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("TODOS")
  const [msg, setMsg] = useState("")
  const [editProgresso, setEditProgresso] = useState<{ id: string; val: number } | null>(null)

  const visíveis = planos
    .filter((p) => filtroStatus === "TODOS" || p.status === filtroStatus)
    .filter((p) => filtroPrioridade === "TODOS" || p.prioridade === filtroPrioridade)

  // Ordenação: ALTA → MEDIA → BAIXA dentro de cada grupo de status
  const prioOrd = { ALTA: 0, MEDIA: 1, BAIXA: 2 }
  const statusOrd = { EM_ANDAMENTO: 0, PENDENTE: 1, CONCLUIDO: 2, CANCELADO: 3 }
  const ordenados = [...visíveis].sort((a, b) =>
    statusOrd[a.status] !== statusOrd[b.status]
      ? statusOrd[a.status] - statusOrd[b.status]
      : prioOrd[a.prioridade] - prioOrd[b.prioridade]
  )

  function openNew() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(p: PlanoAcaoItem) {
    setEditId(p.id)
    setForm({
      oQue: p.oQue, porQue: p.porQue, quem: p.quem, onde: p.onde,
      quando: new Date(p.quando).toISOString().slice(0, 10),
      como: p.como, quantoCusta: p.quantoCusta != null ? String(p.quantoCusta) : "",
      prioridade: p.prioridade, observacao: p.observacao ?? "",
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.oQue || !form.porQue || !form.quem || !form.onde || !form.quando || !form.como) {
      setMsg("Preencha todos os campos obrigatórios.")
      return
    }
    setSaving(true)
    setMsg("")
    const url = editId ? `/api/plano-acao/${editId}` : "/api/plano-acao"
    const method = editId ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setMsg("Erro ao salvar."); return }
    const data = await res.json()
    if (editId) {
      setPlanos((prev) => prev.map((p) => (p.id === editId ? data.plano : p)))
    } else {
      setPlanos((prev) => [data.plano, ...prev])
    }
    setShowForm(false)
    setEditId(null)
  }

  async function handleStatus(id: string, status: PlanoAcaoItem["status"]) {
    const res = await fetch(`/api/plano-acao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlanos((prev) => prev.map((p) => (p.id === id ? data.plano : p)))
    }
  }

  async function handleProgresso(id: string, val: number) {
    const res = await fetch(`/api/plano-acao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progresso: val }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlanos((prev) => prev.map((p) => (p.id === id ? data.plano : p)))
    }
    setEditProgresso(null)
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este plano de ação?")) return
    const res = await fetch(`/api/plano-acao/${id}`, { method: "DELETE" })
    if (res.ok) setPlanos((prev) => prev.filter((p) => p.id !== id))
  }

  // Totalizadores
  const totais = {
    todos: planos.length,
    emAndamento: planos.filter((p) => p.status === "EM_ANDAMENTO").length,
    pendentes: planos.filter((p) => p.status === "PENDENTE").length,
    concluidos: planos.filter((p) => p.status === "CONCLUIDO").length,
    alta: planos.filter((p) => p.prioridade === "ALTA" && p.status !== "CONCLUIDO" && p.status !== "CANCELADO").length,
  }

  const hoje = new Date()

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-xl">Plano de Ação</h1>
            <p className="text-xs text-gray-500">Metodologia 5W2H — controle de ações e responsáveis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Abas */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setAba("acoes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${aba === "acoes" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              <List size={13} /> Ações
            </button>
            <button
              onClick={() => setAba("indicadores")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${aba === "indicadores" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              <BarChart2 size={13} /> Indicadores
            </button>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition shadow-sm"
          >
            <Plus size={15} /> Nova Ação
          </button>
        </div>
      </div>

      {/* Aba Indicadores */}
      {aba === "indicadores" && <PlanoAcaoIndicadores planos={planos} />}

      {/* ── Aba Ações ────────────────────────────────────────────────────── */}
      {aba === "acoes" && <>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Em andamento", val: totais.emAndamento, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Pendentes",    val: totais.pendentes,    color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Concluídos",   val: totais.concluidos,   color: "text-green-700", bg: "bg-green-50" },
          { label: "Alta prior. abertos", val: totais.alta, color: "text-red-700", bg: "bg-red-50" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-xl border border-gray-100 p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todas as prioridades</option>
          <option value="ALTA">🔴 Alta</option>
          <option value="MEDIA">🟡 Média</option>
          <option value="BAIXA">🟢 Baixa</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 self-center">{ordenados.length} ação(ões)</span>
      </div>

      {/* Lista de planos */}
      {ordenados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum plano de ação encontrado.</p>
          <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">Criar o primeiro plano →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenados.map((p) => {
            const prio = PRIORIDADE_CONFIG[p.prioridade]
            const sts = STATUS_CONFIG[p.status]
            const StsIcon = sts.icon
            const vencido = p.status !== "CONCLUIDO" && p.status !== "CANCELADO" && new Date(p.quando) < hoje
            const isExpanded = expanded === p.id

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm transition-all ${
                  vencido ? "border-red-200" : "border-gray-100"
                }`}
              >
                {/* Linha de prioridade */}
                <div className={`h-1 rounded-t-2xl ${prio.dot}`} />

                <div className="p-4">
                  {/* Row principal */}
                  <div className="flex items-start gap-3">
                    {/* Ícone de prioridade */}
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${prio.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm leading-snug">{p.oQue}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Quem — destaque */}
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                              👤 {p.quem}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${prio.bg} ${prio.color}`}>
                              {prio.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sts.bg} ${sts.color}`}>
                              <StsIcon size={11} />
                              {sts.label}
                            </span>
                            {vencido && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                                <AlertTriangle size={11} /> Vencido
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Prazo + ações rápidas */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">
                            📅 {format(new Date(p.quando), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-600 transition p-1">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 transition p-1">
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : p.id)}
                            className="text-gray-400 hover:text-gray-700 transition p-1"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${p.progresso}%`,
                              background: p.progresso >= 100 ? "#22c55e" : p.progresso >= 50 ? "#3b82f6" : "#f59e0b",
                            }}
                          />
                        </div>
                        {editProgresso?.id === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={0} max={100}
                              value={editProgresso.val}
                              onChange={(e) => setEditProgresso({ id: p.id, val: Number(e.target.value) })}
                              className="w-14 border rounded px-1 py-0.5 text-xs text-center"
                            />
                            <button onClick={() => handleProgresso(p.id, editProgresso.val)} className="text-xs text-blue-600 font-medium hover:underline">OK</button>
                            <button onClick={() => setEditProgresso(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditProgresso({ id: p.id, val: p.progresso })}
                            className="text-xs text-gray-500 hover:text-blue-600 font-medium w-12 text-right"
                          >
                            {p.progresso}%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhe expandido */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: "❓ Por quê", val: p.porQue },
                          { label: "📍 Onde", val: p.onde },
                          { label: "🛠️ Como", val: p.como },
                          { label: "💰 Custo estimado", val: p.quantoCusta != null ? `R$ ${p.quantoCusta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className="text-sm text-gray-700">{val}</p>
                          </div>
                        ))}
                      </div>
                      {p.observacao && (
                        <div className="bg-yellow-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-0.5">📝 Observação</p>
                          <p className="text-sm text-gray-700">{p.observacao}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Criado por {p.criadoPor.name} • {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                        {p.dataConclusao && (
                          <span className="text-green-600">Concluído em {format(new Date(p.dataConclusao), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                      </div>

                      {/* Ações de status */}
                      {p.status !== "CONCLUIDO" && p.status !== "CANCELADO" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {p.status === "PENDENTE" && (
                            <button
                              onClick={() => handleStatus(p.id, "EM_ANDAMENTO")}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition font-medium"
                            >
                              ▶ Iniciar
                            </button>
                          )}
                          {p.status === "EM_ANDAMENTO" && (
                            <button
                              onClick={() => handleStatus(p.id, "PENDENTE")}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                            >
                              ⏸ Pausar
                            </button>
                          )}
                          <button
                            onClick={() => handleStatus(p.id, "CONCLUIDO")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium"
                          >
                            ✓ Concluir
                          </button>
                          <button
                            onClick={() => handleStatus(p.id, "CANCELADO")}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                          >
                            ✕ Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      </> /* fim aba acoes */}

      {/* Modal de criação/edição — sempre visível independente da aba */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-blue-700" />
              <h3 className="font-bold text-gray-800 text-lg">{editId ? "Editar Plano de Ação" : "Novo Plano de Ação"}</h3>
            </div>

            {/* Prioridade — destaque */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridade</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ALTA", "MEDIA", "BAIXA"] as const).map((p) => {
                  const cfg = PRIORIDADE_CONFIG[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, prioridade: p }))}
                      className={`py-2 rounded-xl border-2 text-sm font-medium transition ${
                        form.prioridade === p
                          ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                          : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              {/* 5W */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">5W — O quê, Por quê, Quem, Onde, Quando</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    O que será feito? <span className="text-red-500">*</span>
                  </label>
                  <input value={form.oQue} onChange={(e) => setForm((f) => ({ ...f, oQue: e.target.value }))}
                    placeholder="Descreva a ação a ser realizada"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Por quê? <span className="text-red-500">*</span>
                  </label>
                  <input value={form.porQue} onChange={(e) => setForm((f) => ({ ...f, porQue: e.target.value }))}
                    placeholder="Justificativa ou problema a resolver"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quem? (responsável) <span className="text-red-500">*</span>
                    </label>
                    <input value={form.quem} onChange={(e) => setForm((f) => ({ ...f, quem: e.target.value }))}
                      placeholder="Nome do responsável"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Onde? <span className="text-red-500">*</span>
                    </label>
                    <input value={form.onde} onChange={(e) => setForm((f) => ({ ...f, onde: e.target.value }))}
                      placeholder="Local de execução"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quando? (prazo) <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={form.quando} onChange={(e) => setForm((f) => ({ ...f, quando: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* 2H */}
              <div className="bg-green-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">2H — Como, Quanto custa</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Como será feito? <span className="text-red-500">*</span>
                  </label>
                  <textarea value={form.como} onChange={(e) => setForm((f) => ({ ...f, como: e.target.value }))}
                    rows={2} placeholder="Descreva o método ou plano de execução"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quanto custa? (R$) — opcional</label>
                  <input type="number" min="0" step="0.01" value={form.quantoCusta}
                    onChange={(e) => setForm((f) => ({ ...f, quantoCusta: e.target.value }))}
                    placeholder="0,00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observação — opcional</label>
                <textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  rows={2} placeholder="Notas adicionais"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {msg && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{msg}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => { setShowForm(false); setMsg("") }}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition">
                {saving ? "Salvando…" : editId ? "Salvar alterações" : "Criar plano"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
