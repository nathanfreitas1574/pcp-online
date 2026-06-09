"use client"

import { useState, useEffect } from "react"
import { MessageSquare, CheckSquare, Square, Plus, Trash2, Send, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Comentario = {
  id: string
  texto: string
  createdAt: string | Date
  autor: { id: string; name: string }
}

type Tarefa = {
  id: string
  descricao: string
  responsavel: string | null
  prazo: string | Date | null
  concluida: boolean
  ordem: number
}

export default function PlanoAcaoDetalhe({
  planoId,
  onProgressoChange,
}: {
  planoId: string
  onProgressoChange?: (novoProgresso: number, plano: unknown) => void
}) {
  const [aba, setAba] = useState<"tarefas" | "comentarios">("tarefas")

  // ── Tarefas ────────────────────────────────────────────────────────────────
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loadingTarefas, setLoadingTarefas] = useState(true)
  const [novaDescricao, setNovaDescricao] = useState("")
  const [novaResponsavel, setNovaResponsavel] = useState("")
  const [novoPrazo, setNovoPrazo] = useState("")
  const [addingTarefa, setAddingTarefa] = useState(false)
  const [showFormTarefa, setShowFormTarefa] = useState(false)

  // ── Comentários ────────────────────────────────────────────────────────────
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loadingComent, setLoadingComent] = useState(true)
  const [novoComent, setNovoComent] = useState("")
  const [sendingComent, setSendingComent] = useState(false)

  // Carregar tarefas
  useEffect(() => {
    setLoadingTarefas(true)
    fetch(`/api/plano-acao/${planoId}/tarefas`)
      .then(r => r.json())
      .then(d => setTarefas(d.tarefas ?? []))
      .finally(() => setLoadingTarefas(false))
  }, [planoId])

  // Carregar comentários
  useEffect(() => {
    setLoadingComent(true)
    fetch(`/api/plano-acao/${planoId}/comentarios`)
      .then(r => r.json())
      .then(d => setComentarios(d.comentarios ?? []))
      .finally(() => setLoadingComent(false))
  }, [planoId])

  async function toggleTarefa(t: Tarefa) {
    const res = await fetch(`/api/plano-acao/${planoId}/tarefas/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluida: !t.concluida }),
    })
    if (res.ok) {
      const data = await res.json()
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, concluida: !x.concluida } : x))
      onProgressoChange?.(data.plano.progresso, data.plano)
    }
  }

  async function deleteTarefa(tarefaId: string) {
    const res = await fetch(`/api/plano-acao/${planoId}/tarefas/${tarefaId}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setTarefas(prev => prev.filter(x => x.id !== tarefaId))
      onProgressoChange?.(data.plano.progresso, data.plano)
    }
  }

  async function addTarefa() {
    if (!novaDescricao.trim()) return
    setAddingTarefa(true)
    const res = await fetch(`/api/plano-acao/${planoId}/tarefas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: novaDescricao,
        responsavel: novaResponsavel || null,
        prazo: novoPrazo || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setTarefas(prev => [...prev, data.tarefa])
      setNovaDescricao("")
      setNovaResponsavel("")
      setNovoPrazo("")
      setShowFormTarefa(false)
    }
    setAddingTarefa(false)
  }

  async function addComentario() {
    if (!novoComent.trim()) return
    setSendingComent(true)
    const res = await fetch(`/api/plano-acao/${planoId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: novoComent }),
    })
    if (res.ok) {
      const data = await res.json()
      setComentarios(prev => [...prev, data.comentario])
      setNovoComent("")
    }
    setSendingComent(false)
  }

  const concluidas = tarefas.filter(t => t.concluida).length
  const total = tarefas.length

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Abas internas */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setAba("tarefas")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            aba === "tarefas" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CheckSquare size={13} />
          Checklist
          {total > 0 && (
            <span className={`ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
              concluidas === total ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {concluidas}/{total}
            </span>
          )}
        </button>
        <button
          onClick={() => setAba("comentarios")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            aba === "comentarios" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <MessageSquare size={13} />
          Comentários
          {comentarios.length > 0 && (
            <span className="ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {comentarios.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Checklist ───────────────────────────────────────────────────────── */}
      {aba === "tarefas" && (
        <div className="space-y-1.5">
          {loadingTarefas ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : tarefas.length === 0 && !showFormTarefa ? (
            <p className="text-xs text-gray-400 italic">Nenhuma etapa adicionada ainda.</p>
          ) : (
            tarefas.map(t => (
              <div key={t.id} className={`flex items-start gap-2 rounded-xl px-3 py-2 group transition ${
                t.concluida ? "bg-green-50" : "bg-gray-50"
              }`}>
                <button onClick={() => toggleTarefa(t)} className="mt-0.5 shrink-0 text-gray-400 hover:text-blue-600 transition">
                  {t.concluida
                    ? <CheckSquare size={16} className="text-green-600" />
                    : <Square size={16} />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t.concluida ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {t.descricao}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.responsavel && (
                      <span className="text-xs text-gray-400">👤 {t.responsavel}</span>
                    )}
                    {t.prazo && (
                      <span className="text-xs text-gray-400">
                        📅 {format(new Date(t.prazo), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTarefa(t.id)}
                  className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}

          {/* Formulário nova tarefa */}
          {showFormTarefa ? (
            <div className="bg-blue-50 rounded-xl p-3 space-y-2 border border-blue-100">
              <input
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                placeholder="Descrição da etapa*"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === "Enter" && addTarefa()}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={novaResponsavel}
                  onChange={e => setNovaResponsavel(e.target.value)}
                  placeholder="Responsável (opcional)"
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={novoPrazo}
                  onChange={e => setNovoPrazo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addTarefa} disabled={addingTarefa || !novaDescricao.trim()}
                  className="text-xs px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition">
                  {addingTarefa ? "Salvando…" : "Adicionar"}
                </button>
                <button onClick={() => { setShowFormTarefa(false); setNovaDescricao("") }}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFormTarefa(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition mt-1"
            >
              <Plus size={13} /> Adicionar etapa
            </button>
          )}
        </div>
      )}

      {/* ── Comentários ─────────────────────────────────────────────────────── */}
      {aba === "comentarios" && (
        <div className="space-y-3">
          {loadingComent ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhum comentário ainda. Seja o primeiro.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comentarios.map(c => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {c.autor.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{c.autor.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {format(new Date(c.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.texto}</p>
                </div>
              ))}
            </div>
          )}

          {/* Input novo comentário */}
          <div className="flex gap-2">
            <input
              value={novoComent}
              onChange={e => setNovoComent(e.target.value)}
              placeholder="Escreva um comentário ou atualização…"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && addComentario()}
            />
            <button
              onClick={addComentario}
              disabled={sendingComent || !novoComent.trim()}
              className="p-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 transition"
            >
              {sendingComent ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
