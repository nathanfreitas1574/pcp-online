"use client"

import {
  BarChart2, Box, Truck, TrendingUp, TrendingDown, AlertTriangle,
  Ship, Package, DollarSign, ClipboardCheck, Lock, CheckCircle2,
  XCircle, Clock,
} from "lucide-react"

type KPIs = {
  totalBoxes: number; totalCap: number; totalVol: number; pctOcupacao: number
  boxesLivres: number; boxesCriticos: number; boxesBloqueados: number
  recebidoTon: number; expedidoTon: number
  custoTotal: number; custoPorTon: number | null
  alertasCriticosCount: number; vistoriaHoje: number; lacresNaoConformes: number
  mes: string
}

function Card({ label, value, sub, icon: Icon, cor = "blue", destaque = false }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; cor?: string; destaque?: boolean
}) {
  const cores: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600", orange: "bg-orange-50 text-orange-600",
    gray: "bg-gray-100 text-gray-500", yellow: "bg-yellow-50 text-yellow-600",
    indigo: "bg-indigo-50 text-indigo-600",
  }
  return (
    <div className={`bg-white rounded-2xl border ${destaque ? "border-blue-200 shadow-md shadow-blue-50" : "border-gray-100 shadow-sm"} p-5 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl shrink-0 ${cores[cor]}`}><Icon size={22} /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function BarraOcupacao({ pct }: { pct: number }) {
  const cor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#22c55e"
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Ocupação geral</span>
        <span className="font-bold" style={{ color: cor }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
      </div>
      {[0, 25, 50, 75, 100].map(v => (
        <div key={v} className="inline-block" style={{ width: "25%" }}>
          <span className="text-[10px] text-gray-300">{v}%</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </div>
  )
}

export default function ExecutivoClient({
  kpis, alertasCriticos, naviosProximos, previsoes, topClientes,
}: {
  kpis: KPIs
  alertasCriticos: { id: string; titulo: string; descricao: string; tipo: string; createdAt: string }[]
  naviosProximos:  { id: string; nome: string; eta: string; produto?: string | null; clienteNome?: string | null; volumePrev?: number | null; status: string }[]
  previsoes:       { id: string; produto: string; cliente: string; boxCodigo: string; dataPrevisao: string; status: string; naveNome?: string | null; volumePrev?: number | null }[]
  topClientes:     { nome: string; volume: number }[]
}) {
  const mesLabel = new Date(kpis.mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const maxVol   = Math.max(...topClientes.map(c => c.volume), 1)

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 size={22} className="text-blue-700" /> Dashboard Executivo
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Visão consolidada · {mesLabel}</p>
        </div>
        {/* Status badges rápidos */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={kpis.alertasCriticosCount === 0} label={`${kpis.alertasCriticosCount} alertas críticos`} />
          <StatusBadge ok={kpis.lacresNaoConformes  === 0} label={`${kpis.lacresNaoConformes} lacres n/c`} />
          <StatusBadge ok={kpis.boxesBloqueados     === 0} label={`${kpis.boxesBloqueados} boxes bloqueados`} />
        </div>
      </div>

      {/* ── KPIs principais ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Ocupação Geral"   value={`${kpis.pctOcupacao.toFixed(1)}%`}
          sub={`${kpis.totalVol.toLocaleString("pt-BR")} / ${kpis.totalCap.toLocaleString("pt-BR")} ton`}
          icon={Box} cor={kpis.pctOcupacao >= 90 ? "red" : kpis.pctOcupacao >= 70 ? "orange" : "green"} destaque />
        <Card label="Recebido no Mês"  value={`${kpis.recebidoTon.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} t`}
          sub={mesLabel} icon={TrendingUp} cor="blue" />
        <Card label="Expedido no Mês"  value={`${kpis.expedidoTon.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} t`}
          sub={mesLabel} icon={TrendingDown} cor="indigo" />
        <Card label="Custo/Tonelada"
          value={kpis.custoPorTon != null ? `R$ ${kpis.custoPorTon.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : "—"}
          sub={`Total R$ ${kpis.custoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
          icon={DollarSign} cor="yellow" />
      </div>

      {/* ── Linha 2: Status operacional ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Boxes Livres"     value={kpis.boxesLivres}   sub="sem produto"          icon={Package}        cor="green" />
        <Card label="Boxes Críticos"   value={kpis.boxesCriticos} sub="≥ 90% capacidade"     icon={AlertTriangle}  cor="red" />
        <Card label="Vistorias Hoje"   value={kpis.vistoriaHoje}  sub="realizadas"            icon={ClipboardCheck} cor="blue" />
        <Card label="Lacres N/C"       value={kpis.lacresNaoConformes} sub="não conformes"    icon={Lock}           cor={kpis.lacresNaoConformes > 0 ? "red" : "green"} />
      </div>

      {/* ── Barra de ocupação ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <BarraOcupacao pct={kpis.pctOcupacao} />
      </div>

      {/* ── Linha 3: Gráficos e listas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top clientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <Truck size={15} className="text-blue-600" /> Top Clientes em Estoque
          </h3>
          <div className="space-y-3">
            {topClientes.length === 0 && <p className="text-xs text-gray-400 italic">Sem dados</p>}
            {topClientes.map((c, i) => (
              <div key={c.nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 truncate flex-1">{i + 1}. {c.nome}</span>
                  <span className="text-gray-500 ml-2">{c.volume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ton</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.volume / maxVol) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navios próximos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <Ship size={15} className="text-blue-600" /> Navios — Próximos 14 dias
          </h3>
          <div className="space-y-2.5">
            {naviosProximos.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum navio agendado</p>}
            {naviosProximos.map(n => {
              const dias = Math.ceil((new Date(n.eta).getTime() - Date.now()) / 86400000)
              return (
                <div key={n.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg min-w-12 text-center ${dias <= 2 ? "bg-red-100 text-red-700" : dias <= 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {dias <= 0 ? "Hoje" : `${dias}d`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{n.nome}</p>
                    <p className="text-[11px] text-gray-500 truncate">{n.produto ?? "—"} · {n.clienteNome ?? "—"}</p>
                  </div>
                  {n.volumePrev && <span className="text-xs text-gray-400">{n.volumePrev.toLocaleString("pt-BR")}t</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Alertas críticos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" /> Alertas Críticos
          </h3>
          <div className="space-y-2">
            {alertasCriticos.length === 0 && (
              <div className="flex flex-col items-center py-4 text-green-600">
                <CheckCircle2 size={28} className="mb-1.5 opacity-80" />
                <p className="text-xs font-medium">Sem alertas críticos!</p>
              </div>
            )}
            {alertasCriticos.map(a => (
              <div key={a.id} className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <p className="text-xs font-semibold text-red-700">{a.titulo}</p>
                <p className="text-[11px] text-red-500 mt-0.5 truncate">{a.descricao}</p>
                <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                  <Clock size={9} />{new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Previsões de recebimento ── */}
      {previsoes.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
            <Ship size={15} className="text-indigo-600" /> Recebimentos Programados ({previsoes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {previsoes.map(p => {
              const dias = Math.ceil((new Date(p.dataPrevisao).getTime() - Date.now()) / 86400000)
              const cor  = p.status === "RECEBENDO" ? "green" : dias <= 2 ? "red" : dias <= 7 ? "yellow" : "blue"
              const bgMap: Record<string, string> = { green: "bg-green-50 border-green-200", red: "bg-red-50 border-red-200", yellow: "bg-yellow-50 border-yellow-200", blue: "bg-blue-50 border-blue-100" }
              const txtMap: Record<string, string> = { green: "text-green-700", red: "text-red-700", yellow: "text-yellow-700", blue: "text-blue-700" }
              return (
                <div key={p.id} className={`rounded-xl border px-4 py-3 ${bgMap[cor]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${txtMap[cor]}`}>
                      {p.status === "RECEBENDO" ? "🔄 RECEBENDO" : dias <= 0 ? "⚠ ATRASADO" : `📅 ${dias}d`}
                    </span>
                    <span className="font-mono text-xs bg-white/70 px-2 py-0.5 rounded font-bold text-gray-700">{p.boxCodigo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.produto}</p>
                    {p.volumePrev ? (
                      <span className={`text-sm font-bold shrink-0 tabular-nums ${txtMap[cor]}`}>
                        {p.volumePrev.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} t
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500">{p.cliente}{p.naveNome ? ` · 🚢 ${p.naveNome}` : ""}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
