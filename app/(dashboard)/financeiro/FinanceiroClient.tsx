"use client"
import { DollarSign, TrendingUp, FileText, AlertCircle } from "lucide-react"

type StatusInfo = { valor: number; count: number }

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function FinanceiroClient({
  totalGeral, totalNFs, totalMes, totalNFsMes,
  pendente, faturado, cancelado, rankingClientes,
}: {
  totalGeral: number; totalNFs: number
  totalMes: number; totalNFsMes: number
  pendente: StatusInfo; faturado: StatusInfo; cancelado: StatusInfo
  rankingClientes: { nome: string; codigo: string; valor: number; count: number }[]
}) {
  const maxCliente = rankingClientes[0]?.valor ?? 1

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign size={24} className="text-green-600" /> Dashboard Financeiro
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Valores de consignação por cliente e status</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total Geral", v: fmt(totalGeral), s: `${totalNFs} NFs`, c: "green", icon: DollarSign },
          { l: "Este Mês", v: fmt(totalMes), s: `${totalNFsMes} NFs`, c: "blue", icon: TrendingUp },
          { l: "Pendente", v: fmt(pendente.valor), s: `${pendente.count} NFs`, c: "yellow", icon: FileText },
          { l: "Faturado", v: fmt(faturado.valor), s: `${faturado.count} NFs`, c: "green", icon: FileText },
        ].map(({ l, v, s, c, icon: Icon }) => (
          <div key={l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg bg-${c}-100 text-${c}-600`}><Icon size={16}/></div>
              <p className="text-xs text-gray-500">{l}</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{v}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {/* Status das NFs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { l: "🟡 PENDENTE", v: fmt(pendente.valor), c: pendente.count, bg: "#fef9c3", border: "#eab308" },
          { l: "🟢 FATURADA", v: fmt(faturado.valor), c: faturado.count, bg: "#dcfce7", border: "#22c55e" },
          { l: "🔴 CANCELADA", v: fmt(cancelado.valor), c: cancelado.count, bg: "#fee2e2", border: "#ef4444" },
        ].map(({ l, v, c, bg, border }) => (
          <div key={l} className="rounded-xl p-4 border-2" style={{ background: bg, borderColor: border }}>
            <p className="text-sm font-medium text-gray-700 mb-1">{l}</p>
            <p className="text-2xl font-bold text-gray-800">{v}</p>
            <p className="text-xs text-gray-500 mt-1">{c} nota(s) fiscal(is)</p>
          </div>
        ))}
      </div>

      {/* Ranking clientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600"/> Ranking de Clientes por Valor (Consignação)
        </h3>
        {rankingClientes.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle size={32} className="text-gray-300 mx-auto mb-2"/>
            <p className="text-gray-400 text-sm">Nenhuma consignação registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankingClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-yellow-100 text-yellow-700" :
                  i === 1 ? "bg-gray-200 text-gray-600" :
                  i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                }`}>{i+1}°</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 truncate">{c.nome}</span>
                    <span className="text-gray-600 shrink-0 ml-2 font-medium">{fmt(c.valor)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-700"
                      style={{width:`${(c.valor/maxCliente)*100}%`}}/>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.count} NF(s)</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
