"use client"

import { useState, useEffect } from "react"
import DrillBarChart from "@/components/DrillBarChart"
import { AlertTriangle } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>

export default function DashboardContabil() {
  const [dados, setDados] = useState<Linha[]>([])
  const [mapeados, setMapeados] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/estoque-contabil/dashboard")
      .then(r => r.json())
      .then(d => { setDados(d.dados ?? []); setMapeados(d.mapeados ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Carregando dashboard…</div>
  if (dados.length === 0) return <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Importe o estoque contábil primeiro.</div>

  const semDePara = dados.some(d => d.mapeado === "Sem de-para")

  return (
    <div className="space-y-4">
      {semDePara && mapeados === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={16} />
          Nenhum produto mapeado no <strong>De-Para</strong> ainda — os gráficos usam a descrição original. Faça o de-para para consolidar por nome da vistoria.
        </div>
      )}

      <DrillBarChart
        titulo="Saldo por produto (de-para) → cliente → armazém — clique para detalhar"
        dados={dados}
        niveis={[
          { campo: "produto", titulo: "Produto" },
          { campo: "cliente", titulo: "Cliente" },
          { campo: "armazem", titulo: "Armazém" },
        ]}
        medidas={[{ campo: "saldo", nome: "Saldo", cor: "#3b82f6" }]}
      />

      <DrillBarChart
        titulo="Saldo por cliente → produto → armazém"
        dados={dados}
        niveis={[
          { campo: "cliente", titulo: "Cliente" },
          { campo: "produto", titulo: "Produto" },
          { campo: "armazem", titulo: "Armazém" },
        ]}
        medidas={[{ campo: "saldo", nome: "Saldo", cor: "#16a34a" }]}
      />

      <DrillBarChart
        titulo="Saldo por armazém → produto → cliente"
        dados={dados}
        niveis={[
          { campo: "armazem", titulo: "Armazém" },
          { campo: "produto", titulo: "Produto" },
          { campo: "cliente", titulo: "Cliente" },
        ]}
        medidas={[{ campo: "saldo", nome: "Saldo", cor: "#8b5cf6" }]}
      />
    </div>
  )
}
