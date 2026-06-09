"use client"

import { useState } from "react"
import {
  Plus, Pencil, Check, X, Warehouse, Box as BoxIcon,
  MoveRight, ChevronDown, ChevronRight, Trash2,
  AlertTriangle, Settings2, GripVertical,
} from "lucide-react"

type BoxRow = {
  id: string; codigo: string; descricao: string
  capacidade: number; localizacao: string; armazemId: string | null
}
type ArmazemRow = {
  id: string; codigo: string; nome: string
  descricao: string | null; ordem: number; ativo: boolean
  boxes: BoxRow[]
}

const inp = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

// ── Mini formulário inline ─────────────────────────────────────────────────
function InlineEdit({
  value, onSave, onCancel, placeholder = "", type = "text",
}: {
  value: string; onSave: (v: string) => void; onCancel: () => void
  placeholder?: string; type?: string
}) {
  const [v, setV] = useState(value)
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(v) }} className="flex items-center gap-1.5">
      <input type={type} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} autoFocus
        className={`${inp} py-1 px-2 text-xs flex-1 min-w-0`} />
      <button type="submit" className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check size={12} /></button>
      <button type="button" onClick={onCancel} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={12} /></button>
    </form>
  )
}

// ── Linha de um box ────────────────────────────────────────────────────────
function BoxLinha({
  box, armazens, onUpdate, onMover, onRemover,
}: {
  box: BoxRow
  armazens: ArmazemRow[]
  onUpdate: (id: string, data: Partial<BoxRow>) => void
  onMover: (boxId: string, armazemId: string | null) => void
  onRemover: (boxId: string) => void
}) {
  const [editCampo, setEditCampo] = useState<"codigo" | "descricao" | "capacidade" | "localizacao" | null>(null)
  const [showMover, setShowMover] = useState(false)

  async function salvar(campo: string, valor: string) {
    const res = await fetch(`/api/boxes/${box.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: campo === "capacidade" ? Number(valor) : valor }),
    })
    if (res.ok) {
      const u = await res.json()
      onUpdate(box.id, { [campo]: u[campo] })
    }
    setEditCampo(null)
  }

  async function moverPara(armazemId: string | null) {
    await fetch(`/api/boxes/${box.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ armazemId }),
    })
    onMover(box.id, armazemId)
    setShowMover(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50/50 group">
      <GripVertical size={13} className="text-gray-300 shrink-0" />

      {/* Código */}
      <div className="w-24 shrink-0">
        {editCampo === "codigo"
          ? <InlineEdit value={box.codigo} onSave={v => salvar("codigo", v)} onCancel={() => setEditCampo(null)} placeholder="Código" />
          : <button onClick={() => setEditCampo("codigo")} className="font-mono text-xs font-bold text-blue-700 hover:underline">{box.codigo}</button>
        }
      </div>

      {/* Descrição */}
      <div className="flex-1 min-w-0">
        {editCampo === "descricao"
          ? <InlineEdit value={box.descricao} onSave={v => salvar("descricao", v)} onCancel={() => setEditCampo(null)} placeholder="Descrição" />
          : <button onClick={() => setEditCampo("descricao")} className="text-gray-700 hover:underline truncate block text-left text-xs">{box.descricao}</button>
        }
      </div>

      {/* Localização */}
      <div className="w-28 shrink-0 hidden md:block">
        {editCampo === "localizacao"
          ? <InlineEdit value={box.localizacao} onSave={v => salvar("localizacao", v)} onCancel={() => setEditCampo(null)} placeholder="Localização" />
          : <button onClick={() => setEditCampo("localizacao")} className="text-gray-500 text-xs hover:underline">{box.localizacao || "—"}</button>
        }
      </div>

      {/* Capacidade */}
      <div className="w-24 shrink-0 text-right">
        {editCampo === "capacidade"
          ? <InlineEdit value={String(box.capacidade)} onSave={v => salvar("capacidade", v)} onCancel={() => setEditCampo(null)} type="number" placeholder="ton" />
          : <button onClick={() => setEditCampo("capacidade")} className="text-gray-600 text-xs hover:underline font-medium">
              {box.capacidade.toLocaleString("pt-BR")} ton
            </button>
        }
      </div>

      {/* Ações (aparecem no hover) */}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Mover de armazém */}
        <div className="relative">
          <button onClick={() => setShowMover(v => !v)}
            className="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50" title="Mover de armazém">
            <MoveRight size={13} />
          </button>
          {showMover && (
            <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56">
              <p className="text-xs text-gray-500 px-2 pb-1 font-medium">Mover para…</p>
              {armazens.filter(a => a.id !== box.armazemId).map(a => (
                <button key={a.id} onClick={() => moverPara(a.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-blue-50 text-gray-700 hover:text-blue-700">
                  {a.nome}
                </button>
              ))}
              {box.armazemId && (
                <button onClick={() => moverPara(null)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-orange-50 text-gray-500 hover:text-orange-600 border-t border-gray-100 mt-1 pt-1.5">
                  ✕ Remover de armazém
                </button>
              )}
              <button onClick={() => setShowMover(false)} className="w-full text-left px-2 py-1.5 text-xs text-gray-400 mt-1">Cancelar</button>
            </div>
          )}
        </div>

        {/* Inativar box */}
        <button onClick={() => { if (confirm(`Inativar box ${box.codigo}?`)) onRemover(box.id) }}
          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Inativar box">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ArmazensClient({
  armazens: inicial, boxesSemArmazem: initialSem,
}: {
  armazens: ArmazemRow[]
  boxesSemArmazem: BoxRow[]
}) {
  const [armazens, setArmazens] = useState<ArmazemRow[]>(inicial)
  const [boxesSem, setBoxesSem] = useState<BoxRow[]>(initialSem)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(inicial.map(a => a.id)))
  const [editArmazem, setEditArmazem] = useState<string | null>(null)
  const [editCampo, setEditCampo] = useState<"nome" | "codigo" | "descricao" | null>(null)
  const [showNovoArmazem, setShowNovoArmazem] = useState(false)
  const [novoForm, setNovoForm] = useState({ codigo: "", nome: "", descricao: "" })
  const [showNovoBox, setShowNovoBox] = useState<string | null>(null)  // armazemId
  const [novoBoxForm, setNovoBoxForm] = useState({ codigo: "", descricao: "", capacidade: "", localizacao: "" })
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState("")

  function toggleExpandido(id: string) {
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Seed automático ─────────────────────────────────────────────────────
  async function handleSeed() {
    setSeeding(true); setSeedMsg("")
    const res = await fetch("/api/armazens/seed", { method: "POST" })
    if (res.ok) {
      setSeedMsg("Armazéns criados e boxes atribuídos! Recarregando…")
      setTimeout(() => window.location.reload(), 1500)
    } else setSeedMsg("Erro ao executar seed.")
    setSeeding(false)
  }

  // ── Editar armazém ──────────────────────────────────────────────────────
  async function salvarArmazem(id: string, campo: string, valor: string) {
    const res = await fetch(`/api/armazens/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    })
    if (res.ok) {
      const u = await res.json()
      setArmazens(prev => prev.map(a => a.id === id ? { ...a, [campo]: u[campo] } : a))
    }
    setEditArmazem(null); setEditCampo(null)
  }

  async function inativarArmazem(id: string) {
    if (!confirm("Inativar este armazém? Os boxes serão desvinculados.")) return
    await fetch(`/api/armazens/${id}`, { method: "DELETE" })
    setArmazens(prev => prev.filter(a => a.id !== id))
  }

  // ── Novo armazém ────────────────────────────────────────────────────────
  async function criarArmazem(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/armazens", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoForm),
    })
    if (res.ok) {
      const novo: ArmazemRow = await res.json()
      setArmazens(prev => [...prev, novo])
      setExpandidos(prev => new Set(prev).add(novo.id))
      setNovoForm({ codigo: "", nome: "", descricao: "" })
      setShowNovoArmazem(false)
    }
  }

  // ── Novo box ─────────────────────────────────────────────────────────────
  async function criarBox(e: React.FormEvent, armazemId: string) {
    e.preventDefault()
    const res = await fetch("/api/boxes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novoBoxForm, capacidade: Number(novoBoxForm.capacidade), armazemId }),
    })
    if (res.ok) {
      const novo: BoxRow = await res.json()
      setArmazens(prev => prev.map(a => a.id === armazemId ? { ...a, boxes: [...a.boxes, novo].sort((x, y) => x.codigo.localeCompare(y.codigo)) } : a))
      setNovoBoxForm({ codigo: "", descricao: "", capacidade: "", localizacao: "" })
      setShowNovoBox(null)
    }
  }

  // ── Atualizar box na state ────────────────────────────────────────────────
  function updateBox(boxId: string, data: Partial<BoxRow>) {
    setArmazens(prev => prev.map(a => ({ ...a, boxes: a.boxes.map(b => b.id === boxId ? { ...b, ...data } : b) })))
    setBoxesSem(prev => prev.map(b => b.id === boxId ? { ...b, ...data } : b))
  }

  // ── Mover box ─────────────────────────────────────────────────────────────
  function moverBox(boxId: string, novoArmazemId: string | null) {
    // Remove de onde estava
    let box: BoxRow | undefined
    setArmazens(prev => prev.map(a => {
      const found = a.boxes.find(b => b.id === boxId)
      if (found) box = found
      return { ...a, boxes: a.boxes.filter(b => b.id !== boxId) }
    }))
    setBoxesSem(prev => {
      const found = prev.find(b => b.id === boxId)
      if (found) box = found
      return prev.filter(b => b.id !== boxId)
    })
    if (!box) return
    const updated = { ...box, armazemId: novoArmazemId }
    if (novoArmazemId) {
      setArmazens(prev => prev.map(a => a.id === novoArmazemId
        ? { ...a, boxes: [...a.boxes, updated].sort((x, y) => x.codigo.localeCompare(y.codigo)) }
        : a
      ))
    } else {
      setBoxesSem(prev => [...prev, updated].sort((x, y) => x.codigo.localeCompare(y.codigo)))
    }
  }

  // ── Remover box ───────────────────────────────────────────────────────────
  async function removerBox(boxId: string) {
    await fetch(`/api/boxes/${boxId}`, { method: "DELETE" })
    setArmazens(prev => prev.map(a => ({ ...a, boxes: a.boxes.filter(b => b.id !== boxId) })))
    setBoxesSem(prev => prev.filter(b => b.id !== boxId))
  }

  const totalBoxes = armazens.reduce((s, a) => s + a.boxes.length, 0) + boxesSem.length
  const totalCap   = [...armazens.flatMap(a => a.boxes), ...boxesSem].reduce((s, b) => s + b.capacidade, 0)

  return (
    <div className="space-y-5 pb-10">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings2 size={22} className="text-blue-700" />
            Gestão de Armazéns
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {armazens.length} armazéns · {totalBoxes} boxes · {totalCap.toLocaleString("pt-BR")} ton capacidade total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Seed inicial */}
          {(armazens.length === 0 || boxesSem.length > 0) && (
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-2 border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg text-sm font-medium transition">
              <AlertTriangle size={15} />
              {seeding ? "Atribuindo…" : `Atribuir ${boxesSem.length > 0 ? `${boxesSem.length} boxes sem armazém` : "armazéns padrão"}`}
            </button>
          )}
          <button onClick={() => setShowNovoArmazem(v => !v)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={15} /> Novo Armazém
          </button>
        </div>
      </div>

      {seedMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">{seedMsg}</p>}

      {/* ── Novo armazém form ── */}
      {showNovoArmazem && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2"><Warehouse size={16} />Novo Armazém</h3>
          <form onSubmit={criarArmazem} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
              <input value={novoForm.codigo} onChange={e => setNovoForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                required placeholder="Ex: AZ9" className={`${inp} w-full`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input value={novoForm.nome} onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))}
                required placeholder="Ex: Armazém 9" className={`${inp} w-full`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input value={novoForm.descricao} onChange={e => setNovoForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Opcional" className={`${inp} w-full`} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNovoArmazem(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800">Criar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Armazéns ── */}
      {armazens.map(armazem => {
        const aberto = expandidos.has(armazem.id)
        const capTotal = armazem.boxes.reduce((s, b) => s + b.capacidade, 0)

        return (
          <div key={armazem.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Cabeçalho do armazém */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <button onClick={() => toggleExpandido(armazem.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                {aberto ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
              </button>

              {/* Código */}
              <div className="shrink-0">
                {editArmazem === armazem.id && editCampo === "codigo"
                  ? <InlineEdit value={armazem.codigo} onSave={v => salvarArmazem(armazem.id, "codigo", v)} onCancel={() => { setEditArmazem(null); setEditCampo(null) }} />
                  : <button onClick={() => { setEditArmazem(armazem.id); setEditCampo("codigo") }}
                      className="bg-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-blue-600 font-mono">
                      {armazem.codigo}
                    </button>
                }
              </div>

              {/* Nome */}
              <div className="flex-1 min-w-0">
                {editArmazem === armazem.id && editCampo === "nome"
                  ? <InlineEdit value={armazem.nome} onSave={v => salvarArmazem(armazem.id, "nome", v)} onCancel={() => { setEditArmazem(null); setEditCampo(null) }} />
                  : <button onClick={() => { setEditArmazem(armazem.id); setEditCampo("nome") }}
                      className="font-semibold text-gray-800 hover:underline text-left text-sm">
                      {armazem.nome}
                    </button>
                }
              </div>

              {/* Descrição */}
              <div className="flex-1 min-w-0 hidden lg:block">
                {editArmazem === armazem.id && editCampo === "descricao"
                  ? <InlineEdit value={armazem.descricao ?? ""} onSave={v => salvarArmazem(armazem.id, "descricao", v)} onCancel={() => { setEditArmazem(null); setEditCampo(null) }} placeholder="Descrição" />
                  : <button onClick={() => { setEditArmazem(armazem.id); setEditCampo("descricao") }}
                      className="text-gray-500 text-xs hover:underline text-left truncate block">
                      {armazem.descricao || <span className="text-gray-300 italic">Clique para adicionar descrição</span>}
                    </button>
                }
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <BoxIcon size={12} />
                  <strong className="text-gray-700">{armazem.boxes.length}</strong> boxes
                </span>
                <span className="hidden sm:block">
                  <strong className="text-gray-700">{capTotal.toLocaleString("pt-BR")}</strong> ton
                </span>
              </div>

              {/* Ações do armazém */}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setShowNovoBox(showNovoBox === armazem.id ? null : armazem.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                  <Plus size={12} /> Box
                </button>
                <button onClick={() => inativarArmazem(armazem.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Inativar armazém">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Novo box form */}
            {showNovoBox === armazem.id && (
              <form onSubmit={e => criarBox(e, armazem.id)}
                className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Código *</label>
                  <input value={novoBoxForm.codigo} onChange={e => setNovoBoxForm(f => ({ ...f, codigo: e.target.value }))}
                    required placeholder="Ex: B13" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Descrição *</label>
                  <input value={novoBoxForm.descricao} onChange={e => setNovoBoxForm(f => ({ ...f, descricao: e.target.value }))}
                    required placeholder="Box 13" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Localização</label>
                  <input value={novoBoxForm.localizacao} onChange={e => setNovoBoxForm(f => ({ ...f, localizacao: e.target.value }))}
                    placeholder="Ex: Nave" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Capacidade (ton) *</label>
                  <input type="number" value={novoBoxForm.capacidade} onChange={e => setNovoBoxForm(f => ({ ...f, capacidade: e.target.value }))}
                    required placeholder="0" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowNovoBox(null)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:bg-blue-800">
                    <Plus size={12} className="inline mr-1" />Criar Box
                  </button>
                </div>
              </form>
            )}

            {/* Header das colunas */}
            {aberto && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 font-medium">
                <div className="w-4 shrink-0" />
                <div className="w-24 shrink-0">Código</div>
                <div className="flex-1">Descrição</div>
                <div className="w-28 shrink-0 hidden md:block">Localização</div>
                <div className="w-24 shrink-0 text-right">Capacidade</div>
                <div className="w-16 shrink-0" />
              </div>
            )}

            {/* Boxes */}
            {aberto && (
              <div>
                {armazem.boxes.length === 0
                  ? <p className="px-8 py-4 text-sm text-gray-400 italic">Nenhum box neste armazém.</p>
                  : armazem.boxes.map(box => (
                    <BoxLinha key={box.id} box={box} armazens={armazens}
                      onUpdate={updateBox} onMover={moverBox} onRemover={removerBox} />
                  ))
                }
              </div>
            )}
          </div>
        )
      })}

      {/* ── Boxes sem armazém ── */}
      {boxesSem.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <AlertTriangle size={16} className="text-orange-500 shrink-0" />
            <span className="font-semibold text-orange-800 text-sm">Boxes sem armazém atribuído</span>
            <span className="text-xs text-orange-600 ml-1">({boxesSem.length})</span>
            <button onClick={handleSeed} disabled={seeding}
              className="ml-auto text-xs text-orange-700 border border-orange-300 rounded-lg px-2.5 py-1 hover:bg-orange-100">
              {seeding ? "…" : "Atribuir automaticamente"}
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 font-medium">
            <div className="w-4 shrink-0" /><div className="w-24 shrink-0">Código</div>
            <div className="flex-1">Descrição</div>
            <div className="w-28 shrink-0 hidden md:block">Localização</div>
            <div className="w-24 shrink-0 text-right">Capacidade</div>
            <div className="w-16 shrink-0" />
          </div>
          {boxesSem.map(box => (
            <BoxLinha key={box.id} box={box} armazens={armazens}
              onUpdate={updateBox} onMover={moverBox} onRemover={removerBox} />
          ))}
        </div>
      )}

      {armazens.length === 0 && boxesSem.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Warehouse size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum armazém cadastrado</p>
          <p className="text-sm mt-1">Clique em <strong>Novo Armazém</strong> ou use <strong>Atribuir armazéns padrão</strong> se já tiver boxes cadastrados.</p>
        </div>
      )}
    </div>
  )
}
