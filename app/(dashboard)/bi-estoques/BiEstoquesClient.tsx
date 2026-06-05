"use client"

import { useState } from "react"
import { Upload } from "lucide-react"

type Quebra = {
  id: string; clienteNome: string; produto: string; classe: string | null
  quebraTotal: number; totalNfEmitida: number; nfPendente: number
  cliente: { nome: string }
}
type Insumo = {
  id: string; codigo: string; descricao: string; unidade: string
  movimentos: { tipo: string; quantidade: number; data: Date | string }[]
}
type Movimento = {
  id: string; tipo: string; quantidade: number; data: Date | string
  clienteNome: string | null; insumo: { descricao: string }
}

function BarHorizontal({ label, value, max, color = "green" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3 py-1">
      <p className="text-xs text-gray-600 w-32 truncate" title={label}>{label}</p>
      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
        <div className={`h-full bg-${color}-500 rounded`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-medium text-gray-700 w-20 text-right">{value.toLocaleString("pt-BR")}</p>
    </div>
  )
}

export default function BiEstoquesClient({
  saldoInicial, entradas, saidas, saldoFinal, totalQuebras,
  porCliente, porProduto, quebras, insumos, movimentos,
}: {
  saldoInicial: number; entradas: number; saidas: number; saldoFinal: number; totalQuebras: number
  porCliente: [string, number][]; porProduto: [string, number][]
  quebras: Quebra[]; insumos: Insumo[]; movimentos: Movimento[]
}) {
  const [aba, setAba] = useState<"resumo" | "quebras" | "insumos" | "importar">("resumo")
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")

  const maxCliente = porCliente[0]?.[1] ?? 1
  const maxProduto = porProduto[0]?.[1] ?? 1

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/bi-estoques/importar", { method: "POST", body: fd })
    const data = await res.json()
    setUploadMsg(data.message ?? (res.ok ? "Importado!" : "Erro"))
    setUploading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">BI Estoques</h2>
        <p className="text-gray-500 text-sm mt-1">Movimentação, saldos e quebras do período</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Saldo Inicial", value: saldoInicial, color: "gray" },
          { label: "Entradas", value: entradas, color: "green" },
          { label: "Entrada S/ Cob.", value: 0, color: "blue" },
          { label: "Saídas", value: saidas, color: "orange" },
          { label: "Quebras S/ NF", value: totalQuebras, color: "red" },
          { label: "Saldo Final", value: saldoFinal, color: "green" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold text-${color}-700`}>{value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "resumo", label: "Saldo por Cliente/Produto" },
          { id: "quebras", label: "Quebras" },
          { id: "insumos", label: "Insumos" },
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

      {/* Resumo */}
      {aba === "resumo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Saldo Atual por Cliente</h3>
            {porCliente.length === 0
              ? <p className="text-sm text-gray-400">Nenhum dado. Importe o Excel.</p>
              : porCliente.slice(0, 15).map(([nome, val]) => (
                <BarHorizontal key={nome} label={nome} value={val} max={maxCliente} color="green" />
              ))
            }
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Saldo Atual por Produto</h3>
            {porProduto.length === 0
              ? <p className="text-sm text-gray-400">Nenhum dado. Importe o Excel.</p>
              : porProduto.slice(0, 15).map(([nome, val]) => (
                <BarHorizontal key={nome} label={nome} value={val} max={maxProduto} color="blue" />
              ))
            }
          </div>
        </div>
      )}

      {/* Quebras */}
      {aba === "quebras" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Cliente", "Produto", "Classe", "Quebra Total", "NF Emitida", "NF Pendente"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {quebras.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{q.clienteNome}</td>
                    <td className="px-4 py-2 text-gray-600">{q.produto}</td>
                    <td className="px-4 py-2">
                      {q.classe && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.classe === "FOSFATADO" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{q.classe}</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">{q.quebraTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{q.totalNfEmitida.toLocaleString("pt-BR")}</td>
                    <td className={`px-4 py-2 text-right font-medium ${q.nfPendente < 0 ? "text-red-600" : "text-gray-700"}`}>
                      {q.nfPendente.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {quebras.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">Nenhuma quebra registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insumos */}
      {aba === "insumos" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Código", "Descrição", "Entradas (período)", "Saídas (período)", "Saldo"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {insumos.map((ins) => {
                  const ent = ins.movimentos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.quantidade, 0)
                  const sai = ins.movimentos.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.quantidade, 0)
                  return (
                    <tr key={ins.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{ins.codigo}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{ins.descricao}</td>
                      <td className="px-4 py-2 text-right text-green-700 font-medium">{ent.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium">{sai.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2 text-right font-bold">{(ent - sai).toLocaleString("pt-BR")}</td>
                    </tr>
                  )
                })}
                {insumos.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nenhum insumo cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importar */}
      {aba === "importar" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <Upload size={24} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Importar dados de estoque</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Importe relatórios do Proteus/Connect com saldos por cliente e produto.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">{uploading ? "Importando..." : "Clique para selecionar"}</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
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
