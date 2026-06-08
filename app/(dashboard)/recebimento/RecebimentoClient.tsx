"use client"

import { useState, useEffect } from "react"
import { Truck, Clock, TrendingUp, BarChart2, Upload } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Programacao = {
  id: string
  data: Date | string
  clienteNome: string | null
  produto: string | null
  armazem: string | null
  box: string | null
  volume: number
  seg: number; ter: number; qua: number; qui: number; sex: number; sab: number
  realizado: number
  saldo: number
  contrato: { numero: string; cliente: { nome: string } }
}

type Registro = {
  id: string
  clienteNome: string
  produto: string
  localDescarga: string | null
  tipoVeiculo: string | null
  pesoSaida: number | null
  status: string
  turno: string | null
  tmpMinutos: number | null
  dtPortaria: Date | string | null
}

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const LOCAL_COLORS: Record<string, string> = {
  Tombador: "bg-orange-100 text-orange-700",
  Estruturado: "bg-blue-100 text-blue-700",
  "Produto Acabado": "bg-green-100 text-green-700",
}

export default function RecebimentoClient({
  programacoes,
  registros,
  totalPlanejado,
  totalRealizado,
  totalRegistros,
  tmpMedio,
}: {
  programacoes: Programacao[]
  registros: Registro[]
  totalPlanejado: number
  totalRealizado: number
  totalRegistros: number
  tmpMedio: number
}) {
  const [aba, setAba] = useState<"programacao" | "relatorio" | "importar">("programacao")
  const [filtroLocal, setFiltroLocal] = useState("Todos")
  const [filtroProduto, setFiltroProduto] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [registrosPeriodo, setRegistrosPeriodo] = useState<Registro[] | null>(null)
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")

  const aderencia = totalPlanejado > 0 ? (totalRealizado / totalPlanejado) * 100 : 0

  const locaisDescarga = ["Todos", "Tombador", "Estruturado", "Produto Acabado"]

  // Quando um período é definido, busca o histórico no servidor (não limitado aos 100 mais recentes)
  useEffect(() => {
    if (!dataInicio && !dataFim) {
      setRegistrosPeriodo(null)
      return
    }
    setCarregandoPeriodo(true)
    const params = new URLSearchParams()
    if (dataInicio) params.set("inicio", dataInicio)
    if (dataFim) params.set("fim", dataFim)
    fetch(`/api/recebimento/registros?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setRegistrosPeriodo(data.registros ?? []))
      .finally(() => setCarregandoPeriodo(false))
  }, [dataInicio, dataFim])

  const baseRegistros = registrosPeriodo ?? registros
  const registrosFiltrados = baseRegistros.filter((r) => {
    const matchLocal = filtroLocal === "Todos" || r.localDescarga === filtroLocal
    const matchProduto = filtroProduto === "" || r.produto.toLowerCase().includes(filtroProduto.toLowerCase())
    const matchCliente = filtroCliente === "" || r.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase())
    return matchLocal && matchProduto && matchCliente
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg("")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/recebimento/importar", { method: "POST", body: fd })
    const data = await res.json()
    setUploadMsg(data.message ?? (res.ok ? "Importado com sucesso!" : "Erro na importação"))
    setUploading(false)
    if (res.ok) setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Recebimento</h2>
        <p className="text-gray-500 text-sm mt-1">Controle de descarga e programação</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Planejado", value: totalPlanejado.toLocaleString("pt-BR"), icon: BarChart2, color: "blue" },
          { label: "Realizado", value: totalRealizado.toLocaleString("pt-BR"), icon: TrendingUp, color: "green" },
          { label: "Aderência", value: `${aderencia.toFixed(1)}%`, icon: TrendingUp, color: aderencia >= 80 ? "green" : "red" },
          { label: "TMP Médio", value: `${tmpMedio} min`, icon: Clock, color: "yellow" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-${color}-100 text-${color}-700`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "programacao", label: "Programação Semanal" },
          { id: "relatorio", label: "Relatório Diário" },
          { id: "importar", label: "Importar Excel" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setAba(id as typeof aba)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              aba === id ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Programação Semanal */}
      {aba === "programacao" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Contrato</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Produto</th>
                  <th className="px-3 py-2 text-left font-medium">Box</th>
                  {DIAS.map((d) => <th key={d} className="px-2 py-2 text-center font-medium">{d}</th>)}
                  <th className="px-3 py-2 text-center font-medium">Realizado</th>
                  <th className="px-3 py-2 text-center font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {programacoes.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 font-mono text-xs">{p.contrato.numero}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{p.contrato.cliente.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{p.produto ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{p.box ?? "—"}</td>
                    {[p.seg, p.ter, p.qua, p.qui, p.sex, p.sab].map((v, i) => (
                      <td key={i} className={`px-2 py-2 text-center ${v > 0 ? "font-medium text-gray-800" : "text-gray-300"}`}>
                        {v > 0 ? v.toLocaleString("pt-BR") : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-medium text-green-700">{p.realizado.toLocaleString("pt-BR")}</td>
                    <td className={`px-3 py-2 text-center font-medium ${p.saldo < 0 ? "text-red-600" : "text-gray-700"}`}>
                      {p.saldo.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {programacoes.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">Nenhuma programação. Importe o Excel para carregar dados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Relatório Diário */}
      {aba === "relatorio" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {locaisDescarga.map((l) => (
              <button key={l} onClick={() => setFiltroLocal(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroLocal === l ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Filtrar por produto..."
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
            />
            <input
              type="text"
              placeholder="Filtrar por cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">De</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(filtroProduto || filtroCliente || dataInicio || dataFim) && (
              <button
                onClick={() => { setFiltroProduto(""); setFiltroCliente(""); setDataInicio(""); setDataFim("") }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 transition"
              >
                Limpar filtros
              </button>
            )}
            {carregandoPeriodo && <span className="text-xs text-gray-400 self-center">Carregando período…</span>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Data/Hora", "Cliente", "Produto", "Local Descarga", "Tipo Veículo", "Peso (ton)", "TMP (min)", "Turno", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {registrosFiltrados.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {r.dtPortaria ? format(new Date(r.dtPortaria), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.clienteNome}</td>
                      <td className="px-3 py-2 text-gray-600">{r.produto}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOCAL_COLORS[r.localDescarga ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.localDescarga ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.tipoVeiculo ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{r.pesoSaida?.toLocaleString("pt-BR") ?? "—"}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{r.tmpMinutos ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          r.turno === "A" ? "bg-yellow-100 text-yellow-700" :
                          r.turno === "B" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>{r.turno ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "REALIZADO" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {registrosFiltrados.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Importar Excel */}
      {aba === "importar" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <Upload size={24} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Importar CONTROLE DESCARGA.xlsx</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Selecione o arquivo <strong>01. CONTROLE DESCARGA.xlsx</strong>. O sistema irá importar automaticamente as abas:
            Contrato, PROGRAMAÇÃO SEMANAL e RELATÓRIO DIÁRIO.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">{uploading ? "Importando..." : "Clique para selecionar o arquivo"}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadMsg && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${uploadMsg.includes("sucesso") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {uploadMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
