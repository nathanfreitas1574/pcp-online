"use client"

import { useState, useEffect } from "react"
import { Shield, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Camera } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Ocorrencia = {
  id:string; tipo:string; descricao:string; local:string|null; foto:string|null
  status:"ABERTA"|"EM_ANALISE"|"ENCERRADA"; gravidade:"BAIXA"|"MEDIA"|"ALTA"|"CRITICA"
  responsavel:string|null; resolucao:string|null; dataFechamento:string|null
  criadoPor:{id:string;name:string}; box:{id:string;codigo:string}|null
  createdAt:string
}

const TIPO_LABEL: Record<string,string> = { DERRAMAMENTO:"Derramamento",AVARIA:"Avaria",ACIDENTE:"Acidente",QUALIDADE:"Qualidade",SEGURANCA:"Segurança",OUTRO:"Outro" }
const GRAV_CFG = {
  CRITICA:{ label:"Crítica", color:"text-red-800",  bg:"bg-red-100",    dot:"bg-red-600",    border:"border-red-300" },
  ALTA:   { label:"Alta",    color:"text-red-700",  bg:"bg-red-50",     dot:"bg-red-500",    border:"border-red-200" },
  MEDIA:  { label:"Média",   color:"text-orange-700",bg:"bg-orange-50", dot:"bg-orange-400", border:"border-orange-200" },
  BAIXA:  { label:"Baixa",   color:"text-blue-700", bg:"bg-blue-50",    dot:"bg-blue-400",   border:"border-blue-200" },
}
const STATUS_CFG = {
  ABERTA:     { label:"Aberta",      bg:"bg-red-100",    color:"text-red-700"    },
  EM_ANALISE: { label:"Em análise",  bg:"bg-yellow-100", color:"text-yellow-700" },
  ENCERRADA:  { label:"Encerrada",   bg:"bg-green-100",  color:"text-green-700"  },
}
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

const EMPTY_FORM = { tipo:"OUTRO",descricao:"",local:"",boxCodigo:"",gravidade:"MEDIA",responsavel:"",foto:"" as string }

export default function OcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [filtroGrav, setFiltroGrav] = useState("TODOS")
  const [editId, setEditId] = useState<string|null>(null)
  const [editResolucao, setEditResolucao] = useState("")

  useEffect(() => {
    fetch("/api/ocorrencias").then(r=>r.json()).then(d=>setOcorrencias(d.ocorrencias??[])).finally(()=>setLoading(false))
  }, [])

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file)return
    const reader=new FileReader(); reader.onload=()=>setForm(f=>({...f,foto:reader.result as string})); reader.readAsDataURL(file)
  }

  async function handleSave() {
    if(!form.descricao.trim())return
    setSaving(true)
    const res=await fetch("/api/ocorrencias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
    if(res.ok){const d=await res.json();setOcorrencias(p=>[d.ocorrencia,...p]);setShowForm(false);setForm(EMPTY_FORM)}
    setSaving(false)
  }

  async function handleStatus(id:string, status:string) {
    const body: Record<string,unknown>={status}
    if(status==="ENCERRADA"&&editResolucao) body.resolucao=editResolucao
    const res=await fetch(`/api/ocorrencias/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
    if(res.ok){const d=await res.json();setOcorrencias(p=>p.map(o=>o.id===id?d.ocorrencia:o));setEditId(null);setEditResolucao("")}
  }

  async function handleDelete(id:string) {
    if(!confirm("Excluir esta ocorrência?"))return
    await fetch(`/api/ocorrencias/${id}`,{method:"DELETE"})
    setOcorrencias(p=>p.filter(o=>o.id!==id))
  }

  const visiveis=[...ocorrencias]
    .filter(o=>filtroStatus==="TODOS"||o.status===filtroStatus)
    .filter(o=>filtroGrav==="TODOS"||o.gravidade===filtroGrav)
    .sort((a,b)=>{
      const gOrd={CRITICA:0,ALTA:1,MEDIA:2,BAIXA:3}
      const sOrd={ABERTA:0,EM_ANALISE:1,ENCERRADA:2}
      return sOrd[a.status]-sOrd[b.status]||gOrd[a.gravidade]-gOrd[b.gravidade]
    })

  const abertas=ocorrencias.filter(o=>o.status==="ABERTA").length
  const criticas=ocorrencias.filter(o=>o.gravidade==="CRITICA"&&o.status!=="ENCERRADA").length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center"><Shield size={18} className="text-white"/></div>
          <div><h1 className="font-bold text-gray-800 text-xl">Controle de Ocorrências</h1><p className="text-xs text-gray-500">Incidentes, avarias e não conformidades</p></div>
        </div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition shadow-sm"><Plus size={15}/>Registrar Ocorrência</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Abertas",val:abertas,color:"text-red-700",bg:"bg-red-50"},
          {label:"Em análise",val:ocorrencias.filter(o=>o.status==="EM_ANALISE").length,color:"text-yellow-700",bg:"bg-yellow-50"},
          {label:"Encerradas",val:ocorrencias.filter(o=>o.status==="ENCERRADA").length,color:"text-green-700",bg:"bg-green-50"},
          {label:"Críticas abertas",val:criticas,color:"text-red-800",bg:"bg-red-100"},
        ].map(({label,val,color,bg})=>(
          <div key={label} className={`rounded-xl border border-gray-100 p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
          <option value="TODOS">Todos os status</option>
          <option value="ABERTA">Aberta</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="ENCERRADA">Encerrada</option>
        </select>
        <select value={filtroGrav} onChange={e=>setFiltroGrav(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
          <option value="TODOS">Todas as gravidades</option>
          <option value="CRITICA">🔴 Crítica</option>
          <option value="ALTA">🟠 Alta</option>
          <option value="MEDIA">🟡 Média</option>
          <option value="BAIXA">🔵 Baixa</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 self-center">{visiveis.length} ocorrência(s)</span>
      </div>

      {/* Lista */}
      {loading?<p className="text-sm text-gray-400 text-center py-12">Carregando…</p>:
       visiveis.length===0?(
        <div className="text-center py-16 text-gray-400"><Shield size={40} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Nenhuma ocorrência encontrada.</p></div>
       ):(
        <div className="space-y-3">
          {visiveis.map(o=>{
            const grav=GRAV_CFG[o.gravidade];const sts=STATUS_CFG[o.status];const isExp=expanded===o.id
            return(
              <div key={o.id} className={`bg-white rounded-2xl border shadow-sm ${grav.border}`}>
                <div className={`h-1 rounded-t-2xl ${grav.dot}`}/>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${grav.dot}`}/>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${grav.bg} ${grav.color}`}>{grav.label}</span>
                          <span className="text-xs text-gray-500 font-medium">{TIPO_LABEL[o.tipo]??o.tipo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sts.bg} ${sts.color}`}>{sts.label}</span>
                          {o.box&&<span className="text-xs text-blue-600">📦 {o.box.codigo}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-1">{o.descricao}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Por {o.criadoPor.name} · {format(new Date(o.createdAt),"dd/MM/yyyy HH:mm",{locale:ptBR})}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>handleDelete(o.id)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 size={14}/></button>
                      <button onClick={()=>setExpanded(isExp?null:o.id)} className="text-gray-400 hover:text-gray-700 p-1">{isExp?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
                    </div>
                  </div>

                  {isExp&&(
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {o.local&&<div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">📍 Local</p><p className="text-sm text-gray-700">{o.local}</p></div>}
                      {o.responsavel&&<div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">👤 Responsável</p><p className="text-sm text-gray-700">{o.responsavel}</p></div>}
                      {o.foto&&<img src={o.foto} alt="Foto" className="max-h-48 rounded-xl object-contain border border-gray-100"/>}
                      {o.resolucao&&<div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">✅ Resolução</p><p className="text-sm text-gray-700">{o.resolucao}</p></div>}
                      {o.dataFechamento&&<p className="text-xs text-gray-400">Encerrada em {format(new Date(o.dataFechamento),"dd/MM/yyyy HH:mm",{locale:ptBR})}</p>}

                      {o.status!=="ENCERRADA"&&(
                        <div className="space-y-2">
                          {o.status==="ABERTA"&&<button onClick={()=>handleStatus(o.id,"EM_ANALISE")} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-medium">🔍 Iniciar análise</button>}
                          {editId===o.id?(
                            <div className="space-y-2">
                              <textarea value={editResolucao} onChange={e=>setEditResolucao(e.target.value)} placeholder="Descreva a resolução ou ação tomada…" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                              <div className="flex gap-2">
                                <button onClick={()=>handleStatus(o.id,"ENCERRADA")} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium">✓ Encerrar</button>
                                <button onClick={()=>{setEditId(null);setEditResolucao("")}} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
                              </div>
                            </div>
                          ):(
                            <button onClick={()=>setEditId(o.id)} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium">✓ Encerrar ocorrência</button>
                          )}
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

      {/* Modal nova ocorrência */}
      {showForm&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4"><Shield size={18} className="text-red-600"/><h3 className="font-bold text-gray-800 text-lg">Registrar Ocorrência</h3></div>
            <div className="space-y-3">
              {/* Gravidade */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Gravidade</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["BAIXA","MEDIA","ALTA","CRITICA"] as const).map(g=>{
                    const c=GRAV_CFG[g]
                    return(<button key={g} type="button" onClick={()=>setForm(f=>({...f,gravidade:g}))} className={`py-1.5 rounded-lg border-2 text-xs font-medium transition ${form.gravidade===g?`${c.border} ${c.bg} ${c.color}`:"border-gray-200 text-gray-400 hover:bg-gray-50"}`}>{c.label}</button>)
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} className={inp}>
                    {Object.entries(TIPO_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Local</label><input value={form.local} onChange={e=>setForm(f=>({...f,local:e.target.value}))} placeholder="Ex: Galpão AZ" className={inp}/></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição <span className="text-red-500">*</span></label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} placeholder="Descreva o que ocorreu…" className={inp}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Box (código)</label><input value={form.boxCodigo} onChange={e=>setForm(f=>({...f,boxCodigo:e.target.value}))} placeholder="Ex: AZ01A" className={inp}/></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Responsável</label><input value={form.responsavel} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Nome" className={inp}/></div>
              </div>
              {/* Foto */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Foto (opcional)</label>
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 hover:border-blue-400 transition">
                  <Camera size={16} className="text-gray-400"/>
                  {form.foto?<img src={form.foto} className="h-16 rounded-lg object-contain"/>:<span className="text-xs text-gray-400">Tirar foto / selecionar imagem</span>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto}/>
                </label>
                {form.foto&&<button onClick={()=>setForm(f=>({...f,foto:""}))} className="text-xs text-red-500 mt-1 hover:underline">Remover foto</button>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>{setShowForm(false);setForm(EMPTY_FORM)}} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving||!form.descricao.trim()} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition">{saving?"Salvando…":"Registrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
