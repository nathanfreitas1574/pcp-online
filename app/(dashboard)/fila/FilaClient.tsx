"use client"
import { useState } from "react"
import { Plus, Clock, Truck, CheckCircle, Bell } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Fila = { id: string; placa: string; motorista: string | null; clienteNome: string; produto: string | null; transportadora: string | null; dtChegada: Date | string; status: string; posicao: number | null; localDestino: string | null; observacao: string | null }
type Cliente = { id: string; nome: string; codigo: string }
type Produto = { id: string; codigo: string; descricao: string }

const STATUS_CONFIG: Record<string, { cor: string; bg: string; label: string }> = {
  AGUARDANDO: { cor: "text-yellow-700", bg: "bg-yellow-100", label: "Aguardando" },
  CHAMADO:    { cor: "text-blue-700",   bg: "bg-blue-100",   label: "Chamado" },
  EM_DESCARGA:{ cor: "text-green-700",  bg: "bg-green-100",  label: "Em Descarga" },
  FINALIZADO: { cor: "text-gray-600",   bg: "bg-gray-100",   label: "Finalizado" },
}

export default function FilaClient({ fila, historico, clientes, produtos }: {
  fila: Fila[]; historico: Fila[]; clientes: Cliente[]; produtos: Produto[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ placa: "", motorista: "", clienteNome: "", produto: "", transportadora: "", localDestino: "", observacao: "" })

  const aguardando = fila.filter((f) => f.status === "AGUARDANDO").length
  const chamados = fila.filter((f) => f.status === "CHAMADO").length
  const emDescarga = fila.filter((f) => f.status === "EM_DESCARGA").length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/fila", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false); setShowModal(false); window.location.reload()
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/fila/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck size={22} className="text-blue-600"/> Fila de Caminhões</h2>
          <p className="text-gray-500 text-sm mt-0.5">Controle da fila de espera no pátio</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={15}/> Registrar Chegada
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{l:"Aguardando",v:aguardando,c:"yellow"},{l:"Chamados",v:chamados,c:"blue"},{l:"Em Descarga",v:emDescarga,c:"green"}].map(({l,v,c})=>(
          <div key={l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{v}</p>
            <p className="text-sm text-gray-500 mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Fila ativa */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700 text-sm">Fila Atual ({fila.length})</div>
        {fila.length === 0 ? (
          <div className="py-10 text-center text-gray-400">Nenhum caminhão na fila.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{["Pos.","Placa","Cliente","Produto","Transportadora","Chegada","Destino","Status","Ações"].map((h)=>(
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 text-xs">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {fila.map((f, idx) => {
                const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.AGUARDANDO
                const mins = Math.floor((Date.now() - new Date(f.dtChegada).getTime()) / 60000)
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-bold text-gray-500 text-center">{idx+1}</td>
                    <td className="px-3 py-2.5 font-bold text-gray-800 text-lg">{f.placa}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-700">{f.clienteNome}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{f.produto ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{f.transportadora ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-gray-600">{format(new Date(f.dtChegada), "HH:mm", {locale:ptBR})}</div>
                      <div className={`text-xs font-medium ${mins>120?"text-red-600":mins>60?"text-orange-600":"text-green-600"}`}>{mins}min</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{f.localDestino ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.cor}`}>{cfg.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {f.status === "AGUARDANDO" && (
                          <button onClick={()=>updateStatus(f.id,"CHAMADO")} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs" title="Chamar">
                            <Bell size={13}/>
                          </button>
                        )}
                        {f.status === "CHAMADO" && (
                          <button onClick={()=>updateStatus(f.id,"EM_DESCARGA")} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs" title="Iniciar Descarga">
                            <Truck size={13}/>
                          </button>
                        )}
                        {f.status === "EM_DESCARGA" && (
                          <button onClick={()=>updateStatus(f.id,"FINALIZADO")} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs" title="Finalizar">
                            <CheckCircle size={13}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700 text-sm">Histórico Recente</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{["Placa","Cliente","Produto","Chegada","Status"].map((h)=><th key={h} className="px-3 py-2 text-left font-medium text-gray-500 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {historico.map((f)=>(
                <tr key={f.id} className="hover:bg-gray-50 opacity-60">
                  <td className="px-3 py-2 font-bold text-gray-700">{f.placa}</td>
                  <td className="px-3 py-2 text-gray-600">{f.clienteNome}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{f.produto??'—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{format(new Date(f.dtChegada),"dd/MM HH:mm",{locale:ptBR})}</td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Finalizado</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><Clock size={18}/> Registrar Chegada</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                  <input value={form.placa} onChange={(e)=>setForm(p=>({...p,placa:e.target.value.toUpperCase()}))} required placeholder="ABC-1234" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
                  <input value={form.motorista} onChange={(e)=>setForm(p=>({...p,motorista:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={form.clienteNome} onChange={(e)=>setForm(p=>({...p,clienteNome:e.target.value}))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {clientes.map((c)=><option key={c.id} value={c.nome}>{c.codigo} — {c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <select value={form.produto} onChange={(e)=>setForm(p=>({...p,produto:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">—</option>
                    {produtos.map((p)=><option key={p.id} value={p.descricao}>{p.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Local Destino</label>
                  <select value={form.localDestino} onChange={(e)=>setForm(p=>({...p,localDestino:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">—</option>
                    {["Tombador","Estruturado","Produto Acabado"].map((l)=><option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">{saving?"Registrando…":"Registrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
