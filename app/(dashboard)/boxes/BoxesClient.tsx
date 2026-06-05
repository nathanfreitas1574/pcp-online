"use client"

import { useState } from "react"
import { Plus, Search, Box as BoxIcon } from "lucide-react"

type Box = {
  id: string
  codigo: string
  descricao: string
  localizacao: string
  capacidade: number
  produtos: { produto: { descricao: string } }[]
  lacres: { status: string }[]
  _count: { auditorias: number }
}

export default function BoxesClient({ boxes }: { boxes: Box[] }) {
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ codigo: "", descricao: "", localizacao: "", capacidade: "" })
  const [loading, setLoading] = useState(false)

  const filtered = boxes.filter(
    (b) =>
      b.codigo.toLowerCase().includes(search.toLowerCase()) ||
      b.descricao.toLowerCase().includes(search.toLowerCase()) ||
      b.localizacao.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacidade: Number(form.capacidade) }),
    })
    setLoading(false)
    setShowModal(false)
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Box</h2>
          <p className="text-gray-500 text-sm mt-1">{boxes.length} boxes cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Novo Box
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou localização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((box) => {
          const ultimoLacre = box.lacres[0]
          const statusColor =
            ultimoLacre?.status === "FECHADO"
              ? "bg-green-100 text-green-700"
              : ultimoLacre?.status === "NAO_CONFORME"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"

          return (
            <div key={box.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                    <BoxIcon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{box.codigo}</p>
                    <p className="text-sm text-gray-500">{box.descricao}</p>
                  </div>
                </div>
                {ultimoLacre && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                    {ultimoLacre.status}
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Localização</p>
                  <p className="font-medium text-gray-700">{box.localizacao}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Capacidade</p>
                  <p className="font-medium text-gray-700">{box.capacidade}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Produtos</p>
                  <p className="font-medium text-gray-700">{box.produtos.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Auditorias</p>
                  <p className="font-medium text-gray-700">{box._count.auditorias}</p>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            Nenhum box encontrado.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Novo Box</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { name: "codigo", label: "Código" },
                { name: "descricao", label: "Descrição" },
                { name: "localizacao", label: "Localização" },
                { name: "capacidade", label: "Capacidade", type: "number" },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    value={form[name as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
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
