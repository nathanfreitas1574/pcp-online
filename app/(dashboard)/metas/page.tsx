"use client"

import { useState, useEffect, useCallback } from "react"
import { Target, Pencil, Check, TrendingUp, TrendingDown, Minus } from "lucide-react"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

type MetaTipo = "OCUPACAO_BOXES"|"VOLUME_RECEBIDO"|"TMP_MEDIO"|"VISTORIAS_DIA"|"CAMINHOES_DIA"
type Meta = { id:string; tipo:MetaTipo; valor:number; mes:number; ano:number }
type Realizados = Record<MetaTipo, number>

const META_CFG: Record<MetaTipo, { label:string; unidade:string; desc:string; melhorQuando:"maior"|"menor" }> = {
  OCUPACAO_BOXES:  { label:"Ocupação de Boxes",    unidade:"%",     desc:"% de capacidade ocupada",          melhorQuando:"maior" },
  VOLUME_RECEBIDO: { label:"Volume Recebido",      unidade:"ton",   desc:"Toneladas recebidas no mês",        melhorQuando:"maior" },
  TMP_MEDIO:       { label:"TMP Médio",            unidade:"min",   desc:"Tempo médio caminhão no pátio",     melhorQuando:"menor" },
  VISTORIAS_DIA:   { label:"Vistorias por Dia",    unidade:"/dia",  desc:"Média de vistorias por dia útil",   melhorQuando:"maior" },
  CAMINHOES_DIA:   { label:"Caminhões por Dia",    unidade:"/dia",  desc:"Média de caminhões atendidos/dia",  melhorQuando:"maior" },
}

function semaforo(realizado: number, meta: number, melhorQuando: "maior"|"menor") {
  const pct = meta > 0 ? (realizado / meta) * 100 : 0
  const ok = melhorQuando==="maior" ? pct>=90 : pct<=110
  const warn = melhorQuando==="maior" ? pct>=70 : pct<=130
  if (ok) return { color:"text-green-600", bg:"bg-green-50", ring:"#22c55e", icon:TrendingUp, label:"Meta atingida" }
  if (warn) return { color:"text-yellow-600", bg:"bg-yellow-50", ring:"#f59e0b", icon:Minus, label:"Próximo da meta" }
  return { color:"text-red-600", bg:"bg-red-50", ring:"#ef4444", icon:TrendingDown, label:"Abaixo da meta" }
}

export default function MetasPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth()+1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [metas, setMetas] = useState<Meta[]>([])
  const [realizados, setRealizados] = useState<Realizados|null>(null)
  const [editTipo, setEditTipo] = useState<MetaTipo|null>(null)
  const [editValor, setEditValor] = useState("")
  const [saving, setSaving] = useState(false)

  const carregar = useCallback(async () => {
    const [m, r] = await Promise.all([
      fetch(`/api/metas?mes=${mes}&ano=${ano}`).then(x=>x.json()),
      fetch(`/api/metas/realizados?mes=${mes}&ano=${ano}`).then(x=>x.json()),
    ])
    setMetas(m.metas??[])
    setRealizados(r.realizados??null)
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  async function salvarMeta(tipo: MetaTipo) {
    setSaving(true)
    const res = await fetch("/api/metas", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ tipo, valor:parseFloat(editValor)||0, mes, ano }) })
    if (res.ok) {
      const d = await res.json()
      setMetas(p => { const ex=p.find(m=>m.tipo===tipo); return ex?p.map(m=>m.tipo===tipo?d.meta:m):[...p,d.meta] })
    }
    setEditTipo(null)
    setSaving(false)
  }

  const anos = [hoje.getFullYear()-1, hoje.getFullYear(), hoje.getFullYear()+1]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center"><Target size={18} className="text-white"/></div>
          <div><h1 className="font-bold text-gray-800 text-xl">Metas Operacionais</h1><p className="text-xs text-gray-500">Defina e acompanhe os KPIs por mês</p></div>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e=>setMes(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {MESES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e=>setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(Object.keys(META_CFG) as MetaTipo[]).map(tipo=>{
          const cfg = META_CFG[tipo]
          const metaObj = metas.find(m=>m.tipo===tipo)
          const metaVal = metaObj?.valor ?? null
          const realVal = realizados?.[tipo] ?? null
          const sem = metaVal!=null&&realVal!=null ? semaforo(realVal,metaVal,cfg.melhorQuando) : null
          const SemIcon = sem?.icon
          const pct = metaVal&&metaVal>0&&realVal!=null ? Math.min(200,(realVal/metaVal)*100) : 0
          const isEditing = editTipo===tipo

          return (
            <div key={tipo} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${sem?sem.bg:""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cfg.desc}</p>
                </div>
                {sem&&SemIcon&&<SemIcon size={18} className={sem.color}/>}
              </div>

              {/* Valores */}
              <div className="flex items-end gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Realizado</p>
                  <p className={`text-3xl font-bold ${sem?.color??"text-gray-700"}`}>
                    {realVal!=null?realVal.toLocaleString("pt-BR"):"—"}
                    <span className="text-sm font-normal text-gray-400 ml-1">{cfg.unidade}</span>
                  </p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-gray-400 mb-0.5">Meta</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus type="number" value={editValor} onChange={e=>setEditValor(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")salvarMeta(tipo);if(e.key==="Escape")setEditTipo(null)}}
                        className="w-24 border border-blue-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      <button onClick={()=>salvarMeta(tipo)} disabled={saving} className="p-1 text-green-600 hover:text-green-800"><Check size={16}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-semibold text-gray-600">
                        {metaVal!=null?metaVal.toLocaleString("pt-BR"):"—"}
                        <span className="text-xs font-normal text-gray-400 ml-1">{cfg.unidade}</span>
                      </p>
                      <button onClick={()=>{setEditTipo(tipo);setEditValor(metaVal!=null?String(metaVal):"")}} className="text-gray-300 hover:text-blue-600 transition"><Pencil size={13}/></button>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-1">
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width:`${Math.min(pct,100)}%`, background:sem?.ring??"#d1d5db" }}/>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{metaVal&&realVal!=null?`${Math.round(pct)}% da meta`:"Meta não definida"}</p>
                  {sem&&<p className={`text-xs font-medium ${sem.color}`}>{sem.label}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">Clique no ✏️ para definir ou alterar a meta de cada indicador · Realizados calculados automaticamente do banco de dados</p>
    </div>
  )
}
