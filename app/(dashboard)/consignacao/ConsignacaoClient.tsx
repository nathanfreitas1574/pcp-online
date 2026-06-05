"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type ConsignacaoItem = {
  produto: { codigo: string; descricao: string }
  quantidade: number
  valorUnitario: number
  valorTotal: number
  faturado: boolean
}

type Consignacao = {
  id: string
  numeroNF: string
  status: string
  dataEmissao: string | Date
  dataFatura: string | Date | null
  valorTotal: number
  cliente: { nome: string; codigo: string }
  itens: ConsignacaoItem[]
}

type Cliente = { id: string; codigo: string; nome: string }
type Produto = { id: string; codigo: string; descricao: string }

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  FATURADA: "bg-green-100 text-green-700",
  CANCELADA: "bg-red-100 text-red-700",
}

export default function ConsignacaoClient({
  consignacoes,
  clientes,
  produtos,
}: {
  consignacoes: Consignacao[]
  clientes: Cliente[]
  produtos: Produto[]
}) {
  const [selected, setSelected] = useState<Consignacao | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [form, setForm] = useState({
    clienteId: "",
    numeroNF: "",
    dataEmissao: new Date().toISOString().split("T")[0],
  })
  const [itens, setItens] = useState([{ produtoId: "", quantidade: "", valorUnitario: "" }])

  const filtered =
    filtroStatus === "TODOS" ? consignacoes : consignacoes.filter((c) => c.status === filtroStatus)

  function addItem() {
    setItens((prev) => [...prev, { produtoId: "", quantidade: "", valorUnitario: "" }])
  }

  function updateItem(i: number, field: string, value: string) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const parsedItens = itens.map((it) => ({
      produtoId: it.produtoId,
      quantidade: Number(it.quantidade),
      valorUnitario: Number(it.valorUnitario),
      valorTotal: Number(it.quantidade) * Number(it.valorUnitario),
    }))
    const valorTotal = parsedItens.reduce((sum, it) => sum + it.valorTotal, 0)
    await fetch("/api/consignacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, itens: parsedItens, valorTotal }),
    })
    setLoading(false)
    setShowModal(false)
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Consignação</h2>
          <p className="text-gray-500 text-sm mt-1">NF × Cliente × Produto × Faturamento</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Nova Consignação
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["TODOS", "PENDENTE", "FATURADA", "CANCELADA"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroStatus === s
                ? "bg-blue-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "TODOS" ? "Todos" : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition ${
                selected?.id === c.id ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-100"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-medium text-gray-800">NF {c.numeroNF}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{c.cliente.nome}</p>
              <p className="text-xs text-gray-400 mt-1">
                {format(new Date(c.dataEmissao), "dd/MM/yyyy", { locale: ptBR })} ·{" "}
                {c.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma consignação.</div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">NF {selected.numeroNF}</h3>
                  <p className="text-sm text-gray-500">{selected.cliente.nome}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Emissão</p>
                  <p className="font-medium">{format(new Date(selected.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Fatura</p>
                  <p className="font-medium">
                    {selected.dataFatura
                      ? format(new Date(selected.dataFatura), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Valor Total</p>
                  <p className="font-medium text-green-700">
                    {selected.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Produto</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Qtd</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Vlr Unit.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Faturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">
                        {it.produto.codigo} — {it.produto.descricao}
                      </td>
                      <td className="px-3 py-2 text-right">{it.quantidade}</td>
                      <td className="px-3 py-2 text-right">
                        {it.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {it.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${it.faturado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {it.faturado ? "Sim" : "Não"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              Selecione uma consignação para ver os detalhes.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg my-8">
            <h3 className="font-bold text-gray-800 mb-4">Nova Consignação</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número NF</label>
                  <input
                    type="text"
                    value={form.numeroNF}
                    onChange={(e) => setForm((f) => ({ ...f, numeroNF: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Emissão</label>
                  <input
                    type="date"
                    value={form.dataEmissao}
                    onChange={(e) => setForm((f) => ({ ...f, dataEmissao: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
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
                        className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="R$"
                        value={it.valorUnitario}
                        onChange={(e) => updateItem(i, "valorUnitario", e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm"
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
