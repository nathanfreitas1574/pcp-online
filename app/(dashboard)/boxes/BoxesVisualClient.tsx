"use client"

import { useState } from "react"
import {
  Plus, Search, Warehouse, PackageCheck, PackageX, Gauge,
  ClipboardCheck, ChevronRight, LayoutGrid, Rows3, Map,
  AlertTriangle, X, Ship, CalendarDays, List,
} from "lucide-react"
import BoxVisual, { BoxData } from "@/components/BoxVisual"
import VistoriaDiariaModal from "@/components/VistoriaDiariaModal"
import NovoRecebimentoModal from "@/components/NovoRecebimentoModal"
import DrillBarChart from "@/components/DrillBarChart"

type Previsao = {
  id: string; naveNome: string | null; produto: string; cliente: string
  volumePrev: number | null; dataPrevisao: string; status: string
}

type BoxItem = BoxData & {
  alertasAbertos: number
  ultimoLacre?: string | null
  codigoLacre?: string | null
  movimentadoHoje?: boolean
  armazemId?: string | null
  armazemCodigo?: string | null
  armazemNome?: string | null
  previsao?: Previsao | null
  statusLiberacao?: "BLOQUEADO" | "AGUARDANDO_VISTORIA" | "LIBERADO" | null
  // já herdados de BoxData: statusUso, obsBox
}

// ── Helper: cor do sinal de recebimento ──────────────────────────────────────
function corPrevisao(dataPrevisao: string, status: string): {
  bg: string; text: string; ring: string; label: string; pulse: boolean
} {
  if (status === "RECEBENDO") return { bg: "bg-green-500", text: "text-white", ring: "ring-green-300", label: "RECEBENDO", pulse: true }
  const dias = Math.ceil((new Date(dataPrevisao).getTime() - Date.now()) / 86_400_000)
  if (dias < 0)  return { bg: "bg-gray-400",   text: "text-white", ring: "ring-gray-200",  label: "ATRASADO",  pulse: false }
  if (dias <= 2) return { bg: "bg-red-500",    text: "text-white", ring: "ring-red-300",   label: "IMINENTE",  pulse: true  }
  if (dias <= 7) return { bg: "bg-yellow-500", text: "text-white", ring: "ring-yellow-300",label: `${dias}d`,  pulse: false }
  return              { bg: "bg-green-600",  text: "text-white", ring: "ring-green-200", label: `${dias}d`,  pulse: false }
}

// ── Badge de liberação de box ─────────────────────────────────────────────────
function LiberacaoSinal({ status }: { status: "BLOQUEADO" | "AGUARDANDO_VISTORIA" | "LIBERADO" }) {
  if (status === "LIBERADO") return null
  const cfg = {
    BLOQUEADO:          { bg: "bg-red-600",    icon: "🔒", label: "BLOQ." },
    AGUARDANDO_VISTORIA:{ bg: "bg-orange-500", icon: "⏳", label: "VISTORIA" },
  }[status]
  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      <div className={`${cfg.bg} text-white text-[10px] font-bold py-0.5 text-center flex items-center justify-center gap-1 rounded-t-lg`}>
        {cfg.icon} {cfg.label}
      </div>
    </div>
  )
}

// ── Badge/sinal de recebimento no card de box ─────────────────────────────────
function PrevisaoSinal({ previsao }: { previsao: Previsao }) {
  const { bg, text, label, pulse } = corPrevisao(previsao.dataPrevisao, previsao.status)
  return (
    <div className="absolute -top-1 -right-1 z-20">
      <div className={`
        ${bg} ${text} text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md
        ${pulse ? "animate-pulse" : ""}
      `}>
        <Ship size={9} />
        {label}
      </div>
    </div>
  )
}

// ── Configuração das estruturas do armazém ─────────────────────────────────────
type Estrutura = {
  id: string
  nome: string
  tag: string
  descricao: string
  cor: string
  corBg: string
  match: (c: string) => boolean
  semBoxes?: boolean
}

const ESTRUTURAS: Estrutura[] = [
  {
    id: "NAVE",
    nome: "Nave",
    tag: "B01 – B12",
    descricao: "Armazém principal coberto · 12 boxes",
    cor: "#1d4ed8",
    corBg: "#eff6ff",
    match: (c: string) => /^B\d+/.test(c),
  },
  {
    id: "AZ1",
    nome: "AZ1 — Baias",
    tag: "Baia 01 – Baia 32",
    descricao: "32 baias laterais de armazenagem",
    cor: "#059669",
    corBg: "#f0fdf4",
    match: (c: string) => /^(BAIA|AZ01)/i.test(c),
  },
  {
    id: "AZ2",
    nome: "AZ2 — Compactador",
    tag: "Sem boxes",
    descricao: "Área exclusiva de compactação",
    cor: "#d97706",
    corBg: "#fffbeb",
    match: () => false,
    semBoxes: true,
  },
  {
    id: "ESTRUTURADO",
    nome: "Estruturado",
    tag: "AZ03A … AZ08B",
    descricao: "Módulos AZ03 a AZ08 · lados A e B",
    cor: "#7c3aed",
    corBg: "#f5f3ff",
    match: (c: string) => /^AZ0[3-9]/i.test(c),
  },
]

// ── SVG ilustrações por tipo de estrutura ─────────────────────────────────────
function SvgNave({ cor }: { cor: string }) {
  return (
    <svg viewBox="0 0 220 130" className="w-full h-full">
      {/* chão */}
      <rect x="0" y="105" width="220" height="25" fill="rgba(0,0,0,0.12)" rx="2" />
      {/* corpo principal */}
      <polygon points="110,12 12,72 12,105 208,105 208,72" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      {/* painel lateral esq */}
      <line x1="12" y1="72" x2="12" y2="105" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      {/* painel lateral dir */}
      <line x1="208" y1="72" x2="208" y2="105" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      {/* painéis verticais fachada */}
      {[42, 72, 102, 132, 162].map(x => (
        <line key={x} x1={x} y1="72" x2={x} y2="105" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      ))}
      {/* portal de entrada */}
      <rect x="83" y="68" width="54" height="37" fill="rgba(0,0,0,0.35)" rx="2" />
      <rect x="86" y="71" width="22" height="34" fill="rgba(0,0,0,0.15)" />
      <rect x="112" y="71" width="22" height="34" fill="rgba(0,0,0,0.15)" />
      {/* cume */}
      <line x1="110" y1="12" x2="12" y2="72" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="110" y1="12" x2="208" y2="72" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      {/* guindaste ao fundo esq */}
      <rect x="18" y="55" width="4" height="40" fill="rgba(255,255,255,0.2)" />
      <rect x="14" y="55" width="12" height="3" fill="rgba(255,255,255,0.25)" />
      {/* label */}
      <text x="110" y="122" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="monospace">NAVE PRINCIPAL</text>
    </svg>
  )
}

function SvgBaias({ cor }: { cor: string }) {
  return (
    <svg viewBox="0 0 220 130" className="w-full h-full">
      <rect x="0" y="105" width="220" height="25" fill="rgba(0,0,0,0.12)" rx="2" />
      {/* cobertura arqueada */}
      <path d="M 8,75 Q 110,8 212,75 L 212,105 L 8,105 Z" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      {/* treliças internas */}
      {[50, 90, 130, 170].map(x => (
        <g key={x}>
          <line x1={x} y1={70 - Math.abs(110 - x) * 0.25} x2={x} y2="105" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1={x - 20} y1="105" x2={x} y2={70 - Math.abs(110 - x) * 0.25} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <line x1={x + 20} y1="105" x2={x} y2={70 - Math.abs(110 - x) * 0.25} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        </g>
      ))}
      {/* divisórias das baias */}
      {[35, 65, 95, 125, 155, 185].map(x => (
        <rect key={x} x={x} y="75" width="2" height="30" fill="rgba(255,255,255,0.2)" />
      ))}
      {/* portal */}
      <rect x="92" y="72" width="36" height="33" fill="rgba(0,0,0,0.35)" rx="2" />
      {/* iluminação zenital */}
      {[60, 110, 160].map(x => (
        <ellipse key={x} cx={x} cy={x === 110 ? 30 : 40} rx="6" ry="4" fill="rgba(255,255,200,0.4)" />
      ))}
      <text x="110" y="122" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="monospace">AZ1 — 32 BAIAS</text>
    </svg>
  )
}

function SvgCompactador({ cor }: { cor: string }) {
  return (
    <svg viewBox="0 0 220 130" className="w-full h-full">
      <rect x="0" y="105" width="220" height="25" fill="rgba(0,0,0,0.12)" rx="2" />
      {/* galpão simples */}
      <rect x="20" y="55" width="180" height="50" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <polygon points="110,20 15,55 205,55" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      {/* máquina compactadora */}
      <rect x="60" y="65" width="50" height="40" fill="rgba(0,0,0,0.25)" rx="3" />
      <rect x="65" y="70" width="40" height="10" fill="rgba(255,255,255,0.2)" rx="2" />
      <rect x="70" y="85" width="30" height="15" fill="rgba(255,255,255,0.15)" rx="2" />
      {/* braço hidráulico */}
      <rect x="105" y="70" width="30" height="8" fill="rgba(255,200,0,0.5)" rx="2" />
      <circle cx="135" cy="74" r="5" fill="rgba(255,200,0,0.5)" />
      {/* esteira */}
      <rect x="115" y="80" width="45" height="12" fill="rgba(255,255,255,0.15)" rx="2" />
      {[120, 128, 136, 144, 152].map(x => (
        <line key={x} x1={x} y1="80" x2={x} y2="92" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      ))}
      <text x="110" y="122" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="monospace">AZ2 — COMPACTADOR</text>
    </svg>
  )
}

function SvgEstruturado({ cor }: { cor: string }) {
  return (
    <svg viewBox="0 0 220 130" className="w-full h-full">
      <rect x="0" y="105" width="220" height="25" fill="rgba(0,0,0,0.12)" rx="2" />
      {/* 3 módulos lado a lado */}
      {[12, 82, 152].map((x, i) => (
        <g key={x}>
          <rect x={x} y="55" width="62" height="50" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <polygon points={`${x + 31},20 ${x},55 ${x + 62},55`} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* divisória A/B */}
          <line x1={x + 31} y1="55" x2={x + 31} y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* labels A e B */}
          <text x={x + 16} y="85" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)" fontFamily="monospace">A</text>
          <text x={x + 46} y="85" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)" fontFamily="monospace">B</text>
          {/* número do módulo */}
          <text x={x + 31} y="50" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="monospace">{`AZ0${i + 3}`}</text>
          {/* portão */}
          <rect x={x + 22} y="75" width="18" height="30" fill="rgba(0,0,0,0.3)" rx="1" />
        </g>
      ))}
      <text x="110" y="122" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="monospace">ESTRUTURADO AZ03–AZ08</text>
    </svg>
  )
}

// ── Barra de ocupação mini ────────────────────────────────────────────────────
function MiniBar({ pct, cor }: { pct: number; cor: string }) {
  const c = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : pct >= 40 ? "#22c55e" : "#3b82f6"
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
        <span>Ocupação</span>
        <span className="font-bold text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function BoxesVisualClient({
  boxes,
  totalCapacidade,
  totalVolume: _totalVolume,
  boxesCheios: _boxesCheios,
  boxesLivres: _boxesLivres,
  todasPrevisoes = [],
  naviosDisponiveis = [],
  contabilGranel = null,
  coberturaPendente = null,
  produtosCad = [],
  clientesCad = [],
}: {
  boxes: BoxItem[]
  totalCapacidade: number
  totalVolume: number
  boxesCheios: number
  boxesLivres: number
  todasPrevisoes?: (Previsao & { boxId: string | null })[]
  naviosDisponiveis?: { id: string; nome: string; eta: string; produto?: string | null; clienteNome?: string | null }[]
  contabilGranel?: number | null
  coberturaPendente?: { volume: number; count: number } | null
  produtosCad?: string[]
  clientesCad?: string[]
}) {
  const [visao, setVisao] = useState<"MAPA" | "GRADE" | "LINHA">("MAPA")
  const [estruturaSel, setEstruturaSel] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<"TODOS" | "LIVRE" | "OCUPADO" | "CRITICO">("TODOS")
  const [showModal, setShowModal] = useState(false)
  const [showVistoria, setShowVistoria] = useState(false)
  const [showNovoRecebimento, setShowNovoRecebimento] = useState(false)
  const [showPrevisoes, setShowPrevisoes] = useState(false)
  const [form, setForm] = useState({ codigo: "", descricao: "", localizacao: "", capacidade: "" })
  const [verDetalhe, setVerDetalhe] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previsoes, setPrevisoes] = useState(todasPrevisoes)

  // Estado local de boxes — permite atualizar campos sem recarregar a página
  const [boxesState, setBoxesState] = useState<BoxItem[]>(boxes)

  // Callback universal para atualizar um box específico sem reload
  function handleBoxUpdate(boxId: string, updates: Partial<BoxItem>) {
    setBoxesState(prev =>
      prev.map(b => (b.id === boxId ? { ...b, ...updates } : b))
    )
  }
  // Alias para VistoriaDiariaModal (aceita o mesmo tipo)
  const handleVistoriaSaved = handleBoxUpdate

  const totalPrevisoes = previsoes.length

  // KPIs calculados a partir do estado local (refletem edições sem reload)
  const localTotalVolume  = boxesState.reduce((s, b) => s + b.volumeAtual, 0)
  const localBoxesCheios  = boxesState.filter(b => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9).length
  const localBoxesLivres  = boxesState.filter(b => b.volumeAtual === 0).length
  const pctTotal          = totalCapacidade > 0 ? (localTotalVolume / totalCapacidade) * 100 : 0

  // boxes por estrutura
  function boxesDa(id: string) {
    const est = ESTRUTURAS.find(e => e.id === id)
    if (!est || est.semBoxes) return []
    return boxesState.filter(b => est.match(b.codigo))
  }

  // stats por estrutura
  function statsDa(id: string) {
    const bs = boxesDa(id)
    const vol  = bs.reduce((s, b) => s + b.volumeAtual, 0)
    const cap  = bs.reduce((s, b) => s + b.capacidade, 0)
    const pct  = cap > 0 ? (vol / cap) * 100 : 0
    const crit = bs.filter(b => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9).length
    const alrt = bs.reduce((s, b) => s + b.alertasAbertos, 0)
    return { total: bs.length, vol, cap, pct, crit, alrt }
  }

  // boxe filtrada para visão grade/linha/drill-down
  const filtered = boxesState.filter(b => {
    const pct = b.capacidade > 0 ? (b.volumeAtual / b.capacidade) * 100 : 0
    const matchS =
      b.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (b.produto ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.cliente ?? "").toLowerCase().includes(search.toLowerCase())
    const matchF =
      filtro === "TODOS" ||
      (filtro === "LIVRE"   && b.volumeAtual === 0) ||
      (filtro === "OCUPADO" && b.volumeAtual > 0 && pct < 90) ||
      (filtro === "CRITICO" && pct >= 90)
    return matchS && matchF
  })

  // boxes exibidas no drill-down
  const boxesDrillDown = estruturaSel
    ? boxesDa(estruturaSel).filter(b => filtered.some(f => f.id === b.id))
    : filtered

  // agrupamento por linha
  function linhaDoBox(codigo: string) {
    if (/^B\d+/.test(codigo))       return "NAVE (B01–B12)"
    if (/^(BAIA|AZ01)/i.test(codigo)) return "AZ1 — Baias"
    const az = codigo.match(/^AZ0?(\d+)/)
    if (az) return `AZ${az[1].padStart(2, "0")}`
    return "Outros"
  }
  const linhas = boxesState.reduce<Record<string, BoxItem[]>>((acc, b) => {
    const l = linhaDoBox(b.codigo); acc[l] = acc[l] ?? []; acc[l].push(b); return acc
  }, {})
  const linhasOrdenadas = Object.keys(linhas).sort()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/boxes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacidade: Number(form.capacidade) }),
    })
    setSaving(false); setShowModal(false); window.location.reload()
  }

  // ── BoxGrid reutilizável ────────────────────────────────────────────────────
  function BoxGrid({ items }: { items: BoxItem[] }) {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(box => (
            <div key={box.id} className="relative">
              {box.alertasAbertos > 0 && (
                <div className="absolute -top-1 -left-1 z-10 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                  {box.alertasAbertos}
                </div>
              )}
              {box.statusLiberacao && box.statusLiberacao !== "LIBERADO" && (
                <LiberacaoSinal status={box.statusLiberacao} />
              )}
              {box.previsao && <PrevisaoSinal previsao={box.previsao} />}
              <BoxVisual
                box={box}
                produtos={produtosCad}
                clientes={clientesCad}
                onUpdate={(id, upd) => handleBoxUpdate(id, upd as Partial<BoxItem>)}
              />
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <div className="py-16 text-center text-gray-400">Nenhum box encontrado.</div>
        )}
      </>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Boxes</h2>
          <p className="text-gray-500 text-sm mt-0.5">{boxesState.length} boxes · ocupação visual em tempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Painel de previsões */}
          <button onClick={() => setShowPrevisoes(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border ${
              showPrevisoes ? "bg-blue-700 text-white border-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}>
            <List size={15} />
            Previsões
            {totalPrevisoes > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${showPrevisoes ? "bg-white text-blue-700" : "bg-blue-600 text-white"}`}>
                {totalPrevisoes}
              </span>
            )}
          </button>
          <button onClick={() => setShowNovoRecebimento(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Ship size={15} /> Prog. Recebimento
          </button>
          <button onClick={() => setShowVistoria(true)}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <ClipboardCheck size={16} /> Realizar Vistoria
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Novo Box
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Ocupação Geral", value: `${pctTotal.toFixed(1)}%`, sub: `${localTotalVolume.toLocaleString("pt-BR")} / ${totalCapacidade.toLocaleString("pt-BR")} ton`, icon: Gauge, color: pctTotal >= 90 ? "red" : pctTotal >= 70 ? "orange" : "green" },
          { label: "Boxes Livres",   value: localBoxesLivres,  sub: "sem produto",        icon: PackageX,    color: "blue" },
          { label: "Boxes Cheios",  value: localBoxesCheios,  sub: "≥ 90% capacidade",   icon: PackageCheck, color: "red" },
          { label: "Total Boxes",   value: boxesState.length, sub: "ativos",             icon: Warehouse,    color: "gray" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
              <p className="text-xs text-gray-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Painel de previsões de recebimento ── */}
      {showPrevisoes && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <Ship size={15} className="text-indigo-600" />
              Previsões de Recebimento Ativas
            </h3>
            <button onClick={() => setShowNovoRecebimento(true)}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
              <Plus size={12} /> Nova
            </button>
          </div>
          {previsoes.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma previsão agendada.</p>
          ) : (
            <div className="space-y-2">
              {previsoes.map(p => {
                const box = boxesState.find(b => b.id === p.boxId)
                const { bg, text, label, pulse } = corPrevisao(p.dataPrevisao, p.status)
                const dataFmt = new Date(p.dataPrevisao).toLocaleDateString("pt-BR")
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                    {/* Status badge */}
                    <span className={`${bg} ${text} text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${pulse ? "animate-pulse" : ""}`}>
                      {label}
                    </span>
                    {/* Ship icon + date */}
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs shrink-0">
                      <CalendarDays size={12} />
                      <span className="font-medium">{dataFmt}</span>
                    </div>
                    {/* Box */}
                    <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold shrink-0 ${box ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {box?.codigo ?? (p.boxId ? p.boxId.slice(0, 6) : "box a definir")}
                    </span>
                    {/* Produto / Cliente */}
                    <div className="flex-1 min-w-0 text-xs text-gray-700 truncate">
                      <strong>{p.produto}</strong>
                      <span className="text-gray-400 mx-1">·</span>
                      {p.cliente}
                      {p.naveNome && <span className="text-gray-400 ml-1">· 🚢 {p.naveNome}</span>}
                    </div>
                    {/* Volume */}
                    {p.volumePrev != null && (
                      <span className="text-xs text-gray-500 shrink-0">{p.volumePrev.toLocaleString("pt-BR")} ton</span>
                    )}
                    {/* Ações rápidas */}
                    <div className="flex gap-1 shrink-0">
                      {p.status === "AGUARDANDO" && (
                        <button onClick={async () => {
                          await fetch(`/api/previsao-recebimento/${p.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "RECEBENDO" }),
                          })
                          setPrevisoes(prev => prev.map(x => x.id === p.id ? { ...x, status: "RECEBENDO" } : x))
                        }} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 font-medium">
                          Iniciar
                        </button>
                      )}
                      {p.status === "RECEBENDO" && (
                        <button onClick={async () => {
                          await fetch(`/api/previsao-recebimento/${p.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "RECEBIDO" }),
                          })
                          setPrevisoes(prev => prev.filter(x => x.id !== p.id))
                        }} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 font-medium">
                          Concluir
                        </button>
                      )}
                      <button onClick={async () => {
                        if (!confirm("Cancelar esta previsão?")) return
                        await fetch(`/api/previsao-recebimento/${p.id}`, { method: "DELETE" })
                        setPrevisoes(prev => prev.filter(x => x.id !== p.id))
                      }} className="text-xs text-gray-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50">
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Barra global: Físico × Contábil × Diferença ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Capacidade total do armazém</span>
          <span className="font-bold text-gray-800">{pctTotal.toFixed(1)}%</span>
        </div>

        {/* Físico (boxes) */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500 w-32 shrink-0">📦 Físico (boxes)</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${Math.min(pctTotal, 100)}%`,
              background: pctTotal >= 90 ? "#ef4444" : pctTotal >= 70 ? "#f97316" : "#22c55e",
            }} />
          </div>
          <span className="text-xs font-bold text-gray-700 w-28 text-right tabular-nums">{localTotalVolume.toLocaleString("pt-BR")} t</span>
        </div>

        {contabilGranel !== null && (() => {
          const pctCont = totalCapacidade > 0 ? (contabilGranel / totalCapacidade) * 100 : 0
          const dif = localTotalVolume - contabilGranel
          const pctDif = localTotalVolume > 0 ? (Math.abs(dif) / localTotalVolume) * 100 : 0
          return (
            <>
              {/* Contábil (granel · TOTVS) */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 w-32 shrink-0">📊 Contábil (granel)</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(pctCont, 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-blue-700 w-28 text-right tabular-nums">{contabilGranel.toLocaleString("pt-BR")} t</span>
              </div>

              {/* Diferença físico − contábil */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 w-32 shrink-0">⚖️ Diferença</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${Math.abs(dif) < 0.05 ? "text-green-600" : Math.abs(dif) <= localTotalVolume * 0.05 ? "text-amber-600" : "text-red-600"}`}>
                    {dif > 0 ? "+" : ""}{dif.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t
                  </span>
                  <span className="text-xs text-gray-400">
                    ({pctDif.toFixed(1)}% · {dif > 0 ? "físico maior que o contábil" : dif < 0 ? "contábil maior que o físico" : "conferem"})
                  </span>
                </div>
              </div>
            </>
          )
        })()}

        {coberturaPendente && coberturaPendente.volume > 0 && (
          <a href="/coberturas" className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 hover:bg-amber-50/40 rounded px-1 transition">
            <span className="text-xs text-gray-500 w-32 shrink-0">🛡️ Cobertura pendente</span>
            <span className="text-sm font-bold text-amber-600 tabular-nums">{coberturaPendente.volume.toLocaleString("pt-BR")} t</span>
            <span className="text-xs text-gray-400">({coberturaPendente.count} romaneio{coberturaPendente.count !== 1 ? "s" : ""} descarregado{coberturaPendente.count !== 1 ? "s" : ""} sem NF no contábil) →</span>
          </a>
        )}

        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <span key={f}>{(totalCapacidade * f).toLocaleString("pt-BR")} ton</span>
          ))}
        </div>

        {/* Detalhe por cliente → produto (físico nos boxes) */}
        <button onClick={() => setVerDetalhe(v => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
          <ChevronRight size={14} className={`transition-transform ${verDetalhe ? "rotate-90" : ""}`} />
          {verDetalhe ? "Ocultar" : "Ver produto e volume por cliente"}
        </button>
        {verDetalhe && (
          <div className="mt-3">
            <DrillBarChart
              dados={boxesState.filter(b => b.volumeAtual > 0).map(b => ({
                cliente: b.cliente || "—", produto: b.produto || "—", box: b.codigo, volume: Math.round(b.volumeAtual),
              }))}
              niveis={[
                { campo: "cliente", titulo: "Cliente" },
                { campo: "produto", titulo: "Produto" },
                { campo: "box", titulo: "Box" },
              ]}
              medidas={[{ campo: "volume", nome: "Volume", cor: "#22c55e" }]}
              unidade="t"
              semDados="Nenhum produto nos boxes."
            />
          </div>
        )}
      </div>

      {/* ── Seletor de visão ── */}
      <div className="flex gap-2 mb-4">
        {([
          { id: "MAPA",  label: "Mapa do Armazém", icon: Map },
          { id: "GRADE", label: "Todos os Boxes",  icon: LayoutGrid },
          { id: "LINHA", label: "Por Linha",        icon: Rows3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setVisao(id); setEstruturaSel(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              visao === id ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO MAPA — cards drill-down
      ══════════════════════════════════════════════════════════════════════ */}
      {visao === "MAPA" && (
        <div className="space-y-5">

          {/* Breadcrumb / back */}
          {estruturaSel && (
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setEstruturaSel(null)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
                ← Voltar ao Mapa
              </button>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="font-semibold text-gray-800">
                {ESTRUTURAS.find(e => e.id === estruturaSel)?.nome}
              </span>
              <span className="text-gray-400">— {boxesDrillDown.length} box(es)</span>
            </div>
          )}

          {/* ── Nível 1: cards das estruturas ─────────────────────────── */}
          {!estruturaSel && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {ESTRUTURAS.map(est => {
                  const st = statsDa(est.id)
                  return (
                    <button key={est.id}
                      onClick={() => !est.semBoxes && setEstruturaSel(est.id)}
                      className={`group relative overflow-hidden rounded-2xl shadow-lg text-left transition-all duration-200 ${
                        est.semBoxes ? "cursor-default opacity-80" : "hover:scale-[1.02] hover:shadow-xl active:scale-[0.99]"
                      }`}
                      style={{ background: `linear-gradient(135deg, ${est.cor}ee, ${est.cor}cc)` }}
                    >
                      {/* padrão de fundo sutil */}
                      <div className="absolute inset-0 opacity-5"
                        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />

                      {/* ilustração SVG */}
                      <div className="relative h-36 px-2 pt-2">
                        {est.id === "NAVE"        && <SvgNave cor={est.cor} />}
                        {est.id === "AZ1"         && <SvgBaias cor={est.cor} />}
                        {est.id === "AZ2"         && <SvgCompactador cor={est.cor} />}
                        {est.id === "ESTRUTURADO" && <SvgEstruturado cor={est.cor} />}
                      </div>

                      {/* conteúdo */}
                      <div className="relative p-4 pt-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
                              {est.tag}
                            </p>
                            <h3 className="text-xl font-bold text-white mt-0.5">{est.nome}</h3>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>{est.descricao}</p>
                          </div>
                          {!est.semBoxes && (
                            <div className="bg-white/20 rounded-xl px-3 py-2 text-center shrink-0 ml-2">
                              <p className="text-2xl font-bold text-white leading-tight">{st.total}</p>
                              <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>boxes</p>
                            </div>
                          )}
                        </div>

                        {/* stats */}
                        {!est.semBoxes && st.total > 0 && (
                          <>
                            <div className="flex gap-4 mt-3 text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                              <span>{st.vol.toLocaleString("pt-BR")} <span className="opacity-60">ton</span></span>
                              <span>cap: {st.cap.toLocaleString("pt-BR")} <span className="opacity-60">ton</span></span>
                              {st.crit > 0 && (
                                <span className="flex items-center gap-1 text-yellow-300 font-semibold">
                                  <AlertTriangle size={11} />{st.crit} crítico(s)
                                </span>
                              )}
                            </div>
                            <MiniBar pct={st.pct} cor={est.cor} />
                          </>
                        )}

                        {est.semBoxes && (
                          <div className="mt-3 text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                            Área de compactação — não possui boxes cadastrados
                          </div>
                        )}

                        {!est.semBoxes && (
                          <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                            Ver boxes <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
                          </div>
                        )}
                      </div>

                      {/* alertas badge */}
                      {st.alrt > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow">
                          {st.alrt}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* legenda geral */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                {[
                  { cor: "#3b82f6", label: "< 40%" },
                  { cor: "#22c55e", label: "40–70%" },
                  { cor: "#f97316", label: "70–90%" },
                  { cor: "#ef4444", label: "≥ 90% (crítico)" },
                ].map(({ cor, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: cor }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Nível 2: boxes da estrutura selecionada ───────────────── */}
          {estruturaSel && (
            <>
              {/* filtros inline */}
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                  <input placeholder="Buscar box, produto..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {(["TODOS","LIVRE","OCUPADO","CRITICO"] as const).map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      filtro === f
                        ? f === "CRITICO" ? "bg-red-600 text-white" : "bg-blue-700 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {f === "CRITICO" ? "⚠ Crítico" : f === "TODOS" ? "Todos" : f === "LIVRE" ? "Livre" : "Ocupado"}
                  </button>
                ))}
              </div>

              {/* header da estrutura */}
              {(() => {
                const est = ESTRUTURAS.find(e => e.id === estruturaSel)!
                const st  = statsDa(est.id)
                return (
                  <div className="rounded-xl p-4 flex items-center gap-4"
                    style={{ background: `linear-gradient(135deg, ${est.cor}22, ${est.cor}11)`, borderLeft: `4px solid ${est.cor}` }}>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg">{est.nome}</p>
                      <p className="text-sm text-gray-500">{est.descricao}</p>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-700">
                      <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: est.cor }}>{st.total}</p>
                        <p className="text-xs text-gray-400">boxes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: st.pct >= 90 ? "#ef4444" : st.pct >= 70 ? "#f97316" : "#22c55e" }}>
                          {st.pct.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-400">ocupação</p>
                      </div>
                      {st.crit > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500">{st.crit}</p>
                          <p className="text-xs text-gray-400">crítico(s)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              <BoxGrid items={boxesDrillDown} />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO GRADE — todos os boxes
      ══════════════════════════════════════════════════════════════════════ */}
      {visao === "GRADE" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input placeholder="Buscar box, produto ou cliente..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {(["TODOS","LIVRE","OCUPADO","CRITICO"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filtro === f
                    ? f === "CRITICO" ? "bg-red-600 text-white" : "bg-blue-700 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {f === "CRITICO" ? "⚠ Crítico" : f}
                {f !== "TODOS" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({f === "LIVRE" ? boxesState.filter(b => b.volumeAtual === 0).length
                      : f === "OCUPADO" ? boxesState.filter(b => b.volumeAtual > 0 && b.volumeAtual / b.capacidade < 0.9).length
                      : boxesState.filter(b => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-4 mb-4 text-xs text-gray-500">
            {[{ cor: "#3b82f6", label: "< 40%" }, { cor: "#22c55e", label: "40–70%" }, { cor: "#f97316", label: "70–90%" }, { cor: "#ef4444", label: "≥ 90%" }].map(({ cor, label }) => (
              <div key={label} className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: cor }} /><span>{label}</span></div>
            ))}
          </div>
          <BoxGrid items={filtered} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO LINHA
      ══════════════════════════════════════════════════════════════════════ */}
      {visao === "LINHA" && (
        <div className="space-y-6">
          {linhasOrdenadas.map(linha => {
            const boxesLinha = linhas[linha].filter(b => filtered.some(f => f.id === b.id))
            if (boxesLinha.length === 0) return null
            return (
              <div key={linha} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  {linha}
                  <span className="text-gray-400 font-normal text-sm">({boxesLinha.length} boxes)</span>
                </h3>
                <BoxGrid items={boxesLinha} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal novo box ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Novo Box</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { name: "codigo",      label: "Código (ex: AZ03A, B01, BAIA01)" },
                { name: "descricao",   label: "Descrição" },
                { name: "localizacao", label: "Localização" },
                { name: "capacidade", label: "Capacidade (ton)", type: "number" },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type ?? "text"} value={form[name as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60 transition">
                  {saving ? "Criando…" : "Criar Box"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal novo recebimento ── */}
      {showNovoRecebimento && (
        <NovoRecebimentoModal
          boxes={boxesState.map(b => ({
            id: b.id, codigo: b.codigo, descricao: b.descricao,
            armazemId: b.armazemId, armazemNome: b.armazemNome, armazemCodigo: b.armazemCodigo,
          }))}
          navios={naviosDisponiveis}
          onClose={() => setShowNovoRecebimento(false)}
          onSaved={() => setShowNovoRecebimento(false)}
        />
      )}

      {/* ── Modal vistoria ── */}
      {showVistoria && (
        <VistoriaDiariaModal
          boxes={boxesState.map(b => ({
            id: b.id, codigo: b.codigo, descricao: b.descricao,
            capacidade: b.capacidade, volumeAtual: b.volumeAtual,
            produto: b.produto, cliente: b.cliente, navio: b.navio,
            dataRecebimento: b.dataRecebimento, codigoLacre: b.codigoLacre,
            movimentadoHoje: b.movimentadoHoje,
            armazemId: b.armazemId, armazemNome: b.armazemNome, armazemCodigo: b.armazemCodigo,
          }))}
          onClose={() => setShowVistoria(false)}
          onSaved={handleVistoriaSaved}
        />
      )}
    </div>
  )
}
