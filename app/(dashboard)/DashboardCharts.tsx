"use client"

import DrillBarChart from "@/components/DrillBarChart"
import DrillPieChart from "@/components/DrillPieChart"

type EstoqueDetalhe = { armazem: string; box: string; produto: string; cliente: string; quantidade: number }
type LacreDetalhe = { status: string; box: string }

const LACRE_CORES: Record<string, string> = { "Fechado": "#22c55e", "Aberto": "#f97316", "Não conforme": "#ef4444" }

export default function DashboardCharts({
  estoqueDetalhe,
  lacreDetalhe,
}: {
  estoqueDetalhe: EstoqueDetalhe[]
  lacreDetalhe: LacreDetalhe[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Estoque por armazém → box → produto (drill-down) */}
      <div className="lg:col-span-2">
        <DrillBarChart
          titulo="Estoque por armazém — clique para detalhar"
          dados={estoqueDetalhe}
          niveis={[
            { campo: "armazem", titulo: "Armazém" },
            { campo: "box", titulo: "Box" },
            { campo: "produto", titulo: "Produto" },
            { campo: "cliente", titulo: "Cliente" },
          ]}
          medidas={[{ campo: "quantidade", nome: "Volume", cor: "#3b82f6" }]}
          unidade="t"
          semDados="Sem estoque para exibir."
        />
      </div>

      {/* Lacres por status → box (drill-down) */}
      <div>
        <DrillPieChart
          titulo="Lacres (últimos 30 dias)"
          dados={lacreDetalhe}
          niveis={[
            { campo: "status", titulo: "Status" },
            { campo: "box", titulo: "Box" },
          ]}
          cores={LACRE_CORES}
          semDados="Nenhum lacre nos últimos 30 dias"
        />
      </div>
    </div>
  )
}
