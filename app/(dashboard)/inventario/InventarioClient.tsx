"use client"

import { useState } from "react"
import { Plus, ClipboardList, Search, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type InventarioItem = {
  id: string
  qtdSistema: number
  qtdContada: number
  diferenca: number
  ajustado: boolean
  produto: { codigo: string; descricao: string; unidade: string }
  usuario: { name: string }
}
type Inventario = { id: string; tipo: string; data: Date | string; status: string; itens: InventarioItem[] }
type Box = { id: string; codigo: string; descricao: string; localizacao: string; capacidade: number }
type Produto = { id: string; codigo: string; descricao: string; unidade: string }
type Cliente = { id: string; codigo: string; nome: string }

type ItemForm = {
  boxId: string
  produtoId: string
  clienteNome: string
  qtdSistema: string
  qtdContada: string
}

const statusColor = (s: string) =>
  s === "CONCLUIDO" ? "bg-green-100 text-green-700" :
  s === "AJUSTADO" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"

export default function InventarioClient({
  inventarios: inicial,
  boxes,
  produtos,
  clientes,
  userId,
}: {
  inventarios: Inventario[]
  boxes: Box[]
  produtos: Produto[]
  clientes: Cliente[]
  userId: string
}) {
  const [inventarios, setInventarios] = useState(inicial)
  const [selected, setSelected] = useState<Inventario | null>(inicial[0] ?? null)
  const [showNew, setShowNew] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [tipo, setTipo] = useState("DIARIO")
  const [saving, setSaving] = useState(false)
  const [searchItem, setSearchItem] = useState("")

  const emptyItem: ItemForm = { boxId: "", produtoId: "", clienteNome: "", qtdSistema: "", qtdContada: "" }
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem)
  const [itensNovos, setItensNovos] = useState<ItemForm[]>([])

  // Adicionar linha ao lote
  function addLinha() { setItensNovos((p) => [...p, emptyItem]) }
  function updateLinha(i: number, field: keyof ItemForm, val: string) {
    setItensNovos((p) => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }
  function removeLinha(i: number) { setItensNovos((p) => p.filter((_, idx) => idx !== i)) }

  // Criação do inventário
  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, data: new Date().toISOString() }),
    })
    const novo = await res.json()
    const comItens = { ...novo, itens: [] }
    setInventarios((p) => [comItens, ...p])
    setSelected(comItens)
    setSaving(false)
    setShowNew(false)
  }

  // Lançar itens em lote
  async function handleSalvarItens(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)

    const linhas = itensNovos.length > 0 ? itensNovos : [itemForm]
    const results: InventarioItem[] = []

    for (const it of linhas) {
      if (!it.produtoId) continue
      const qtdS = parseFloat(it.qtdSistema) || 0
      const qtdC = parseFloat(it.qtdContada) || 0
      const res = await fetch("/api/inventario/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventarioId: selected.id,
          produtoId: it.produtoId,
          boxId: it.boxId || null,
          clienteNome: it.clienteNome || null,
          qtdSistema: qtdS,
          qtdContada: qtdC,
          diferenca: qtdC - qtdS,
          usuarioId: userId,
        }),
      })
      const item = await res.json()
      results.push(item)
    }

    setInventarios((prev) =>
      prev.map((inv) =>
        inv.id === selected.id
          ? { ...inv, itens: [...inv.itens, ...results] }
          : inv
      )
    )
    setSelected((prev) =>
      prev ? { ...prev, itens: [...prev.itens, ...results] } : prev
    )
    setItensNovos([])
    setItemForm(emptyItem)
    setSaving(false)
    setShowAddItem(false)
  }

  // Ajustar item
  async function handleAjustar(itemId: string) {
    await fetch(`/api/inventario/item/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ajustado: true }),
    })
    setSelected((prev) =>
      prev
        ? { ...prev, itens: prev.itens.map((it) => it.id === itemId ? { ...it, ajustado: true } : it) }
        : prev
    )
  }

  // Concluir inventário
  async function handleConcluir() {
    if (!selected) return
    await fetch(`/api/inventario/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONCLUIDO" }),
    })
    const updated = { ...selected, status: "CONCLUIDO" }
    setInventarios((p) => p.map((i) => i.id === selected.id ? updated : i))
    setSelected(updated)
  }

  const itensFiltrados = (selected?.itens ?? []).filter(
    (it) =>
      it.produto.descricao.toLowerCase().includes(searchItem.toLowerCase()) ||
      it.produto.codigo.toLowerCase().includes(searchItem.toLowerCase())
  )

  const temDivergencia = selected?.itens.some((it) => it.diferenca !== 0 && !it.ajustado)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventário</h2>
          <p className="text-gray-500 text-sm mt-0.5">Contagem diária e mensal por box</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> Novo Inventário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lista de inventários */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase px-1 mb-2">Histórico</p>
          {inventarios.map((inv) => (
            <button
              key={inv.id}
              onClick={() => { setSelected(inv); setSearchItem("") }}
              className={`w-full text-left bg-white rounded-xl border p-3.5 shadow-sm transition ${selected?.id === inv.id ? "border-blue-500 ring-1 ring-blue-400" : "border-gray-100 hover:border-gray-200"}`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <ClipboardList size={14} className="text-blue-600" />
                  <span className="font-semibold text-gray-800 text-sm">{inv.tipo}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
              </div>
              <p className="text-xs text-gray-500">{format(new Date(inv.data), "dd/MM/yyyy", { locale: ptBR })}</p>
              <p className="text-xs text-gray-400 mt-0.5">{inv.itens.length} itens · {inv.itens.filter((i) => i.diferenca !== 0).length} divergências</p>
            </button>
          ))}
          {inventarios.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum inventário ainda.</div>
          )}
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              {/* Header do inventário */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-bold text-gray-800">
                    Inventário {selected.tipo} — {format(new Date(selected.data), "dd/MM/yyyy", { locale: ptBR })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selected.itens.length} itens ·{" "}
                    {selected.itens.filter((i) => i.diferenca !== 0 && !i.ajustado).length} divergências não ajustadas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/api/exportar/inventario?id=${selected.id}`, "_blank")}
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                  >
                    <FileSpreadsheet size={13} /> Exportar Excel
                  </button>
                  {temDivergencia && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg">
                      <AlertTriangle size={12} /> Divergências pendentes
                    </span>
                  )}
                  {selected.status === "ABERTO" && (
                    <>
                      <button
                        onClick={() => { setItensNovos([emptyItem]); setShowAddItem(true) }}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700"
                      >
                        <Plus size={13} /> Lançar Itens
                      </button>
                      <button
                        onClick={handleConcluir}
                        className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-800"
                      >
                        <CheckCircle size={13} /> Concluir
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Busca */}
              <div className="px-4 py-3 border-b">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tabela de itens */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Box", "Produto", "Cliente", "Unid.", "Qtd Sistema", "Qtd Contada", "Diferença", "Ajustado", "Operador"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {itensFiltrados.map((it) => (
                      <tr key={it.id} className={it.diferenca !== 0 && !it.ajustado ? "bg-red-50" : it.ajustado ? "bg-green-50" : "hover:bg-gray-50"}>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">—</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800 text-xs">{it.produto.codigo}</p>
                          <p className="text-gray-500 text-xs">{it.produto.descricao}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                        <td className="px-3 py-2.5 text-xs text-center text-gray-500">{it.produto.unidade}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{it.qtdSistema.toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-800">{it.qtdContada.toLocaleString("pt-BR")}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${it.diferenca > 0 ? "text-green-700" : it.diferenca < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {it.diferenca > 0 ? "+" : ""}{it.diferenca.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {it.ajustado ? (
                            <span className="text-xs text-green-600 font-medium">✓ Sim</span>
                          ) : it.diferenca !== 0 ? (
                            <button onClick={() => handleAjustar(it.id)} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Ajustar</button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{it.usuario.name}</td>
                      </tr>
                    ))}
                    {itensFiltrados.length === 0 && (
                      <tr><td colSpan={9} className="py-10 text-center text-gray-400 text-sm">
                        {selected.status === "ABERTO" ? 'Clique em "Lançar Itens" para adicionar a contagem.' : "Nenhum item neste inventário."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
              <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
              <p>Selecione ou crie um inventário</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Inventário */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-5">Novo Inventário</h3>
            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {["DIARIO", "MENSAL"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${tipo === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      {t === "DIARIO" ? "📋 Diário" : "📊 Mensal"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400">Data: {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "Criando…" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Itens */}
      {showAddItem && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Lançar Contagem</h3>
            <p className="text-sm text-gray-500 mb-5">Inventário {selected.tipo} — {format(new Date(selected.data), "dd/MM/yyyy", { locale: ptBR })}</p>

            <form onSubmit={handleSalvarItens}>
              <div className="space-y-3">
                {itensNovos.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {/* Box */}
                    <div className="col-span-2">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Box</label>}
                      <select
                        value={it.boxId}
                        onChange={(e) => updateLinha(i, "boxId", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Nenhum</option>
                        {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                      </select>
                    </div>

                    {/* Produto */}
                    <div className="col-span-4">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Produto <span className="text-red-500">*</span></label>}
                      <select
                        value={it.produtoId}
                        onChange={(e) => updateLinha(i, "produtoId", e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione o produto...</option>
                        {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
                      </select>
                    </div>

                    {/* Cliente */}
                    <div className="col-span-2">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Cliente</label>}
                      <select
                        value={it.clienteNome}
                        onChange={(e) => updateLinha(i, "clienteNome", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Todos</option>
                        {clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo}</option>)}
                      </select>
                    </div>

                    {/* Qtd Sistema */}
                    <div className="col-span-2">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Qtd Sistema</label>}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.qtdSistema}
                        onChange={(e) => updateLinha(i, "qtdSistema", e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Qtd Contada */}
                    <div className="col-span-1">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Contada <span className="text-red-500">*</span></label>}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.qtdContada}
                        onChange={(e) => updateLinha(i, "qtdContada", e.target.value)}
                        required
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Diferença calculada */}
                    <div className="col-span-1 flex flex-col justify-end pb-0.5">
                      {i === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Δ</label>}
                      <div className={`text-right text-xs font-bold py-2 ${
                        (parseFloat(it.qtdContada) || 0) - (parseFloat(it.qtdSistema) || 0) < 0 ? "text-red-600" :
                        (parseFloat(it.qtdContada) || 0) - (parseFloat(it.qtdSistema) || 0) > 0 ? "text-green-600" : "text-gray-300"
                      }`}>
                        {((parseFloat(it.qtdContada) || 0) - (parseFloat(it.qtdSistema) || 0)).toFixed(1)}
                      </div>
                    </div>

                    {/* Remover */}
                    <div className="col-span-12 flex justify-end mt-1">
                      {itensNovos.length > 1 && (
                        <button type="button" onClick={() => removeLinha(i)} className="text-xs text-red-400 hover:text-red-600">Remover linha</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLinha}
                className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={14} /> Adicionar linha
              </button>

              <div className="flex gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => setShowAddItem(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                  {saving ? "Salvando…" : `Salvar ${itensNovos.length} item(ns)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
