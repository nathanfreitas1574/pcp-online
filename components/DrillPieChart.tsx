"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ChevronRight, Home, MousePointerClick } from "lucide-react"

export type DrillNivel = { campo: string; titulo: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Registro = Record<string, any>

const PALETA = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"]
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

/**
 * Pizza/donut com drill-down: agrupa `dados` pelo nível atual; ao clicar numa
 * fatia desce para o próximo nível filtrando por aquele valor. Breadcrumb volta.
 * `campoValor` = campo numérico a somar (se omitido, conta registros).
 * `cores` = cor fixa por valor (ex.: status), senão usa paleta.
 */
export default function DrillPieChart({
  titulo, dados, niveis, campoValor, unidade = "", cores, semDados = "Sem dados para exibir.",
}: {
  titulo?: string
  dados: Registro[]
  niveis: DrillNivel[]
  campoValor?: string
  unidade?: string
  cores?: Record<string, string>
  semDados?: string
}) {
  const [caminho, setCaminho] = useState<string[]>([])

  const nivelIdx = Math.min(caminho.length, niveis.length - 1)
  const campo = niveis[nivelIdx].campo
  const podeDescer = caminho.length < niveis.length - 1

  const filtrados = dados.filter(d => caminho.every((val, i) => String(d[niveis[i].campo] ?? "—") === val))

  const grupos = new Map<string, number>()
  for (const d of filtrados) {
    const k = String(d[campo] ?? "—")
    grupos.set(k, (grupos.get(k) ?? 0) + (campoValor ? Number(d[campoValor]) || 0 : 1))
  }
  const data = [...grupos]
    .map(([nome, valor], i) => ({ nome, valor, cor: cores?.[nome] ?? PALETA[i % PALETA.length] }))
    .sort((a, b) => b.valor - a.valor)

  const total = data.reduce((s, d) => s + d.valor, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(slice: any) {
    const nome: string | undefined = slice?.nome ?? slice?.payload?.nome
    if (nome && podeDescer) setCaminho([...caminho, nome])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full">
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
              className={`px-2 py-1 rounded-lg max-w-[160px] truncate ${i === caminho.length - 1 ? "text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}
              title={val}>{val}</button>
          </span>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Agrupado por <strong>{niveis[nivelIdx].titulo}</strong>
        {podeDescer && <span className="hidden sm:inline-flex items-center gap-1 text-gray-400 ml-2"><MousePointerClick size={12} /> clique nas fatias</span>}
      </p>

      {data.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">{semDados}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="valor" nameKey="nome" cx="50%" cy="50%"
                innerRadius={46} outerRadius={72} paddingAngle={3}
                onClick={handleClick} style={{ cursor: podeDescer ? "pointer" : "default" }}>
                {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Pie>
              <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) + (unidade ? " " + unidade : "") : v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {data.map(d => (
              <button key={d.nome} onClick={() => podeDescer && setCaminho([...caminho, d.nome])}
                className="flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-50 rounded px-1"
                style={{ cursor: podeDescer ? "pointer" : "default" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.cor }} />
                {d.nome} ({fmt(d.valor)}{total > 0 ? ` · ${Math.round((d.valor / total) * 100)}%` : ""})
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
