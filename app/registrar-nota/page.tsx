"use client"

import { useState, useEffect } from "react"
import { FileX2, CheckCircle2, AlertTriangle, Send, Clock } from "lucide-react"

const TIPOS = [
  { value: "CANCELAMENTO", label: "Cancelamento", sub: "015-CA", color: "border-green-400 bg-green-50 text-green-700" },
  { value: "INUTILIZACAO", label: "Inutilização", sub: "030-INA", color: "border-gray-400 bg-gray-50 text-gray-700" },
  { value: "EXTEMPORANEO", label: "Cancel. extemporâneo", sub: "015-CAE", color: "border-purple-400 bg-purple-50 text-purple-700" },
]
const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const hoje = () => new Date().toISOString().slice(0, 10)

export default function RegistrarNotaPage() {
  const [tipo, setTipo] = useState("CANCELAMENTO")
  const [data, setData] = useState(hoje())
  const [numero, setNumero] = useState("")
  const [numeroNF, setNumeroNF] = useState("")
  const [usuario, setUsuario] = useState("")
  const [cliente, setCliente] = useState("")
  const [filial, setFilial] = useState("")
  const [motivoErro, setMotivoErro] = useState("")
  const [observacao, setObservacao] = useState("")
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState("")
  const [done, setDone] = useState<null | { alerta: boolean }>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => { setOrigin(window.location.origin) }, [])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (!numero.trim()) { setErro("Informe o número."); return }
    if (!usuario.trim()) { setErro("Informe seu nome."); return }
    setSaving(true)
    const r = await fetch("/api/public/controle-notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, data, numero, numeroNF, usuario, cliente, filial, motivoErro, observacao }),
    })
    const d = await r.json().catch(() => ({}))
    setSaving(false)
    if (r.ok) setDone({ alerta: !!d.alertaContabil })
    else setErro(d.error ?? "Erro ao salvar. Tente novamente.")
  }

  function novo() {
    setTipo("CANCELAMENTO"); setData(hoje()); setNumero(""); setNumeroNF("")
    setUsuario(""); setCliente(""); setFilial(""); setMotivoErro(""); setObservacao("")
    setDone(null); setErro("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fertalvo-logo.svg" alt="Fertalvo" className="h-10" />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200"><FileX2 className="text-white" size={22} /></div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Solicitação de Cancelamento</h1>
            <p className="text-xs text-gray-500">Balança — Fertalvo PCP {origin ? "" : ""}</p>
          </div>
        </div>

        {done ? (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <CheckCircle2 className="text-green-500 mb-2" size={48} />
              <h2 className="text-lg font-bold text-gray-800">Solicitação enviada!</h2>
              <p className="text-sm text-gray-500">O PCP recebeu o pedido.</p>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-sm mb-3">
              <Clock size={16} className="shrink-0" />
              <span>Status: <strong>Aguardando validação</strong> do PCP. Após validar e conferir a NF, o cancelamento é confirmado.</span>
            </div>

            {done.alerta && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs mb-3">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Atenção: essa NF <strong>ainda aparece lançada no estoque contábil</strong> — confira se foi realmente cancelada no sistema.</span>
              </div>
            )}

            <button onClick={novo} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition">Nova solicitação</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="bg-white rounded-3xl shadow-xl p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => (
                  <button type="button" key={t.value} onClick={() => setTipo(t.value)}
                    className={`rounded-xl border-2 px-2 py-2.5 text-center transition ${tipo === t.value ? t.color : "border-gray-100 bg-white text-gray-400"}`}>
                    <span className="block text-xs font-bold leading-tight">{t.label}</span>
                    <span className="block text-[10px] mt-0.5 opacity-80">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Número *</label><input value={numero} onChange={e => setNumero(e.target.value)} className={inp + " font-mono"} placeholder="ex: 15819" /></div>
            </div>

            {tipo !== "INUTILIZACAO" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nº da NF <span className="text-amber-600">(valida no contábil)</span></label>
                <input value={numeroNF} onChange={e => setNumeroNF(e.target.value)} className={inp + " font-mono"} placeholder="NF cancelada" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Seu nome *</label><input value={usuario} onChange={e => setUsuario(e.target.value)} className={inp} placeholder="quem está solicitando" /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Matriz / Filial</label>
                <input list="filiais" value={filial} onChange={e => setFilial(e.target.value)} className={inp} placeholder="ex: MATRIZ" />
                <datalist id="filiais"><option value="MATRIZ" /><option value="FILIAL" /></datalist>
              </div>
            </div>

            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label><input value={cliente} onChange={e => setCliente(e.target.value)} className={inp} /></div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo do erro</label>
              <select value={motivoErro} onChange={e => setMotivoErro(e.target.value)} className={inp}>
                <option value="">—</option>
                <option value="ERRO OPERACIONAL">Erro operacional</option>
                <option value="ERRO SISTEMA">Erro de sistema</option>
              </select>
            </div>

            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Observação</label><textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} className={inp} /></div>

            {erro && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm"><AlertTriangle size={15} /> {erro}</div>}

            <button type="submit" disabled={saving} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-rose-200">
              <Send size={16} /> {saving ? "Enviando…" : "Solicitar cancelamento"}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-4">Fertalvo · PCP Online · uso interno da Balança</p>
      </div>
    </div>
  )
}
