"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, History, FileText, TrendingDown, Target, CheckCircle2, AlertTriangle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })

type Cob = { cliente: string; produto: string; tipo: string; prog: number; real: number; naoRealizado: number; pct: number }
type Dados = {
  ano: number; porMes: { mes: number; prog: number; real: number }[]; cobranca: Cob[]
  clientes: string[]; produtos: string[]; totais: { prog: number; real: number; naoRealizado: number }
}

export default function HistoricoClient({ anoAtual }: { anoAtual: number }) {
  const [ano, setAno] = useState(anoAtual)
  const [mes, setMes] = useState(0)
  const [tipo, setTipo] = useState("")
  const [cliente, setCliente] = useState("")
  const [produto, setProduto] = useState("")
  const [d, setD] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ ano: String(ano) })
    if (mes) qs.set("mes", String(mes))
    if (tipo) qs.set("tipo", tipo)
    if (cliente) qs.set("cliente", cliente)
    if (produto) qs.set("produto", produto)
    const r = await fetch("/api/programacao/historico?" + qs.toString())
    setD(await r.json())
    setLoading(false)
  }, [ano, mes, tipo, cliente, produto])
  useEffect(() => { carregar() }, [carregar])

  const cob = d?.cobranca ?? []
  const totais = d?.totais ?? { prog: 0, real: 0, naoRealizado: 0 }
  const pctGeral = totais.prog > 0 ? Math.round((totais.real / totais.prog) * 100) : 0
  const chart = (d?.porMes ?? []).map(m => ({ nome: MESES[m.mes - 1], Programado: Math.round(m.prog), Realizado: Math.round(m.real) }))

  function exportarPDF() {
    const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))
    const periodo = mes ? `${MESES_FULL[mes - 1]}/${ano}` : `Ano ${ano}`
    const linhas = cob.map(c => `<tr${c.naoRealizado > 0 ? ' style="background:#fef2f2"' : ""}><td>${esc(c.cliente)}</td><td>${esc(c.produto)}</td><td>${c.tipo === "EXPEDICAO" ? "Expedição" : "Recebimento"}</td><td style="text-align:right">${fmt(c.prog)}</td><td style="text-align:right">${fmt(c.real)}</td><td style="text-align:right"><b>${fmt(c.naoRealizado)}</b></td><td style="text-align:right">${c.pct}%</td></tr>`).join("")
    const html = `<html><head><meta charset="utf-8"><title>Cobrança Programação</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:18px;color:#111}h1{font-size:16px;margin:0}p{color:#555;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}tfoot td{font-weight:bold;background:#fafafa}</style></head><body><h1>Programação — Realizado × Cobrança · ${periodo}</h1><p>Programado: ${fmt(totais.prog)} t &middot; Realizado: ${fmt(totais.real)} t &middot; Não realizado: ${fmt(totais.naoRealizado)} t (${pctGeral}% atendido) &middot; ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Cliente</th><th>Produto</th><th>Operação</th><th>Programado (t)</th><th>Realizado (t)</th><th>Não realizado (t)</th><th>%</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`
    const w = window.open("", "_blank"); if (!w) { alert("Permita pop-ups para PDF."); return }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 3 + i)

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/programacao" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Voltar à Programação"><ArrowLeft size={18} /></Link>
          <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center"><History className="text-indigo-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Histórico &amp; Cobrança — Programação</h1>
            <p className="text-sm text-gray-500">Realizado × programado por cliente/produto, mês a mês. Foco no <strong>não realizado</strong> de contrato fixo.</p>
          </div>
        </div>
        <button onClick={exportarPDF} disabled={cob.length === 0} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"><FileText size={15} className="text-red-600" /> PDF cobrança</button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <select value={ano} onChange={e => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${mes ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
          <option value={0}>📅 Ano todo</option>
          {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {[["", "Todos"], ["RECEBIMENTO", "Recebimento"], ["EXPEDICAO", "Expedição"]].map(([v, l]) => (
            <button key={v} onClick={() => setTipo(v)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tipo === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
        <input list="h-clientes" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Cliente…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <datalist id="h-clientes">{(d?.clientes ?? []).map(c => <option key={c} value={c} />)}</datalist>
        <input list="h-produtos" value={produto} onChange={e => setProduto(e.target.value)} placeholder="Produto…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <datalist id="h-produtos">{(d?.produtos ?? []).map(p => <option key={p} value={p} />)}</datalist>
        <div className="text-sm text-gray-500 ml-auto">{loading ? "Carregando…" : `${cob.length} linha(s)`}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1"><Target size={14}/> Programado</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.prog)} <span className="text-sm text-gray-400">t</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><CheckCircle2 size={14}/> Realizado</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totais.real)} <span className="text-sm text-gray-400">t · {pctGeral}%</span></p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${totais.naoRealizado > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1"><TrendingDown size={14}/> Não realizado (cobrança)</div>
          <p className={`text-2xl font-bold ${totais.naoRealizado > 0 ? "text-red-700" : "text-gray-800"}`}>{fmt(totais.naoRealizado)} <span className="text-sm text-gray-400">t</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><AlertTriangle size={14}/> Clientes c/ pendência</div>
          <p className="text-2xl font-bold text-gray-800">{cob.filter(c => c.naoRealizado > 0.05).length}</p>
        </div>
      </div>

      {/* Gráfico mês a mês */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Programado × Realizado — mês a mês ({ano})</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(Number(v)) + " t"} /><Legend />
            <Bar dataKey="Programado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Realizado" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de cobrança */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <TrendingDown size={15} className="text-red-600" />
          <h3 className="text-sm font-bold text-gray-700">Cobrança — o que cada cliente deixou de encostar {mes ? `· ${MESES_FULL[mes - 1]}` : ""}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Produto</th>
                <th className="text-left px-3 py-2.5 font-semibold">Operação</th>
                <th className="text-right px-3 py-2.5 font-semibold">Programado</th>
                <th className="text-right px-3 py-2.5 font-semibold">Realizado</th>
                <th className="text-right px-3 py-2.5 font-semibold">Não realizado</th>
                <th className="text-center px-3 py-2.5 font-semibold">% atend.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cob.map((c, i) => (
                <tr key={i} className={c.naoRealizado > 0.05 ? "bg-red-50/50" : "hover:bg-gray-50/50"}>
                  <td className="px-3 py-2 font-medium text-gray-800 text-xs">{c.cliente}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs max-w-[220px] truncate" title={c.produto}>{c.produto}</td>
                  <td className="px-3 py-2 text-xs">{c.tipo === "EXPEDICAO" ? <span className="text-purple-600">Expedição</span> : <span className="text-blue-600">Recebimento</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{fmt(c.prog)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700 font-medium">{fmt(c.real)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${c.naoRealizado > 0.05 ? "text-red-600" : "text-gray-300"}`}>{c.naoRealizado > 0.05 ? fmt(c.naoRealizado) : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.pct >= 95 ? "text-green-700 bg-green-50" : c.pct >= 70 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"}`}>{c.pct}%</span>
                  </td>
                </tr>
              ))}
              {!loading && cob.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhuma programação no período. Programe semanas em <strong>Programação Semanal</strong>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
