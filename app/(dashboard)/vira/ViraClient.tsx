"use client"

import { useState } from "react"
import { Plus, Search, X, GripVertical, Trash2, Repeat } from "lucide-react"

type Vira = {
  id: string; prioridade: number; data: string
  clienteNome: string | null; produto: string | null; boxOrigem: string | null; boxDestino: string | null
  volume: string | null; turno: string | null; obs: string | null; status: string
}

const STATUS = ["PROGRAMADO", "EM ANDAMENTO", "CONCLUIDO", "CANCELADO"]
const STATUS_CLS: Record<string, string> = {
  PROGRAMADO: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "EM ANDAMENTO": "bg-blue-100 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-green-100 text-green-700 border-green-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
}
const TURNOS = ["A", "B", "C"]

export default function ViraClient({
  inicial, boxes, clientes, produtos,
}: {
  inicial: Vira[]; boxes: string[]; clientes: string[]; produtos: string[]
}) {
  const [rows, setRows] = useState<Vira[]>(inicial)
  const [busca, setBusca] = useState("")
  const [statusF, setStatusF] = useState("TODOS")
  const [adding, setAdding] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [handleId, setHandleId] = useState<string | null>(null)

  const filtradas = rows.filter((r) =>
    (statusF === "TODOS" || r.status === statusF) &&
    (!busca || `${r.clienteNome ?? ""} ${r.produto ?? ""} ${r.boxOrigem ?? ""} ${r.boxDestino ?? ""} ${r.obs ?? ""} ${r.data}`.toLowerCase().includes(busca.toLowerCase()))
  )
  const podeArrastar = !busca && statusF === "TODOS"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function salvarCampo(id: string, campo: keyof Vira, valor: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
    await fetch(`/api/vira/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: valor }),
    }).catch(() => {})
  }

  async function adicionar() {
    setAdding(true)
    const res = await fetch("/api/vira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    const nova = await res.json().catch(() => null)
    if (nova?.id) setRows((prev) => [...prev, nova])
    setAdding(false)
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta linha do vira?")) return
    setRows((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/vira/${id}`, { method: "DELETE" }).catch(() => {})
  }

  function soltarEm(targetId: string) {
    if (!podeArrastar || !dragId || dragId === targetId) { setDragId(null); setHandleId(null); return }
    setRows((prev) => {
      const arr = [...prev]
      const from = arr.findIndex((r) => r.id === dragId)
      const to = arr.findIndex((r) => r.id === targetId)
      if (from < 0 || to < 0) return prev
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      fetch("/api/vira/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: arr.map((r) => r.id) }) }).catch(() => {})
      return arr
    })
    setDragId(null); setHandleId(null)
  }

  const inp = "w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Repeat size={22} className="text-green-700" /> Programação do Vira</h2>
          <p className="text-gray-500 text-sm mt-0.5">Movimentação interna de produto entre boxes (vira interno)</p>
        </div>
        <button onClick={adicionar} disabled={adding}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60">
          <Plus size={15} /> {adding ? "Adicionando…" : "Adicionar linha"}
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {["TODOS", ...STATUS].map((s) => (
          <button key={s} onClick={() => setStatusF(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusF === s ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s === "TODOS" ? "Todos" : s}
          </button>
        ))}
        <div className="relative ml-auto max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, produto, box, obs…"
            className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400" />
          {busca && <button onClick={() => setBusca("")} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"><X size={15} /></button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-800 text-white">
              <tr>
                <th className="px-2 py-3 text-center font-medium w-16">#</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Data</th>
                <th className="px-3 py-3 text-left font-medium min-w-28">Cliente</th>
                <th className="px-3 py-3 text-left font-medium min-w-28">Produto</th>
                <th className="px-3 py-3 text-left font-medium min-w-28">Box Origem</th>
                <th className="px-3 py-3 text-left font-medium min-w-28">Box Destino</th>
                <th className="px-3 py-3 text-left font-medium min-w-36">Volume a movimentar</th>
                <th className="px-3 py-3 text-center font-medium min-w-20">Turno</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">OBS</th>
                <th className="px-3 py-3 text-center font-medium min-w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map((r, idx) => (
                <tr key={r.id}
                  draggable={handleId === r.id}
                  onDragStart={() => setDragId(r.id)}
                  onDragOver={(e) => { if (dragId) e.preventDefault() }}
                  onDrop={() => soltarEm(r.id)}
                  onDragEnd={() => { setDragId(null); setHandleId(null) }}
                  className={`hover:bg-green-50/40 ${dragId === r.id ? "opacity-40" : ""}`}>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1 text-gray-400">
                      {podeArrastar && (
                        <span title="Arrastar para reordenar" className="cursor-grab active:cursor-grabbing" onMouseDown={() => setHandleId(r.id)}>
                          <GripVertical size={13} className="text-gray-300 hover:text-gray-500" />
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-500 tabular-nums">{idx + 1}</span>
                      <button onClick={() => excluir(r.id)} title="Excluir linha" className="text-gray-300 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" defaultValue={r.data} onBlur={(e) => { if (e.target.value && e.target.value !== r.data) salvarCampo(r.id, "data", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="vira-clientes" defaultValue={r.clienteNome ?? ""} placeholder="Cliente"
                      onBlur={(e) => { if (e.target.value !== (r.clienteNome ?? "")) salvarCampo(r.id, "clienteNome", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="vira-produtos" defaultValue={r.produto ?? ""} placeholder="Produto"
                      onBlur={(e) => { if (e.target.value !== (r.produto ?? "")) salvarCampo(r.id, "produto", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="vira-boxes" defaultValue={r.boxOrigem ?? ""} placeholder="Origem"
                      onBlur={(e) => { if (e.target.value !== (r.boxOrigem ?? "")) salvarCampo(r.id, "boxOrigem", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="vira-boxes" defaultValue={r.boxDestino ?? ""} placeholder="Destino"
                      onBlur={(e) => { if (e.target.value !== (r.boxDestino ?? "")) salvarCampo(r.id, "boxDestino", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input defaultValue={r.volume ?? ""} placeholder="ex: TODO VOLUME DO AZ"
                      onBlur={(e) => { if (e.target.value !== (r.volume ?? "")) salvarCampo(r.id, "volume", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select defaultValue={r.turno ?? ""} onChange={(e) => salvarCampo(r.id, "turno", e.target.value)} className={`${inp} text-center`}>
                      <option value="">—</option>
                      {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input defaultValue={r.obs ?? ""} placeholder="obs"
                      onBlur={(e) => { if (e.target.value !== (r.obs ?? "")) salvarCampo(r.id, "obs", e.target.value) }} className={inp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.status} onChange={(e) => salvarCampo(r.id, "status", e.target.value)}
                      className={`w-full text-xs font-semibold text-center border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${STATUS_CLS[r.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">
                  {busca || statusF !== "TODOS" ? "Nenhuma linha para esse filtro." : "Nenhum vira programado. Clique em “Adicionar linha”."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <datalist id="vira-boxes">{boxes.map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id="vira-clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="vira-produtos">{produtos.map((p) => <option key={p} value={p} />)}</datalist>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-600">Status:</span>
        {STATUS.map((s) => (
          <span key={s} className={`px-2 py-0.5 rounded-full border ${STATUS_CLS[s]}`}>{s}</span>
        ))}
        <span className="text-gray-400">· arraste pelo <GripVertical size={11} className="inline" /> para reordenar a prioridade</span>
      </div>
    </div>
  )
}
