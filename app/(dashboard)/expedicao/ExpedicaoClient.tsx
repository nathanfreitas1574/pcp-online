"use client"

import { useState, useEffect } from "react"
import { Package, TrendingUp, BarChart2, Target, Upload, Search, Plus, X, CalendarDays, Zap, ChevronLeft, ChevronRight } from "lucide-react"
import { getSemanaAtual, semanasDoAno } from "@/lib/programacao"

const TIPOS_OPERACAO = ["BIG BAG", "GRANEL", "PRODUTO ACABADO"]
const OPERACOES = ["SIMPLES", "MISTURA", "EXPEDIÇÃO"]
const LINHAS_PRODUCAO = ["MISTURA 1", "MISTURA 2", "BAG MÓVEL", "PRODUTO ACABADO", "GRANEL"]
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const TIPO_OP_DIA = ["ENVASE", "GRANEL", "COMPACTADOR", "PRODUTO ACABADO"]
const OPERACAO_DIA = ["SIMPLES", "MISTURA", "GRANEL", "COMPACTADOR"]
const LINHA_PROD_DIA = ["NAVE", "EMBEGADO", "GRANEL", "COMPACTADOR", "BAG MÓVEL"]
const DDINP = "w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"

type Contrato = {
  id: string; numero: string; operacao: string | null; produtoAbreviado: string | null
  tipoProduto: string | null; linhaProducao: string | null; mes: string | null; semana: number | null
  volProgramado: number; realizado: number; saldo: number; status: string; pct?: number | null
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
  "PRODUTO ACABADO": "bg-emerald-100 text-emerald-700",
  COMPACTADOR: "bg-orange-100 text-orange-700",
  EMBEGADO: "bg-purple-100 text-purple-700",
  VARREDURA: "bg-gray-100 text-gray-600",
}

export default function ExpedicaoClient({
  contratos, registros: _registros, totalForecast: _totalForecast, totalRealizado: _totalRealizado, totalOrcado: _totalOrcado, totalCapacidade, aderencia: _aderencia,
}: {
  contratos: Contrato[]
  registros: Registro[]
  totalForecast: number
  totalRealizado: number
  totalOrcado: number
  totalCapacidade: number
  aderencia: number
}) {
  const [aba, setAba] = useState<"contratos" | "registros" | "diadia" | "orcado" | "forecast" | "capacidade" | "importar">("contratos")
  const [filtroStatus, setFiltroStatus] = useState("TODOS")
  const [busca, setBusca] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [rows, setRows] = useState<Contrato[]>(contratos)
  const [addNum, setAddNum] = useState("")
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState("")

  // Aba Contratos — Vol.Prog (Programação Semanal), Realizado (Marcação), Saldo e % por período
  const [ctrAno, setCtrAno] = useState(() => new Date().getFullYear())
  const [ctrMes, setCtrMes] = useState(0)       // 0 = todos os meses
  const [ctrSemana, setCtrSemana] = useState(0) // 0 = todas as semanas
  const [ctrSemanas, setCtrSemanas] = useState(53)
  const [ctrClienteF, setCtrClienteF] = useState("")
  const [ctrProdutoF, setCtrProdutoF] = useState("")
  const [ctrTotProg, setCtrTotProg] = useState(0)
  const [ctrTotReal, setCtrTotReal] = useState(0)
  const [ctrLoading, setCtrLoading] = useState(false)

  useEffect(() => {
    if (aba !== "contratos") return
    setCtrLoading(true)
    const qs = new URLSearchParams({ ano: String(ctrAno), mes: String(ctrMes), semana: String(ctrSemana) })
    fetch(`/api/expedicao/contratos?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (d.rows) setRows(d.rows); setCtrTotProg(d.totalProgramado ?? 0); setCtrTotReal(d.totalRealizado ?? 0); setCtrSemanas(d.semanas ?? 53) })
      .catch(() => {})
      .finally(() => setCtrLoading(false))
  }, [aba, ctrAno, ctrMes, ctrSemana])

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

  // ── Aba Forecast (por cliente/tipo, lançado por data) ──
  type FcRow = { clienteNome: string; forecast: number; realizado: number; desvio: number | null }
  const [fcGran, setFcGran] = useState<"ano" | "mes" | "semana">("mes")
  const [fcAno, setFcAno] = useState(anoAtual)
  const [fcMes, setFcMes] = useState(new Date().getMonth() + 1)
  const [fcSemana, setFcSemana] = useState(() => getSemanaAtual().semana)
  const [fcTipo, setFcTipo] = useState("ENVASE")
  const [fcRows, setFcRows] = useState<FcRow[]>([])
  const [fcTotForecast, setFcTotForecast] = useState(0)
  const [fcTotRealizado, setFcTotRealizado] = useState(0)
  const [fcClientes, setFcClientes] = useState<string[]>([])
  const [fcTipos, setFcTipos] = useState<string[]>(["ENVASE", "GRANEL", "PRODUTO ACABADO"])
  const [fcLabel, setFcLabel] = useState("")
  const [fcLoading, setFcLoading] = useState(false)
  const [fcNovoCliente, setFcNovoCliente] = useState("")
  // modal diário
  const [fcDiasCliente, setFcDiasCliente] = useState<string | null>(null)
  const [fcDias, setFcDias] = useState<{ dia: number; dow: number; forecast: number }[]>([])
  const [fcDiasLoading, setFcDiasLoading] = useState(false)
  const [fcExplodir, setFcExplodir] = useState("")

  const fcEditavel = fcGran === "mes" && fcTipo !== "TODOS"

  function carregarForecast() {
    setFcLoading(true)
    const qs = new URLSearchParams({ gran: fcGran, ano: String(fcAno), mes: String(fcMes), semana: String(fcSemana), tipo: fcTipo })
    fetch(`/api/expedicao/forecast?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setFcRows(d.rows ?? []); setFcTotForecast(d.totalForecast ?? 0); setFcTotRealizado(d.totalRealizado ?? 0)
        setFcClientes(d.clientes ?? []); setFcTipos(d.tipos ?? ["ENVASE", "GRANEL"]); setFcLabel(d.label ?? "")
      })
      .catch(() => {})
      .finally(() => setFcLoading(false))
  }
  useEffect(() => {
    if (aba !== "forecast") return
    carregarForecast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, fcGran, fcAno, fcMes, fcSemana, fcTipo])

  async function salvarForecastMes(clienteNome: string, valor: number) {
    setFcRows((prev) => {
      const next = prev.map((r) => (r.clienteNome === clienteNome
        ? { ...r, forecast: valor, desvio: valor > 0 ? ((r.realizado - valor) / valor) * 100 : null }
        : r))
      setFcTotForecast(next.reduce((s, r) => s + r.forecast, 0))
      return next
    })
    await fetch("/api/expedicao/forecast", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escopo: "mes", ano: fcAno, mes: fcMes, clienteNome, tipo: fcTipo, forecast: valor }),
    }).catch(() => {})
  }
  function adicionarClienteForecast() {
    const nome = fcNovoCliente.trim()
    if (!nome) return
    if (!fcRows.some((r) => r.clienteNome.toLowerCase() === nome.toLowerCase()))
      setFcRows((prev) => [{ clienteNome: nome, forecast: 0, realizado: 0, desvio: null }, ...prev])
    setFcNovoCliente("")
  }

  // modal diário (explosão / lançamento por dia)
  function abrirDias(clienteNome: string) {
    setFcDiasCliente(clienteNome); setFcDiasLoading(true); setFcDias([]); setFcExplodir("")
    const qs = new URLSearchParams({ modo: "dias", ano: String(fcAno), mes: String(fcMes), cliente: clienteNome, tipo: fcTipo === "TODOS" ? "ENVASE" : fcTipo })
    fetch(`/api/expedicao/forecast?${qs}`).then((r) => r.json()).then((d) => setFcDias(d.dias ?? [])).catch(() => {}).finally(() => setFcDiasLoading(false))
  }
  async function salvarDia(dia: number, valor: number) {
    setFcDias((prev) => prev.map((d) => (d.dia === dia ? { ...d, forecast: valor } : d)))
    await fetch("/api/expedicao/forecast", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escopo: "dia", ano: fcAno, mes: fcMes, dia, clienteNome: fcDiasCliente, tipo: fcTipo === "TODOS" ? "ENVASE" : fcTipo, forecast: valor }),
    }).catch(() => {})
  }
  async function explodirMes() {
    if (!fcDiasCliente) return
    const total = Number(fcExplodir) || 0
    await fetch("/api/expedicao/forecast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano: fcAno, mes: fcMes, clienteNome: fcDiasCliente, tipo: fcTipo === "TODOS" ? "ENVASE" : fcTipo, total }),
    }).catch(() => {})
    abrirDias(fcDiasCliente)
  }
  function fecharDias() { setFcDiasCliente(null); carregarForecast() }
  const fcDiasTotal = fcDias.reduce((s, d) => s + d.forecast, 0)

  // ── Aba Capacidade (equipamento × turno A/B/C) ──
  type CapRow = { linha: string; turnos: Record<string, number>; total: number }
  const [capAno, setCapAno] = useState(anoAtual)
  const [capMes, setCapMes] = useState(new Date().getMonth() + 1)
  const [capRows, setCapRows] = useState<CapRow[]>([])
  const [capTurnos, setCapTurnos] = useState<string[]>(["A", "B", "C"])
  const [capTotaisTurno, setCapTotaisTurno] = useState<Record<string, number>>({})
  const [capTotalGeral, setCapTotalGeral] = useState(0)
  const [capLoading, setCapLoading] = useState(false)

  useEffect(() => {
    if (aba !== "capacidade") return
    setCapLoading(true)
    fetch(`/api/expedicao/capacidade?ano=${capAno}&mes=${capMes}`)
      .then((r) => r.json())
      .then((d) => {
        setCapRows(d.rows ?? [])
        setCapTurnos(d.turnos ?? ["A", "B", "C"])
        setCapTotaisTurno(d.totaisTurno ?? {})
        setCapTotalGeral(d.totalGeral ?? 0)
      })
      .catch(() => {})
      .finally(() => setCapLoading(false))
  }, [aba, capAno, capMes])

  async function salvarCapacidade(linha: string, turno: string, capacidade: number) {
    setCapRows((prev) => {
      const next = prev.map((r) => {
        if (r.linha !== linha) return r
        const turnos = { ...r.turnos, [turno]: capacidade }
        const total = capTurnos.reduce((s, t) => s + (turnos[t] ?? 0), 0)
        return { ...r, turnos, total }
      })
      setCapTotalGeral(next.reduce((s, r) => s + r.total, 0))
      setCapTotaisTurno(Object.fromEntries(capTurnos.map((t) => [t, next.reduce((s, r) => s + (r.turnos[t] ?? 0), 0)])))
      return next
    })
    await fetch("/api/expedicao/capacidade", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano: capAno, mes: capMes, linha, turno, capacidade }),
    }).catch(() => {})
  }

  // ── Aba Dia a Dia (Orçado x Faturado) — linhas VÊM DA MARCAÇÃO ──
  type DiaRow = {
    chave: string; data: string; cliente: string; produto: string
    tipoOperacao: string | null; operacao: string | null; linhaProducao: string | null
    forecast: number; turnoA: number; turnoB: number; turnoC: number; obs: string; realizado: number
  }
  const [ddMes, setDdMes] = useState(() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}` })
  const [ddRows, setDdRows] = useState<DiaRow[]>([])
  const [ddLoading, setDdLoading] = useState(false)

  function carregarDiaDia() {
    setDdLoading(true)
    fetch(`/api/expedicao/diadia?mes=${ddMes}`)
      .then((r) => r.json())
      .then((d) => setDdRows(d.rows ?? []))
      .catch(() => {})
      .finally(() => setDdLoading(false))
  }
  useEffect(() => {
    if (aba !== "diadia") return
    carregarDiaDia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, ddMes])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function salvarDiaCampo(chave: string, campo: keyof DiaRow, valor: any) {
    const anterior = ddRows.find((r) => r.chave === chave)?.[campo]
    setDdRows((prev) => prev.map((r) => (r.chave === chave ? { ...r, [campo]: valor } : r)))
    const ok = await fetch("/api/expedicao/diadia", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave, [campo]: valor }),
    }).then((r) => r.ok).catch(() => false)
    if (!ok) {
      setDdRows((prev) => prev.map((r) => (r.chave === chave ? { ...r, [campo]: anterior } : r)))
      alert("Falha ao salvar. Tente novamente.")
    }
  }
  const ddFiltradas = ddRows.filter((r) => !busca || `${r.cliente} ${r.produto} ${r.linhaProducao ?? ""} ${r.obs}`.toLowerCase().includes(busca.toLowerCase()))
  const ddTotForecast = ddFiltradas.reduce((s, r) => s + r.forecast, 0)
  const ddTotRealizado = ddFiltradas.reduce((s, r) => s + r.realizado, 0)

  const gap = ctrTotReal - ctrTotProg
  const ctrAderencia = ctrTotProg > 0 ? (ctrTotReal / ctrTotProg) * 100 : 0
  const performance = totalCapacidade > 0 ? (ctrTotReal / totalCapacidade) * 100 : 0
  const ctrClientes = [...new Set(rows.map((c) => c.cliente.nome))].sort()
  const ctrProdutos = [...new Set(rows.map((c) => c.produtoAbreviado).filter(Boolean) as string[])].sort()

  async function salvarContratoCampo(id: string, campo: "tipoProduto" | "operacao" | "linhaProducao", valor: string) {
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
    .filter((c) => !ctrClienteF || c.cliente.nome === ctrClienteF)
    .filter((c) => !ctrProdutoF || (c.produtoAbreviado ?? "") === ctrProdutoF)
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
          { label: "Programado", value: ctrTotProg.toLocaleString("pt-BR"), icon: Target, sub: "ton (Prog. Semanal)" },
          { label: "Realizado", value: ctrTotReal.toLocaleString("pt-BR"), icon: Package, sub: "ton (Marcação)" },
          { label: "Saldo", value: (gap >= 0 ? "+" : "") + gap.toLocaleString("pt-BR"), icon: BarChart2, sub: "realiz − prog" },
          { label: "Aderência", value: `${ctrAderencia.toFixed(1)}%`, icon: TrendingUp, sub: "realiz/prog" },
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
          { id: "diadia", label: "Dia a Dia" },
          { id: "orcado", label: "Orçado" },
          { id: "forecast", label: "Forecast" },
          { id: "capacidade", label: "Capacidade" },
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
            {/* período: ano · mês · semana (Vol.Prog e Realizado são calculados nele) */}
            <select value={ctrAno} onChange={(e) => setCtrAno(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={ctrMes} onChange={(e) => { setCtrMes(Number(e.target.value)); if (Number(e.target.value)) setCtrSemana(0) }}
              className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 ${ctrMes ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
              <option value={0}>Mês: todos</option>
              {MESES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
            <select value={ctrSemana} onChange={(e) => { setCtrSemana(Number(e.target.value)); if (Number(e.target.value)) setCtrMes(0) }}
              className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 ${ctrSemana ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
              <option value={0}>Semana: todas</option>
              {Array.from({ length: ctrSemanas }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            {ctrLoading && <span className="text-[11px] text-gray-400">calculando…</span>}
            <span className="text-gray-300 mx-1">|</span>
            {["TODOS", "PROGRAMADO", "FINALIZADO", "CANCELADO"].map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroStatus === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {s}
              </button>
            ))}
            {ctrClientes.length > 0 && (
              <select value={ctrClienteF} onChange={(e) => setCtrClienteF(e.target.value)}
                className={`text-xs rounded-lg px-2 py-1.5 border max-w-40 focus:outline-none focus:ring-2 focus:ring-blue-200 ${ctrClienteF ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                <option value="">Cliente: todos</option>
                {ctrClientes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {ctrProdutos.length > 0 && (
              <select value={ctrProdutoF} onChange={(e) => setCtrProdutoF(e.target.value)}
                className={`text-xs rounded-lg px-2 py-1.5 border max-w-40 focus:outline-none focus:ring-2 focus:ring-blue-200 ${ctrProdutoF ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                <option value="">Produto: todos</option>
                {ctrProdutos.map((p) => <option key={p} value={p}>{p}</option>)}
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
                    {["Contrato", "Cliente", "Produto", "Tipo", "Operação", "Linha Produção", "Vol. Prog.", "Realizado", "Saldo", "%", "Status"].map((h) => (
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
                      <td className="px-2 py-2">
                        <select value={c.linhaProducao ?? ""} onChange={(e) => salvarContratoCampo(c.id, "linhaProducao", e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">—</option>
                          {LINHAS_PRODUCAO.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{c.volProgramado.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">{c.realizado.toLocaleString("pt-BR")}</td>
                      <td className={`px-3 py-2 text-right font-medium ${c.saldo < 0 ? "text-amber-600" : "text-gray-700"}`}>
                        {c.saldo.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {c.pct == null ? <span className="text-gray-300">—</span> : (
                          <span className={`font-semibold ${c.pct >= 100 ? "text-green-600" : c.pct >= 70 ? "text-amber-600" : "text-red-500"}`}>{c.pct.toFixed(0)}%</span>
                        )}
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
                    <tr><td colSpan={11} className="py-10 text-center text-gray-400">Nenhum contrato no período/filtro.</td></tr>
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

      {/* Dia a Dia (Orçado x Faturado) — realizado total automático da Marcação */}
      {aba === "diadia" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="month" value={ddMes} onChange={(e) => setDdMes(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
            <span className="text-xs text-gray-500">
              {ddLoading ? "carregando…" : `${ddFiltradas.length} linha(s)`}
              {" · "}Forecast <span className="font-semibold text-blue-700">{ddTotForecast.toLocaleString("pt-BR")} t</span>
              {" · "}Realizado <span className="font-semibold text-green-700">{ddTotRealizado.toLocaleString("pt-BR")} t</span>
            </span>
            <span className="text-xs text-gray-400 hidden lg:inline">as linhas vêm da <strong>Marcação de Veículos</strong> (CHECKOUT · CARGA)</span>
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, produto, linha…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 w-56 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-800 text-white">
                  <tr>
                    <th className="px-2 py-2.5 text-left font-medium min-w-24">Data</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-28">Cliente</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-28">Produto</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-28">Tipo Operação</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-24">Operação</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-28">Linha Produção</th>
                    <th className="px-2 py-2.5 text-center font-medium min-w-20">Forecast</th>
                    <th className="px-2 py-2.5 text-center font-medium min-w-24 bg-green-900">Realizado</th>
                    <th className="px-2 py-2.5 text-center font-medium min-w-16">T. A</th>
                    <th className="px-2 py-2.5 text-center font-medium min-w-16">T. B</th>
                    <th className="px-2 py-2.5 text-center font-medium min-w-16">T. C</th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-28">OBS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ddFiltradas.map((r) => (
                    <tr key={r.chave} className="hover:bg-green-50/40">
                      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{r.data.split("-").reverse().join("/")}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-800">{r.cliente}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{r.produto}</td>
                      <td className="px-1 py-1">
                        <select value={r.tipoOperacao ?? ""} onChange={(e) => salvarDiaCampo(r.chave, "tipoOperacao", e.target.value)} className={DDINP}>
                          <option value="">—</option>{TIPO_OP_DIA.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select value={r.operacao ?? ""} onChange={(e) => salvarDiaCampo(r.chave, "operacao", e.target.value)} className={DDINP}>
                          <option value="">—</option>{OPERACAO_DIA.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select value={r.linhaProducao ?? ""} onChange={(e) => salvarDiaCampo(r.chave, "linhaProducao", e.target.value)} className={DDINP}>
                          <option value="">—</option>{LINHA_PROD_DIA.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input key={`${r.chave}-f-${r.forecast}`} type="number" min="0" step="10" defaultValue={r.forecast || ""} placeholder="0" onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.forecast) salvarDiaCampo(r.chave, "forecast", v) }} className={`${DDINP} text-right`} /></td>
                      <td className="px-2 py-1 text-right font-semibold text-green-700 tabular-nums bg-green-50/50">{r.realizado ? r.realizado.toLocaleString("pt-BR") : "—"}</td>
                      <td className="px-1 py-1"><input key={`${r.chave}-a-${r.turnoA}`} type="number" min="0" step="10" defaultValue={r.turnoA || ""} placeholder="0" onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.turnoA) salvarDiaCampo(r.chave, "turnoA", v) }} className={`${DDINP} text-right`} /></td>
                      <td className="px-1 py-1"><input key={`${r.chave}-b-${r.turnoB}`} type="number" min="0" step="10" defaultValue={r.turnoB || ""} placeholder="0" onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.turnoB) salvarDiaCampo(r.chave, "turnoB", v) }} className={`${DDINP} text-right`} /></td>
                      <td className="px-1 py-1"><input key={`${r.chave}-c-${r.turnoC}`} type="number" min="0" step="10" defaultValue={r.turnoC || ""} placeholder="0" onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.turnoC) salvarDiaCampo(r.chave, "turnoC", v) }} className={`${DDINP} text-right`} /></td>
                      <td className="px-1 py-1"><input key={`${r.chave}-o`} defaultValue={r.obs} placeholder="obs" onBlur={(e) => { if (e.target.value !== r.obs) salvarDiaCampo(r.chave, "obs", e.target.value) }} className={DDINP} /></td>
                    </tr>
                  ))}
                  {!ddLoading && ddFiltradas.length === 0 && (
                    <tr><td colSpan={12} className="py-10 text-center text-gray-400">{busca ? "Nenhuma linha para esse filtro." : "Nenhuma carga (CHECKOUT · CARGA) na Marcação neste mês."}</td></tr>
                  )}
                  {ddLoading && <tr><td colSpan={12} className="py-10 text-center text-gray-400">Carregando…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">As linhas (Data · Cliente · Produto · <span className="text-green-700 font-semibold">Realizado</span>) vêm da <strong>Marcação de Veículos</strong> (CHECKOUT · CARGA). Tipo/Operação/Linha vêm do contrato mas dá pra ajustar. Forecast e Turno A/B/C são digitados.</p>
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
                  <input key={`${orcAno}-${m.mes}`} type="number" min="0" step="10" defaultValue={m.orcado || ""} placeholder="0"
                    onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== m.orcado) salvarOrcado(m.mes, v) }}
                    className="flex-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forecast — por cliente/tipo, lançado por data */}
      {aba === "forecast" && (
        <div>
          {/* controles: granularidade + período + tipo */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["ano", "mes", "semana"] as const).map((g) => (
                <button key={g} onClick={() => setFcGran(g)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${fcGran === g ? "bg-blue-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {g === "ano" ? "Ano" : g === "mes" ? "Mês" : "Semana"}
                </button>
              ))}
            </div>
            <select value={fcAno} onChange={(e) => setFcAno(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {fcGran !== "ano" && (
              <select value={fcMes} onChange={(e) => setFcMes(Number(e.target.value))}
                className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {MESES.map((nome, i) => <option key={i} value={i + 1}>{nome}</option>)}
              </select>
            )}
            {fcGran === "semana" && (
              <div className="flex items-center gap-1 text-xs">
                <button onClick={() => setFcSemana((s) => Math.max(1, s - 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500"><ChevronLeft size={14} /></button>
                <span className="text-gray-600 min-w-8 text-center font-medium">S{fcSemana}</span>
                <button onClick={() => setFcSemana((s) => Math.min(semanasDoAno(fcAno), s + 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500"><ChevronRight size={14} /></button>
              </div>
            )}
            {/* tipo */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-1">
              {[...fcTipos, "TODOS"].map((t) => (
                <button key={t} onClick={() => setFcTipo(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${fcTipo === t ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {t === "ENVASE" ? "Envase" : t === "GRANEL" ? "Granel" : t === "PRODUTO ACABADO" ? "Produto Acabado" : t === "TODOS" ? "Todos" : t}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              <span className="text-gray-400">{fcLabel} · </span>
              F <span className="font-semibold text-blue-700">{fcTotForecast.toLocaleString("pt-BR")} t</span>
              {" · "}R <span className="font-semibold text-green-700">{fcTotRealizado.toLocaleString("pt-BR")} t</span>
              {fcLoading && <span className="text-gray-400 ml-1">carregando…</span>}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <input list="fc-clientes" value={fcNovoCliente} onChange={(e) => setFcNovoCliente(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarClienteForecast()}
                placeholder="+ cliente" className="w-40 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <datalist id="fc-clientes">{fcClientes.map((c) => <option key={c} value={c} />)}</datalist>
              <button onClick={adicionarClienteForecast} className="bg-blue-600 text-white rounded-lg px-2 py-1.5 hover:bg-blue-700"><Plus size={14} /></button>
            </div>
          </div>
          {!fcEditavel && (
            <p className="text-[11px] text-gray-400 mb-2">
              Edição de forecast só na granularidade <strong>Mês</strong> com um tipo selecionado (não em Todos). Aqui é só visualização/soma do período.
            </p>
          )}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Cliente", "Forecast (t)", "Realizado (t)", "Desvio (% · t)", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fcRows.map((r) => (
                    <tr key={`${fcGran}-${fcAno}-${fcMes}-${fcSemana}-${fcTipo}-${r.clienteNome}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{r.clienteNome}</td>
                      <td className="px-2 py-1.5">
                        {fcEditavel ? (
                          <input key={`${fcAno}-${fcMes}-${fcTipo}-${r.clienteNome}-${r.forecast}`} type="number" min="0" step="10" defaultValue={r.forecast || ""} placeholder="0"
                            onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r.forecast) salvarForecastMes(r.clienteNome, v) }}
                            className="w-28 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                        ) : (
                          <span className="text-gray-700 pr-2">{r.forecast.toLocaleString("pt-BR")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-green-700">{r.realizado.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">
                        {(() => {
                          const volDif = Math.round((r.realizado - r.forecast) * 100) / 100
                          const pos = volDif >= 0
                          return (
                            <div className="leading-tight">
                              {r.desvio === null
                                ? <span className="text-gray-300 text-xs">—</span>
                                : <span className={`font-medium ${r.desvio >= 0 ? "text-green-600" : "text-red-600"}`}>{r.desvio >= 0 ? "+" : ""}{r.desvio.toFixed(1)}%</span>}
                              <div className={`text-[10px] ${pos ? "text-green-600/80" : "text-red-600/80"}`}>
                                {pos ? "+" : ""}{volDif.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fcEditavel && (
                          <button onClick={() => abrirDias(r.clienteNome)} title="Lançar por dia / explodir"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-auto">
                            <CalendarDays size={13} /> dias
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!fcLoading && fcRows.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400">Sem forecast nem realizado neste período. Adicione um cliente acima.</td></tr>
                  )}
                  {fcLoading && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Carregando…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal diário (explosão / lançamento por dia) */}
          {fcDiasCliente && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-gray-800 text-lg">Forecast diário — {fcDiasCliente}</h4>
                  <button onClick={fecharDias} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {MESES[fcMes - 1]}/{fcAno} · tipo <strong>{fcTipo === "TODOS" ? "ENVASE" : fcTipo}</strong> · total <span className="font-semibold text-blue-700">{fcDiasTotal.toLocaleString("pt-BR")} t</span>
                </p>

                {/* explodir */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
                  <Zap size={15} className="text-amber-500 shrink-0" />
                  <span className="text-xs text-gray-600">Explodir total do mês nos dias úteis:</span>
                  <input type="number" min="0" step="10" value={fcExplodir} onChange={(e) => setFcExplodir(e.target.value)}
                    placeholder="total t" className="w-24 text-sm border border-amber-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-300" />
                  <button onClick={explodirMes} className="bg-amber-500 text-white rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-amber-600">Explodir</button>
                </div>

                {fcDiasLoading ? (
                  <p className="text-sm text-gray-400 text-center py-6">Carregando dias…</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {fcDias.map((d) => (
                      <div key={d.dia} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${d.dow === 0 ? "bg-red-50" : "bg-gray-50"}`}>
                        <span className={`text-xs w-6 ${d.dow === 0 ? "text-red-500 font-semibold" : "text-gray-500"}`}>{String(d.dia).padStart(2, "0")}</span>
                        <input key={`${fcAno}-${fcMes}-${fcDiasCliente}-${d.dia}-${d.forecast}`} type="number" min="0" step="10" defaultValue={d.forecast || ""} placeholder="0"
                          onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== d.forecast) salvarDia(d.dia, v) }}
                          className="flex-1 w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={fecharDias} className="w-full mt-4 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Fechar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capacidade — equipamento × turno (A/B/C) */}
      {aba === "capacidade" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select value={capAno} onChange={(e) => setCapAno(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={capMes} onChange={(e) => setCapMes(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {MESES.map((nome, i) => <option key={i} value={i + 1}>{nome}</option>)}
            </select>
            <span className="text-xs text-gray-500 ml-2">
              Capacidade fixa por equipamento e turno — <span className="font-semibold text-blue-700">{capTotalGeral.toLocaleString("pt-BR")} t</span> total
              {capLoading && <span className="text-gray-400 ml-2">carregando…</span>}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Equipamento</th>
                    {capTurnos.map((t) => (
                      <th key={t} className="px-3 py-2 text-center font-medium text-gray-500">Turno {t}</th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {capRows.map((r) => (
                    <tr key={r.linha} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LINHA_COLORS[r.linha] ?? "bg-gray-100 text-gray-600"}`}>{r.linha}</span>
                      </td>
                      {capTurnos.map((t) => (
                        <td key={t} className="px-2 py-1.5 text-center">
                          <input key={`${capAno}-${capMes}-${r.linha}-${t}`} type="number" min="0" step="10"
                            defaultValue={r.turnos[t] || ""} placeholder="0"
                            onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== (r.turnos[t] ?? 0)) salvarCapacidade(r.linha, t, v) }}
                            className="w-24 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold text-gray-700">{r.total.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                  {capRows.length === 0 && !capLoading && (
                    <tr><td colSpan={capTurnos.length + 2} className="py-10 text-center text-gray-400">Carregando equipamentos…</td></tr>
                  )}
                </tbody>
                {capRows.length > 0 && (
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-600">Total</td>
                      {capTurnos.map((t) => (
                        <td key={t} className="px-3 py-2 text-center font-semibold text-gray-700">{(capTotaisTurno[t] ?? 0).toLocaleString("pt-BR")}</td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold text-blue-700">{capTotalGeral.toLocaleString("pt-BR")}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 max-w-3xl">Valores em toneladas por turno. O total é a capacidade instalada do equipamento no mês.</p>
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
