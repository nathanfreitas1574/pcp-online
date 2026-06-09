"use client"

import { useState } from "react"
import {
  Plus, Search, Warehouse, PackageCheck, PackageX, Gauge,
  ClipboardCheck, ChevronRight, LayoutGrid, Rows3, Map,
  AlertTriangle, X,
} from "lucide-react"
import BoxVisual, { BoxData } from "@/components/BoxVisual"
import VistoriaDiariaModal from "@/components/VistoriaDiariaModal"

type BoxItem = BoxData & {
  alertasAbertos: number
  ultimoLacre?: string | null
  codigoLacre?: string | null
  movimentadoHoje?: boolean
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
  totalVolume,
  boxesCheios,
  boxesLivres,
}: {
  boxes: BoxItem[]
  totalCapacidade: number
  totalVolume: number
  boxesCheios: number
  boxesLivres: number
}) {
  const [visao, setVisao] = useState<"MAPA" | "GRADE" | "LINHA">("MAPA")
  const [estruturaSel, setEstruturaSel] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<"TODOS" | "LIVRE" | "OCUPADO" | "CRITICO">("TODOS")
  const [showModal, setShowModal] = useState(false)
  const [showVistoria, setShowVistoria] = useState(false)
  const [form, setForm] = useState({ codigo: "", descricao: "", localizacao: "", capacidade: "" })
  const [saving, setSaving] = useState(false)

  const pctTotal = totalCapacidade > 0 ? (totalVolume / totalCapacidade) * 100 : 0

  // boxes por estrutura
  function boxesDa(id: string) {
    const est = ESTRUTURAS.find(e => e.id === id)
    if (!est || est.semBoxes) return []
    return boxes.filter(b => est.match(b.codigo))
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
  const filtered = boxes.filter(b => {
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
  const linhas = boxes.reduce<Record<string, BoxItem[]>>((acc, b) => {
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
              {box.ultimoLacre === "NAO_CONFORME" && (
                <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">⚠ Lacre</div>
              )}
              <BoxVisual box={box} />
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
          <p className="text-gray-500 text-sm mt-0.5">{boxes.length} boxes · ocupação visual em tempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
          { label: "Ocupação Geral", value: `${pctTotal.toFixed(1)}%`, sub: `${totalVolume.toLocaleString("pt-BR")} / ${totalCapacidade.toLocaleString("pt-BR")} ton`, icon: Gauge, color: pctTotal >= 90 ? "red" : pctTotal >= 70 ? "orange" : "green" },
          { label: "Boxes Livres",   value: boxesLivres,  sub: "sem produto",        icon: PackageX,    color: "blue" },
          { label: "Boxes Cheios",  value: boxesCheios,  sub: "≥ 90% capacidade",   icon: PackageCheck, color: "red" },
          { label: "Total Boxes",   value: boxes.length, sub: "ativos",             icon: Warehouse,    color: "gray" },
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

      {/* ── Barra global ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Capacidade total do armazém</span>
          <span className="font-bold text-gray-800">{pctTotal.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${pctTotal}%`,
            background: pctTotal >= 90 ? "#ef4444" : pctTotal >= 70 ? "#f97316" : "#22c55e",
          }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <span key={f}>{(totalCapacidade * f).toLocaleString("pt-BR")} ton</span>
          ))}
        </div>
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
                    ({f === "LIVRE" ? boxes.filter(b => b.volumeAtual === 0).length
                      : f === "OCUPADO" ? boxes.filter(b => b.volumeAtual > 0 && b.volumeAtual / b.capacidade < 0.9).length
                      : boxes.filter(b => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9).length})
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

      {/* ── Modal vistoria ── */}
      {showVistoria && (
        <VistoriaDiariaModal
          boxes={boxes.map(b => ({
            id: b.id, codigo: b.codigo, descricao: b.descricao,
            capacidade: b.capacidade, volumeAtual: b.volumeAtual,
            produto: b.produto, cliente: b.cliente, navio: b.navio,
            dataRecebimento: b.dataRecebimento, codigoLacre: b.codigoLacre,
            movimentadoHoje: b.movimentadoHoje,
          }))}
          onClose={() => setShowVistoria(false)}
        />
      )}
    </div>
  )
}
