"use client"

import { useState, useEffect } from "react"
import { Package, TrendingUp, BarChart2, Target, Upload, Search, Plus, X } from "lucide-react"

const TIPOS_OPERACAO = ["BIG BAG", "GRANEL", "PRODUTO ACABADO"]
const OPERACOES = ["SIMPLES", "MISTURA", "EXPEDIÇÃO"]
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

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

// linha da aba "Realizado" (vinda da Marcação de Veículos)
type RealRow = {
  numero: string; data: string; ymd: string; contrato: string | null
  cliente: string; produto: string; tipoProduto: string | null
  operacao: string | null; linha: string | null; turno: string | null
  realizado: number; observacao: string
}

const LINHA_COLORS: Record<string, string> = {
  NAVE: "bg-blue-100 text-blue-700",
  "BAG MÓVEL": "bg-green-100 text-green-700",
  GRANEL: "bg-yellow-100 text-yellow-700",
  EMBEGADO: "bg-purple-100 text-purple-700",
  VARREDURA: "bg-gray-100 text-gray-600",
}

export default function ExpedicaoClient({
  contratos, registros: _registros, totalForecast, totalRealizado, totalOrcado, totalCapacidade, aderencia,
}: {
  contratos: Contrato[]
  registros: Registro[]
  totalForecast: number
  totalRealizado: number
  totalOrcado: number
  totalCapacidade: number
  aderencia: number
}) {
  const [aba, setAba] = useState<"contratos" | "registros" | "orcado" | "forecast" | "importar">("contratos")
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [busca, setBusca] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [rows, setRows] = useState<Contrato[]>(contratos)
  const [mesF, setMesF] = useState("")
  const [addNum, setAddNum] = useState("")
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState("")

  // Aba "Realizado" — dados vêm da Marcação de Veículos (CHECKOUT · CARGA)
  const [realMes, setRealMes] = useState(() => {
    const h = new Date()
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`
  })
  const [realRows, setRealRows] = useState<RealRow[]>([])
  const [realTotal, setRealTotal] = useState(0)
  const [realLoading, setRealLoading] = useState(false)

  useEffect(() => {
    if (aba !== "registros") return
    setRealLoading(true)
    fetch(`/api/expedicao/realizado?mes=${realMes}`)
      .then((r) => r.json())
      .then((d) => { setRealRows(d.rows ?? []); setRealTotal(d.totalRealizado ?? 0) })
      .catch(() => {})
      .finally(() => setRealLoading(false))
  }, [aba, realMes])

  async function salvarObs(numero: string, observacao: string) {
    const anterior = realRows.find((r) => r.numero === numero)?.observacao ?? ""
    setRealRows((prev) => prev.map((r) => (r.numero === numero ? { ...r, observacao } : r)))
    const ok = await fetch("/api/expedicao/realizado", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcacaoNumero: numero, observacao }),
    }).then((r) => r.ok).catch(() => false)
    if (!ok) {
      // reverte a observação se o salvamento falhar
      setRealRows((prev) => prev.map((r) => (r.numero === numero ? { ...r, observacao: anterior } : r)))
      alert("Falha ao salvar a observação. Tente novamente.")
    }
  }

  // ── Aba Orçado (anual, mês a mês — meta da diretoria) ──
  const anoAtual = new Date().getFullYear()
  const [orcAno, setOrcAno] = useState(anoAtual)
  const [orcMeses, setOrcMeses] = useState<{ mes: number; orcado: number }[]>([])
  const [orcTotal, setOrcTotal] = useState(0)
  const [orcLoading, setOrcLoading] = useState(false)

  useEffect(() => {
    if (aba !== "orcado") return
    setOrcLoading(true)
    fetch(`/api/expedicao/orcado?ano=${orcAno}`)
      .then((r) => r.json())
      .then((d) => { setOrcMeses(d.meses ?? []); setOrcTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setOrcLoading(false))
  }, [aba, orcAno])

  async function salvarOrcado(mes: number, orcado: number) {
    setOrcMeses((prev) => {
      const next = prev.map((m) => (m.mes === mes ? { ...m, orcado } : m))
      setOrcTotal(next.reduce((s, m) => s + m.orcado, 0))
      return next
    })
    await fetch("/api/expedicao/orcado", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano: orcAno, mes, orcado }),
    }).catch(() => {})
  }

  // ── Aba Forecast (por cliente/mês) ──
  const [fcAno, setFcAno] = useState(anoAtual)
  const [fcMes, setFcMes] = useState(new Date().getMonth() + 1)
  const [fcRows, setFcRows] = useState<{ clienteNome: string; forecast: number; realizado: number; desvio: number | null }[]>([])
  const [fcTotForecast, setFcTotForecast] = useState(0)
  const [fcTotRealizado, setFcTotRealizado] = useState(0)
  const [fcClientes, setFcClientes] = useState<string[]>([])
  const [fcLoading, setFcLoading] = useState(false)
  const [fcNovoCliente, setFcNovoCliente] = useState("")

  useEffect(() => {
    if (aba !== "forecast") return
    setFcLoading(true)
    fetch(`/api/expedicao/forecast?ano=${fcAno}&mes=${fcMes}`)
      .then((r) => r.json())
      .then((d) => { setFcRows(d.rows ?? []); setFcTotForecast(d.totalForecast ?? 0); setFcTotRealizado(d.totalRealizado ?? 0); setFcClientes(d.clientes ?? []) })
      .catch(() => {})
      .finally(() => setFcLoading(false))
  }, [aba, fcAno, fcMes])

  async function salvarForecast(clienteNome: string, forecast: number) {
    setFcRows((prev) => {
      const next = prev.map((r) => (r.clienteNome === clienteNome
        ? { ...r, forecast, desvio: forecast > 0 ? ((r.realizado - forecast) / forecast) * 100 : null }
        : r))
      setFcTotForecast(next.reduce((s, r) => s + r.forecast, 0))
      return next
    })
    await fetch("/api/expedicao/forecast", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano: fcAno, mes: fcMes, clienteNome, forecast }),
    }).catch(() => {})
  }
  function adicionarClienteForecast() {
    const nome = fcNovoCliente.trim()
    if (!nome) return
    if (!fcRows.some((r) => r.clienteNome.toLowerCase() === nome.toLowerCase()))
      setFcRows((prev) => [{ clienteNome: nome, forecast: 0, realizado: 0, desvio: null }, ...prev])
    setFcNovoCliente("")
  }

  const gap = totalRealizado - totalForecast
  const performance = totalCapacidade > 0 ? (totalRealizado / totalCapacidade) * 100 : 0
  const mesesContrato = [...new Set(rows.map((c) => c.mes).filter(Boolean) as string[])].sort()

  async function salvarContratoCampo(id: string, campo: "tipoProduto" | "operacao", valor: string) {
    setRows((prev) => prev.map((c) => c.id === id ? { ...c, [campo]: valor || null } : c))
    await fetch(`/api/expedicao/contrato/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: valor }) })
  }
  async function adicionarContrato() {
    if (!addNum.trim()) return
    setAdding(true); setAddMsg("")
    const r = await fetch("/api/expedicao/contrato", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero: addNum.trim() }) })
    const d = await r.json()
    setAdding(false)
    if (r.ok) { setRows((prev) => [d, ...prev]); setAddNum(""); setAddMsg(`✓ Contrato ${d.numero} — ${d.cliente.nome} adicionado.`) }
    else setAddMsg(`✕ ${d.error ?? "Erro ao adicionar."}`)
  }

  const contratosFiltrados = rows
    .filter((c) => filtroStatus === "TODOS" || c.status === filtroStatus)
    .filter((c) => !mesF || c.mes === mesF)
    .filter((c) => {
      const q = busca.toLowerCase()
      return (
        c.numero.toLowerCase().includes(q) ||
        c.cliente.nome.toLowerCase().includes(q) ||
        (c.produtoAbreviado ?? "").toLowerCase().includes(q) ||
        (c.operacao ?? "").toLowerCase().includes(q)
      )
    })

  const realFiltrados = realRows.filter((r) => {
    const q = busca.toLowerCase()
    return (
      r.cliente.toLowerCase().includes(q) ||
      r.produto.toLowerCase().includes(q) ||
      (r.contrato ?? "").toLowerCase().includes(q)
    )
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
        <h2 className="text-2xl font-bold text-gray-800">Controle de Expedição</h2>
        <p className="text-gray-500 text-sm mt-1">Contratos (TOTVS), realizado da Marcação, orçado, forecast e capacidade</p>
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
          { id: "registros", label: "Realizado" },
          { id: "orcado", label: "Orçado" },
          { id: "forecast", label: "Forecast" },
          { id: "importar", label: "Importar Excel" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => { setAba(id as typeof aba); setBusca("") }}
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
          {/* Adicionar contrato só pelo número (resto vem do TOTVS) */}
          <div className="flex flex-wrap items-center gap-2 mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <span className="text-xs font-semibold text-blue-700">Adicionar contrato:</span>
            <input value={addNum} onChange={(e) => setAddNum(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionarContrato()}
              placeholder="nº do contrato" className="w-40 text-sm border border-blue-300 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={adicionarContrato} disabled={adding}
              className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60">
              <Plus size={14} /> {adding ? "Buscando TOTVS…" : "Adicionar"}
            </button>
            <span className="text-xs text-gray-500">cliente e produto vêm do <strong>Contratos TOTVS</strong></span>
            {addMsg && <span className={`text-xs font-medium ml-1 ${addMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{addMsg} <button onClick={() => setAddMsg("")}><X size={11} className="inline" /></button></span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {["TODOS", "PROGRAMADO", "FINALIZADO", "CANCELADO"].map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroStatus === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {s}
              </button>
            ))}
            {mesesContrato.length > 0 && (
              <select value={mesF} onChange={(e) => setMesF(e.target.value)}
                className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 ${mesF ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                <option value="">Todos os meses</option>
                {mesesContrato.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
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
                      <td className="px-2 py-2">
                        <select value={c.tipoProduto ?? ""} onChange={(e) => salvarContratoCampo(c.id, "tipoProduto", e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">—</option>
                          {TIPOS_OPERACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={c.operacao ?? ""} onChange={(e) => salvarContratoCampo(c.id, "operacao", e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">—</option>
                          {OPERACOES.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
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

      {/* Realizado — vem da Marcação de Veículos (CHECKOUT · CARGA) */}
      {aba === "registros" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="month" value={realMes} onChange={(e) => setRealMes(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <span className="text-xs font-medium text-gray-500">
              {realLoading ? "Carregando…" : `${realFiltrados.length} carregamento(s) · `}
              {!realLoading && <span className="text-green-700 font-semibold">{realTotal.toLocaleString("pt-BR")} t</span>}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">tipo/operação vêm do <strong>Contrato de Expedição</strong> casado por cliente + produto</span>
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar contrato, cliente, produto..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Data", "Contrato", "Cliente", "Produto", "Tipo Operação", "Operação", "Linha", "Turno", "Realizado (t)", "Observação"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {realFiltrados.map((r) => (
                  <tr key={`${realMes}-${r.numero}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{r.data}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{r.contrato ?? "—"}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{r.cliente}</td>
                    <td className="px-3 py-2 text-gray-600">{r.produto}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{r.tipoProduto ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{r.operacao ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.linha && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LINHA_COLORS[r.linha] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.linha}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        r.turno === "A" ? "bg-yellow-100 text-yellow-700" :
                        r.turno === "B" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>{r.turno ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-green-700 whitespace-nowrap">{r.realizado.toLocaleString("pt-BR")}</td>
                    <td className="px-2 py-1.5">
                      <input key={`${realMes}-${r.numero}-${r.observacao}`} defaultValue={r.observacao} placeholder="—"
                        onBlur={(e) => { if (e.target.value !== r.observacao) salvarObs(r.numero, e.target.value) }}
                        className="w-44 text-xs border border-transparent hover:border-gray-200 focus:border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-200" />
                    </td>
                  </tr>
                ))}
                {!realLoading && realFiltrados.length === 0 && (
                  <tr><td colSpan={10} className="py-10 text-center text-gray-400">Nenhum carregamento (CHECKOUT · CARGA) neste mês.</td></tr>
                )}
                {realLoading && (
                  <tr><td colSpan={10} className="py-10 text-center text-gray-400">Carregando…</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* Orçado — anual, mês a mês (meta da diretoria) */}
      {aba === "orcado" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="text-xs text-gray-500">Ano:</label>
            <select value={orcAno} onChange={(e) => setOrcAno(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className="text-xs text-gray-500 ml-2">
              Meta da diretoria por mês — <span className="font-semibold text-blue-700">{orcTotal.toLocaleString("pt-BR")} t</span> no ano
              {orcLoading && <span className="text-gray-400 ml-2">carregando…</span>}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 max-w-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {orcMeses.map((m) => (
                <div key={m.mes} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-8">{MESES[m.mes - 1]}</span>
                  <input key={`${orcAno}-${m.mes}-${m.orcado}`} type="number" min="0" step="10" defaultValue={m.orcado || ""} placeholder="0"
                    onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== m.orcado) salvarOrcado(m.mes, v) }}
                    className="flex-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forecast — por cliente/mês */}
      {aba === "forecast" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select value={fcAno} onChange={(e) => setFcAno(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={fcMes} onChange={(e) => setFcMes(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {MESES.map((nome, i) => <option key={i} value={i + 1}>{nome}</option>)}
            </select>
            <span className="text-xs text-gray-500">
              Forecast <span className="font-semibold text-blue-700">{fcTotForecast.toLocaleString("pt-BR")} t</span>
              {" · "}Realizado <span className="font-semibold text-green-700">{fcTotRealizado.toLocaleString("pt-BR")} t</span> <span className="text-gray-400">(nave/bag)</span>
              {fcLoading && <span className="text-gray-400 ml-2">carregando…</span>}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <input list="fc-clientes" value={fcNovoCliente} onChange={(e) => setFcNovoCliente(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarClienteForecast()}
                placeholder="+ cliente" className="w-40 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <datalist id="fc-clientes">{fcClientes.map((c) => <option key={c} value={c} />)}</datalist>
              <button onClick={adicionarClienteForecast} className="bg-blue-600 text-white rounded-lg px-2 py-1.5 hover:bg-blue-700"><Plus size={14} /></button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Cliente", "Forecast (t)", "Realizado (t)", "Desvio"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fcRows.map((r) => (
                    <tr key={`${fcAno}-${fcMes}-${r.clienteNome}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{r.clienteNome}</td>
                      <td className="px-2 py-1.5">
                        <input key={`${fcAno}-${fcMes}-${r.clienteNome}-${r.forecast}`} type="number" min="0" step="10" defaultValue={r.forecast || ""} placeholder="0"
                          onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.forecast) salvarForecast(r.clienteNome, v) }}
                          className="w-28 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-green-700">{r.realizado.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">
                        {r.desvio === null ? <span className="text-gray-300">—</span> : (
                          <span className={`font-medium ${r.desvio >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {r.desvio >= 0 ? "+" : ""}{r.desvio.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!fcLoading && fcRows.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sem forecast nem realizado neste mês. Adicione um cliente acima.</td></tr>
                  )}
                  {fcLoading && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Carregando…</td></tr>}
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
