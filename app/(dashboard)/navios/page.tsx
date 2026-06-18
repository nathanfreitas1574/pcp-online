"use client"

import { useState, useEffect } from "react"
import { Ship, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react"
import { format, differenceInDays, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"

type Navio = {
  id: string; nome: string; eta: string; produto: string | null
  volumePrev: number | null; clienteNome: string | null; origem: string | null
  berco: string | null; status: "AGUARDANDO"|"ATRACADA"|"DESCARREGANDO"|"CONCLUIDA"|"CANCELADA"
  observacao: string | null; createdAt: string
}

const STATUS_CFG = {
  AGUARDANDO:    { label: "Aguardando",    color: "text-blue-700",  bg: "bg-blue-50",   dot: "bg-blue-500"   },
  ATRACADA:      { label: "Atracada",      color: "text-yellow-700",bg: "bg-yellow-50", dot: "bg-yellow-500" },
  DESCARREGANDO: { label: "Descarregando", color: "text-orange-700",bg: "bg-orange-50", dot: "bg-orange-500" },
  CONCLUIDA:     { label: "Concluída",     color: "text-green-700", bg: "bg-green-50",  dot: "bg-green-500"  },
  CANCELADA:     { label: "Cancelada",     color: "text-gray-500",  bg: "bg-gray-100",  dot: "bg-gray-400"   },
}

const EMPTY = { nome:"", eta:"", produto:"", volumePrev:"", clienteNome:"", origem:"", berco:"", observacao:"" }

export default function NaviosPage() {
  const [navios, setNavios] = useState<Navio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [filtro, setFiltro] = useState("TODOS")
  const [busca, setBusca] = useState("")

  useEffect(() => {
    fetch("/api/navios").then(r=>r.json()).then(d=>setNavios(d.navios??[])).finally(()=>setLoading(false))
  }, [])

  function openNew() { setEditId(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(n: Navio) {
    setEditId(n.id)
    setForm({ nome:n.nome, eta:new Date(n.eta).toISOString().slice(0,16), produto:n.produto??"", volumePrev:n.volumePrev!=null?String(n.volumePrev):"", clienteNome:n.clienteNome??"", origem:n.origem??"", berco:n.berco??"", observacao:n.observacao??"" })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nome || !form.eta) return
    setSaving(true)
    const url = editId ? `/api/navios/${editId}` : "/api/navios"
    const method = editId ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) })
    if (res.ok) {
      const d = await res.json()
      if (editId) setNavios(p=>p.map(n=>n.id===editId?d.navio:n))
      else setNavios(p=>[d.navio,...p])
      setShowForm(false)
    }
    setSaving(false)
  }

  async function handleStatus(id: string, status: Navio["status"]) {
    const res = await fetch(`/api/navios/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) })
    if (res.ok) { const d=await res.json(); setNavios(p=>p.map(n=>n.id===id?d.navio:n)) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este navio?")) return
    await fetch(`/api/navios/${id}`, { method:"DELETE" })
    setNavios(p=>p.filter(n=>n.id!==id))
  }

  const hoje = new Date()
  const q = busca.toLowerCase()
  const visiveis = navios
    .filter(n => filtro==="TODOS" || n.status===filtro)
    .filter(n => !q || [n.nome, n.clienteNome, n.produto, n.origem].some(c => (c??"").toLowerCase().includes(q)))
    .sort((a,b) => new Date(a.eta).getTime()-new Date(b.eta).getTime())

  const ativos = navios.filter(n=>n.status!=="CONCLUIDA"&&n.status!=="CANCELADA")
  const proximos = navios.filter(n=>n.status==="AGUARDANDO"&&differenceInDays(new Date(n.eta),hoje)<=7&&!isPast(new Date(n.eta)))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center"><Ship size={18} className="text-white"/></div>
          <div><h1 className="font-bold text-gray-800 text-xl">Cronograma de Navios</h1><p className="text-xs text-gray-500">Agenda de chegadas e status de descarga</p></div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition shadow-sm"><Plus size={15}/>Novo Navio</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Em operação", val: ativos.length, color:"text-blue-700", bg:"bg-blue-50" },
          { label:"Aguardando", val: navios.filter(n=>n.status==="AGUARDANDO").length, color:"text-yellow-700", bg:"bg-yellow-50" },
          { label:"Descarregando", val: navios.filter(n=>n.status==="DESCARREGANDO").length, color:"text-orange-700", bg:"bg-orange-50" },
          { label:"Chegam em 7 dias", val: proximos.length, color:"text-purple-700", bg:"bg-purple-50" },
        ].map(({label,val,color,bg})=>(
          <div key={label} className={`rounded-xl border border-gray-100 p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por navio, cliente, produto ou origem…" className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap gap-2 items-center">
        {["TODOS","AGUARDANDO","ATRACADA","DESCARREGANDO","CONCLUIDA","CANCELADA"].map(s=>(
          <button key={s} onClick={()=>setFiltro(s)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${filtro===s?"bg-blue-700 text-white border-blue-700":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s==="TODOS"?"Todos":STATUS_CFG[s as keyof typeof STATUS_CFG]?.label??s}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? <p className="text-sm text-gray-400 text-center py-12">Carregando…</p> :
       visiveis.length===0 ? (
        <div className="text-center py-16 text-gray-400"><Ship size={40} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Nenhum navio encontrado.</p><button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">Agendar o primeiro →</button></div>
       ) : (
        <div className="space-y-3">
          {visiveis.map(n=>{
            const cfg = STATUS_CFG[n.status]
            const diasAteETA = differenceInDays(new Date(n.eta), hoje)
            const atrasado = isPast(new Date(n.eta)) && n.status==="AGUARDANDO"
            const isExp = expanded===n.id
            return (
              <div key={n.id} className={`bg-white rounded-2xl border shadow-sm ${atrasado?"border-red-200":"border-gray-100"}`}>
                <div className={`h-1 rounded-t-2xl ${cfg.dot}`}/>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Ship size={20} className="text-blue-400 shrink-0"/>
                      <div>
                        <h3 className="font-bold text-gray-800">{n.nome}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          {n.produto && <span className="text-xs text-gray-500">{n.produto}</span>}
                          {n.clienteNome && <span className="text-xs text-gray-500">· {n.clienteNome}</span>}
                          {atrasado && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ ETA vencida</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">{format(new Date(n.eta),"dd/MM/yyyy HH:mm",{locale:ptBR})}</p>
                        <p className="text-xs text-gray-400">
                          {n.status==="AGUARDANDO" ? (atrasado ? `${Math.abs(diasAteETA)}d atraso` : diasAteETA===0?"hoje":`em ${diasAteETA}d`) : ""}
                        </p>
                      </div>
                      <button onClick={()=>openEdit(n)} className="text-gray-400 hover:text-blue-600 transition p-1"><Pencil size={14}/></button>
                      <button onClick={()=>handleDelete(n.id)} className="text-gray-400 hover:text-red-600 transition p-1"><Trash2 size={14}/></button>
                      <button onClick={()=>setExpanded(isExp?null:n.id)} className="text-gray-400 hover:text-gray-700 transition p-1">{isExp?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
                    </div>
                  </div>

                  {isExp && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {[
                          {label:"Volume previsto",val:n.volumePrev!=null?`${n.volumePrev.toLocaleString("pt-BR")} ton`:"—"},
                          {label:"Origem",val:n.origem??"—"},
                          {label:"Berço",val:n.berco??"—"},
                          {label:"Cliente",val:n.clienteNome??"—"},
                        ].map(({label,val})=>(
                          <div key={label} className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className="font-medium text-gray-700">{val}</p>
                          </div>
                        ))}
                      </div>
                      {n.observacao && <div className="bg-yellow-50 rounded-xl p-3 text-sm text-gray-700"><span className="text-xs text-gray-400 block mb-0.5">📝 Observação</span>{n.observacao}</div>}

                      {/* Transições de status */}
                      {n.status!=="CONCLUIDA"&&n.status!=="CANCELADA"&&(
                        <div className="flex flex-wrap gap-2 pt-1">
                          {n.status==="AGUARDANDO"&&<button onClick={()=>handleStatus(n.id,"ATRACADA")} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-medium">⚓ Atracou</button>}
                          {n.status==="ATRACADA"&&<button onClick={()=>handleStatus(n.id,"DESCARREGANDO")} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition font-medium">▶ Iniciar descarga</button>}
                          {n.status==="DESCARREGANDO"&&<button onClick={()=>handleStatus(n.id,"CONCLUIDA")} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium">✓ Concluir</button>}
                          <button onClick={()=>handleStatus(n.id,"CANCELADA")} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">✕ Cancelar</button>
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

      {/* Modal */}
      {showForm&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4"><Ship size={18} className="text-blue-700"/><h3 className="font-bold text-gray-800 text-lg">{editId?"Editar Navio":"Novo Navio"}</h3></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nome do navio <span className="text-red-500">*</span></label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: MSC Lucinda" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">ETA (data/hora prevista) <span className="text-red-500">*</span></label><input type="datetime-local" value={form.eta} onChange={e=>setForm(f=>({...f,eta:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Produto</label><input value={form.produto} onChange={e=>setForm(f=>({...f,produto:e.target.value}))} placeholder="Ex: UREIA 46%" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Volume previsto (ton)</label><input type="number" value={form.volumePrev} onChange={e=>setForm(f=>({...f,volumePrev:e.target.value}))} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label><input value={form.clienteNome} onChange={e=>setForm(f=>({...f,clienteNome:e.target.value}))} placeholder="Nome do cliente" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Origem</label><input value={form.origem} onChange={e=>setForm(f=>({...f,origem:e.target.value}))} placeholder="Ex: Rotterdam" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Berço de atracação</label><input value={form.berco} onChange={e=>setForm(f=>({...f,berco:e.target.value}))} placeholder="Ex: Berço 3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Observação</label><textarea value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving||!form.nome||!form.eta} className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition">{saving?"Salvando…":editId?"Salvar":"Agendar navio"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
