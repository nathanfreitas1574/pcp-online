"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Database, Upload, Search, ArrowDownToLine, ArrowUpFromLine, Boxes,
  CheckCircle2, AlertTriangle, X, Scale, Table2, ArrowLeftRight,
} from "lucide-react"
import DrillBarChart from "@/components/DrillBarChart"
import DeParaProdutos from "./DeParaProdutos"
import DashboardContabil from "./DashboardContabil"

type Item = {
  id: string; filial: string | null; produto: string | null; descricao: string | null
  armazem: string | null; razaoSocial: string | null; docOriginal: string; serieDoc: string | null
  dtEmissao: string | null; quantidade: number; tes: string | null; sentido: string | null
}
type Props = {
  clientes: string[]
  armazens: string[]
  totalGeral: { count: number; quantidade: number }
  porSentido: { sentido: string; count: number; quantidade: number }[]
  importadoEm: string | null
  produtosVistoria: string[]
  coberturaPendente: { volume: number; count: number }
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const fmtInt = (n: number) => n.toLocaleString("pt-BR")
const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const ARM_NOME: Record<string, string> = { "10": "Produto", "20": "Aditivo", "30": "Insumos" }
const armLabel = (a: string) => ARM_NOME[a] ? `${a} · ${ARM_NOME[a]}` : `Armazém ${a}`

export default function EstoqueContabilClient({ clientes, armazens, totalGeral, porSentido, importadoEm, produtosVistoria, coberturaPendente }: Props) {
  const [view, setView] = useState<"estoque" | "depara" | "dashboard">("estoque")
  const [itens, setItens] = useState<Item[]>([])
  const [totalFiltrado, setTotalFiltrado] = useState({ count: 0, quantidade: 0, saldo: 0 })
  const [loading, setLoading] = useState(false)
  const [importadoEmState, setImportadoEm] = useState(importadoEm)
  const fileRef = useRef<HTMLInputElement>(null)

  const [busca, setBusca] = useState("")
  const [cliente, setCliente] = useState("")
  const [armazem, setArmazem] = useState("")
  const [produto, setProduto] = useState("")
  const [sentido, setSentido] = useState("")
  const [dataIni, setDataIni] = useState("")
  const [dataFim, setDataFim] = useState("")

  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (busca)   qs.set("busca", busca)
    if (cliente) qs.set("cliente", cliente)
    if (armazem) qs.set("armazem", armazem)
    if (produto) qs.set("produto", produto)
    if (sentido) qs.set("sentido", sentido)
    if (dataIni) qs.set("dataInicio", dataIni)
    if (dataFim) qs.set("dataFim", dataFim)
    const r = await fetch("/api/estoque-contabil?" + qs.toString())
    const d = await r.json()
    setItens(d.itens ?? [])
    setTotalFiltrado(d.totalFiltrado ?? { count: 0, quantidade: 0, saldo: 0 })
    if (d.importadoEm) setImportadoEm(d.importadoEm)
    setLoading(false)
  }, [busca, cliente, armazem, produto, sentido, dataIni, dataFim])

  useEffect(() => { carregar() }, [carregar])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const r = await fetch("/api/estoque-contabil/importar", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) {
        setMsg({ tipo: "ok", texto: `${fmtInt(d.total)} registros importados (snapshot atualizado).` })
        await carregar()
      } else {
        setMsg({ tipo: "erro", texto: d.error ?? "Falha na importação." })
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de rede ao importar." })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function limpar() { setBusca(""); setCliente(""); setArmazem(""); setProduto(""); setSentido(""); setDataIni(""); setDataFim("") }

  const entrada = porSentido.find(s => s.sentido === "ENTRADA")
  const saida   = porSentido.find(s => s.sentido === "SAIDA")

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database className="text-blue-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Estoque Contábil</h1>
            <p className="text-sm text-gray-500">
              Materiais em poder de terceiros (TOTVS)
              {importadoEmState ? ` · atualizado em ${new Date(importadoEmState).toLocaleString("pt-BR")}` : " · nenhuma importação ainda"}
            </p>
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow-sm">
            <Upload size={16} />
            {importing ? "Importando…" : "Importar Excel"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${msg.tipo === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.tipo === "ok" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          <p className="flex-1 font-medium">{msg.texto}</p>
          <button onClick={() => setMsg(null)}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Toggle Estoque / De-Para */}
      <div className="flex bg-gray-100 p-1 rounded-lg gap-1 w-fit mb-4">
        <button onClick={() => setView("estoque")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "estoque" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
          <Table2 size={13} /> Estoque
        </button>
        <button onClick={() => setView("depara")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "depara" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
          <ArrowLeftRight size={13} /> De-Para Produtos
        </button>
        <button onClick={() => setView("dashboard")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${view === "dashboard" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
          <Scale size={13} /> Dashboard
        </button>
      </div>

      {view === "depara" && <DeParaProdutos produtosVistoria={produtosVistoria} />}
      {view === "dashboard" && <DashboardContabil />}

      {view === "estoque" && (<>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Boxes size={14}/> Registros</div>
          <p className="text-2xl font-bold text-gray-800">{fmtInt(totalGeral.count)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Scale size={14}/> Quantidade total</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totalGeral.quantidade)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><ArrowDownToLine size={14}/> Entradas (R)</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(entrada?.quantidade ?? 0)} <span className="text-sm font-medium text-gray-400">· {fmtInt(entrada?.count ?? 0)}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><ArrowUpFromLine size={14}/> Saídas (D)</div>
          <p className="text-2xl font-bold text-gray-800">{fmt(saida?.quantidade ?? 0)} <span className="text-sm font-medium text-gray-400">· {fmtInt(saida?.count ?? 0)}</span></p>
        </div>
      </div>

      {/* Saldo pendente de cobertura */}
      {coberturaPendente.volume > 0 && (
        <a href="/coberturas" className="flex items-center gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100/60 transition">
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{coberturaPendente.volume.toLocaleString("pt-BR")} t pendentes de cobertura</p>
            <p className="text-xs text-amber-700">{coberturaPendente.count} romaneio(s) descarregado(s) sem NF para entrar no contábil — ainda não refletido no saldo acima</p>
          </div>
          <span className="text-amber-600 text-sm">Gerenciar →</span>
        </a>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar NF, cliente, produto…"
              className={inp + " pl-9"} onKeyDown={e => e.key === "Enter" && carregar()} />
          </div>
          <select value={cliente} onChange={e => setCliente(e.target.value)} className={inp}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={armazem} onChange={e => setArmazem(e.target.value)} className={inp}>
            <option value="">Todos os armazéns</option>
            {armazens.map(a => <option key={a} value={a}>{armLabel(a)}</option>)}
          </select>
          <select value={sentido} onChange={e => setSentido(e.target.value)} className={inp}>
            <option value="">Entradas e saídas</option>
            <option value="ENTRADA">Entrada (R)</option>
            <option value="SAIDA">Saída (D)</option>
          </select>
          <input value={produto} onChange={e => setProduto(e.target.value)} placeholder="Produto contém…"
            className={inp} onKeyDown={e => e.key === "Enter" && carregar()} />
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Movimentação — de</label>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className={inp + " py-1.5"} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inp + " py-1.5"} />
          </div>
        </div>
        {/* Chips rápidos de armazém (tipo) */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          <span className="text-xs text-gray-400 self-center mr-1">Tipo:</span>
          {[["", "Todos"], ["10", "Produto"], ["20", "Aditivo"], ["30", "Insumos"]].map(([v, l]) => (
            <button key={v} onClick={() => { setArmazem(v) }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${armazem === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={carregar} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Aplicar filtros</button>
          <button onClick={limpar} className="text-gray-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Limpar</button>
          <div className="ml-auto self-center text-sm text-gray-500">
            {loading ? "Carregando…" : <>
              {fmtInt(totalFiltrado.count)} registros · {fmt(totalFiltrado.quantidade)} qtd ·
              <span className="text-blue-700 font-semibold"> saldo {fmt(totalFiltrado.saldo)}</span>
            </>}
          </div>
        </div>
      </div>

      {/* Gráfico drill-down (top 500 carregados) */}
      {itens.length > 0 && (
        <div className="mb-4">
          <DrillBarChart
            titulo="Quantidade por armazém — clique para detalhar (top 500 itens carregados)"
            dados={itens}
            niveis={[
              { campo: "armazem", titulo: "Armazém" },
              { campo: "razaoSocial", titulo: "Cliente" },
              { campo: "descricao", titulo: "Produto" },
            ]}
            medidas={[{ campo: "quantidade", nome: "Quantidade", cor: "#3b82f6" }]}
          />
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">NF</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Produto</th>
                <th className="text-left px-3 py-2.5 font-semibold">Armaz.</th>
                <th className="text-left px-3 py-2.5 font-semibold">TES</th>
                <th className="text-left px-3 py-2.5 font-semibold">Sentido</th>
                <th className="text-right px-3 py-2.5 font-semibold">Qtd.</th>
                <th className="text-left px-3 py-2.5 font-semibold">Emissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map(it => (
                <tr key={it.id} className="hover:bg-blue-50/40">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{it.docOriginal}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={it.razaoSocial ?? ""}>{it.razaoSocial ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[240px] truncate" title={it.descricao ?? ""}>{it.descricao ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{it.armazem ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{it.tes ?? "—"}</td>
                  <td className="px-3 py-2">
                    {it.sentido === "ENTRADA"
                      ? <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">Entrada</span>
                      : it.sentido === "SAIDA"
                        ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Saída</span>
                        : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800 tabular-nums">{fmt(it.quantidade)}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{it.dtEmissao ? new Date(it.dtEmissao).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
              {!loading && itens.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  Nenhum registro. Use <strong>Importar Excel</strong> para subir a planilha de Materiais De/Em Terceiros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {itens.length === 500 && (
          <p className="text-[11px] text-gray-400 px-3 py-2 border-t border-gray-100">Mostrando os 500 maiores por quantidade. Use os filtros para refinar.</p>
        )}
      </div>
      </>)}
    </div>
  )
}
