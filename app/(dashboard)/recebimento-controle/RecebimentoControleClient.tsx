"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Download, Plus, Pencil, Trash2, X, Save, Table2, BarChart3, Upload, Ship, Target, CheckCircle2, TrendingDown,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
const dt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

type Item = {
  id: string; data: string | null; ano: number; mes: number; semana: number | null
  unidade: string | null; status: string | null; cliente: string; produtoAbreviado: string
  tipoProduto: string | null; navio: string | null; origem: string | null
  volumeProgramado: number; cancelado: number; adicionado: number; obs: string | null
  confirmado: number; realizado: number; saldo: number
}
type Grupo = { nome: string; confirmado: number; realizado: number; saldo: number }
type Dados = {
  ano: number; mes: number; itens: Item[]
  painel: { cotas: { confirmado: number; realizado: number; saldo: number }; porCliente: Grupo[]; porProduto: Grupo[]; porTipo: Grupo[]; realizadoDia: { dia: string; valor: number }[] }
  opcoes: { anos: number[]; unidades: string[]; tiposProduto: string[]; clientes: string[] }
}
const VAZIO = { data: "", unidade: "ROO", status: "PREVISTO", cliente: "", produtoAbreviado: "", tipoProduto: "GRANEL", navio: "", origem: "", volumeProgramado: "", cancelado: "", adicionado: "", obs: "" }

export default function RecebimentoControleClient({ anoAtual, mesAtual }: { anoAtual: number; mesAtual: number }) {
  const [ano, setAno] = useState(anoAtual)
  const [mes, setMes] = useState(mesAtual)
  const [unidade, setUnidade] = useState("")
  const [tipoProduto, setTipoProduto] = useState("")
  const [cliente, setCliente] = useState("")
  const [d, setD] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"tabela" | "painel">("tabela")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [aviso, setAviso] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ ano: String(ano), mes: String(mes) })
    if (unidade) qs.set("unidade", unidade)
    if (tipoProduto) qs.set("tipoProduto", tipoProduto)
    if (cliente) qs.set("cliente", cliente)
    const r = await fetch("/api/recebimento-controle?" + qs.toString())
    setD(await r.json())
    setLoading(false)
  }, [ano, mes, unidade, tipoProduto, cliente])
  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() { setForm({ ...VAZIO }); setEditId(null) }
  function abrirEdit(it: Item) {
    setForm({
      data: it.data ? it.data.slice(0, 10) : "", unidade: it.unidade ?? "ROO", status: it.status ?? "PREVISTO",
      cliente: it.cliente, produtoAbreviado: it.produtoAbreviado, tipoProduto: it.tipoProduto ?? "", navio: it.navio ?? "",
      origem: it.origem ?? "", volumeProgramado: String(it.volumeProgramado || ""), cancelado: String(it.cancelado || ""),
      adicionado: String(it.adicionado || ""), obs: it.obs ?? "",
    })
    setEditId(it.id)
  }

  async function salvar() {
    if (!form.cliente.trim() || !form.produtoAbreviado.trim()) { setAviso("Informe cliente e produto."); return }
    setSalvando(true)
    const url = editId ? `/api/recebimento-controle/${editId}` : "/api/recebimento-controle"
    const body = editId ? form : { ...form, ano, mes }
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSalvando(false)
    if (r.ok) { setForm(null); await carregar() } else setAviso("Erro ao salvar.")
  }

  async function excluir(it: Item) {
    if (!confirm(`Excluir ${it.cliente} — ${it.produtoAbreviado}?`)) return
    await fetch(`/api/recebimento-controle/${it.id}`, { method: "DELETE" })
    await carregar()
  }

  async function importarMarcacao(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImportando(true); setAviso("")
    const fd = new FormData(); fd.append("file", file)
    try {
      const r = await fetch("/api/marcacoes/importar", { method: "POST", body: fd })
      const j = await r.json()
      if (r.ok) { setAviso(`✅ Marcação importada (${j.criados ?? j.criadas ?? "ok"}). Realizado atualizado.`); await carregar() }
      else setAviso(`❌ ${j.error ?? "Falha ao importar marcação."}`)
    } catch { setAviso("❌ Erro de rede.") }
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const itens = d?.itens ?? []
  const cotas = d?.painel.cotas ?? { confirmado: 0, realizado: 0, saldo: 0 }
  const pct = cotas.confirmado > 0 ? Math.round((cotas.realizado / cotas.confirmado) * 100) : 0

  return (
    <div className="p-6 max-w-[1700px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center"><Download className="text-orange-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Controle de Recebimento</h1>
            <p className="text-sm text-gray-500">Programação mensal de descarga · Realizado vem da Marcação (CHECKOUT), igual à Programação</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importarMarcacao} />
          <button onClick={() => fileRef.current?.click()} disabled={importando} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"><Upload size={15} /> {importando ? "Importando…" : "Importar Marcação"}</button>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"><Plus size={16} /> Adicionar</button>
        </div>
      </div>

      {aviso && <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700"><span className="flex-1">{aviso}</span><button onClick={() => setAviso("")}><X size={15} /></button></div>}

      {/* Filtros + view */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <select value={ano} onChange={e => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[...new Set([anoAtual, ...(d?.opcoes.anos ?? [])])].sort((a, b) => b - a).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="border border-blue-300 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={unidade} onChange={e => setUnidade(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas unidades</option>
          {(d?.opcoes.unidades ?? []).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={tipoProduto} onChange={e => setTipoProduto(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          {(d?.opcoes.tiposProduto ?? []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={cliente} onChange={e => setCliente(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]">
          <option value="">Todos os clientes</option>
          {(d?.opcoes.clientes ?? []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex bg-gray-100 p-1 rounded-lg gap-1">
          <button onClick={() => setView("tabela")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "tabela" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}><Table2 size={13} /> Tabela</button>
          <button onClick={() => setView("painel")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "painel" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}><BarChart3 size={13} /> Painel</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi icon={<Target size={14} />} cor="text-blue-700" label="Confirmado (cotas)" v={`${fmt(cotas.confirmado)} t`} />
        <Kpi icon={<CheckCircle2 size={14} />} cor="text-green-700" label="Realizado" v={`${fmt(cotas.realizado)} t · ${pct}%`} />
        <Kpi icon={<TrendingDown size={14} />} cor="text-amber-700" label="Saldo a receber" v={`${fmt(cotas.saldo)} t`} />
        <Kpi icon={<Ship size={14} />} cor="text-gray-700" label="Registros no mês" v={String(itens.length)} />
      </div>

      {view === "painel" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card titulo="Cotas por Cliente"><GrupoChart data={d?.painel.porCliente ?? []} /></Card>
          <Card titulo="Saldo por Produto"><GrupoChart data={d?.painel.porProduto ?? []} /></Card>
          <Card titulo="Tipo de Produto"><GrupoChart data={d?.painel.porTipo ?? []} /></Card>
          <Card titulo="Realizado por Dia">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(d?.painel.realizadoDia ?? []).map(x => ({ nome: x.dia.slice(8) + "/" + x.dia.slice(5, 7), valor: Math.round(x.valor) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="nome" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v)) + " t"} /><Bar dataKey="valor" name="Realizado" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                <tr>
                  {["Data", "Sem", "Unid", "Status", "Cliente", "Produto", "Tipo", "Navio", "Origem", "Prog.", "Canc.", "Adic.", "Confirm.", "Realiz.", "Saldo", "Obs", ""].map((h, i) => (
                    <th key={i} className={`px-2 py-2.5 font-semibold ${["Prog.", "Canc.", "Adic.", "Confirm.", "Realiz.", "Saldo"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itens.map(it => (
                  <tr key={it.id} className="hover:bg-orange-50/30">
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{dt(it.data)}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{it.semana ?? "—"}</td>
                    <td className="px-2 py-1.5 text-gray-600">{it.unidade}</td>
                    <td className="px-2 py-1.5"><span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{it.status}</span></td>
                    <td className="px-2 py-1.5 font-medium text-gray-800 max-w-[120px] truncate" title={it.cliente}>{it.cliente}</td>
                    <td className="px-2 py-1.5 text-gray-700 max-w-[130px] truncate" title={it.produtoAbreviado}>{it.produtoAbreviado}</td>
                    <td className="px-2 py-1.5 text-gray-500">{it.tipoProduto || "—"}</td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-[100px] truncate" title={it.navio ?? ""}>{it.navio || "—"}</td>
                    <td className="px-2 py-1.5 text-gray-500">{it.origem || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{fmt(it.volumeProgramado)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-red-500">{it.cancelado ? fmt(it.cancelado) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-green-600">{it.adicionado ? fmt(it.adicionado) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-blue-700">{fmt(it.confirmado)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-green-700">{it.realizado ? fmt(it.realizado) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-bold text-gray-800">{fmt(it.saldo)}</td>
                    <td className="px-2 py-1.5 text-gray-400 max-w-[90px] truncate" title={it.obs ?? ""}>{it.obs || ""}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEdit(it)} className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={13} /></button>
                        <button onClick={() => excluir(it)} className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && itens.length === 0 && (
                  <tr><td colSpan={17} className="text-center py-12 text-gray-400">Nenhum recebimento em {MESES[mes - 1]}/{ano}. Clique em <strong>Adicionar</strong>.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal add/edit */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">{editId ? "Editar recebimento" : "Novo recebimento"}</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Campo l="Data"><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className={inp} /></Campo>
              <Campo l="Unidade"><input value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} className={inp} /></Campo>
              <Campo l="Status"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inp}><option>PREVISTO</option><option>CONFIRMADO</option><option>REALIZADO</option><option>CANCELADO</option></select></Campo>
              <Campo l="Cliente *" span><input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={inp} /></Campo>
              <Campo l="Tipo"><select value={form.tipoProduto} onChange={e => setForm({ ...form, tipoProduto: e.target.value })} className={inp}><option value="GRANEL">Granel</option><option value="EMBALADO">Embalado</option><option value="">—</option></select></Campo>
              <Campo l="Produto abreviado *" span><input value={form.produtoAbreviado} onChange={e => setForm({ ...form, produtoAbreviado: e.target.value })} className={inp} placeholder="ex: UREIA 46" /></Campo>
              <Campo l="Navio"><input value={form.navio} onChange={e => setForm({ ...form, navio: e.target.value })} className={inp} /></Campo>
              <Campo l="Origem"><input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} className={inp} placeholder="ex: Onno" /></Campo>
              <Campo l="Vol. programado"><input type="number" value={form.volumeProgramado} onChange={e => setForm({ ...form, volumeProgramado: e.target.value })} className={inp} /></Campo>
              <Campo l="Cancelado"><input type="number" value={form.cancelado} onChange={e => setForm({ ...form, cancelado: e.target.value })} className={inp} /></Campo>
              <Campo l="Adicionado"><input type="number" value={form.adicionado} onChange={e => setForm({ ...form, adicionado: e.target.value })} className={inp} /></Campo>
              <Campo l="Observação" span><input value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} className={inp} /></Campo>
            </div>
            {/* Preview ao vivo do Confirmado (= Programado + Adicionado − Cancelado) */}
            <div className="mx-5 mb-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm">
              <span className="text-gray-600 text-xs">Confirmado = Programado + Adicionado − Cancelado</span>
              <span className="font-bold text-blue-700">
                {fmt(Number(form.volumeProgramado) || 0)} + {fmt(Number(form.adicionado) || 0)} − {fmt(Number(form.cancelado) || 0)} = {fmt((Number(form.volumeProgramado) || 0) + (Number(form.adicionado) || 0) - (Number(form.cancelado) || 0))} t
              </span>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ icon, cor, label, v }: { icon: React.ReactNode; cor: string; label: string; v: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">{icon} {label}</div>
      <p className={`text-2xl font-bold ${cor}`}>{v}</p>
    </div>
  )
}
function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><h3 className="text-sm font-bold text-gray-700 mb-3">{titulo}</h3>{children}</div>
}
function GrupoChart({ data }: { data: Grupo[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.map(g => ({ nome: g.nome, Confirmado: Math.round(g.confirmado), Realizado: Math.round(g.realizado), Saldo: Math.round(g.saldo) }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="nome" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => fmt(Number(v)) + " t"} /><Legend />
        <Bar dataKey="Confirmado" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Realizado" fill="#f97316" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Saldo" fill="#22c55e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
function Campo({ l, span, children }: { l: string; span?: boolean; children: React.ReactNode }) {
  return <div className={span ? "col-span-2 sm:col-span-3" : ""}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>{children}</div>
}
