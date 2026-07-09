"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Trash2, Upload, Eraser, TrendingDown, Package, Percent, CheckCircle2, Clock, FolderOpen } from "lucide-react"
import DrillBarChart from "@/components/DrillBarChart"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const STATUS = [
  { key: "ABERTO", label: "Aberto", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "EM_ANDAMENTO", label: "Em andamento", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "FINALIZADO", label: "Finalizado", cls: "bg-green-100 text-green-700 border-green-200" },
]
const statusCfg = (s: string) => STATUS.find((x) => x.key === s) ?? STATUS[0]
const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
const fmt1 = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const pct = (n: number) => `${((n || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
const ymd = (iso: string | null) => (iso ? iso.slice(0, 10) : "")

type Row = {
  id: string; data: string | null; filial: string | null; contrato: string | null
  cliente: string | null; produto: string | null; origemNavio: string | null
  volumeContrato: number; volumeRecebido: number; quebraTecnica: number; quebraDisponivel: number
  pctQuebra: number; saldoAReceber: number; sobra: number; quebraFutura: number; difBalanca: number
  statusManual: string | null; status: string; obs: string | null
}
type NV = { nome: string; quebra: number; volume: number; pct: number; n: number }
type Dados = {
  rows: Row[]
  kpis: { total: number; aberto: number; andamento: number; finalizado: number; volumeMovimentado: number; volumeContrato: number; quebraTotal: number; quebraFinalizada: number; quebraAndamento: number; quebraDisponivel: number; quebraFutura: number; saldoAReceber: number; sobra: number; difBalanca: number; pctMedio: number }
  porProduto: NV[]; porCliente: NV[]; porFilial: NV[]
  opcoes: { anos: number[]; clientes: string[]; produtos: string[]; filiais: string[] }
}

const INP = "w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"

export default function QuebraClient() {
  const [ano, setAno] = useState(0)
  const [mes, setMes] = useState(0)
  const [fStatus, setFStatus] = useState("")
  const [fCliente, setFCliente] = useState("")
  const [fProduto, setFProduto] = useState("")
  const [fFilial, setFFilial] = useState("")
  const [d, setD] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(false)
  const [upMsg, setUpMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ ano: String(ano), mes: String(mes), status: fStatus, cliente: fCliente, produto: fProduto, filial: fFilial })
    fetch(`/api/quebra-tecnica?${qs}`).then((r) => r.json()).then((j) => setD(j.error ? null : j)).catch(() => {}).finally(() => setLoading(false))
  }, [ano, mes, fStatus, fCliente, fProduto, fFilial])
  useEffect(() => { carregar() }, [carregar])

  const temFiltro = !!ano || !!mes || !!fStatus || !!fCliente || !!fProduto || !!fFilial
  const limpar = () => { setAno(0); setMes(0); setFStatus(""); setFCliente(""); setFProduto(""); setFFilial("") }

  // edição inline (otimista + PATCH)
  async function salvar(id: string, campo: keyof Row, valor: string | number | null) {
    setD((prev) => prev ? { ...prev, rows: prev.rows.map((r) => r.id === id ? { ...r, [campo]: valor } : r) } : prev)
    await fetch(`/api/quebra-tecnica/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: valor }) }).catch(() => {})
    carregar() // recalcula status/KPIs no servidor
  }
  async function adicionar() {
    await fetch("/api/quebra-tecnica", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {})
    carregar()
  }
  async function excluir(id: string) {
    if (!confirm("Excluir esta linha de quebra técnica?")) return
    setD((prev) => prev ? { ...prev, rows: prev.rows.filter((r) => r.id !== id) } : prev)
    await fetch(`/api/quebra-tecnica/${id}`, { method: "DELETE" }).catch(() => {})
    carregar()
  }
  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm("Importar substitui todos os dados atuais pela planilha. Continuar?")) { e.target.value = ""; return }
    setUpMsg("Importando…")
    const fd = new FormData(); fd.append("file", file); fd.append("modo", "substituir")
    const res = await fetch("/api/quebra-tecnica/importar", { method: "POST", body: fd })
    const j = await res.json().catch(() => ({}))
    setUpMsg(res.ok ? `✓ ${j.importados} linhas importadas (aba ${j.aba}).` : `✕ ${j.error ?? "Erro ao importar."}`)
    e.target.value = ""
    carregar()
  }

  const k = d?.kpis
  const kpiCards = [
    { t: "Contratos em aberto", v: k ? String(k.aberto) : "—", ic: <FolderOpen size={16} />, cor: "text-amber-600", bg: "bg-amber-50" },
    { t: "Em andamento", v: k ? String(k.andamento) : "—", ic: <Clock size={16} />, cor: "text-blue-600", bg: "bg-blue-50" },
    { t: "Finalizados", v: k ? String(k.finalizado) : "—", ic: <CheckCircle2 size={16} />, cor: "text-green-600", bg: "bg-green-50" },
    { t: "Volume movimentado", v: k ? `${fmt(k.volumeMovimentado)} t` : "—", ic: <Package size={16} />, cor: "text-gray-700", bg: "bg-gray-50" },
    { t: "Quebra técnica total", v: k ? `${fmt1(k.quebraTotal)} t` : "—", ic: <TrendingDown size={16} />, cor: "text-red-600", bg: "bg-red-50", sub: k ? `${k.pctMedio}% do recebido` : "" },
    { t: "Quebra finalizada", v: k ? `${fmt1(k.quebraFinalizada)} t` : "—", ic: <CheckCircle2 size={16} />, cor: "text-green-700", bg: "bg-green-50" },
    { t: "Quebra disponível", v: k ? `${fmt1(k.quebraDisponivel)} t` : "—", ic: <Percent size={16} />, cor: "text-emerald-600", bg: "bg-emerald-50" },
    { t: "Saldo a receber", v: k ? `${fmt1(k.saldoAReceber)} t` : "—", ic: <Package size={16} />, cor: "text-blue-700", bg: "bg-blue-50" },
  ]

  const selCls = (v: string | number) => `text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 ${v ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quebra Técnica</h2>
          <p className="text-sm text-gray-500">Perda técnica de recebimento por contrato — painel de gestão e lançamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 border border-green-300 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100">
            <Upload size={15} /> Importar Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <button onClick={adicionar}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            <Plus size={15} /> Adicionar linha
          </button>
        </div>
      </div>
      {upMsg && <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${upMsg.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : upMsg === "Importando…" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700 border border-red-200"}`}>{upMsg} {upMsg.startsWith("✓") && <button onClick={() => setUpMsg("")} className="ml-1 text-xs underline">ok</button>}</div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className={selCls(ano)}>
          <option value={0}>Ano: todos</option>
          {(d?.opcoes.anos ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selCls(mes)}>
          <option value={0}>Mês: todos</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          <button onClick={() => setFStatus("")} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${!fStatus ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>Todos</button>
          {STATUS.map((s) => <button key={s.key} onClick={() => setFStatus(fStatus === s.key ? "" : s.key)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${fStatus === s.key ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>{s.label}</button>)}
        </div>
        {(d?.opcoes.filiais.length ?? 0) > 0 && (
          <select value={fFilial} onChange={(e) => setFFilial(e.target.value)} className={selCls(fFilial)}>
            <option value="">Filial: todas</option>
            {(d?.opcoes.filiais ?? []).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {(d?.opcoes.clientes.length ?? 0) > 0 && (
          <select value={fCliente} onChange={(e) => setFCliente(e.target.value)} className={`${selCls(fCliente)} max-w-40`}>
            <option value="">Cliente: todos</option>
            {(d?.opcoes.clientes ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(d?.opcoes.produtos.length ?? 0) > 0 && (
          <select value={fProduto} onChange={(e) => setFProduto(e.target.value)} className={`${selCls(fProduto)} max-w-40`}>
            <option value="">Produto: todos</option>
            {(d?.opcoes.produtos ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {temFiltro && <button onClick={limpar} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Eraser size={13} /> Limpar</button>}
        {loading && <span className="text-xs text-gray-400">carregando…</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {kpiCards.map((c) => (
          <div key={c.t} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-500 leading-tight">{c.t}</p>
              <span className={`${c.bg} ${c.cor} rounded-lg p-1`}>{c.ic}</span>
            </div>
            <p className={`text-xl font-bold mt-1 ${c.cor}`}>{c.v}</p>
            {c.sub && <p className="text-[10px] text-gray-400">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Gráficos com drill-down: produto → cliente → navio | cliente → produto → contrato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <DrillBarChart
            titulo="Quebra técnica por produto (t)"
            dados={(d?.rows ?? []).map((r) => ({ produto: r.produto || "(sem produto)", cliente: r.cliente || "(sem cliente)", navio: r.origemNavio || "(sem navio)", quebra: r.quebraTecnica }))}
            niveis={[{ campo: "produto", titulo: "Produto" }, { campo: "cliente", titulo: "Cliente" }, { campo: "navio", titulo: "Origem/Navio" }]}
            medidas={[{ campo: "quebra", nome: "Quebra (t)", cor: "#ef4444" }]}
            unidade="t"
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <DrillBarChart
            titulo="Quebra técnica por cliente (t)"
            dados={(d?.rows ?? []).map((r) => ({ cliente: r.cliente || "(sem cliente)", produto: r.produto || "(sem produto)", contrato: r.contrato || "(sem contrato)", quebra: r.quebraTecnica }))}
            niveis={[{ campo: "cliente", titulo: "Cliente" }, { campo: "produto", titulo: "Produto" }, { campo: "contrato", titulo: "Contrato" }]}
            medidas={[{ campo: "quebra", nome: "Quebra (t)", cor: "#f97316" }]}
            unidade="t"
          />
        </div>
      </div>

      {/* Tabela editável */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                {["Data", "Filial", "Contrato", "Cliente", "Produto", "Origem/Navio", "Vol. Contr.", "Vol. Receb.", "Quebra", "% Queb.", "Q. Disp.", "Saldo Rec.", "Sobra", "Dif. Bal.", "Status", ""].map((h, i) => (
                  <th key={i} className="px-2 py-2.5 text-left font-medium whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(d?.rows ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/30">
                  <td className="px-1 py-1"><input type="date" defaultValue={ymd(r.data)} onChange={(e) => salvar(r.id, "data", e.target.value || null)} className={`${INP} w-32`} /></td>
                  <td className="px-1 py-1"><input defaultValue={r.filial ?? ""} onBlur={(e) => { if (e.target.value !== (r.filial ?? "")) salvar(r.id, "filial", e.target.value) }} className={`${INP} w-16 uppercase`} /></td>
                  <td className="px-1 py-1"><input defaultValue={r.contrato ?? ""} onBlur={(e) => { if (e.target.value !== (r.contrato ?? "")) salvar(r.id, "contrato", e.target.value) }} className={`${INP} w-16 font-mono`} /></td>
                  <td className="px-1 py-1"><input defaultValue={r.cliente ?? ""} onBlur={(e) => { if (e.target.value !== (r.cliente ?? "")) salvar(r.id, "cliente", e.target.value) }} className={`${INP} min-w-28`} /></td>
                  <td className="px-1 py-1"><input defaultValue={r.produto ?? ""} onBlur={(e) => { if (e.target.value !== (r.produto ?? "")) salvar(r.id, "produto", e.target.value) }} className={`${INP} min-w-24`} /></td>
                  <td className="px-1 py-1"><input defaultValue={r.origemNavio ?? ""} onBlur={(e) => { if (e.target.value !== (r.origemNavio ?? "")) salvar(r.id, "origemNavio", e.target.value) }} className={`${INP} min-w-24`} /></td>
                  {(["volumeContrato", "volumeRecebido", "quebraTecnica"] as const).map((campo) => (
                    <td key={campo} className="px-1 py-1"><input type="number" min="0" step="0.01" defaultValue={r[campo] || ""} onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== r[campo]) salvar(r.id, campo, v) }} className={`${INP} w-20 text-right`} /></td>
                  ))}
                  <td className="px-1 py-1"><input type="number" min="0" step="0.001" defaultValue={r.pctQuebra || ""} onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== r.pctQuebra) salvar(r.id, "pctQuebra", v) }} className={`${INP} w-16 text-right`} title="fração: 0,005 = 0,5%" /></td>
                  {(["quebraDisponivel", "saldoAReceber", "sobra", "difBalanca"] as const).map((campo) => (
                    <td key={campo} className="px-1 py-1"><input type="number" step="0.01" defaultValue={r[campo] || ""} onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== r[campo]) salvar(r.id, campo, v) }} className={`${INP} w-20 text-right`} /></td>
                  ))}
                  <td className="px-1 py-1">
                    <select value={r.statusManual ?? ""} onChange={(e) => salvar(r.id, "statusManual", e.target.value || null)}
                      className={`text-[11px] font-semibold rounded-full border px-2 py-1 focus:outline-none cursor-pointer ${statusCfg(r.status).cls}`}
                      title={r.statusManual ? "Status fixado manualmente" : "Automático pelo saldo — pode sobrescrever"}>
                      <option value="" className="bg-white text-gray-600">Auto · {statusCfg(r.status).label}</option>
                      {STATUS.map((s) => <option key={s.key} value={s.key} className="bg-white text-gray-800">{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1 text-center"><button onClick={() => excluir(r.id)} title="Excluir" className="text-gray-300 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {(d?.rows?.length ?? 0) === 0 && (
                <tr><td colSpan={16} className="py-12 text-center text-gray-400">{temFiltro ? "Nenhuma linha para esse filtro." : "Nenhuma quebra lançada. Importe o Excel ou clique em Adicionar linha."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">% Quebra em fração (0,005 = 0,5%). Status automático: sem recebimento = Aberto · saldo a receber &gt; 0 = Em andamento · saldo 0 = Finalizado. No seletor você pode fixar manualmente.</p>
    </div>
  )
}
