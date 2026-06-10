"use client"

import { useState, useCallback } from "react"
import { Search, History, BarChart3, TrendingUp, Package, Calendar, X } from "lucide-react"

type BoxOpcao = { id: string; codigo: string; descricao: string }

type Entrada = {
  id: string
  boxId: string
  boxCodigo: string
  acao: string
  produto: string | null
  clienteNome: string | null
  volume: number | null
  pctOcupacao: number | null
  usuarioNome: string | null
  observacao: string | null
  createdAt: string
}

type Media = {
  boxCodigo: string
  produto: string
  clienteNome: string
  mediaVolume: number
  maxVolume: number
  minVolume: number
  count: number
}

const ACOES_LABEL: Record<string, { label: string; cor: string }> = {
  ATUALIZAR:   { label: "Atualização de estoque", cor: "bg-blue-100 text-blue-700"   },
  ESVAZIAR:    { label: "Box esvaziado",          cor: "bg-gray-100 text-gray-600"   },
  CRIAR:       { label: "Box criado",             cor: "bg-green-100 text-green-700" },
  MOVER:       { label: "Movido de armazém",      cor: "bg-indigo-100 text-indigo-700" },
  BLOQUEAR:    { label: "Bloqueado",              cor: "bg-red-100 text-red-700"     },
  LIBERAR:     { label: "Liberado",               cor: "bg-emerald-100 text-emerald-700" },
}

function badge(acao: string) {
  const cfg = ACOES_LABEL[acao] ?? { label: acao, cor: "bg-gray-100 text-gray-600" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cor}`}>{cfg.label}</span>
}

export default function HistoricoBoxesClient({
  boxes, produtos, clientes,
}: {
  boxes: BoxOpcao[]
  produtos: string[]
  clientes: string[]
}) {
  const [boxSel,     setBoxSel]     = useState("")
  const [produtoSel, setProdutoSel] = useState("")
  const [clienteSel, setClienteSel] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim,    setDataFim]    = useState("")
  const [loading,    setLoading]    = useState(false)
  const [historico,  setHistorico]  = useState<Entrada[]>([])
  const [medias,     setMedias]     = useState<Media[]>([])
  const [buscado,    setBuscado]    = useState(false)
  const [aba,        setAba]        = useState<"LINHA" | "MEDIAS">("LINHA")

  const buscar = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (boxSel)     p.set("boxId", boxSel)
    if (produtoSel) p.set("produto", produtoSel)
    if (clienteSel) p.set("cliente", clienteSel)
    if (dataInicio) p.set("dataInicio", dataInicio)
    if (dataFim)    p.set("dataFim",    dataFim)

    const res  = await fetch(`/api/historico-boxes?${p}`)
    const data = await res.json()
    setHistorico(data.historico ?? [])
    setMedias(data.medias ?? [])
    setBuscado(true)
    setLoading(false)
  }, [boxSel, produtoSel, clienteSel, dataInicio, dataFim])

  function limpar() {
    setBoxSel(""); setProdutoSel(""); setClienteSel("")
    setDataInicio(""); setDataFim("")
    setHistorico([]); setMedias([]); setBuscado(false)
  }

  const totalVolume = historico.reduce((s, h) => s + (h.volume ?? 0), 0)
  const mediaGeral  = historico.filter(h => h.volume).length > 0
    ? historico.reduce((s, h) => s + (h.volume ?? 0), 0) / historico.filter(h => h.volume).length
    : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History size={22} className="text-indigo-600" />
            Histórico de Produto por Box
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Consulte o histórico de estoque, identifique quais boxes receberam qual produto e calcule médias por período
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          Filtros de consulta
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Box */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Box</label>
            <select value={boxSel} onChange={e => setBoxSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os boxes</option>
              {boxes.map(b => (
                <option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>
              ))}
            </select>
          </div>
          {/* Produto */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto</label>
            <select value={produtoSel} onChange={e => setProdutoSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os produtos</option>
              {produtos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* Cliente */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <select value={clienteSel} onChange={e => setClienteSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os clientes</option>
              {clientes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Data início */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {/* Data fim */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {/* Ações */}
          <div className="flex items-end gap-2">
            <button onClick={buscar} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition disabled:opacity-60">
              <Search size={14} />
              {loading ? "Buscando…" : "Buscar"}
            </button>
            {buscado && (
              <button onClick={limpar}
                className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Registros encontrados", value: historico.length, icon: History, color: "indigo" },
              { label: "Volume total somado",   value: `${totalVolume.toLocaleString("pt-BR")} ton`, icon: Package, color: "blue" },
              { label: "Média por registro",    value: `${mediaGeral.toFixed(0)} ton`, icon: TrendingUp, color: "green" },
              { label: "Combinações box/produto", value: medias.length, icon: BarChart3, color: "purple" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 shrink-0`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Abas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {([
                { id: "LINHA", label: "Linha do tempo", icon: Calendar },
                { id: "MEDIAS", label: "Médias por box/produto", icon: BarChart3 },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setAba(id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
                    aba === id ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Aba: Linha do tempo */}
            {aba === "LINHA" && (
              <div className="p-4">
                {historico.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <History size={40} className="mx-auto mb-3 opacity-40" />
                    <p>Nenhum registro encontrado para os filtros selecionados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-tl-lg">Data</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Box</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Ação</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Produto</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Cliente</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">Volume (ton)</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">Ocup %</th>
                          <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-tr-lg">Usuário</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {historico.map(h => (
                          <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                              <div>{new Date(h.createdAt).toLocaleDateString("pt-BR")}</div>
                              <div className="text-gray-400">{new Date(h.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{h.boxCodigo}</span>
                            </td>
                            <td className="px-3 py-2.5">{badge(h.acao)}</td>
                            <td className="px-3 py-2.5 text-gray-800 font-medium text-xs">{h.produto ?? "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600 text-xs">{h.clienteNome ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800 text-xs">
                              {h.volume != null ? h.volume.toLocaleString("pt-BR") : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs">
                              {h.pctOcupacao != null ? (
                                <span className={`font-semibold ${h.pctOcupacao >= 90 ? "text-red-600" : h.pctOcupacao >= 70 ? "text-orange-500" : "text-green-600"}`}>
                                  {h.pctOcupacao.toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500">{h.usuarioNome ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Aba: Médias */}
            {aba === "MEDIAS" && (
              <div className="p-4">
                {medias.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                    <p>Sem dados suficientes para calcular médias.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Média de volume registrado por box/produto no período — útil para dimensionar capacidade e rastrear reutilização de boxes.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-tl-lg">Box</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Produto</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Cliente</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">Média (ton)</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">Máx (ton)</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">Mín (ton)</th>
                            <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right rounded-tr-lg">Registros</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {medias.map((m, i) => {
                            // barra de proporção visual
                            const maxMedia = medias[0]?.mediaVolume ?? 1
                            const pct = (m.mediaVolume / maxMedia) * 100
                            return (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{m.boxCodigo}</span>
                                </td>
                                <td className="px-3 py-2.5 text-gray-800 font-medium text-xs">{m.produto}</td>
                                <td className="px-3 py-2.5 text-gray-600 text-xs">{m.clienteNome || "—"}</td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="hidden sm:block w-20 bg-gray-100 rounded-full h-1.5">
                                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="font-bold text-indigo-700 text-xs">{m.mediaVolume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right text-xs text-green-700 font-semibold">{m.maxVolume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                                <td className="px-3 py-2.5 text-right text-xs text-gray-500">{m.minVolume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                                <td className="px-3 py-2.5 text-right text-xs text-gray-500">{m.count}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!buscado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">Selecione os filtros e clique em <strong>Buscar</strong></p>
          <p className="text-sm mt-1">Você pode pesquisar por box, produto, cliente e/ou período</p>
        </div>
      )}
    </div>
  )
}
