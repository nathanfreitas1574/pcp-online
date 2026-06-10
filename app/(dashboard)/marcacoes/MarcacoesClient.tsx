"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Truck, Upload, Search, Filter, ArrowDownToLine, ArrowUpFromLine,
  Scale, CheckCircle2, AlertTriangle, X, Link2, Package,
} from "lucide-react"

type Marcacao = {
  id: string
  numero: string
  operacao: string | null
  status: string | null
  dataCarregamento: string | null
  produto: string | null
  motorista: string | null
  pedidoCliente: string | null
  clienteDestino: string | null
  placa: string | null
  transportadora: string | null
  tipoVeiculo: string | null
  cliente: string | null
  pesoPrevisto: number
  pesoLiquido: number
  turno: string | null
  romaneio: string | null
}

type Comparativo = {
  cliente: string
  contratado: number
  realizado: number
  realizadoCarga: number
  realizadoDescarga: number
  saldo: number
  pct: number | null
  veiculos: number
  contratos: number
}

type Props = {
  clientes: string[]
  produtos: string[]
  transportadoras: string[]
  agregadoOperacao: { operacao: string; count: number; pesoLiquido: number }[]
}

const fmt = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtInt = (n: number) => n.toLocaleString("pt-BR")

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

function opBadge(op: string | null) {
  const o = (op || "").toUpperCase()
  if (o.includes("DESCARGA")) return "bg-amber-100 text-amber-700"
  if (o.includes("CARGA"))    return "bg-blue-100 text-blue-700"
  return "bg-gray-100 text-gray-600"
}

export default function MarcacoesClient({ clientes, produtos, transportadoras, agregadoOperacao }: Props) {
  const [tab, setTab] = useState<"lista" | "comparativo">("lista")
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([])
  const [comparativo, setComparativo] = useState<Comparativo[]>([])
  const [totaisComp, setTotaisComp] = useState({ contratado: 0, realizado: 0, veiculos: 0 })
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // filtros
  const [busca, setBusca] = useState("")
  const [operacao, setOperacao] = useState("")
  const [cliente, setCliente] = useState("")
  const [produto, setProduto] = useState("")
  const [transportadora, setTransportadora] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  // importação
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ tipo: "ok" | "erro"; texto: string; detalhe?: string } | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (busca)          qs.set("busca", busca)
    if (operacao)       qs.set("operacao", operacao)
    if (cliente)        qs.set("cliente", cliente)
    if (produto)        qs.set("produto", produto)
    if (transportadora) qs.set("transportadora", transportadora)
    if (dataInicio)     qs.set("dataInicio", dataInicio)
    if (dataFim)        qs.set("dataFim", dataFim)
    const r = await fetch("/api/marcacoes?" + qs.toString())
    const d = await r.json()
    setMarcacoes(d.marcacoes ?? [])
    setLoading(false)
  }, [busca, operacao, cliente, produto, transportadora, dataInicio, dataFim])

  const carregarComparativo = useCallback(async () => {
    const r = await fetch("/api/marcacoes/realizado")
    const d = await r.json()
    setComparativo(d.comparativo ?? [])
    setTotaisComp(d.totais ?? { contratado: 0, realizado: 0, veiculos: 0 })
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { if (tab === "comparativo") carregarComparativo() }, [tab, carregarComparativo])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const r = await fetch("/api/marcacoes/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) {
        setImportMsg({
          tipo: "ok",
          texto: `${d.criados} novas, ${d.atualizados} atualizadas (total ${d.total}).`,
          detalhe: d.colunasIgnoradas?.length ? `Colunas ignoradas: ${d.colunasIgnoradas.join(", ")}` : undefined,
        })
        await carregar()
        if (tab === "comparativo") await carregarComparativo()
      } else {
        setImportMsg({ tipo: "erro", texto: d.error ?? "Falha na importação." })
      }
    } catch {
      setImportMsg({ tipo: "erro", texto: "Erro de rede ao importar." })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function limparFiltros() {
    setBusca(""); setOperacao(""); setCliente(""); setProduto(""); setTransportadora(""); setDataInicio(""); setDataFim("")
  }

  // KPIs a partir do agregado (total geral) — independente dos filtros
  const totalVeiculos = agregadoOperacao.reduce((s, a) => s + a.count, 0)
  const totalPeso     = agregadoOperacao.reduce((s, a) => s + a.pesoLiquido, 0)
  const carga    = agregadoOperacao.find(a => a.operacao.toUpperCase().includes("CARGA") && !a.operacao.toUpperCase().includes("DESCARGA"))
  const descarga = agregadoOperacao.find(a => a.operacao.toUpperCase().includes("DESCARGA"))

  // KPIs filtrados (da lista atual)
  const pesoFiltrado = marcacoes.reduce((s, m) => s + m.pesoLiquido, 0)

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
            <Truck className="text-blue-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Marcação de Veículos</h1>
            <p className="text-sm text-gray-500">Carga e descarga — importado do TOTVS, vinculado aos contratos</p>
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
          >
            <Upload size={16} />
            {importing ? "Importando…" : "Importar Excel"}
          </button>
        </div>
      </div>

      {/* Mensagem de importação */}
      {importMsg && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          importMsg.tipo === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {importMsg.tipo === "ok" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-medium">{importMsg.texto}</p>
            {importMsg.detalhe && <p className="text-xs opacity-80 mt-0.5">{importMsg.detalhe}</p>}
          </div>
          <button onClick={() => setImportMsg(null)}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Truck size={14}/> Total de veículos</div>
          <p className="text-2xl font-bold text-gray-800">{fmtInt(totalVeiculos)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Scale size={14}/> Peso líquido total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totalPeso)} <span className="text-sm font-medium text-gray-400">ton</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1"><ArrowUpFromLine size={14}/> Carga</div>
          <p className="text-2xl font-bold text-gray-800">{fmtInt(carga?.count ?? 0)} <span className="text-sm font-medium text-gray-400">veíc · {fmt(carga?.pesoLiquido ?? 0)} t</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><ArrowDownToLine size={14}/> Descarga</div>
          <p className="text-2xl font-bold text-gray-800">{fmtInt(descarga?.count ?? 0)} <span className="text-sm font-medium text-gray-400">veíc · {fmt(descarga?.pesoLiquido ?? 0)} t</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button onClick={() => setTab("lista")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === "lista" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <Filter size={14} className="inline mr-1.5" />Marcações
        </button>
        <button onClick={() => setTab("comparativo")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === "comparativo" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <Link2 size={14} className="inline mr-1.5" />Realizado vs Contratado
        </button>
      </div>

      {tab === "lista" ? (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 relative">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar placa, motorista, romaneio, cliente…"
                  className={inp + " pl-9"} onKeyDown={e => e.key === "Enter" && carregar()} />
              </div>
              <select value={operacao} onChange={e => setOperacao(e.target.value)} className={inp}>
                <option value="">Todas operações</option>
                <option value="CARGA">Carga</option>
                <option value="DESCARGA">Descarga</option>
              </select>
              <select value={cliente} onChange={e => setCliente(e.target.value)} className={inp}>
                <option value="">Todos os clientes</option>
                {clientes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={produto} onChange={e => setProduto(e.target.value)} className={inp}>
                <option value="">Todos os produtos</option>
                {produtos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={transportadora} onChange={e => setTransportadora(e.target.value)} className={inp}>
                <option value="">Todas transportadoras</option>
                {transportadoras.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inp} title="Data inicial (carregamento)" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inp} title="Data final (carregamento)" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={carregar} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Aplicar filtros</button>
              <button onClick={limparFiltros} className="text-gray-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Limpar</button>
              <div className="ml-auto self-center text-sm text-gray-500">
                {loading ? "Carregando…" : `${marcacoes.length} marcações · ${fmt(pesoFiltrado)} t`}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Operação</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Data Carreg.</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Produto</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Cliente Destino</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Placa</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Transportadora</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Tipo Veíc.</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Prev. (t)</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Líq. (t)</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {marcacoes.map(m => (
                    <tr key={m.id} className="hover:bg-blue-50/40">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{m.numero}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${opBadge(m.operacao)}`}>{m.operacao ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {m.dataCarregamento ? new Date(m.dataCarregamento).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[220px] truncate" title={m.produto ?? ""}>{m.produto ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={m.clienteDestino ?? ""}>{m.clienteDestino ?? m.cliente ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.placa ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={m.transportadora ?? ""}>{m.transportadora ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{m.tipoVeiculo ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{fmt(m.pesoPrevisto)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800 tabular-nums">{fmt(m.pesoLiquido)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{m.status ?? "—"}</td>
                    </tr>
                  ))}
                  {!loading && marcacoes.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-12 text-gray-400">
                      Nenhuma marcação encontrada. Use <strong>Importar Excel</strong> para carregar a planilha do TOTVS.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ─── COMPARATIVO REALIZADO vs CONTRATADO ─────────────────────────── */
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Package size={14}/> Contratado total</div>
              <p className="text-2xl font-bold text-gray-800">{fmt(totaisComp.contratado)} <span className="text-sm font-medium text-gray-400">ton</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><Scale size={14}/> Realizado total</div>
              <p className="text-2xl font-bold text-gray-800">{fmt(totaisComp.realizado)} <span className="text-sm font-medium text-gray-400">ton</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Truck size={14}/> Veículos movimentados</div>
              <p className="text-2xl font-bold text-gray-800">{fmtInt(totaisComp.veiculos)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Link2 size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-700 text-sm">Cruzamento por cliente — contrato (TOTVS) × movimentação real</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Contratado (t)</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Realizado (t)</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Saldo (t)</th>
                    <th className="text-left px-3 py-2.5 font-semibold w-48">% Realizado</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Veíc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparativo.map((c, i) => {
                    const pct = c.pct ?? 0
                    const semContrato = c.contratado === 0
                    return (
                      <tr key={i} className="hover:bg-blue-50/40">
                        <td className="px-3 py-2 text-gray-700 font-medium max-w-[260px] truncate" title={c.cliente}>{c.cliente}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">{semContrato ? "—" : fmt(c.contratado)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800">{fmt(c.realizado)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${c.saldo < 0 ? "text-red-600" : "text-green-600"}`}>
                          {semContrato ? "—" : fmt(c.saldo)}
                        </td>
                        <td className="px-3 py-2">
                          {semContrato ? (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">sem contrato</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-green-500" : "bg-blue-500"}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-500 w-12 text-right">{fmt(pct, 0)}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{fmtInt(c.veiculos)}</td>
                      </tr>
                    )
                  })}
                  {comparativo.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                      Sem dados para cruzar. Importe marcações e contratos primeiro.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Link2 size={12} /> O cruzamento casa o <strong>Cliente Destino</strong> da marcação com o <strong>cliente do contrato</strong> (nome normalizado).
          </p>
        </>
      )}
    </div>
  )
}
