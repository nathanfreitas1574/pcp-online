"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, RefreshCw, Truck, Package, Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type TurnoDados = {
  geradoEm: string
  periodo: { inicio: string; fim: string }
  resumo: {
    caminhoesTurno: number; caminhoesPatio: number; tmpMedioMin: number | null
    volumeRecebidoTon: number; lacresCriados: number; lacresNaoConformes: number
    vistoriasTurno: number; vistoriasNaoConformes: number
    alertasAbertos: number; alertasGeradosTurno: number; ocorrenciasTurno: number
  }
  detalhes: {
    tmpAtivos: { id:string; placa:string; clienteNome:string; dtEntrada:string }[]
    tmpEncerrados: { id:string; placa:string; clienteNome:string; produto:string|null; dtEntrada:string; dtSaida:string|null }[]
    registrosRecebimento: { id:string; clienteNome:string|null; produto:string|null; pesoBruto:number|null; createdAt:string }[]
    alertasGerados: { id:string; tipo:string; mensagem:string; severidade:string; createdAt:string }[]
    vistorias: { id:string; conforme:boolean; box:{codigo:string}; createdAt:string }[]
    ocorrencias: { id:string; tipo:string; gravidade:string; descricao:string; status:string; createdAt:string }[]
  }
}

const GRAVIDADE_COLOR: Record<string, string> = {
  CRITICA:"bg-red-100 text-red-800", ALTA:"bg-orange-100 text-orange-800",
  MEDIA:"bg-yellow-100 text-yellow-800", BAIXA:"bg-blue-100 text-blue-700",
}

export default function DashboardTurnoPage() {
  const [dados, setDados] = useState<TurnoDados|null>(null)
  const [loading, setLoading] = useState(true)
  const [abaDetalhe, setAbaDetalhe] = useState<"caminhoes"|"recebimento"|"vistorias"|"alertas"|"ocorrencias">("caminhoes")

  const carregar = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/dashboard-turno")
    if (res.ok) setDados(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const fmt = (d: string) => format(new Date(d), "HH:mm", { locale: ptBR })
  const mins = (entrada: string, saida?: string|null) => {
    const m = Math.round((new Date(saida??Date.now()).getTime()-new Date(entrada).getTime())/60000)
    return m >= 60 ? `${Math.floor(m/60)}h${m%60}min` : `${m}min`
  }

  if (loading && !dados) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-blue-500"/></div>

  const r = dados?.resumo
  const d = dados?.detalhes

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center"><Clock size={18} className="text-white"/></div>
          <div>
            <h1 className="font-bold text-gray-800 text-xl">Dashboard de Turno</h1>
            <p className="text-xs text-gray-500">
              Últimas 8 horas · atualizado em {dados ? format(new Date(dados.geradoEm),"HH:mm",{locale:ptBR}) : "—"}
            </p>
          </div>
        </div>
        <button onClick={carregar} disabled={loading} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading?"animate-spin":""}/>Atualizar
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Truck, label:"Caminhões no turno", val: r?.caminhoesTurno ?? 0, sub:`${r?.caminhoesPatio ?? 0} no pátio agora`, color:"text-blue-700", bg:"bg-blue-50" },
          { icon: Clock, label:"TMP médio", val: r?.tmpMedioMin != null ? `${r.tmpMedioMin}min` : "—", sub: r?.tmpMedioMin != null ? (r.tmpMedioMin<=60?"✓ Dentro do SLA":"⚠ Acima do SLA") : "sem dados", color: r?.tmpMedioMin != null && r.tmpMedioMin>90 ? "text-red-600":"text-green-600", bg: r?.tmpMedioMin != null && r.tmpMedioMin>90 ? "bg-red-50":"bg-green-50" },
          { icon: Package, label:"Volume recebido", val: r ? `${r.volumeRecebidoTon.toLocaleString("pt-BR")} ton` : "—", sub:"no turno", color:"text-purple-700", bg:"bg-purple-50" },
          { icon: AlertTriangle, label:"Alertas abertos", val: r?.alertasAbertos ?? 0, sub:`${r?.alertasGeradosTurno ?? 0} gerados no turno`, color: (r?.alertasAbertos??0)>0?"text-red-600":"text-green-600", bg:(r?.alertasAbertos??0)>0?"bg-red-50":"bg-green-50" },
        ].map(({icon:Icon,label,val,sub,color,bg})=>(
          <div key={label} className={`rounded-2xl border border-gray-100 shadow-sm p-4 ${bg}`}>
            <div className="flex items-start justify-between">
              <div><p className="text-xs text-gray-500 mb-1">{label}</p><p className={`text-2xl font-bold ${color}`}>{val}</p><p className="text-xs text-gray-400 mt-1">{sub}</p></div>
              <Icon size={18} className={`${color} opacity-50`}/>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Vistorias realizadas", val:r?.vistoriasTurno??0, badge:r?.vistoriasNaoConformes??0, badgeLabel:"não conformes", badgeColor:"bg-red-100 text-red-700" },
          { label:"Lacres registrados", val:r?.lacresCriados??0, badge:r?.lacresNaoConformes??0, badgeLabel:"não conformes", badgeColor:"bg-red-100 text-red-700" },
          { label:"Ocorrências no turno", val:r?.ocorrenciasTurno??0, badge:0, badgeLabel:"", badgeColor:"" },
          { label:"Caminhões no pátio", val:r?.caminhoesPatio??0, badge:0, badgeLabel:"aguardando", badgeColor:"bg-yellow-100 text-yellow-700" },
        ].map(({label,val,badge,badgeLabel,badgeColor})=>(
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-gray-800">{val}</p>
              {badge>0&&badgeLabel&&<span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-1 ${badgeColor}`}>{badge} {badgeLabel}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Detalhe por abas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {([
            { id:"caminhoes", label:`Caminhões (${(d?.tmpEncerrados.length??0)+(d?.tmpAtivos.length??0)})` },
            { id:"recebimento", label:`Recebimento (${d?.registrosRecebimento.length??0})` },
            { id:"vistorias", label:`Vistorias (${d?.vistorias.length??0})` },
            { id:"alertas", label:`Alertas (${d?.alertasGerados.length??0})` },
            { id:"ocorrencias", label:`Ocorrências (${d?.ocorrencias.length??0})` },
          ] as const).map(tab=>(
            <button key={tab.id} onClick={()=>setAbaDetalhe(tab.id)} className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition border-b-2 ${abaDetalhe===tab.id?"border-blue-600 text-blue-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {/* Caminhões */}
          {abaDetalhe==="caminhoes"&&(
            <div className="space-y-2">
              {d?.tmpAtivos.map(t=>(
                <div key={t.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"/>
                  <span className="font-bold text-gray-800 text-sm">{t.placa}</span>
                  <span className="text-xs text-gray-500 flex-1">{t.clienteNome}</span>
                  <span className="text-xs text-yellow-700 font-medium">No pátio há {mins(t.dtEntrada)}</span>
                </div>
              ))}
              {d?.tmpEncerrados.map(t=>(
                <div key={t.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0"/>
                  <span className="font-medium text-gray-700 text-sm">{t.placa}</span>
                  <span className="text-xs text-gray-400 flex-1">{t.clienteNome} · {t.produto??"—"}</span>
                  <span className="text-xs text-gray-500">{fmt(t.dtEntrada)} → {t.dtSaida?fmt(t.dtSaida):"—"} ({mins(t.dtEntrada,t.dtSaida)})</span>
                </div>
              ))}
              {(d?.tmpAtivos.length??0)+(d?.tmpEncerrados.length??0)===0&&<p className="text-sm text-gray-400 text-center py-6">Nenhum caminhão no turno.</p>}
            </div>
          )}

          {/* Recebimento */}
          {abaDetalhe==="recebimento"&&(
            <div className="space-y-2">
              {d?.registrosRecebimento.length===0&&<p className="text-sm text-gray-400 text-center py-6">Nenhum recebimento no turno.</p>}
              {d?.registrosRecebimento.map(r=>(
                <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <Package size={14} className="text-blue-400 shrink-0"/>
                  <span className="font-medium text-gray-700 text-sm flex-1">{r.produto??"—"}</span>
                  <span className="text-xs text-gray-500">{r.clienteNome??"—"}</span>
                  <span className="text-xs font-semibold text-blue-700">{r.pesoBruto?.toLocaleString("pt-BR")} ton</span>
                  <span className="text-xs text-gray-400">{fmt(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Vistorias */}
          {abaDetalhe==="vistorias"&&(
            <div className="space-y-2">
              {d?.vistorias.length===0&&<p className="text-sm text-gray-400 text-center py-6">Nenhuma vistoria no turno.</p>}
              {d?.vistorias.map(v=>(
                <div key={v.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${v.conforme?"bg-green-50 border-green-100":"bg-red-50 border-red-100"}`}>
                  {v.conforme?<CheckCircle2 size={14} className="text-green-600"/>:<XCircle size={14} className="text-red-600"/>}
                  <span className="font-medium text-gray-800 text-sm">{v.box.codigo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.conforme?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{v.conforme?"Conforme":"Não conforme"}</span>
                  <span className="ml-auto text-xs text-gray-400">{fmt(v.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alertas */}
          {abaDetalhe==="alertas"&&(
            <div className="space-y-2">
              {d?.alertasGerados.length===0&&<p className="text-sm text-gray-400 text-center py-6">Nenhum alerta gerado no turno.</p>}
              {d?.alertasGerados.map(a=>(
                <div key={a.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${a.severidade==="CRITICA"?"text-red-600":a.severidade==="ALTA"?"text-orange-500":"text-yellow-500"}`}/>
                  <div className="flex-1"><p className="text-sm text-gray-700">{a.mensagem}</p><p className="text-xs text-gray-400 mt-0.5">{a.tipo} · {fmt(a.createdAt)}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${GRAVIDADE_COLOR[a.severidade]??""}`}>{a.severidade}</span>
                </div>
              ))}
            </div>
          )}

          {/* Ocorrências */}
          {abaDetalhe==="ocorrencias"&&(
            <div className="space-y-2">
              {d?.ocorrencias.length===0&&<p className="text-sm text-gray-400 text-center py-6">Nenhuma ocorrência no turno.</p>}
              {d?.ocorrencias.map(o=>(
                <div key={o.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <Shield size={14} className="text-orange-500 shrink-0 mt-0.5"/>
                  <div className="flex-1"><p className="text-sm text-gray-700">{o.descricao}</p><p className="text-xs text-gray-400 mt-0.5">{o.tipo} · {fmt(o.createdAt)}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${GRAVIDADE_COLOR[o.gravidade]??""}`}>{o.gravidade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
