"use client"

import { useState } from "react"
import { DollarSign, Plus, Trash2, TrendingDown, Package, Wrench, Users, MoreHorizontal, FileSpreadsheet, FileText } from "lucide-react"

type Custo = {
  id: string; data: string; mes: string; tipo: string; descricao: string
  valor: number; armazemId: string | null; armazemNome: string | null; criadoPorNome: string | null
}
type Armazem = { id: string; nome: string; codigo: string }

const TIPOS = [
  { value: "MAO_OBRA",   label: "Mão de Obra",  icon: Users,        cor: "blue" },
  { value: "EQUIPAMENTO",label: "Equipamento",   icon: Wrench,       cor: "orange" },
  { value: "INSUMO",     label: "Insumo",        icon: Package,      cor: "green" },
  { value: "MANUTENCAO", label: "Manutenção",    icon: TrendingDown, cor: "red" },
  { value: "OUTROS",     label: "Outros",        icon: MoreHorizontal, cor: "gray" },
]

const inp = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
const corMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700", orange: "bg-orange-100 text-orange-700",
  green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-700", gray: "bg-gray-100 text-gray-600",
}

export default function CustosClient({
  custos: inicial, armazens, custosPorMes, mesAtual,
}: {
  custos: Custo[]; armazens: Armazem[]
  custosPorMes: Record<string, number>; mesAtual: string
}) {
  const [custos, setCustos]   = useState(inicial)
  const [mesFiltro, setMes]   = useState(mesAtual)
  const [tipoFiltro, setTipo] = useState("TODOS")
  const [showForm, setForm]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setF] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "MAO_OBRA", descricao: "", valor: "", armazemId: "",
  })

  const filtrados = custos.filter(c =>
    (mesFiltro === "TODOS" || c.mes === mesFiltro) &&
    (tipoFiltro === "TODOS" || c.tipo === tipoFiltro)
  )

  const totalFiltrado = filtrados.reduce((s, c) => s + c.valor, 0)
  const porTipo = TIPOS.map(t => ({
    ...t,
    total: filtrados.filter(c => c.tipo === t.value).reduce((s, c) => s + c.valor, 0),
  }))

  // Meses disponíveis
  const meses = ["TODOS", ...Array.from(new Set(custos.map(c => c.mes))).sort().reverse()]

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/custos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valor: Number(form.valor) }),
    })
    if (res.ok) {
      const novo = await res.json()
      setCustos(prev => [{ ...novo, armazemNome: armazens.find(a => a.id === novo.armazemId)?.nome ?? null }, ...prev])
      setF({ data: form.data, tipo: "MAO_OBRA", descricao: "", valor: "", armazemId: "" })
      setForm(false)
    }
    setSaving(false)
  }

  async function remover(id: string) {
    if (!confirm("Remover este custo?")) return
    await fetch(`/api/custos/${id}`, { method: "DELETE" })
    setCustos(prev => prev.filter(c => c.id !== id))
  }

  // rótulo legível do período/tipo (p/ nome de arquivo e cabeçalho)
  const tipoLabel = (v: string) => TIPOS.find(t => t.value === v)?.label ?? v
  const periodoLabel = mesFiltro === "TODOS"
    ? "Todos os meses"
    : new Date(mesFiltro + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  // Excel — exporta a lista JÁ FILTRADA na tela (xlsx no client)
  async function exportarExcel() {
    if (filtrados.length === 0) return
    const XLSX = await import("xlsx")
    const linhas = filtrados.map(c => ({
      "Data": new Date(c.data).toLocaleDateString("pt-BR"),
      "Tipo": tipoLabel(c.tipo),
      "Descrição": c.descricao,
      "Armazém": c.armazemNome ?? "Geral",
      "Valor (R$)": c.valor,
    }))
    const ws = XLSX.utils.json_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    const aba = periodoLabel.replace(/[\\/:?*[\]]/g, "-").slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, aba)
    const sufixo = mesFiltro === "TODOS" ? new Date().toISOString().slice(0, 10) : mesFiltro
    XLSX.writeFile(wb, `custos_${sufixo}.xlsx`)
  }

  // PDF — abre janela, escreve HTML e imprime (padrão do projeto)
  function exportarPDF() {
    if (filtrados.length === 0) return
    const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))
    const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    const linhas = filtrados.map(c => `<tr><td>${esc(new Date(c.data).toLocaleDateString("pt-BR"))}</td><td>${esc(tipoLabel(c.tipo))}</td><td>${esc(c.descricao)}</td><td>${esc(c.armazemNome ?? "Geral")}</td><td style="text-align:right">${brl(c.valor)}</td></tr>`).join("")
    const total = filtrados.reduce((s, c) => s + c.valor, 0)
    const tituloTipo = tipoFiltro === "TODOS" ? "" : ` — ${esc(tipoLabel(tipoFiltro))}`
    const html = `<html><head><meta charset="utf-8"><title>Custo Operacional</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:18px;color:#111}h1{font-size:16px;margin:0}p{color:#555;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}tfoot td{font-weight:bold;background:#fafafa}</style></head><body><h1>Custo Operacional — ${esc(periodoLabel)}${tituloTipo}</h1><p>${filtrados.length} lançamento(s) &middot; ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Data</th><th>Tipo</th><th>Descri&ccedil;&atilde;o</th><th>Armaz&eacute;m</th><th style="text-align:right">Valor</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="4">Total</td><td style="text-align:right">${brl(total)}</td></tr></tfoot></table></body></html>`
    const w = window.open("", "_blank")
    if (!w) { alert("Permita pop-ups para exportar em PDF."); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign size={22} className="text-yellow-600" /> Custo Operacional
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Custo/tonelada · Controle de despesas operacionais</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportarExcel} disabled={filtrados.length === 0}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition" title="Exportar para Excel">
            <FileSpreadsheet size={15} className="text-green-600" /> Excel
          </button>
          <button onClick={exportarPDF} disabled={filtrados.length === 0}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition" title="Exportar para PDF (impressão)">
            <FileText size={15} className="text-red-600" /> PDF
          </button>
          <button onClick={() => setForm(v => !v)}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Lançar Custo
          </button>
        </div>
      </div>

      {/* Breakdown por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {porTipo.map(t => {
          const Icon = t.icon
          return (
            <button key={t.value} onClick={() => setTipo(tipoFiltro === t.value ? "TODOS" : t.value)}
              className={`bg-white rounded-xl border p-4 text-left transition hover:shadow-md ${tipoFiltro === t.value ? "border-blue-400 shadow-md shadow-blue-50" : "border-gray-100 shadow-sm"}`}>
              <div className={`inline-flex p-2 rounded-lg mb-2 ${corMap[t.cor]}`}><Icon size={15} /></div>
              <p className="text-xs text-gray-500">{t.label}</p>
              <p className="text-lg font-bold text-gray-800">
                R$ {t.total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-400">{totalFiltrado > 0 ? ((t.total / totalFiltrado) * 100).toFixed(0) : 0}% do total</p>
            </button>
          )
        })}
      </div>

      {/* Total do período */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-yellow-100 text-sm">Total do período selecionado</p>
            <p className="text-3xl font-bold mt-1">R$ {totalFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-yellow-100 text-sm">{filtrados.length} lançamentos</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2"><DollarSign size={15} />Novo Lançamento</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Data *</label>
              <input type="date" value={form.data} onChange={e => setF(f => ({ ...f, data: e.target.value }))} required className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setF(f => ({ ...f, tipo: e.target.value }))} className={inp}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" value={form.valor}
                onChange={e => setF(f => ({ ...f, valor: e.target.value }))} required placeholder="0,00" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição *</label>
              <input value={form.descricao} onChange={e => setF(f => ({ ...f, descricao: e.target.value }))}
                required placeholder="Ex: Folha de pagamento operadores" className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Armazém</label>
              <select value={form.armazemId} onChange={e => setF(f => ({ ...f, armazemId: e.target.value }))} className={inp}>
                <option value="">Geral</option>
                {armazens.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50">
                {saving ? "Salvando…" : "Lançar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={mesFiltro} onChange={e => setMes(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          {meses.map(m => <option key={m} value={m}>{m === "TODOS" ? "Todos os meses" : new Date(m + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtrados.length} registros</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Armazém</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Nenhum lançamento encontrado.</td></tr>
            )}
            {filtrados.map(c => {
              const tipo = TIPOS.find(t => t.value === c.tipo)
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    {tipo && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${corMap[tipo.cor]}`}>{tipo.label}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.descricao}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{c.armazemNome ?? "Geral"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remover(c.id)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
