"use client"

import { useState, useEffect } from "react"
import { Clock, Plus, CheckCircle, Truck } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type TmpReg = { id: string; placa: string; motorista: string | null; clienteNome: string; produto: string | null; localDescarga: string | null; dtEntrada: Date | string; dtSaida: Date | string | null; tmpMinutos: number | null; status: string }
type Box = { id: string; codigo: string }
type Cliente = { id: string; nome: string; codigo: string }
type Produto = { id: string; descricao: string; codigo: string }

function Cronometro({ dtEntrada }: { dtEntrada: Date | string }) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    function calc() { setMins(Math.floor((Date.now() - new Date(dtEntrada).getTime()) / 60000)) }
    calc()
    const interval = setInterval(calc, 30000)
    return () => clearInterval(interval)
  }, [dtEntrada])

  const h = Math.floor(mins / 60)
  const m = mins % 60
  const cor = mins > 120 ? "text-red-600" : mins > 60 ? "text-orange-600" : "text-green-600"
  return <span className={`font-mono font-bold text-lg ${cor}`}>{h > 0 ? `${h}h` : ""}{m}min</span>
}

export default function TmpClient({ ativos, historico, boxes, clientes, produtos }: {
  ativos: TmpReg[]; historico: TmpReg[]
  boxes: Box[]; clientes: Cliente[]; produtos: Produto[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ placa: "", motorista: "", clienteNome: "", produto: "", localDescarga: "" })
  const [saving, setSaving] = useState(false)
  const [registros, setRegistros] = useState(ativos)

  async function handleEntrada(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/tmp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, dtEntrada: new Date().toISOString() }) })
    const novo = await res.json()
    setRegistros((p) => [novo, ...p])
    setForm({ placa: "", motorista: "", clienteNome: "", produto: "", localDescarga: "" })
    setSaving(false); setShowModal(false)
  }

  async function handleSaida(id: string) {
    await fetch(`/api/tmp/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dtSaida: new Date().toISOString() }) })
    setRegistros((p) => p.filter((r) => r.id !== id))
    window.location.reload()
  }

  const tmpMedioHistorico = historico.filter((r) => r.tmpMinutos).reduce((s, r, _, a) => s + (r.tmpMinutos ?? 0) / a.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">TMP — Tempo Médio de Permanência</h2>
          <p className="text-gray-500 text-sm mt-0.5">Cronômetro em tempo real por caminhão</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={15} /> Registrar Entrada
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Em andamento</p>
          <p className="text-3xl font-bold text-blue-700">{registros.length}</p>
          <p className="text-xs text-gray-400">caminhões no pátio</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">TMP Médio Hoje</p>
          <p className="text-3xl font-bold text-gray-800">{Math.round(tmpMedioHistorico)}min</p>
          <p className="text-xs text-gray-400">baseado nos últimos {historico.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Concluídos Hoje</p>
          <p className="text-3xl font-bold text-green-700">{historico.length}</p>
          <p className="text-xs text-gray-400">registros</p>
        </div>
      </div>

      {/* Ativos */}
      <h3 className="font-semibold text-gray-700 mb-3">🚛 Caminhões no Pátio</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {registros.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-800 text-lg">{r.placa}</p>
                <p className="text-xs text-gray-500">{r.motorista ?? "Motorista não informado"}</p>
              </div>
              <Cronometro dtEntrada={r.dtEntrada} />
            </div>
            <div className="space-y-1 text-xs text-gray-600 mb-3">
              <p><span className="text-gray-400">Cliente:</span> {r.clienteNome}</p>
              <p><span className="text-gray-400">Produto:</span> {r.produto ?? "—"}</p>
              <p><span className="text-gray-400">Local:</span> {r.localDescarga ?? "—"}</p>
              <p><span className="text-gray-400">Entrada:</span> {format(new Date(r.dtEntrada), "HH:mm", { locale: ptBR })}</p>
            </div>
            <button onClick={() => handleSaida(r.id)} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-green-700">
              <CheckCircle size={13} /> Registrar Saída
            </button>
          </div>
        ))}
        {registros.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            <Truck size={32} className="mx-auto mb-2 text-gray-300" />
            <p>Nenhum caminhão no pátio no momento.</p>
          </div>
        )}
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <>
          <h3 className="font-semibold text-gray-700 mb-3">📋 Histórico Recente</h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{["Placa", "Cliente", "Produto", "Entrada", "Saída", "TMP"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historico.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-bold text-gray-800">{r.placa}</td>
                    <td className="px-3 py-2 text-gray-600">{r.clienteNome}</td>
                    <td className="px-3 py-2 text-gray-500">{r.produto ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{format(new Date(r.dtEntrada), "HH:mm", { locale: ptBR })}</td>
                    <td className="px-3 py-2 text-gray-500">{r.dtSaida ? format(new Date(r.dtSaida), "HH:mm", { locale: ptBR }) : "—"}</td>
                    <td className="px-3 py-2 font-bold text-blue-700">{r.tmpMinutos ? `${Math.floor(r.tmpMinutos / 60)}h${r.tmpMinutos % 60}min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal entrada */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><Clock size={20} /> Registrar Entrada</h3>
            <form onSubmit={handleEntrada} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                  <input value={form.placa} onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))} required placeholder="ABC-1234" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
                  <input value={form.motorista} onChange={(e) => setForm((f) => ({ ...f, motorista: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={form.clienteNome} onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo} — {c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <select value={form.produto} onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {produtos.map((p) => <option key={p.id} value={p.descricao}>{p.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Local Descarga</label>
                  <select value={form.localDescarga} onChange={(e) => setForm((f) => ({ ...f, localDescarga: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {["Tombador", "Estruturado", "Produto Acabado"].map((l) => <option key={l}>{l}</option>)}
                    {boxes.map((b) => <option key={b.id} value={b.codigo}>{b.codigo}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "Registrando…" : "Registrar Entrada"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
