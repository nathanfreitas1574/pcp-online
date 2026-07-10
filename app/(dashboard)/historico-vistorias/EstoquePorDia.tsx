"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarDays, Warehouse, ChevronDown, ChevronUp } from "lucide-react"

const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
type SnapBox = { boxCodigo: string; volume: number; capacidade: number; produto: string | null; cliente: string | null; statusUso: string | null }
type Snap = { dataPedida: string; dataEfetiva: string | null; total: number; capacidade: number; ocupacao: number; boxes: SnapBox[]; dias: string[] }

const ddmmyy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

// Histórico por dia: escolha uma data e veja o total que havia nos boxes naquele dia.
export default function EstoquePorDia() {
  const hoje = new Date().toISOString().slice(0, 10)
  const [data, setData] = useState(hoje)
  const [d, setD] = useState<Snap | null>(null)
  const [loading, setLoading] = useState(true)
  const [aberto, setAberto] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/boxes/snapshot?data=${data}`)
    const j = await r.json().catch(() => null)
    setD(j?.error ? null : j)
    setLoading(false)
  }, [data])
  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Warehouse size={18} className="text-blue-700" />
          <div>
            <h3 className="font-bold text-gray-800">Estoque nos boxes por dia</h3>
            <p className="text-xs text-gray-500">Volte a data e veja o total que havia nos boxes naquele dia (ontem, 2 semanas atrás…)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={14} /> Dia:</span>
          <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {(d?.dias?.length ?? 0) > 0 && (
            <select value={d?.dataEfetiva ?? ""} onChange={(e) => setData(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600" title="Dias com registro">
              {(d?.dias ?? []).map((x) => <option key={x} value={x}>{ddmmyy(x)}</option>)}
            </select>
          )}
          <button onClick={() => setAberto(!aberto)} className="text-gray-400 hover:text-gray-600">{aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        </div>
      </div>

      {aberto && (
        <>
          {loading ? (
            <p className="px-5 py-6 text-sm text-gray-400">Carregando…</p>
          ) : !d || !d.dataEfetiva ? (
            <p className="px-5 py-6 text-sm text-gray-400">
              Ainda não há registro diário. Os snapshots passam a ser gravados automaticamente a cada vistoria ou alteração de estoque — a partir de hoje, o histórico se acumula.
            </p>
          ) : (
            <>
              {d.dataEfetiva !== d.dataPedida && (
                <p className="mx-5 mt-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  Sem registro em {ddmmyy(d.dataPedida)} — mostrando o estado vigente em <strong>{ddmmyy(d.dataEfetiva)}</strong> (último registro anterior).
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 px-5 pt-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-blue-600">Total nos boxes em {ddmmyy(d.dataEfetiva)}</p>
                  <p className="text-lg font-bold text-blue-800">{fmt(d.total)} t</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500">Capacidade</p>
                  <p className="text-lg font-bold text-gray-700">{fmt(d.capacidade)} t</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-green-600">Ocupação</p>
                  <p className="text-lg font-bold text-green-700">{d.ocupacao}%</p>
                </div>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      {["Box", "Produto", "Cliente", "Volume (t)", "Capacidade", "Ocup.", "Status"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.boxes.map((b) => (
                      <tr key={b.boxCodigo} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{b.boxCodigo}</td>
                        <td className="px-3 py-1.5 text-gray-700">{b.produto ?? "—"}</td>
                        <td className="px-3 py-1.5 text-gray-500">{b.cliente ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-800 tabular-nums">{fmt(b.volume)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400 tabular-nums">{fmt(b.capacidade)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{b.capacidade > 0 ? `${Math.round((b.volume / b.capacidade) * 100)}%` : "—"}</td>
                        <td className="px-3 py-1.5 text-gray-500">{b.statusUso ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
