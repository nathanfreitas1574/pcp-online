"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import { ChevronRight, Home, MousePointerClick } from "lucide-react"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const

type Prog = {
  id: string; clienteNome: string; produto: string
  dom: number; seg: number; ter: number; qua: number; qui: number; sex: number; sab: number
  total: number
}

const COR_PROG = "#3b82f6"
const COR_REAL = "#16a34a"
const COR_REAL_EXC = "#d97706"
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

export default function ProgramacaoGraficos({
  rows, realizadoPorDia,
}: { rows: Prog[]; realizadoPorDia: Record<string, number[]> }) {
  const [cliente, setCliente] = useState<string | null>(null)
  const [produto, setProduto] = useState<string | null>(null)

  const realDe = (id: string) => realizadoPorDia[id] ?? [0, 0, 0, 0, 0, 0, 0]

  // ── Monta dados conforme o nível do drill-down ──────────────────────────────
  let nivel: "cliente" | "produto" | "dia"
  let data: { label: string; programado: number; realizado: number }[]

  if (!cliente) {
    nivel = "cliente"
    const map = new Map<string, { programado: number; realizado: number }>()
    for (const r of rows) {
      const cur = map.get(r.clienteNome) ?? { programado: 0, realizado: 0 }
      cur.programado += r.total
      cur.realizado += realDe(r.id).reduce((s, v) => s + v, 0)
      map.set(r.clienteNome, cur)
    }
    data = [...map].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.programado - a.programado || b.realizado - a.realizado)
  } else if (!produto) {
    nivel = "produto"
    const map = new Map<string, { programado: number; realizado: number }>()
    for (const r of rows.filter(r => r.clienteNome === cliente)) {
      const cur = map.get(r.produto) ?? { programado: 0, realizado: 0 }
      cur.programado += r.total
      cur.realizado += realDe(r.id).reduce((s, v) => s + v, 0)
      map.set(r.produto, cur)
    }
    data = [...map].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.programado - a.programado)
  } else {
    nivel = "dia"
    const prog = [0, 0, 0, 0, 0, 0, 0]
    const real = [0, 0, 0, 0, 0, 0, 0]
    for (const r of rows.filter(r => r.clienteNome === cliente && r.produto === produto)) {
      DIAS_KEYS.forEach((k, i) => { prog[i] += r[k] ?? 0; real[i] += realDe(r.id)[i] ?? 0 })
    }
    data = DIAS.map((d, i) => ({ label: d, programado: prog[i], realizado: real[i] }))
  }

  const podeDescer = nivel !== "dia"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(state: any) {
    const label: string | undefined = state?.activeLabel
    if (!label) return
    if (nivel === "cliente") setCliente(label)
    else if (nivel === "produto") setProduto(label)
  }

  const totalProg = data.reduce((s, d) => s + d.programado, 0)
  const totalReal = data.reduce((s, d) => s + d.realizado, 0)
  const pct = totalProg > 0 ? Math.round((totalReal / totalProg) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-1 flex-wrap">
        <button onClick={() => { setCliente(null); setProduto(null) }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg ${!cliente ? "text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}>
          <Home size={14} /> Clientes
        </button>
        {cliente && <>
          <ChevronRight size={14} className="text-gray-300" />
          <button onClick={() => setProduto(null)}
            className={`px-2 py-1 rounded-lg max-w-[220px] truncate ${!produto ? "text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}
            title={cliente}>{cliente}</button>
        </>}
        {produto && <>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="px-2 py-1 text-blue-700 font-semibold max-w-[220px] truncate" title={produto}>{produto}</span>
        </>}
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs text-gray-500">
          {nivel === "cliente" && "Programado × Realizado por cliente"}
          {nivel === "produto" && `Produtos de ${cliente}`}
          {nivel === "dia" && `${produto} — por dia da semana`}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">Prog: <strong className="text-blue-600">{fmt(totalProg)}</strong></span>
          <span className="text-gray-500">Real: <strong className="text-green-600">{fmt(totalReal)}</strong></span>
          <span className={`font-bold ${pct >= 100 ? "text-green-600" : pct > 0 ? "text-amber-600" : "text-gray-400"}`}>{pct}%</span>
          {podeDescer && <span className="hidden sm:flex items-center gap-1 text-gray-400"><MousePointerClick size={13} /> clique nas barras</span>}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">Sem dados para exibir.</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, nivel === "cliente" ? data.length * 38 + 60 : 300)}>
          <BarChart
            data={data}
            layout={nivel === "dia" ? "horizontal" : "vertical"}
            margin={{ top: 5, right: 20, left: nivel === "dia" ? -20 : 10, bottom: 5 }}
            onClick={handleClick}
            style={{ cursor: podeDescer ? "pointer" : "default" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {nivel === "dia" ? (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            ) : (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={140}
                  tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + "…" : v} />
              </>
            )}
            <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) + " t" : v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="programado" name="Programado" fill={COR_PROG} radius={[3, 3, 3, 3]} maxBarSize={28} />
            <Bar dataKey="realizado" name="Realizado" radius={[3, 3, 3, 3]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.realizado > d.programado + 0.05 ? COR_REAL_EXC : COR_REAL} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {podeDescer && data.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">
          Clique numa barra para abrir {nivel === "cliente" ? "os produtos do cliente" : "o detalhe por dia"}.
          {" "}Barra de realizado em <span className="text-amber-600 font-medium">âmbar</span> = ultrapassou o programado.
        </p>
      )}
    </div>
  )
}
