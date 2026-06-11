"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import { ChevronRight, Home, MousePointerClick } from "lucide-react"

export type DrillNivel = { campo: string; titulo: string }
export type DrillMedida = {
  campo: string
  nome: string
  cor: string
  comparaCom?: string   // se valor > valor de comparaCom → usa corExcede
  corExcede?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Registro = Record<string, any>

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

/**
 * Gráfico de barras com drill-down genérico: agrupa `dados` pelo nível atual,
 * e ao clicar numa barra desce para o próximo nível filtrando por aquele valor.
 * Breadcrumb permite voltar. Funciona com qualquer array de registros.
 */
export default function DrillBarChart({
  titulo, dados, niveis, medidas, unidade = "", semDados = "Sem dados para exibir.",
}: {
  titulo?: string
  dados: Registro[]
  niveis: DrillNivel[]
  medidas: DrillMedida[]
  unidade?: string
  semDados?: string
}) {
  const [caminho, setCaminho] = useState<string[]>([])

  const nivelIdx = Math.min(caminho.length, niveis.length - 1)
  const campoNivel = niveis[nivelIdx].campo
  const podeDescer = caminho.length < niveis.length - 1

  // filtra pelos valores já selecionados no caminho
  const filtrados = dados.filter(d => caminho.every((val, i) => String(d[niveis[i].campo] ?? "—") === val))

  // agrupa pelo campo do nível atual, somando as medidas
  const grupos = new Map<string, Record<string, number>>()
  for (const d of filtrados) {
    const chave = String(d[campoNivel] ?? "—")
    const acc = grupos.get(chave) ?? Object.fromEntries(medidas.map(m => [m.campo, 0]))
    for (const m of medidas) acc[m.campo] += Number(d[m.campo]) || 0
    grupos.set(chave, acc)
  }
  const data = [...grupos]
    .map(([label, vals]) => ({ label, ...vals }) as Record<string, string | number>)
    .sort((a, b) => (Number(b[medidas[0].campo]) || 0) - (Number(a[medidas[0].campo]) || 0))

  const horizontal = data.length > 4
  const altura = horizontal ? Math.max(220, data.length * 46 + 60) : 300

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(state: any) {
    const label: string | undefined = state?.activeLabel
    if (label && podeDescer) setCaminho([...caminho, label])
  }

  const totaisMedida = medidas.map(m => data.reduce((s, d) => s + (Number(d[m.campo]) || 0), 0))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {titulo && <h3 className="font-semibold text-gray-700 mb-2 text-sm">{titulo}</h3>}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-1 flex-wrap">
        <button onClick={() => setCaminho([])}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg ${caminho.length === 0 ? "text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}>
          <Home size={13} /> {niveis[0].titulo}
        </button>
        {caminho.map((val, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={13} className="text-gray-300" />
            <button onClick={() => setCaminho(caminho.slice(0, i))}
              className={`px-2 py-1 rounded-lg max-w-[200px] truncate ${i === caminho.length - 1 ? "text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}
              title={val}>{val}</button>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs text-gray-500">
          Agrupado por <strong>{niveis[nivelIdx].titulo}</strong>
        </p>
        <div className="flex items-center gap-3 text-xs">
          {medidas.map((m, i) => (
            <span key={m.campo} className="text-gray-500">{m.nome}: <strong style={{ color: m.cor }}>{fmt(totaisMedida[i])}</strong></span>
          ))}
          {podeDescer && <span className="hidden sm:flex items-center gap-1 text-gray-400"><MousePointerClick size={13} /> clique nas barras</span>}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-14 text-center text-gray-400 text-sm">{semDados}</div>
      ) : (
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 24, left: horizontal ? 10 : -18, bottom: 5 }}
            onClick={handleClick} style={{ cursor: podeDescer ? "pointer" : "default" }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={150}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
            <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) + (unidade ? " " + unidade : "") : v)} />
            {medidas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {medidas.map(m => (
              <Bar key={m.campo} dataKey={m.campo} name={m.nome} fill={m.cor} radius={[3, 3, 3, 3]} maxBarSize={30}>
                {m.comparaCom && m.corExcede
                  ? data.map((d, i) => (
                      <Cell key={i} fill={(Number(d[m.campo]) || 0) > (Number(d[m.comparaCom!]) || 0) + 0.05 ? m.corExcede : m.cor} />
                    ))
                  : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {podeDescer && data.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">
          Clique numa barra para abrir por <strong>{niveis[nivelIdx + 1].titulo}</strong>.
        </p>
      )}
    </div>
  )
}
