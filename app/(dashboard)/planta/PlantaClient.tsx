"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Factory, Plus, Pencil, Trash2, X, Save, DoorOpen, Lock, Package, Users, Boxes, CheckCircle2, ArrowDownToLine } from "lucide-react"

type Item = { id: string; armazemId: string; produto: string; cliente: string | null; quantidade: number; ordem: number }
type Armazem = { id: string; codigo: string; nome: string }
type Props = { armazens: Armazem[] }
type Form = { id?: string; produto: string; cliente: string; quantidade: string }

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const nf = (n: number) => n.toLocaleString("pt-BR")

// paleta para as zonas de cliente
const CORES = [
  { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200", head: "text-rose-700", bar: "border-rose-300" },
  { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200", head: "text-amber-700", bar: "border-amber-300" },
  { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200", head: "text-violet-700", bar: "border-violet-300" },
  { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", head: "text-emerald-700", bar: "border-emerald-300" },
  { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200", head: "text-sky-700", bar: "border-sky-300" },
]

export default function PlantaClient({ armazens }: Props) {
  const [armazemId, setArmazemId] = useState(armazens[0]?.id ?? "")
  const [itens, setItens] = useState<Item[]>([])
  const [balcaoFechado, setBalcaoFechado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const armazem = armazens.find(a => a.id === armazemId)

  const carregar = useCallback(async () => {
    if (!armazemId) { setLoading(false); return }
    setLoading(true)
    const r = await fetch(`/api/planta?armazemId=${armazemId}`)
    const d = await r.json()
    setItens(d.itens ?? [])
    setBalcaoFechado(!!d.balcaoFechado)
    setLoading(false)
  }, [armazemId])
  useEffect(() => { carregar() }, [carregar])

  // zonas: Área Geral + uma por cliente
  const zonas = useMemo(() => {
    const geral = itens.filter(i => !i.cliente)
    const clientes = [...new Set(itens.map(i => i.cliente).filter(Boolean) as string[])].sort()
    return [
      { key: "__geral", label: "Área Geral (Vários Clientes)", cliente: "", itens: geral, cor: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-200", head: "text-blue-700", bar: "border-blue-300" } },
      ...clientes.map((c, i) => ({ key: c, label: c, cliente: c, itens: itens.filter(x => x.cliente === c), cor: CORES[i % CORES.length] })),
    ]
  }, [itens])

  const comQtd = itens.filter(i => i.quantidade > 0).length

  function abrirNovo(cliente = "") { setForm({ produto: "", cliente, quantidade: "" }); setErro("") }
  function abrirEdit(it: Item) { setForm({ id: it.id, produto: it.produto, cliente: it.cliente ?? "", quantidade: String(it.quantidade || "") }); setErro("") }

  async function salvar() {
    if (!form) return
    if (!form.produto.trim()) { setErro("Informe o produto."); return }
    setSalvando(true); setErro("")
    const url = form.id ? `/api/planta/${form.id}` : "/api/planta"
    const r = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ armazemId, produto: form.produto, cliente: form.cliente, quantidade: form.quantidade }),
    })
    setSalvando(false)
    if (r.ok) { setForm(null); await carregar() }
    else { const d = await r.json().catch(() => ({})); setErro(d.error ?? "Erro ao salvar.") }
  }

  async function excluir() {
    if (!form?.id) return
    if (!confirm(`Remover "${form.produto}" da planta?`)) return
    await fetch(`/api/planta/${form.id}`, { method: "DELETE" })
    setForm(null); await carregar()
  }

  async function toggleBalcao() {
    const novo = !balcaoFechado
    setBalcaoFechado(novo)
    await fetch("/api/planta/balcao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ armazemId, balcaoFechado: novo }) })
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center"><Factory className="text-indigo-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Planta do Armazém</h1>
            <p className="text-sm text-gray-500">Clique em qualquer material para editar cliente e quantidade</p>
          </div>
        </div>
        <button onClick={() => abrirNovo("")} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"><Plus size={16} /> Adicionar produto</button>
      </div>

      {/* Seletor de armazém + balcão */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {armazens.map(a => (
            <button key={a.id} onClick={() => setArmazemId(a.id)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${armazemId === a.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`} title={a.nome}>
              {a.codigo}
            </button>
          ))}
          {armazens.length === 0 && <span className="text-sm text-gray-400">Nenhum armazém cadastrado na Gestão de Armazéns.</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{armazem?.nome}</span>
          <button onClick={toggleBalcao} disabled={!armazemId} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition disabled:opacity-50 ${balcaoFechado ? "border-red-400 bg-red-50 text-red-600" : "border-green-400 bg-green-50 text-green-700"}`}>
            {balcaoFechado ? <><Lock size={14} /> BALCÃO FECHADO</> : <><DoorOpen size={14} /> BALCÃO ABERTO</>}
          </button>
        </div>
      </div>

      {/* Planta — zonas */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : (
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-indigo-100 p-4 mb-5">
          <div className="text-center mb-3">
            <span className="inline-block bg-indigo-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow">ARMAZÉM {armazem?.codigo}</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(zonas.length, 4)}, minmax(0, 1fr))` }}>
            {zonas.map(z => (
              <div key={z.key} className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                <div className={`flex items-center gap-2 px-3 py-2.5 border-b-2 ${z.cor.bar}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${z.cor.dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${z.cor.head}`}>{z.label}</span>
                  <span className="ml-auto text-xs text-gray-400">{z.itens.length}</span>
                </div>
                <div className="p-2 space-y-1.5 flex-1">
                  {z.itens.map(it => (
                    <button key={it.id} onClick={() => abrirEdit(it)} className="w-full flex items-center justify-between gap-2 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-lg px-2.5 py-2 text-left transition group">
                      <span className="text-sm text-gray-700 font-medium truncate">{it.produto}</span>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${it.quantidade > 0 ? z.cor.chip : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                        {it.quantidade > 0 ? nf(it.quantidade) : "—"}
                      </span>
                    </button>
                  ))}
                  {z.itens.length === 0 && <p className="text-xs text-gray-300 text-center py-4">Sem produtos</p>}
                </div>
                <button onClick={() => abrirNovo(z.cliente)} className="m-2 mt-0 flex items-center justify-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg py-1.5 font-semibold transition">
                  <Plus size={13} /> adicionar
                </button>
              </div>
            ))}
          </div>
          <div className="text-center mt-3">
            <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full"><ArrowDownToLine size={13} /> ENTRADA DO ARMAZÉM</span>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Boxes size={15} />} label="Total de Materiais" value={itens.length} cor="text-gray-800" />
        <Kpi icon={<Package size={15} />} label="Área Geral" value={zonas[0]?.itens.length ?? 0} cor="text-blue-700" />
        <Kpi icon={<Users size={15} />} label="Zonas de Cliente" value={zonas.length - 1} cor="text-rose-700" />
        <Kpi icon={<CheckCircle2 size={15} />} label="Com Quantidade" value={comQtd} cor="text-emerald-700" />
      </div>

      {/* Modal add/edit */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Pencil size={16} className="text-indigo-600" /> {form.id ? "Editar produto" : "Adicionar produto"}</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Produto *</label><input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} className={inp} placeholder="Ex: F10 FSP 45" autoFocus /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente <span className="text-gray-400 font-normal">(vazio = Área Geral)</span></label>
                <input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={inp} placeholder="Ex: FLOR SAM" />
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantidade (sacos/unidades)</label><input type="number" min="0" step="1" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} className={inp} placeholder="0" /></div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              {form.id
                ? <button onClick={excluir} className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg"><Trash2 size={14} /> Remover</button>
                : <span />}
              <div className="flex gap-2">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, cor }: { icon: React.ReactNode; label: string; value: number; cor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">{icon} {label}</div>
      <p className={`text-2xl font-bold ${cor}`}>{value}</p>
    </div>
  )
}
