"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Search, Package, Users, BoxIcon, Check, X, ArrowRightLeft, ChevronDown, ChevronRight, Pencil as PencilIcon } from "lucide-react"

type Produto  = { id: string; codigo: string; descricao: string; unidade: string; ativo: boolean }
type Cliente  = { id: string; codigo: string; nome: string; cnpj: string | null; ativo: boolean }
type Box      = { id: string; codigo: string; descricao: string; localizacao: string; capacidade: number; ativo: boolean }
type DePara   = {
  id: string
  descricaoOrigem: string
  produtoId: string
  criadoPorNome: string | null
  createdAt: string | Date
  produto: { id: string; codigo: string; descricao: string; unidade: string }
}

type Tab = "produtos" | "clientes" | "boxes" | "depara"

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

// ─── De/Para ──────────────────────────────────────────────────────────────────
function DeParaTab({ depara: inicial, produtos }: { depara: DePara[]; produtos: Produto[] }) {
  const [depara, setDepara]         = useState<DePara[]>(inicial)
  const [search, setSearch]         = useState("")
  const [novaDesc, setNovaDesc]     = useState("")
  const [novaProd, setNovaProd]     = useState("")
  const [saving, setSaving]         = useState(false)
  const [erro, setErro]             = useState("")
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editDesc, setEditDesc]     = useState("")
  const [editProd, setEditProd]     = useState("")
  const [visao, setVisao]           = useState<"agrupado" | "lista">("agrupado")

  // ── Filtrar ────────────────────────────────────────────────────────────────
  const filtered = depara.filter(d =>
    d.descricaoOrigem.toLowerCase().includes(search.toLowerCase()) ||
    d.produto.descricao.toLowerCase().includes(search.toLowerCase()) ||
    d.produto.codigo.toLowerCase().includes(search.toLowerCase())
  )

  // ── Agrupar por produto ────────────────────────────────────────────────────
  const grupos = filtered.reduce<Record<string, { produto: DePara["produto"]; itens: DePara[] }>>((acc, d) => {
    if (!acc[d.produtoId]) acc[d.produtoId] = { produto: d.produto, itens: [] }
    acc[d.produtoId].itens.push(d)
    return acc
  }, {})
  const gruposOrdenados = Object.values(grupos).sort((a, b) =>
    a.produto.descricao.localeCompare(b.produto.descricao)
  )

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ── Adicionar mapeamento ───────────────────────────────────────────────────
  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novaDesc.trim() || !novaProd) return
    setSaving(true); setErro("")
    const res = await fetch("/api/produto-depara", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricaoOrigem: novaDesc.trim(), produtoId: novaProd }),
    })
    if (res.ok) {
      const novo: DePara = await res.json()
      setDepara(prev => [...prev, novo])
      setNovaDesc(""); setNovaProd("")
      // expande o grupo do produto recém-adicionado
      setExpandidos(prev => new Set(prev).add(novo.produtoId))
    } else {
      const d = await res.json()
      setErro(d.error ?? "Erro ao adicionar")
    }
    setSaving(false)
  }

  // ── Excluir ────────────────────────────────────────────────────────────────
  async function handleExcluir(id: string) {
    if (!confirm("Remover este mapeamento?")) return
    await fetch(`/api/produto-depara/${id}`, { method: "DELETE" })
    setDepara(prev => prev.filter(d => d.id !== id))
  }

  // ── Editar inline ──────────────────────────────────────────────────────────
  function openEdit(d: DePara) {
    setEditingId(d.id); setEditDesc(d.descricaoOrigem); setEditProd(d.produtoId)
  }
  async function handleSalvarEdit(id: string) {
    const res = await fetch(`/api/produto-depara/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricaoOrigem: editDesc, produtoId: editProd }),
    })
    if (res.ok) {
      const updated: DePara = await res.json()
      setDepara(prev => prev.map(d => d.id === id ? updated : d))
    }
    setEditingId(null)
  }

  const inp = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-5">

      {/* ── Formulário de adição ── */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-blue-600" />
          Novo mapeamento De/Para
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Associe uma descrição externa (planilha, cliente, ERP) a um produto já cadastrado no sistema.
        </p>
        <form onSubmit={handleAdicionar} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição de origem <span className="text-red-500">*</span></label>
            <input
              value={novaDesc}
              onChange={e => { setNovaDesc(e.target.value); setErro("") }}
              placeholder='Ex: "UREIA 46% GRANULADA PRILLS", "MAP GRAN."…'
              required
              className={`${inp} w-full`}
            />
          </div>
          <div className="flex items-center justify-center pt-4 shrink-0">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
              <span className="text-gray-400 text-sm font-normal hidden sm:block">→</span>
              <ArrowRightLeft size={18} />
              <span className="text-gray-400 text-sm font-normal hidden sm:block">→</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto no sistema <span className="text-red-500">*</span></label>
            <select
              value={novaProd}
              onChange={e => setNovaProd(e.target.value)}
              required
              className={`${inp} w-full`}
            >
              <option value="">Selecione o produto…</option>
              {produtos.filter(p => p.ativo).map(p => (
                <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end shrink-0">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition h-[38px]"
            >
              <Plus size={15} />
              {saving ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        </form>
        {erro && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <X size={12} /> {erro}
          </p>
        )}
      </div>

      {/* ── Filtros e visão ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar descrição ou produto..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {([
            { id: "agrupado", label: "Por Produto" },
            { id: "lista",    label: "Lista completa" },
          ] as const).map(v => (
            <button key={v.id} onClick={() => setVisao(v.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                visao === v.id ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}>
              {v.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">
          <strong className="text-gray-700">{filtered.length}</strong> mapeamento(s) ·{" "}
          <strong className="text-gray-700">{gruposOrdenados.length}</strong> produto(s)
        </span>
      </div>

      {/* ══════════════════════════════════════
          VISÃO AGRUPADA POR PRODUTO
      ══════════════════════════════════════ */}
      {visao === "agrupado" && (
        <div className="space-y-2">
          {gruposOrdenados.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              Nenhum mapeamento encontrado. Adicione o primeiro acima.
            </div>
          )}
          {gruposOrdenados.map(({ produto, itens }) => {
            const aberto = expandidos.has(produto.id)
            return (
              <div key={produto.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabeçalho do grupo */}
                <button
                  onClick={() => toggleExpandido(produto.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                >
                  {aberto ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}

                  {/* badge produto destino */}
                  <span className="flex items-center gap-2 bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shrink-0">
                    <Package size={13} />
                    {produto.codigo}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">{produto.descricao}</span>
                  <span className="text-xs text-gray-400 ml-1">({produto.unidade})</span>

                  <span className="ml-auto flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                    <ArrowRightLeft size={11} />
                    {itens.length} alias{itens.length !== 1 ? "es" : ""}
                  </span>
                </button>

                {/* Itens do grupo */}
                {aberto && (
                  <div className="border-t border-gray-50">
                    {itens.map((d, idx) => (
                      <div key={d.id}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm ${idx % 2 === 0 ? "bg-gray-50/40" : "bg-white"}`}>

                        {/* seta decorativa */}
                        <span className="text-gray-300 font-mono text-xs shrink-0 pl-2">↳</span>

                        {editingId === d.id ? (
                          /* ── Modo edição inline ── */
                          <>
                            <input
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              autoFocus
                            />
                            <select
                              value={editProd}
                              onChange={e => setEditProd(e.target.value)}
                              className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              {produtos.filter(p => p.ativo).map(p => (
                                <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
                              ))}
                            </select>
                            <button onClick={() => handleSalvarEdit(d.id)}
                              className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition" title="Salvar">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Cancelar">
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          /* ── Modo leitura ── */
                          <>
                            <span className="flex-1 text-gray-700 font-mono text-xs bg-gray-100 px-2.5 py-1 rounded">
                              {d.descricaoOrigem}
                            </span>
                            {d.criadoPorNome && (
                              <span className="text-xs text-gray-400 shrink-0 hidden md:block">por {d.criadoPorNome}</span>
                            )}
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEdit(d)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Editar">
                                <PencilIcon size={13} />
                              </button>
                              <button onClick={() => handleExcluir(d.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Remover">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Adicionar alias inline no grupo */}
                    <AddAliasInline
                      produtoId={produto.id}
                      onAdd={novo => {
                        setDepara(prev => [...prev, novo])
                        setExpandidos(prev => new Set(prev).add(produto.id))
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          VISÃO LISTA COMPLETA
      ══════════════════════════════════════ */}
      {visao === "lista" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Descrição de origem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-8 text-center">→</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Produto no sistema</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Criado por</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Nenhum mapeamento encontrado.</td></tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  {editingId === d.id ? (
                    <>
                      <td className="px-4 py-2" colSpan={2}>
                        <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          className="w-full border border-blue-300 rounded px-2 py-1 text-sm" autoFocus />
                      </td>
                      <td className="px-4 py-2">
                        <select value={editProd} onChange={e => setEditProd(e.target.value)}
                          className="border border-blue-300 rounded px-2 py-1 text-sm w-full">
                          {produtos.filter(p => p.ativo).map(p => (
                            <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell" />
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => handleSalvarEdit(d.id)} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check size={13} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded bg-gray-100 text-gray-500"><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 bg-gray-50/60 max-w-xs">
                        {d.descricaoOrigem}
                      </td>
                      <td className="px-2 py-3 text-center text-gray-300 font-bold">→</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 bg-blue-700 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                          <Package size={11} />{d.produto.codigo}
                        </span>
                        <span className="ml-2 text-gray-700 text-sm">{d.produto.descricao}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{d.criadoPorNome ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600"><PencilIcon size={13} /></button>
                          <button onClick={() => handleExcluir(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Adicionar alias diretamente dentro de um grupo já expandido
function AddAliasInline({ produtoId, onAdd }: { produtoId: string; onAdd: (d: DePara) => void }) {
  const [aberto, setAberto]   = useState(false)
  const [desc, setDesc]       = useState("")
  const [saving, setSaving]   = useState(false)
  const [erro, setErro]       = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) return
    setSaving(true); setErro("")
    const res = await fetch("/api/produto-depara", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricaoOrigem: desc.trim(), produtoId }),
    })
    if (res.ok) {
      onAdd(await res.json())
      setDesc(""); setAberto(false)
    } else {
      const d = await res.json(); setErro(d.error ?? "Erro")
    }
    setSaving(false)
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="w-full flex items-center gap-2 px-6 py-2 text-xs text-blue-600 hover:bg-blue-50 transition border-t border-gray-50">
        <Plus size={12} /> Adicionar alias neste produto
      </button>
    )
  }

  return (
    <form onSubmit={submit}
      className="flex items-center gap-2 px-4 py-2.5 border-t border-blue-100 bg-blue-50/40">
      <span className="text-gray-300 font-mono text-xs pl-2 shrink-0">↳</span>
      <input
        value={desc}
        onChange={e => { setDesc(e.target.value); setErro("") }}
        placeholder="Nova descrição de origem…"
        autoFocus
        className="flex-1 border border-blue-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {erro && <span className="text-xs text-red-500 shrink-0">{erro}</span>}
      <button type="submit" disabled={saving}
        className="flex items-center gap-1 bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-800 disabled:opacity-60 shrink-0">
        <Check size={12} />{saving ? "…" : "Salvar"}
      </button>
      <button type="button" onClick={() => { setAberto(false); setErro("") }}
        className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0">
        <X size={13} />
      </button>
    </form>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CadastrosClient({ produtos, clientes, boxes, depara }: {
  produtos: Produto[]
  clientes: Cliente[]
  boxes: Box[]
  depara: DePara[]
}) {
  const [tab, setTab] = useState<Tab>("produtos")

  const tabs = [
    { id: "produtos" as Tab, label: "Produtos",  icon: Package,         count: produtos.filter((p) => p.ativo).length },
    { id: "clientes" as Tab, label: "Clientes",  icon: Users,           count: clientes.filter((c) => c.ativo).length },
    { id: "boxes"    as Tab, label: "Boxes",     icon: BoxIcon,         count: boxes.length },
    { id: "depara"   as Tab, label: "De/Para",   icon: ArrowRightLeft,  count: depara.length },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Cadastros</h2>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie produtos, clientes, boxes e mapeamentos De/Para</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
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
      {tab === "boxes"    && <BoxesTab boxes={boxes} />}
      {tab === "depara"   && <DeParaTab depara={depara} produtos={produtos} />}
    </div>
  )
}
