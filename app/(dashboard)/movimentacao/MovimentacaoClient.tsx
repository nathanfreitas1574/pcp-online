"use client"

import { useState } from "react"
import { Plus, Truck, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Item = { produto: { codigo: string; descricao: string }; quantidade: number }
type Movimentacao = {
  id: string
  tipo: string
  status: string
  origem: string | null
  destino: string | null
  dataPrevista: string | Date
  dataRealizada: string | Date | null
  viagens: number
  observacao: string | null
  usuario: { name: string }
  itens: Item[]
}
type Produto = { id: string; codigo: string; descricao: string; unidade: string }

const STATUS_COLORS: Record<string, string> = {
  PROGRAMADA: "bg-yellow-100 text-yellow-700",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  CONCLUIDA: "bg-green-100 text-green-700",
  CANCELADA: "bg-red-100 text-red-700",
}

export default function MovimentacaoClient({
  movimentacoes,
  produtos,
}: {
  movimentacoes: Movimentacao[]
  produtos: Produto[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Movimentacao | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [form, setForm] = useState({
    tipo: "TRANSFERENCIA",
    origem: "",
    destino: "",
    dataPrevista: new Date().toISOString().split("T")[0],
    viagens: "1",
    observacao: "",
  })
  const [itens, setItens] = useState([{ produtoId: "", quantidade: "" }])

  const filtered =
    filtroStatus === "TODOS" ? movimentacoes : movimentacoes.filter((m) => m.status === filtroStatus)

  function addItem() {
    setItens((prev) => [...prev, { produtoId: "", quantidade: "" }])
  }

  function updateItem(i: number, field: string, value: string) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/movimentacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        viagens: Number(form.viagens),
        itens: itens.map((it) => ({ produtoId: it.produtoId, quantidade: Number(it.quantidade) })),
      }),
    })
    setLoading(false)
    setShowModal(false)
    window.location.reload()
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/movimentacao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Movimentação Interna</h2>
          <p className="text-gray-500 text-sm mt-1">Pré-programação PCP e controle de viagens</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/api/exportar/movimentacoes", "_blank")}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Nova Movimentação
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["TODOS", "PROGRAMADA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroStatus === s
                ? "bg-blue-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "TODOS" ? "Todos" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition ${
                selected?.id === m.id ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-100"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-blue-600" />
                  <span className="font-medium text-gray-800">{m.tipo}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>
                  {m.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {m.origem ?? "—"} → {m.destino ?? "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {format(new Date(m.dataPrevista), "dd/MM/yyyy", { locale: ptBR })} · {m.viagens} viagem(ns)
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma movimentação.</div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  {selected.tipo} — {selected.origem ?? "—"} → {selected.destino ?? "—"}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                  {selected.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Viagens</p>
                  <p className="font-medium">{selected.viagens}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Data Prevista</p>
                  <p className="font-medium">{format(new Date(selected.dataPrevista), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Responsável</p>
                  <p className="font-medium">{selected.usuario.name}</p>
                </div>
              </div>

              {selected.observacao && (
                <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  {selected.observacao}
                </p>
              )}

              <table className="w-full text-sm mb-4">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Produto</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{it.produto.codigo} — {it.produto.descricao}</td>
                      <td className="px-3 py-2 text-right font-medium">{it.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selected.status === "PROGRAMADA" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, "EM_ANDAMENTO")}
                    className="px-4 py-1.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
                  >
                    Iniciar
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, "CANCELADA")}
                    className="px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {selected.status === "EM_ANDAMENTO" && (
                <button
                  onClick={() => updateStatus(selected.id, "CONCLUIDA")}
                  className="px-4 py-1.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
                >
                  Concluir
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              Selecione uma movimentação para ver os detalhes.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg my-8">
            <h3 className="font-bold text-gray-800 mb-4">Nova Movimentação</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Viagens</label>
                  <input
                    type="number"
                    min="1"
                    value={form.viagens}
                    onChange={(e) => setForm((f) => ({ ...f, viagens: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <input
                    type="text"
                    value={form.origem}
                    onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Setor / Armazém"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <input
                    type="text"
                    value={form.destino}
                    onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Setor / Armazém"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Prevista</label>
                <input
                  type="date"
                  value={form.dataPrevista}
                  onChange={(e) => setForm((f) => ({ ...f, dataPrevista: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Itens</label>
                  <button type="button" onClick={addItem} className="text-blue-600 text-xs hover:underline">
                    + Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {itens.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={it.produtoId}
                        onChange={(e) => updateItem(i, "produtoId", e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Produto...</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.codigo} — {p.descricao}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={it.quantidade}
                        onChange={(e) => updateItem(i, "quantidade", e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
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
