"use client"

import { useState } from "react"
import { Package, TrendingUp, BarChart2, Target, Upload, Search } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Contrato = {
  id: string; numero: string; operacao: string | null; produtoAbreviado: string | null
  tipoProduto: string | null; mes: string | null; semana: number | null
  volProgramado: number; realizado: number; saldo: number; status: string
  cliente: { nome: string }
}

type Registro = {
  id: string; data: Date | string; clienteNome: string; produto: string
  linha: string | null; operacao: string | null; turno: string | null
  orcado: number; forecast: number; realizado: number; capacidade: number
}

const LINHA_COLORS: Record<string, string> = {
  NAVE: "bg-blue-100 text-blue-700",
  "BAG MÓVEL": "bg-green-100 text-green-700",
  GRANEL: "bg-yellow-100 text-yellow-700",
  EMBEGADO: "bg-purple-100 text-purple-700",
  VARREDURA: "bg-gray-100 text-gray-600",
}

export default function ExpedicaoClient({
  contratos, registros, totalForecast, totalRealizado, totalOrcado, totalCapacidade, aderencia,
}: {
  contratos: Contrato[]
  registros: Registro[]
  totalForecast: number
  totalRealizado: number
  totalOrcado: number
  totalCapacidade: number
  aderencia: number
}) {
  const [aba, setAba] = useState<"contratos" | "registros" | "importar">("contratos")
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [busca, setBusca] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")

  const gap = totalRealizado - totalForecast
  const performance = totalCapacidade > 0 ? (totalRealizado / totalCapacidade) * 100 : 0

  const contratosFiltrados = contratos
    .filter((c) => filtroStatus === "TODOS" || c.status === filtroStatus)
    .filter((c) => {
      const q = busca.toLowerCase()
      return (
        c.numero.toLowerCase().includes(q) ||
        c.cliente.nome.toLowerCase().includes(q) ||
        (c.produtoAbreviado ?? "").toLowerCase().includes(q) ||
        (c.operacao ?? "").toLowerCase().includes(q)
      )
    })

  const registrosFiltrados = registros.filter((r) => {
    const q = busca.toLowerCase()
    return r.clienteNome.toLowerCase().includes(q) || r.produto.toLowerCase().includes(q)
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/expedicao/importar", { method: "POST", body: fd })
    const data = await res.json()
    setUploadMsg(data.message ?? (res.ok ? "Importado!" : "Erro"))
    setUploading(false)
    if (res.ok) setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Expedição</h2>
        <p className="text-gray-500 text-sm mt-1">Controle de carregamento e performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Forecast", value: totalForecast.toLocaleString("pt-BR"), icon: Target, sub: "ton" },
          { label: "Realizado", value: totalRealizado.toLocaleString("pt-BR"), icon: Package, sub: "ton" },
          { label: "Gap", value: (gap >= 0 ? "+" : "") + gap.toLocaleString("pt-BR"), icon: BarChart2, sub: "ton" },
          { label: "Aderência", value: `${aderencia.toFixed(1)}%`, icon: TrendingUp, sub: "forecast" },
          { label: "Performance", value: `${performance.toFixed(1)}%`, icon: TrendingUp, sub: "capacidade" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className="text-blue-600" />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "contratos", label: "Contratos" },
          { id: "registros", label: "Dia a Dia" },
          { id: "importar", label: "Importar Excel" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setAba(id as typeof aba)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              aba === id ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Contratos */}
      {aba === "contratos" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {["TODOS", "PROGRAMADO", "FINALIZADO", "CANCELADO"].map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroStatus === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {s}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar contrato, cliente, produto, operação..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Contrato", "Cliente", "Produto", "Tipo", "Operação", "Vol. Prog.", "Realizado", "Saldo", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contratosFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{c.numero}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{c.cliente.nome}</td>
                      <td className="px-3 py-2 text-gray-600">{c.produtoAbreviado ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{c.tipoProduto ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{c.operacao ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{c.volProgramado.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">{c.realizado.toLocaleString("pt-BR")}</td>
                      <td className={`px-3 py-2 text-right font-medium ${c.saldo < 0 ? "text-red-600" : "text-gray-700"}`}>
                        {c.saldo.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "FINALIZADO" ? "bg-green-100 text-green-700" :
                          c.status === "CANCELADO" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                  {contratosFiltrados.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-gray-400">Nenhum contrato. Importe o Excel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dia a Dia */}
      {aba === "registros" && (
        <div>
          <div className="flex items-center mb-3">
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente, produto..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Data", "Cliente", "Produto", "Linha", "Operação", "Turno", "Forecast", "Realizado", "Capacidade"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrosFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {format(new Date(r.data), "dd/MM/yy", { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{r.clienteNome}</td>
                    <td className="px-3 py-2 text-gray-600">{r.produto}</td>
                    <td className="px-3 py-2">
                      {r.linha && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LINHA_COLORS[r.linha] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.linha}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.operacao ?? "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        r.turno === "A" ? "bg-yellow-100 text-yellow-700" :
                        r.turno === "B" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>{r.turno ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{r.forecast.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right font-medium text-green-700">{r.realizado.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{r.capacidade.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {registrosFiltrados.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-gray-400">Nenhum registro. Importe o Excel.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* Importar */}
      {aba === "importar" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <Upload size={24} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Importar Base Dados Expedição.xlsx</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Selecione o arquivo <strong>Base Dados Expedição.xlsx</strong> ou <strong>01. PLANO CARGA SAFRA 2026.xlsx</strong>.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">{uploading ? "Importando..." : "Clique para selecionar"}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadMsg && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${uploadMsg.includes("ucesso") || uploadMsg.includes("Importado") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {uploadMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
