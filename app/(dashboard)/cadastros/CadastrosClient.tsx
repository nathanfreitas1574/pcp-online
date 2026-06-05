"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Search, Package, Users, BoxIcon, Check, X } from "lucide-react"

type Produto = { id: string; codigo: string; descricao: string; unidade: string; ativo: boolean }
type Cliente = { id: string; codigo: string; nome: string; cnpj: string | null; ativo: boolean }
type Box = { id: string; codigo: string; descricao: string; localizacao: string; capacidade: number; ativo: boolean }

type Tab = "produtos" | "clientes" | "boxes"

function Badge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      {ativo ? <Check size={11} /> : <X size={11} />}
      {ativo ? "Ativo" : "Inativo"}
    </span>
  )
}

// ─── Produtos ────────────────────────────────────────────────────────────────
function ProdutosTab({ produtos: inicial }: { produtos: Produto[] }) {
  const [produtos, setProdutos] = useState(inicial)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [form, setForm] = useState({ codigo: "", descricao: "", unidade: "TON" })
  const [saving, setSaving] = useState(false)

  const filtered = produtos.filter(
    (p) =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.descricao.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setForm({ codigo: "", descricao: "", unidade: "TON" })
    setShowModal(true)
  }

  function openEdit(p: Produto) {
    setEditing(p)
    setForm({ codigo: p.codigo, descricao: p.descricao, unidade: p.unidade })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      const res = await fetch(`/api/produtos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const updated = await res.json()
      setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const novo = await res.json()
      setProdutos((prev) => [...prev, novo].sort((a, b) => a.descricao.localeCompare(b.descricao)))
    }
    setSaving(false)
    setShowModal(false)
  }

  async function handleInativar(id: string) {
    await fetch(`/api/produtos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: false }),
    })
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: false } : p)))
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={15} /> Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Código", "Descrição", "Unidade", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <tr key={p.id} className={`hover:bg-gray-50 ${!p.ativo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.codigo}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{p.descricao}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">{p.unidade}</span>
                </td>
                <td className="px-4 py-3"><Badge ativo={p.ativo} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition">
                      <Pencil size={14} />
                    </button>
                    {p.ativo && (
                      <button onClick={() => handleInativar(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-5">{editing ? "Editar Produto" : "Novo Produto"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    required
                    placeholder="Ex: UREIA46"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["TON", "KG", "UN", "BB", "SC"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-red-500">*</span></label>
                <input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  required
                  placeholder="Ex: UREIA 46% GRANULADA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">
                  {saving ? "Salvando…" : editing ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clientes ────────────────────────────────────────────────────────────────
function ClientesTab({ clientes: inicial }: { clientes: Cliente[] }) {
  const [clientes, setClientes] = useState(inicial)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState({ codigo: "", nome: "", cnpj: "" })
  const [saving, setSaving] = useState(false)

  const filtered = clientes.filter(
    (c) =>
      c.codigo.toLowerCase().includes(search.toLowerCase()) ||
      c.nome.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() { setEditing(null); setForm({ codigo: "", nome: "", cnpj: "" }); setShowModal(true) }
  function openEdit(c: Cliente) { setEditing(c); setForm({ codigo: c.codigo, nome: c.nome, cnpj: c.cnpj ?? "" }); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, cnpj: form.cnpj || null }
    if (editing) {
      const res = await fetch(`/api/clientes/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const updated = await res.json()
      setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } else {
      const res = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const novo = await res.json()
      setClientes((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    setSaving(false)
    setShowModal(false)
  }

  async function handleInativar(id: string) {
    await fetch(`/api/clientes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: false }) })
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: false } : c)))
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"><Plus size={15} /> Novo Cliente</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Código", "Nome", "CNPJ", "Status", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 ${!c.ativo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">{c.codigo}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                <td className="px-4 py-3 text-gray-500">{c.cnpj ?? "—"}</td>
                <td className="px-4 py-3"><Badge ativo={c.ativo} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Pencil size={14} /></button>
                    {c.ativo && <button onClick={() => handleInativar(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-5">{editing ? "Editar Cliente" : "Novo Cliente"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
                  <input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} required placeholder="Ex: FTO" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Ex: FERTALVO COMÉRCIO E SERVIÇOS" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "Salvando…" : editing ? "Atualizar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Boxes ───────────────────────────────────────────────────────────────────
function BoxesTab({ boxes }: { boxes: Box[] }) {
  const [search, setSearch] = useState("")
  const filtered = boxes.filter(
    (b) => b.codigo.toLowerCase().includes(search.toLowerCase()) || b.localizacao.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar box..." className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <a href="/boxes" className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"><Plus size={15} /> Novo Box</a>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Código", "Descrição", "Localização", "Capacidade (ton)", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-gray-800">{b.codigo}</td>
                <td className="px-4 py-3 text-gray-600">{b.descricao}</td>
                <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{b.localizacao}</span></td>
                <td className="px-4 py-3 text-right font-medium">{b.capacidade.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3"><Badge ativo={b.ativo} /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nenhum box encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CadastrosClient({ produtos, clientes, boxes }: { produtos: Produto[]; clientes: Cliente[]; boxes: Box[] }) {
  const [tab, setTab] = useState<Tab>("produtos")

  const tabs = [
    { id: "produtos" as Tab, label: "Produtos", icon: Package, count: produtos.filter((p) => p.ativo).length },
    { id: "clientes" as Tab, label: "Clientes", icon: Users, count: clientes.filter((c) => c.ativo).length },
    { id: "boxes" as Tab, label: "Boxes", icon: BoxIcon, count: boxes.length },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Cadastros</h2>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie produtos, clientes e boxes do sistema</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === id ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-800"}`}
          >
            <Icon size={16} />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === id ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {tab === "produtos" && <ProdutosTab produtos={produtos} />}
      {tab === "clientes" && <ClientesTab clientes={clientes} />}
      {tab === "boxes" && <BoxesTab boxes={boxes} />}
    </div>
  )
}
