"use client"
import { TrendingUp, Users, Clock, Truck } from "lucide-react"
import DrillBarChart from "@/components/DrillBarChart"

type RankingItem = { nome: string; volume: number }
type DescargaDetalhe = { cliente: string; produto: string; transportadora: string; placa: string; peso: number }

export default function AnalyticsClient({
  ranking, descargaDetalhe, tmpDetalhe, movDetalhe, totalDescarga, totalTMP, tmpMedioGeral
}: {
  ranking: RankingItem[]
  descargaDetalhe: DescargaDetalhe[]
  tmpDetalhe: { mes: string; cliente: string; produto: string; tmp: number }[]
  movDetalhe: { mes: string; status: string; qtd: number }[]
  totalDescarga: number; totalTMP: number; tmpMedioGeral: number
}) {
  const maxRanking = ranking[0]?.volume ?? 1

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp size={24} className="text-blue-600" /> Analytics & Histórico
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Visão histórica dos últimos 12 meses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Descargas (12m)", v: totalDescarga, icon: Truck, c: "blue" },
          { l: "TMPs Registrados", v: totalTMP, icon: Clock, c: "green" },
          { l: "TMP Médio Geral", v: `${tmpMedioGeral}min`, icon: Clock, c: "yellow" },
          { l: "Clientes Atendidos", v: ranking.length, icon: Users, c: "purple" },
        ].map(({ l, v, icon: Icon, c }) => (
          <div key={l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-${c}-100 text-${c}-600`}><Icon size={18}/></div>
            <div><p className="text-xs text-gray-500">{l}</p><p className="text-xl font-bold text-gray-800">{v}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TMP médio por mês → Cliente → Produto (drill-down) */}
        <DrillBarChart
          titulo="TMP médio por mês (min) — clique para detalhar"
          dados={tmpDetalhe}
          niveis={[
            { campo: "mes", titulo: "Mês" },
            { campo: "cliente", titulo: "Cliente" },
            { campo: "produto", titulo: "Produto" },
          ]}
          medidas={[{ campo: "tmp", nome: "TMP médio", cor: "#3b82f6", agregacao: "media" }]}
          unidade="min"
          ordenar="original"
          semDados="Dados disponíveis após registros de TMP."
        />

        {/* Movimentações por mês → Status (drill-down) */}
        <DrillBarChart
          titulo="Movimentações por mês — clique para detalhar"
          dados={movDetalhe}
          niveis={[
            { campo: "mes", titulo: "Mês" },
            { campo: "status", titulo: "Status" },
          ]}
          medidas={[{ campo: "qtd", nome: "Movimentações", cor: "#22c55e" }]}
          ordenar="original"
          semDados="Dados disponíveis após movimentações."
        />
      </div>

      {/* Drill-down: volume descarregado por Cliente → Produto → Transportadora → Placa */}
      {descargaDetalhe.length > 0 && (
        <div className="mb-4">
          <DrillBarChart
            titulo="Volume descarregado (12 meses) — clique para detalhar"
            dados={descargaDetalhe}
            niveis={[
              { campo: "cliente", titulo: "Cliente" },
              { campo: "produto", titulo: "Produto" },
              { campo: "transportadora", titulo: "Transportadora" },
              { campo: "placa", titulo: "Placa" },
            ]}
            medidas={[{ campo: "peso", nome: "Volume", cor: "#3b82f6" }]}
            unidade="t"
          />
        </div>
      )}

      {/* Ranking de Clientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm flex items-center gap-2">
          <Users size={16} className="text-purple-600"/> Ranking de Clientes por Volume Recebido (12 meses)
        </h3>
        {ranking.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Dados disponíveis após registros de descarga.</p>
        ) : (
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-yellow-100 text-yellow-700" :
                  i === 1 ? "bg-gray-200 text-gray-600" :
                  i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                }`}>{i+1}°</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 truncate">{r.nome}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{r.volume.toLocaleString("pt-BR")} ton</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all"
                      style={{width:`${(r.volume/maxRanking)*100}%`}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
