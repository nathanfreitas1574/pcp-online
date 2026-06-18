"use client"

import { useState } from "react"
import { Upload, Search } from "lucide-react"

type VistoriaBox = {
  id: string; boxCodigo: string; boxTipo: string
  clienteNome: string | null; produto: string | null; classe: string | null
  estoque: number; capacidade: number; pctOcupacao: number
  diasEstocado: number | null; statusBox: string
}

function BoxCard({ v }: { v: VistoriaBox }) {
  const ocupado = v.statusBox !== "LIVRE"
  const pct = v.capacidade > 0 ? Math.min((v.estoque / v.capacidade) * 100, 100) : 0

  return (
    <div className={`border-2 rounded-xl p-3 text-xs transition ${
      !ocupado ? "border-gray-200 bg-gray-50" :
      pct > 80 ? "border-red-300 bg-red-50" :
      pct > 50 ? "border-yellow-300 bg-yellow-50" : "border-green-300 bg-green-50"
    }`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-gray-800 text-sm">{v.boxCodigo}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          !ocupado ? "bg-gray-200 text-gray-600" :
          pct > 80 ? "bg-red-200 text-red-700" : "bg-green-200 text-green-700"
        }`}>
          {!ocupado ? "LIVRE" : `${pct.toFixed(0)}%`}
        </span>
      </div>
      {ocupado ? (
        <>
          <p className="text-gray-700 font-medium truncate">{v.produto ?? "—"}</p>
          <p className="text-gray-500 truncate">{v.clienteNome ?? "—"}</p>
          <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-gray-500">
            <span>{v.estoque.toLocaleString("pt-BR")} ton</span>
            {v.diasEstocado && <span>{v.diasEstocado}d</span>}
          </div>
        </>
      ) : (
        <p className="text-gray-400 mt-1">—</p>
      )}
    </div>
  )
}

export default function VistoriaClient({
  registros, alvenaria, estruturado, varredura,
  estoqueTotal, estoqueAlv, estoqueEst,
  capTotal, capAlv, capEst, tmpMedio,
}: {
  registros: VistoriaBox[]
  alvenaria: VistoriaBox[]; estruturado: VistoriaBox[]; varredura: VistoriaBox[]
  estoqueTotal: number; estoqueAlv: number; estoqueEst: number
  capTotal: number; capAlv: number; capEst: number; tmpMedio: number
}) {
  const [aba, setAba] = useState<"mapa" | "tabela" | "importar">("mapa")
  const [tipoFiltro, setTipoFiltro] = useState("TODOS")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"TODOS" | "OCUPADOS" | "LIVRES">("TODOS")
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")

  const pctAlv = capAlv > 0 ? (estoqueAlv / capAlv) * 100 : 0
  const pctEst = capEst > 0 ? (estoqueEst / capEst) * 100 : 0
  const pctTotal = capTotal > 0 ? (estoqueTotal / capTotal) * 100 : 0

  const registrosFiltrados = tipoFiltro === "TODOS" ? registros
    : tipoFiltro === "ALVENARIA" ? alvenaria
    : tipoFiltro === "ESTRUTURADO" ? estruturado : varredura

  const q = busca.toLowerCase()
  const registrosExibidos = registrosFiltrados.filter((v) => {
    const ocupado = v.statusBox !== "LIVRE"
    if (statusFiltro === "OCUPADOS" && !ocupado) return false
    if (statusFiltro === "LIVRES" && ocupado) return false
    if (!q) return true
    return (
      v.boxCodigo.toLowerCase().includes(q) ||
      (v.clienteNome ?? "").toLowerCase().includes(q) ||
      (v.produto ?? "").toLowerCase().includes(q)
    )
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/vistoria/importar", { method: "POST", body: fd })
    const data = await res.json()
    setUploadMsg(data.message ?? (res.ok ? "Importado!" : "Erro"))
    setUploading(false)
    if (res.ok) setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vistoria Estoque</h2>
        <p className="text-gray-500 text-sm mt-1">Ocupação física dos boxes do armazém</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Estoque Total", value: `${(estoqueTotal / 1000).toFixed(1)} Mil`, sub: `${pctTotal.toFixed(1)}% ocup.` },
          { label: "Alvenaria", value: estoqueAlv.toLocaleString("pt-BR"), sub: `${pctAlv.toFixed(1)}%` },
          { label: "Estruturado", value: `${(estoqueEst / 1000).toFixed(1)} Mil`, sub: `${pctEst.toFixed(1)}%` },
          { label: "Varredura", value: varredura.reduce((s, v) => s + v.estoque, 0).toLocaleString("pt-BR"), sub: "ton" },
          { label: "Tmp Médio Est.", value: `${tmpMedio} dias`, sub: "permanência" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "mapa", label: "Mapa dos Boxes" },
          { id: "tabela", label: "Tabela Detalhada" },
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

      {/* Mapa dos Boxes */}
      {aba === "mapa" && (
        <div className="space-y-6">
          {alvenaria.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                Alvenaria ({alvenaria.length} boxes)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {alvenaria.map((v) => <BoxCard key={v.id} v={v} />)}
              </div>
            </div>
          )}
          {estruturado.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
                Estruturado ({estruturado.length} boxes)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {estruturado.map((v) => <BoxCard key={v.id} v={v} />)}
              </div>
            </div>
          )}
          {registros.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              Nenhum dado de vistoria. Importe o Excel para visualizar os boxes.
            </div>
          )}
        </div>
      )}

      {/* Tabela */}
      {aba === "tabela" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {["TODOS", "ALVENARIA", "ESTRUTURADO", "VARREDURA"].map((t) => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  tipoFiltro === t ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por box, cliente ou produto..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {([
              { id: "TODOS", label: "Todos" },
              { id: "OCUPADOS", label: "Ocupados" },
              { id: "LIVRES", label: "Livres" },
            ] as const).map(({ id, label }) => (
              <button key={id} onClick={() => setStatusFiltro(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFiltro === id ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Box", "Tipo", "Cliente", "Produto", "Classe", "Estoque (ton)", "% Ocupação", "Dias Estocado", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrosExibidos.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-bold text-gray-800">{v.boxCodigo}</td>
                      <td className="px-3 py-2 text-gray-500">{v.boxTipo}</td>
                      <td className="px-3 py-2 text-gray-700">{v.clienteNome ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{v.produto ?? "—"}</td>
                      <td className="px-3 py-2">
                        {v.classe && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{v.classe}</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{v.estoque.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-medium ${v.pctOcupacao > 80 ? "text-red-600" : v.pctOcupacao > 50 ? "text-yellow-600" : "text-green-600"}`}>
                          {v.pctOcupacao.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{v.diasEstocado ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          v.statusBox === "LIVRE" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                        }`}>{v.statusBox}</span>
                      </td>
                    </tr>
                  ))}
                  {registrosExibidos.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-gray-400">Nenhum registro.</td></tr>
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
            <h3 className="font-semibold text-gray-800">Importar dados de Vistoria</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Importe relatório de vistoria com estoque por box (Alvenaria, Estruturado, Varredura).
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">{uploading ? "Importando..." : "Clique para selecionar"}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadMsg && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${uploadMsg.includes("cesso") || uploadMsg.includes("Importado") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {uploadMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
