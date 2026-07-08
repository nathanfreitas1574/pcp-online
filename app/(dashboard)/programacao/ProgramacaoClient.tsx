"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Save, Calendar, Table2, BarChart3, ChevronLeft, ChevronRight, History, Search, X, GripVertical, Trash2, Layers, Eraser } from "lucide-react"
import ProgramacaoGraficos from "./ProgramacaoGraficos"
import { DIA, ddMM, domingoDaSemana } from "@/lib/programacao"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const
const VIS = [1, 2, 3, 4, 5, 6] as const // dias exibidos: Seg..Sáb (domingo = índice 0, fora da programação)
const TOL = 0.95 // atende com 95% do programado

// cores das linhas de produção (vêm do Controle de Expedição)
const LINHA_PROD_COLORS: Record<string, string> = {
  "MISTURA 1": "bg-purple-100 text-purple-700",
  "MISTURA 2": "bg-fuchsia-100 text-fuchsia-700",
  "BAG MÓVEL": "bg-green-100 text-green-700",
  "PRODUTO ACABADO": "bg-emerald-100 text-emerald-700",
  GRANEL: "bg-yellow-100 text-yellow-700",
}
const SEM_LINHA = "— sem linha —"
const STORAGE_KEY = "pcp:prog:filtros" // filtros persistidos entre navegações
const pad = (n: number) => String(n).padStart(2, "0")

// Estilo do realizado de um dia. `passou` = o dia já decorreu.
function estiloDia(prog: number, real: number, passou: boolean): { cls: string; sym: string } {
  if (real <= 0) {
    if (prog > 0 && passou) return { cls: "text-red-600 bg-red-50 rounded font-semibold", sym: "✕" } // não atendido
    return { cls: "text-gray-300", sym: "" }
  }
  if (prog === 0) return { cls: "text-amber-600 bg-amber-50 rounded font-semibold", sym: "▲" } // realizado sem programação
  if (real > prog * 1.05) return { cls: "text-amber-600 bg-amber-50 rounded font-semibold", sym: "▲" } // ultrapassou
  if (real >= prog * TOL) return { cls: "text-green-700 bg-green-50 rounded font-semibold", sym: "✓" } // atendido
  // parcial: só reprova (✕) se o dia já decorreu; senão é parcial em andamento (azul)
  return passou ? { cls: "text-red-600 bg-red-50/60 rounded font-semibold", sym: "✕" } : { cls: "text-blue-600", sym: "" }
}

type Dia = { ymd: string; label: string }
type Prog = {
  id: string; clienteNome: string; produto: string; boxId?: string | null; boxCodigo: string | null; numeroContrato: string | null
  dom: number; seg: number; ter: number; qua: number; qui: number; sex: number; sab: number
  total: number; realizado: number; tipo: string; turno?: string | null
}
type Box = { id: string; codigo: string }
type Cliente = { id: string; nome: string; codigo: string }
type Produto = { id: string; descricao: string; codigo: string }
type Demanda = {
  id: string; cliente: string | null; produto: string | null; quantidade: number
  local: string | null; turno1: boolean; turno2: boolean; turno3: boolean; obs: string | null
}

export default function ProgramacaoClient({
  programacoes: inicial, boxes, clientes, produtos, semana, ano, maxSemana, dias, realizadoPorDia, linhaPorContrato = {}, demandasIniciais = []
}: {
  programacoes: Prog[]; boxes: Box[]; clientes: Cliente[]; produtos: Produto[]
  semana: number; ano: number; maxSemana: number; dias: Dia[]; realizadoPorDia: Record<string, number[]>
  linhaPorContrato?: Record<string, string>
  demandasIniciais?: Demanda[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Prog[]>(inicial)
  const [saving, setSaving] = useState<string | null>(null)
  const [tipo, setTipo] = useState("RECEBIMENTO")
  const [novaLinha, setNovaLinha] = useState({ numeroContrato: "", clienteNome: "", produto: "", boxId: "" })
  const [addMode, setAddMode] = useState(false)
  const [buscandoCtr, setBuscandoCtr] = useState(false)
  const [ctrInfo, setCtrInfo] = useState<string>("")
  const [view, setView] = useState<"tabela" | "graficos">("tabela")
  const [busca, setBusca] = useState("")
  const [linhasSel, setLinhasSel] = useState<string[]>([]) // filtro por linha de produção (multi)
  const [filtrosOk, setFiltrosOk] = useState(false)        // já hidratou filtros do localStorage?
  const [dragId, setDragId] = useState<string | null>(null)   // linha sendo arrastada
  const [handleId, setHandleId] = useState<string | null>(null) // linha com arraste habilitado (pelo handle)

  // Restaura filtros salvos ao montar (persistem ao trocar de tela/semana)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const f = JSON.parse(raw)
        if (f.tipo === "RECEBIMENTO" || f.tipo === "EXPEDICAO") setTipo(f.tipo)
        if (typeof f.busca === "string") setBusca(f.busca)
        if (Array.isArray(f.linhasSel)) setLinhasSel(f.linhasSel.filter((x: unknown) => typeof x === "string"))
      }
    } catch { /* ignora storage indisponível */ }
    setFiltrosOk(true)
  }, [])
  // Salva filtros sempre que mudarem (após hidratar, p/ não sobrescrever com default)
  useEffect(() => {
    if (!filtrosOk) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tipo, busca, linhasSel })) } catch { /* ignora */ }
  }, [tipo, busca, linhasSel, filtrosOk])

  const realDe = (id: string) => realizadoPorDia[id] ?? [0, 0, 0, 0, 0, 0, 0]
  // Linha de Produção do contrato (definida no Controle de Expedição)
  const linhaDe = (numeroContrato: string | null) =>
    numeroContrato ? linhaPorContrato[String(numeroContrato).trim().replace(/^0+/, "") || "0"] ?? null : null

  // Dias já decorridos (ymd do dia < hoje no fuso do navegador) — p/ YTD e "não atendido"
  const now = new Date()
  const hojeYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  let elapsedIdx = -1
  dias.forEach((d, i) => { if (d.ymd < hojeYmd) elapsedIdx = i })
  const passou = (i: number) => i <= elapsedIdx

  function irParaSemana(s: number) {
    if (s < 1 || s > maxSemana) return
    router.push(`/programacao?ano=${ano}&semana=${s}`)
  }

  async function buscarContrato(numero: string) {
    if (!numero.trim()) { setCtrInfo(""); return }
    setBuscandoCtr(true); setCtrInfo("")
    try {
      const res = await fetch(`/api/contratos/lookup?numero=${encodeURIComponent(numero.trim())}`)
      const d = await res.json()
      const m = d.matches?.[0]
      if (m) {
        setNovaLinha(p => ({ ...p, clienteNome: m.clienteNome, produto: m.desProduto }))
        setCtrInfo(`✓ ${m.clienteNome} — ${m.desProduto}${d.matches.length > 1 ? ` (+${d.matches.length - 1} filial)` : ""}`)
      } else {
        setCtrInfo("Contrato não encontrado — preencha cliente/produto manualmente.")
      }
    } catch {
      setCtrInfo("Erro ao buscar contrato.")
    }
    setBuscandoCtr(false)
  }

  // Linhas de produção disponíveis (do tipo atual) + as já selecionadas (p/ chip visível mesmo mudando de semana)
  const linhasDisponiveis = (() => {
    const set = new Set<string>()
    for (const r of rows) if (r.tipo === tipo) set.add(linhaDe(r.numeroContrato) ?? SEM_LINHA)
    for (const lp of linhasSel) set.add(lp)
    const arr = [...set].filter((x) => x !== SEM_LINHA).sort()
    if (set.has(SEM_LINHA)) arr.push(SEM_LINHA)
    return arr
  })()
  const toggleLinha = (lp: string) => setLinhasSel((prev) => (prev.includes(lp) ? prev.filter((x) => x !== lp) : [...prev, lp]))
  const limparFiltros = () => { setBusca(""); setLinhasSel([]) }
  const temFiltro = !!busca || linhasSel.length > 0

  const filtradas = rows.filter((r) =>
    r.tipo === tipo &&
    (!busca || `${r.numeroContrato ?? ""} ${r.clienteNome} ${r.produto} ${r.boxCodigo ?? ""}`.toLowerCase().includes(busca.toLowerCase())) &&
    (linhasSel.length === 0 || linhasSel.includes(linhaDe(r.numeroContrato) ?? SEM_LINHA))
  )
  // arrays de 7 posições (índice 0 = Dom, ignorado na exibição/soma)
  const totaisDia = DIAS_KEYS.map((d) => filtradas.reduce((s, r) => s + (r[d] ?? 0), 0))
  const totalGeral = VIS.reduce((s, i) => s + totaisDia[i], 0)
  const realizadoDia = DIAS_KEYS.map((_, i) => filtradas.reduce((s, r) => s + (realDe(r.id)[i] ?? 0), 0))
  const realizadoGeral = VIS.reduce((s, i) => s + realizadoDia[i], 0)
  const fmt1 = (n: number) => n ? n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : ""

  // total/realizado da LINHA sem domingo
  const totalLinha = (row: Prog) => VIS.reduce((s, i) => s + (row[DIAS_KEYS[i]] ?? 0), 0)
  const realTotalLinha = (id: string) => { const r = realDe(id); return VIS.reduce((s, i) => s + (r[i] ?? 0), 0) }

  function ytd(prog: Prog) {
    const real = realDe(prog.id)
    let p = 0, r = 0
    for (const i of VIS) { if (i <= elapsedIdx) { p += prog[DIAS_KEYS[i]] ?? 0; r += real[i] ?? 0 } }
    return { p, r }
  }
  const ytdGeral = (() => {
    let p = 0, r = 0
    for (const i of VIS) { if (i <= elapsedIdx) { p += totaisDia[i]; r += realizadoDia[i] } }
    return { p, r }
  })()

  function CelulaYTD({ p, r }: { p: number; r: number }) {
    if (elapsedIdx < 0) return <span className="text-gray-300 text-xs" title="Semana ainda não iniciada">—</span>
    if (p === 0 && r === 0) return <span className="text-gray-300 text-xs">—</span>
    if (p === 0) return <div className="leading-tight"><div className="text-amber-600 text-xs font-bold">▲ sem prog</div><div className="text-[10px] text-gray-400">{fmt1(r)}</div></div>
    const emLinha = r >= p * TOL
    return (
      <div className="leading-tight">
        <div className={`text-xs font-bold ${emLinha ? "text-green-600" : "text-red-600"}`}>{emLinha ? "✓ em linha" : "✕ atrás"}</div>
        <div className="text-[10px] text-gray-400">{fmt1(r)} / {fmt1(p)}</div>
      </div>
    )
  }

  async function salvarLinha(row: Prog, campo: typeof DIAS_KEYS[number], valor: string) {
    const num = parseFloat(valor) || 0
    const updated = { ...row, [campo]: num, total: DIAS_KEYS.reduce((s, d) => s + (d === campo ? num : (row[d] ?? 0)), 0) }
    setRows((prev) => prev.map((r) => r.id === row.id ? updated : r))
    setSaving(row.id + campo)
    await fetch(`/api/programacao/${row.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: num }),
    })
    setSaving(null)
  }

  // Preenche o contrato numa linha já criada (ex.: programação da próxima semana sem contrato ainda).
  // Salva o nº e alinha cliente/produto pelo contrato (a Linha de Produção reflete sozinha).
  // NÃO mexe nos volumes já digitados (o PATCH recalcula o total a partir dos dias existentes).
  async function salvarContrato(row: Prog, numero: string) {
    const num = numero.trim()
    if (num === (row.numeroContrato ?? "")) return
    setSaving(row.id + "ctr")
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, numeroContrato: num || null } : r)))
    await fetch(`/api/programacao/${row.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numeroContrato: num }),
    }).catch(() => {})
    // busca o contrato e alinha cliente/produto (só o cabeçalho — volumes ficam como estão)
    if (num) {
      try {
        const res = await fetch(`/api/contratos/lookup?numero=${encodeURIComponent(num)}`)
        const d = await res.json()
        const m = d.matches?.[0]
        if (m && (m.clienteNome || m.desProduto)) {
          const upd = { clienteNome: m.clienteNome || row.clienteNome, produto: m.desProduto || row.produto }
          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...upd } : r)))
          await fetch(`/api/programacao/${row.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd),
          }).catch(() => {})
        }
      } catch { /* ignora lookup indisponível */ }
    }
    setSaving(null)
  }

  async function salvarBox(row: Prog, boxId: string) {
    const codigo = boxes.find(b => b.id === boxId)?.codigo ?? null
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, boxId, boxCodigo: codigo } : r))
    setSaving(row.id + "box")
    await fetch(`/api/programacao/${row.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boxId }),
    })
    setSaving(null)
  }

  async function adicionarLinha() {
    if (!novaLinha.clienteNome || !novaLinha.produto) return
    setSaving("nova")
    const res = await fetch("/api/programacao", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novaLinha, semana, ano, tipo, dataInicio: dias[0].ymd, dataFim: dias[6].ymd }),
    })
    const nova = await res.json()
    setRows((prev) => [...prev, nova])
    setNovaLinha({ numeroContrato: "", clienteNome: "", produto: "", boxId: "" })
    setCtrInfo(""); setAddMode(false); setSaving(null)
  }

  async function excluirLinha(id: string) {
    if (!confirm("Excluir esta linha da programação?")) return
    setRows((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/programacao/${id}`, { method: "DELETE" }).catch(() => {})
  }

  async function excluirProgramacao() {
    const doTipo = rows.filter((r) => r.tipo === tipo)
    if (doTipo.length === 0) return
    const nome = tipo === "RECEBIMENTO" ? "Recebimento" : "Expedição"
    if (!confirm(`Excluir TODA a programação de ${nome} da semana ${semana}/${ano}? (${doTipo.length} linha(s))`)) return
    setRows((prev) => prev.filter((r) => r.tipo !== tipo))
    await fetch(`/api/programacao?ano=${ano}&semana=${semana}&tipo=${tipo}`, { method: "DELETE" }).catch(() => {})
  }

  // arrastar linha (reordena SÓ dentro do tipo atual e persiste)
  function soltarEm(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setHandleId(null); return }
    setRows((prev) => {
      const doTipo = prev.filter((r) => r.tipo === tipo)
      const outros = prev.filter((r) => r.tipo !== tipo)
      const from = doTipo.findIndex((r) => r.id === dragId)
      const to = doTipo.findIndex((r) => r.id === targetId)
      if (from < 0 || to < 0) return prev
      const [moved] = doTipo.splice(from, 1)
      doTipo.splice(to, 0, moved)
      const ids = doTipo.map((r) => r.id)
      fetch("/api/programacao/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => {})
      return [...outros, ...doTipo]
    })
    setDragId(null); setHandleId(null)
  }
  const podeArrastar = !temFiltro // arrastar só sem filtro ativo

  // ── Outras demandas internas da semana ──
  const [demandas, setDemandas] = useState<Demanda[]>(demandasIniciais)
  const [addingDem, setAddingDem] = useState(false)
  async function adicionarDemanda() {
    setAddingDem(true)
    const res = await fetch("/api/programacao/demandas", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ano, semana }),
    })
    const nova = await res.json().catch(() => null)
    if (nova?.id) setDemandas((prev) => [...prev, nova])
    setAddingDem(false)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function salvarDemanda(id: string, campo: keyof Demanda, valor: any) {
    setDemandas((prev) => prev.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)))
    await fetch(`/api/programacao/demandas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: valor }),
    }).catch(() => {})
  }
  async function excluirDemanda(id: string) {
    if (!confirm("Excluir esta demanda interna?")) return
    setDemandas((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/programacao/demandas/${id}`, { method: "DELETE" }).catch(() => {})
  }
  const totalDemandas = demandas.reduce((s, d) => s + (d.quantidade || 0), 0)
  const DEMINP = "w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"

  const ehSemanaAtual = elapsedIdx >= 0 && elapsedIdx < 6
  const semanaFutura = elapsedIdx < 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Programação Semanal</h2>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => irParaSemana(semana - 1)} disabled={semana <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500" title="Semana anterior"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar size={13} />
              <select value={semana} onChange={(e) => irParaSemana(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Array.from({ length: maxSemana }, (_, i) => i + 1).map((s) => {
                  const dom = domingoDaSemana(ano, s)
                  const seg = new Date(dom.getTime() + DIA); const sab = new Date(dom.getTime() + 6 * DIA)
                  return <option key={s} value={s}>Semana {s} — {ddMM(seg)} a {ddMM(sab)}</option>
                })}
              </select>
              <span className="text-gray-400">/ {ano}</span>
            </div>
            <button onClick={() => irParaSemana(semana + 1)} disabled={semana >= maxSemana}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500" title="Próxima semana"><ChevronRight size={16} /></button>
            {semanaFutura && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">a programar</span>}
            {ehSemanaAtual && <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">semana atual</span>}
            {!semanaFutura && !ehSemanaAtual && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">encerrada</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            {["RECEBIMENTO", "EXPEDICAO"].map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tipo === t ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
                {t === "RECEBIMENTO" ? "Recebimento" : "Expedição"}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setView("tabela")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "tabela" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
              <Table2 size={13} /> Tabela
            </button>
            <button onClick={() => setView("graficos")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "graficos" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
              <BarChart3 size={13} /> Gráficos
            </button>
          </div>
          <Link href="/programacao/historico"
            className="flex items-center gap-2 border border-indigo-300 text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition" title="Histórico e cobrança">
            <History size={15} /> Histórico
          </Link>
          {view === "tabela" && (
            <button onClick={() => setAddMode(true)}
              className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
              <Plus size={15} /> Adicionar linha
            </button>
          )}
          {view === "tabela" && rows.some((r) => r.tipo === tipo) && (
            <button onClick={excluirProgramacao} title="Excluir toda a programação desta semana/tipo"
              className="flex items-center gap-2 border border-red-200 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
              <Trash2 size={15} /> Excluir programação
            </button>
          )}
        </div>
      </div>

      {view === "graficos" && (
        <ProgramacaoGraficos rows={filtradas} realizadoPorDia={realizadoPorDia} />
      )}

      {view === "tabela" && (<>
      {/* Filtros — isola cliente/produto/contrato/box e linha(s) de produção. Persistem entre navegações. */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por cliente, produto, contrato ou box…"
            className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400" />
          {busca && <button onClick={() => setBusca("")} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"><X size={15} /></button>}
        </div>

        {/* Filtro por Linha de Produção (multi-seleção) */}
        {linhasDisponiveis.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500 font-medium"><Layers size={13} /> Linha:</span>
            {linhasDisponiveis.map((lp) => {
              const on = linhasSel.includes(lp)
              const cor = lp === SEM_LINHA ? "bg-gray-100 text-gray-600" : (LINHA_PROD_COLORS[lp] ?? "bg-gray-100 text-gray-600")
              return (
                <button key={lp} onClick={() => toggleLinha(lp)} title={on ? "Clique p/ remover do filtro" : "Clique p/ isolar esta linha"}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${on ? `${cor} border-current ring-1 ring-current` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                  {lp}
                </button>
              )
            })}
          </div>
        )}

        {temFiltro && (
          <button onClick={limparFiltros}
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600">
            <Eraser size={13} /> Limpar filtros
          </button>
        )}
        {temFiltro && <span className="text-xs text-gray-500">{filtradas.length} linha(s)</span>}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-2 py-3 text-center font-medium w-14">#</th>
                <th className="px-3 py-3 text-left font-medium min-w-20">Contrato</th>
                <th className="px-3 py-3 text-left font-medium min-w-24">Box</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Cliente</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Produto</th>
                <th className="px-3 py-3 text-left font-medium min-w-24" title="Definida no Controle de Expedição">Linha Prod.</th>
                {VIS.map((i) => (
                  <th key={i} className={`px-2 py-3 text-center font-medium min-w-20 ${passou(i) ? "" : "opacity-80"}`}>
                    <div>{DIAS[i]}</div>
                    <div className="text-xs opacity-70 font-normal">{dias[i].label}</div>
                    <div className="text-[9px] opacity-60 font-normal mt-0.5">prog / real</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">Total</th>
                <th className="px-3 py-3 text-center font-medium min-w-24" title="Semana até hoje (dias decorridos)">YTD semana</th>
                <th className="px-3 py-3 text-center font-medium">Realiz.</th>
                <th className="px-3 py-3 text-center font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map((row, idx) => {
                const real = realDe(row.id)
                const realTotal = realTotalLinha(row.id)
                const totalRow = totalLinha(row)
                const y = ytd(row)
                return (
                <tr key={row.id}
                  draggable={handleId === row.id}
                  onDragStart={() => setDragId(row.id)}
                  onDragOver={(e) => { if (dragId) e.preventDefault() }}
                  onDrop={() => soltarEm(row.id)}
                  onDragEnd={() => { setDragId(null); setHandleId(null) }}
                  className={`hover:bg-blue-50/30 ${dragId === row.id ? "opacity-40" : ""} ${dragId && dragId !== row.id ? "border-t-2 border-t-transparent hover:border-t-blue-400" : ""}`}>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1 text-gray-400">
                      {podeArrastar && (
                        <span title="Arrastar para reordenar" className="cursor-grab active:cursor-grabbing" onMouseDown={() => setHandleId(row.id)}>
                          <GripVertical size={13} className="text-gray-300 hover:text-gray-500" />
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-500 tabular-nums">{idx + 1}</span>
                      <button onClick={() => excluirLinha(row.id)} title="Excluir linha"
                        className="text-gray-300 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input defaultValue={row.numeroContrato ?? ""} placeholder="+ contrato" key={`ctr-${row.id}-${row.numeroContrato ?? ""}`}
                      onBlur={(e) => salvarContrato(row, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                      title="Nº do contrato — preencha depois; alinha cliente/produto/linha sem mexer nos volumes"
                      className={`w-24 font-mono text-xs rounded px-1.5 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300 ${saving === row.id + "ctr" ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-gray-300 bg-transparent text-gray-600"}`} />
                  </td>
                  <td className="px-2 py-2">
                    <select value={row.boxId ?? ""} onChange={(e) => salvarBox(row, e.target.value)}
                      className={`text-xs border rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${saving === row.id + "box" ? "border-blue-400 bg-blue-50" : "border-gray-200 text-blue-700 font-bold"}`}
                      title="Box (editável)">
                      <option value="">—</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800 text-xs">{row.clienteNome}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.produto}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const lp = linhaDe(row.numeroContrato)
                      if (!lp) return <span className="text-gray-300 text-xs">—</span>
                      const cls = LINHA_PROD_COLORS[lp] ?? "bg-gray-100 text-gray-600"
                      return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cls}`}>{lp}</span>
                    })()}
                  </td>
                  {VIS.map((i) => {
                    const d = DIAS_KEYS[i]
                    const e = estiloDia(row[d] ?? 0, real[i], passou(i))
                    return (
                    <td key={d} className="px-1 py-1 align-top">
                      <input type="number" min="0" defaultValue={row[d] || ""}
                        onBlur={(ev) => salvarLinha(row, d, ev.target.value)}
                        className={`w-full text-center text-xs border rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${saving === row.id + d ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
                        placeholder="0" />
                      <div className={`text-center text-[10px] mt-0.5 px-0.5 ${e.cls}`} title="Realizado (CHECKOUT) · ✓ atendido · ✕ não atendido · ▲ excedeu">
                        {real[i] > 0 ? `${e.sym} ${fmt1(real[i])}`.trim() : (e.sym || "·")}
                      </div>
                    </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-bold text-gray-800 align-top">{totalRow.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-center align-top"><CelulaYTD p={y.p} r={y.r} /></td>
                  <td className="px-3 py-2 text-center align-top">
                    <span className={`text-xs font-bold ${realTotal >= totalRow && totalRow > 0 ? "text-green-600" : realTotal > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {realTotal > 0 ? fmt1(realTotal) : "—"}
                    </span>
                    {totalRow > 0 && (<div className="text-[10px] text-gray-400">{Math.round((realTotal / totalRow) * 100)}%</div>)}
                  </td>
                  <td className="px-3 py-2 text-center align-top">
                    {(() => {
                      const saldo = totalRow - realTotal
                      if (totalRow === 0 && realTotal === 0) return <span className="text-gray-300 text-xs">—</span>
                      if (Math.abs(saldo) < 0.05) return <span className="text-green-600 text-xs font-bold" title="Programado atingido">✓ 0</span>
                      if (saldo > 0) return <span className="text-gray-500 text-xs font-medium" title="Falta realizar">{fmt1(saldo)}</span>
                      return <span className="text-amber-600 text-xs font-bold" title="Ultrapassou o programado">▲ +{fmt1(-saldo)}</span>
                    })()}
                  </td>
                </tr>
                )
              })}

              {/* Linha de nova entrada */}
              {addMode && (
                <tr className="bg-blue-50">
                  <td className="px-2 py-2 text-center text-gray-300"><Plus size={13} className="mx-auto" /></td>
                  <td className="px-2 py-2">
                    <input value={novaLinha.numeroContrato} placeholder="Nº contr."
                      onChange={(e) => setNovaLinha((p) => ({ ...p, numeroContrato: e.target.value }))}
                      onBlur={(e) => buscarContrato(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscarContrato((e.target as HTMLInputElement).value)}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none font-mono" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={novaLinha.boxId} onChange={(e) => setNovaLinha((p) => ({ ...p, boxId: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none">
                      <option value="">Box...</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input list="clientes-list" value={novaLinha.clienteNome} placeholder={buscandoCtr ? "buscando…" : "Cliente *"}
                      onChange={(e) => setNovaLinha((p) => ({ ...p, clienteNome: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none" />
                    <datalist id="clientes-list">{clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo}</option>)}</datalist>
                  </td>
                  <td className="px-2 py-2">
                    <input list="produtos-list" value={novaLinha.produto} placeholder="Produto *"
                      onChange={(e) => setNovaLinha((p) => ({ ...p, produto: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none" />
                    <datalist id="produtos-list">{produtos.map((p) => <option key={p.id} value={p.descricao}>{p.codigo}</option>)}</datalist>
                  </td>
                  <td className="px-2 py-2 text-gray-300 text-xs text-center">—</td>
                  {VIS.map((i) => <td key={i} className="px-1 py-2"><div className="w-full h-7 bg-gray-100 rounded" /></td>)}
                  <td className="px-2 py-2">
                    <button onClick={adicionarLinha} disabled={saving === "nova"}
                      className="flex items-center gap-1 bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-800 disabled:opacity-60">
                      <Save size={12} /> {saving === "nova" ? "…" : "OK"}
                    </button>
                  </td>
                  <td className="px-2 py-2"><button onClick={() => setAddMode(false)} className="text-xs text-gray-400 hover:text-red-500">✕</button></td>
                  <td /><td />
                </tr>
              )}
              {addMode && ctrInfo && (
                <tr className="bg-blue-50"><td colSpan={16} className="px-3 pb-2 text-[11px] text-blue-700">{ctrInfo}</td></tr>
              )}

              {/* Linha de totais */}
              {filtradas.length > 0 && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td colSpan={6} className="px-3 py-2.5 text-xs text-gray-600 font-semibold">TOTAL SEMANA</td>
                  {VIS.map((i) => {
                    const t = totaisDia[i]
                    const e = estiloDia(t, realizadoDia[i], passou(i))
                    return (
                    <td key={i} className="px-2 py-2.5 text-center text-xs align-top">
                      <div className="text-blue-700">{t > 0 ? t.toLocaleString("pt-BR") : "—"}</div>
                      <div className={`text-[10px] px-0.5 ${e.cls}`}>{realizadoDia[i] > 0 ? `${e.sym} ${fmt1(realizadoDia[i])}`.trim() : (e.sym || "")}</div>
                    </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center text-blue-800 align-top">{totalGeral.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-center align-top"><CelulaYTD p={ytdGeral.p} r={ytdGeral.r} /></td>
                  <td className="px-3 py-2.5 text-center text-green-700 align-top">{realizadoGeral > 0 ? fmt1(realizadoGeral) : "—"}</td>
                  <td className="px-3 py-2.5 text-center align-top">
                    {(() => {
                      const saldo = totalGeral - realizadoGeral
                      if (totalGeral === 0 && realizadoGeral === 0) return <span className="text-gray-300 text-xs">—</span>
                      if (Math.abs(saldo) < 0.05) return <span className="text-green-600 text-xs">✓</span>
                      if (saldo > 0) return <span className="text-gray-600 text-xs">{fmt1(saldo)}</span>
                      return <span className="text-amber-600 text-xs">▲ +{fmt1(-saldo)}</span>
                    })()}
                  </td>
                </tr>
              )}

              {filtradas.length === 0 && !addMode && (
                <tr><td colSpan={16} className="py-12 text-center text-gray-400">
                  {temFiltro ? "Nenhuma linha para esse filtro." : <>Nenhuma programação para a semana {semana}. Clique em &quot;Adicionar linha&quot; para começar.</>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-600">Realizado (CHECKOUT):</span>
        <span><span className="text-green-700 font-semibold">✓ atendido</span> (≥95% do dia)</span>
        <span><span className="text-red-600 font-semibold">✕ não atendido</span> (dia decorrido)</span>
        <span><span className="text-amber-600 font-semibold">▲ excedeu</span> / sem programação</span>
        <span className="text-gray-400">|</span>
        <span><strong>YTD semana</strong> = prog × real só dos dias que já passaram</span>
        <span><strong>Saldo</strong> = programado − realizado</span>
      </div>

      {/* ── Outras Demandas Internas da semana ─────────────────────────────── */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between bg-green-800 text-white px-4 py-2.5">
          <h3 className="font-bold text-sm tracking-wide">OUTRAS DEMANDAS INTERNAS — Semana {semana}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-100">Total: <strong>{totalDemandas.toLocaleString("pt-BR")} t</strong></span>
            <button onClick={adicionarDemanda} disabled={addingDem}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-60">
              <Plus size={13} /> {addingDem ? "…" : "Adicionar"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-50 border-b border-green-100">
              <tr>
                {["", "Cliente", "Produto", "Quantidade", "Local", "1º Turno", "2º Turno", "3º Turno", "Observação"].map((h, i) => (
                  <th key={i} className={`px-3 py-2 font-medium text-green-900 text-xs ${i >= 5 && i <= 7 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {demandas.map((d) => (
                <tr key={d.id} className="hover:bg-green-50/40">
                  <td className="px-2 py-2 text-center w-8">
                    <button onClick={() => excluirDemanda(d.id)} title="Excluir demanda"
                      className="text-gray-300 hover:text-red-600"><Trash2 size={13} /></button>
                  </td>
                  <td className="px-2 py-1.5 min-w-28">
                    <input list="dem-clientes" defaultValue={d.cliente ?? ""} placeholder="INTERNO / FERTALVO…"
                      onBlur={(e) => { if (e.target.value !== (d.cliente ?? "")) salvarDemanda(d.id, "cliente", e.target.value) }} className={DEMINP} />
                    <datalist id="dem-clientes"><option value="INTERNO" /><option value="FERTALVO" /></datalist>
                  </td>
                  <td className="px-2 py-1.5 min-w-32">
                    <input list="produtos-list" defaultValue={d.produto ?? ""} placeholder="VARREDURA, NK…"
                      onBlur={(e) => { if (e.target.value !== (d.produto ?? "")) salvarDemanda(d.id, "produto", e.target.value) }} className={DEMINP} />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input type="number" min="0" defaultValue={d.quantidade || ""} placeholder="—"
                      onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== d.quantidade) salvarDemanda(d.id, "quantidade", v) }}
                      className={`${DEMINP} text-right`} />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input list="dem-locais" defaultValue={d.local ?? ""} placeholder="AZ5A, B11…"
                      onBlur={(e) => { if (e.target.value !== (d.local ?? "")) salvarDemanda(d.id, "local", e.target.value) }} className={DEMINP} />
                    <datalist id="dem-locais">{boxes.map((b) => <option key={b.id} value={b.codigo} />)}</datalist>
                  </td>
                  {(["turno1", "turno2", "turno3"] as const).map((t) => (
                    <td key={t} className="px-2 py-1.5 text-center w-16">
                      <input type="checkbox" checked={d[t]} onChange={(e) => salvarDemanda(d.id, t, e.target.checked)}
                        className="w-4 h-4 accent-green-700 cursor-pointer" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 min-w-40">
                    <input defaultValue={d.obs ?? ""} placeholder="ex: ORGANIZAR E ARRUMAR BOX"
                      onBlur={(e) => { if (e.target.value !== (d.obs ?? "")) salvarDemanda(d.id, "obs", e.target.value) }}
                      className={`${DEMINP} uppercase`} />
                  </td>
                </tr>
              ))}
              {demandas.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400 text-sm">Nenhuma demanda interna nesta semana. Clique em “Adicionar”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  )
}
