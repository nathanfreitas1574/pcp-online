"use client"

import { GraficoPizza } from "@/components/GraficoLinha"
import DrillBarChart from "@/components/DrillBarChart"

type EstoqueDetalhe = { armazem: string; box: string; produto: string; cliente: string; quantidade: number }
type LacreStatus = { nome: string; valor: number; cor: string }

export default function DashboardCharts({
  estoqueDetalhe,
  lacresPorStatus,
}: {
  estoqueDetalhe: EstoqueDetalhe[]
  lacresPorStatus: LacreStatus[]
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

      {/* Lacres por status */}
      <div>
        {lacresPorStatus.length > 0 ? (
          <GraficoPizza titulo="Lacres (últimos 30 dias)" data={lacresPorStatus.map((l) => ({ nome: l.nome, valor: l.valor, cor: l.cor }))} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full flex items-center justify-center">
            <p className="text-gray-400 text-sm text-center">Nenhum lacre nos últimos 30 dias</p>
          </div>
        )}
      </div>
    </div>
  )
}
