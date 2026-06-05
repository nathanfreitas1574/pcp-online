"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell
} from "recharts"

type DataPoint = Record<string, string | number>

export function GraficoLinha({ data, linhas, titulo }: {
  data: DataPoint[]
  linhas: { key: string; label: string; cor: string }[]
  titulo?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {titulo && <h3 className="font-semibold text-gray-700 mb-4 text-sm">{titulo}</h3>}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {linhas.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.cor} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoBarra({ data, barras, titulo }: {
  data: DataPoint[]
  barras: { key: string; label: string; cor: string }[]
  titulo?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {titulo && <h3 className="font-semibold text-gray-700 mb-4 text-sm">{titulo}</h3>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {barras.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.cor} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoPizza({ data, titulo }: {
  data: { nome: string; valor: number; cor: string }[]
  titulo?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {titulo && <h3 className="font-semibold text-gray-700 mb-4 text-sm">{titulo}</h3>}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={70} label={({ nome, percent }: { nome?: string; percent?: number }) => `${nome ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
            {data.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
          </Pie>
          <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
