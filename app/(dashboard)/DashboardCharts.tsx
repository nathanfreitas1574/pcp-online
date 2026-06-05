"use client"

import { GraficoBarra, GraficoPizza } from "@/components/GraficoLinha"

type OcupacaoBox = { label: string; ocupacao: number; volume: number }
type LacreStatus = { nome: string; valor: number; cor: string }

export default function DashboardCharts({
  ocupacaoBoxes,
  lacresPorStatus,
}: {
  ocupacaoBoxes: OcupacaoBox[]
  lacresPorStatus: LacreStatus[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ocupação dos boxes */}
      <div className="lg:col-span-2">
        <GraficoBarra
          titulo="Ocupação dos Boxes (%)"
          data={ocupacaoBoxes.map((b) => ({ label: b.label, "Ocupação %": b.ocupacao }))}
          barras={[{ key: "Ocupação %", label: "Ocupação %", cor: "#3b82f6" }]}
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
