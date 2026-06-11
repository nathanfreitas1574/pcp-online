"use client"

import { useState, useCallback } from "react"
import { Search, FileText, Upload, X, Package, Users, BarChart3, RefreshCw, Plus, Pencil, Save, Trash2 } from "lucide-react"
import DrillBarChart from "@/components/DrillBarChart"

const VAZIO: Partial<Contrato> = {
  filial: "", numero: "", descricao: "", clienteNome: "", desProduto: "", codProduto: "",
  descTabela: "", tipoMercado: "", qtdContratada: 0, safra: "", dataCtr: null,
  stsAssinatura: "Aberto", stsFiscal: "Aberto", stsFinanceiro: "Aberto", stsEstoque: "Aberto",
  modalidade: "", centroCusto: "",
}

type Contrato = {
  id: string
  filial: string
  numero: string
  descricao: string
  tipoMercado: string | null
  dataCtr: string | null
  clienteNome: string
  codProduto: string | null
  desProduto: string
  descTabela: string | null
  qtdContratada: number
  safra: string | null
  stsAssinatura: string
  stsFiscal: string
  stsFinanceiro: string
  stsEstoque: string
  modalidade: string | null
  centroCusto: string | null
  ativo: boolean
}

type TotalTabela = { descTabela: string; count: number; totalQtd: number }

const TABELA_COR: Record<string, string> = {
  GENERICA:        "bg-blue-100 text-blue-700",
  "PRODUTO ACABADO":"bg-green-100 text-green-700",
  EMBALAGEM:       "bg-amber-100 text-amber-700",
  LACRE:           "bg-purple-100 text-purple-700",
}

function sts(val: string) {
  return val === "Aberto"
    ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Aberto</span>
    : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{val}</span>
}

export default function ContratosClient({
  safras, clientes, tabelas, totaisGeral,
}: {
  safras: string[]
  clientes: string[]
  tabelas: string[]
  totaisGeral: TotalTabela[]
}) {
  const [busca,      setBusca]      = useState("")
  const [clienteSel, setClienteSel] = useState("")
  const [safraSel,   setSafraSel]   = useState(safras[0] ?? "")
  const [tabelaSel,  setTabelaSel]  = useState("")
  const [dataIni,    setDataIni]    = useState("")
  const [dataFim,    setDataFim]    = useState("")
  const [contratos,  setContratos]  = useState<Contrato[]>([])
  const [loading,    setLoading]    = useState(false)
  const [buscado,    setBuscado]    = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [importMsg,  setImportMsg]  = useState("")
  // modal criar/editar
  const [editando,   setEditando]   = useState<Partial<Contrato> | null>(null)
  const [salvando,   setSalvando]   = useState(false)
  const [erroForm,   setErroForm]   = useState("")

  // KPIs globais com base nos totaisGeral
  const totalContratos = totaisGeral.reduce((s, t) => s + t.count, 0)
  const totalFertiliz  = totaisGeral.find(t => t.descTabela === "GENERICA")?.totalQtd ?? 0
  const totalEmbalag   = totaisGeral.find(t => t.descTabela === "EMBALAGEM")?.totalQtd ?? 0
  const totalProdAcab  = totaisGeral.find(t => t.descTabela === "PRODUTO ACABADO")?.totalQtd ?? 0

  const buscar = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (busca)      p.set("busca",   busca)
    if (clienteSel) p.set("cliente", clienteSel)
    if (safraSel)   p.set("safra",   safraSel)
    if (tabelaSel)  p.set("tabela",  tabelaSel)
    if (dataIni)    p.set("dataInicio", dataIni)
    if (dataFim)    p.set("dataFim",    dataFim)

    const res  = await fetch(`/api/contratos?${p}`)
    const data = await res.json()
    setContratos(data.contratos ?? [])
    setBuscado(true)
    setLoading(false)
  }, [busca, clienteSel, safraSel, tabelaSel, dataIni, dataFim])

  // criar/editar
  async function salvarContrato() {
    if (!editando) return
    if (!editando.numero?.toString().trim()) { setErroForm("Informe o número do contrato."); return }
    setSalvando(true); setErroForm("")
    const isEdit = !!editando.id
    const url = isEdit ? `/api/contratos/${editando.id}` : "/api/contratos"
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando),
    })
    setSalvando(false)
    if (res.ok) {
      setEditando(null)
      if (buscado) await buscar()
    } else {
      const d = await res.json().catch(() => ({}))
      setErroForm(d.error ?? "Erro ao salvar.")
    }
  }

  async function excluirContrato(c: Contrato) {
    if (!confirm(`Desativar o contrato ${c.numero} (${c.clienteNome})?`)) return
    const res = await fetch(`/api/contratos/${c.id}`, { method: "DELETE" })
    if (res.ok) setContratos(prev => prev.filter(x => x.id !== c.id))
  }

  async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg("")

    try {
      // Lê o Excel via FileReader e envia para a rota de importação
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/contratos/importar", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        const ign = data.colunasIgnoradas?.length ? ` · ignoradas: ${data.colunasIgnoradas.length} col.` : ""
        setImportMsg(`✅ ${data.criados} criados, ${data.atualizados} atualizados (${data.camposReconhecidos?.length ?? 0} campos reconhecidos${ign})`)
        await buscar()
      } else {
        setImportMsg(`❌ Erro: ${data.error}`)
      }
    } catch {
      setImportMsg("❌ Erro ao importar arquivo")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  // Resumo por cliente (dos contratos carregados)
  const porCliente: Record<string, { count: number; qtd: number }> = {}
  for (const c of contratos) {
    const k = c.clienteNome
    porCliente[k] = porCliente[k] ?? { count: 0, qtd: 0 }
    porCliente[k].count++
    porCliente[k].qtd += c.qtdContratada
  }
  const clientesOrdenados = Object.entries(porCliente).sort((a,b) => b[1].qtd - a[1].qtd)
  const qtdTotalBusca = contratos.reduce((s, c) => s + c.qtdContratada, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={22} className="text-blue-600" />
            Contratos de Armazenagem
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Contratos do TOTVS — armazenagem de fertilizantes, embalagens e lacres</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditando({ ...VAZIO }); setErroForm("") }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition">
            <Plus size={15} /> Novo Contrato
          </button>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
            importing ? "bg-gray-200 text-gray-500" : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}>
            <Upload size={15} />
            {importing ? "Importando…" : "Importar Excel"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importarExcel} disabled={importing} />
          </label>
        </div>
      </div>

      {importMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${importMsg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {importMsg}
        </div>
      )}

      {/* KPIs globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total contratos", value: totalContratos.toLocaleString("pt-BR"), sub: "na base",         icon: FileText, color: "blue" },
          { label: "Fertilizantes",   value: `${(totalFertiliz/1000).toFixed(0)} mil ton`, sub: "GENERICA", icon: Package, color: "green" },
          { label: "Embalagens",      value: totalEmbalag.toLocaleString("pt-BR"),  sub: "unidades (BB/sacas)", icon: BarChart3, color: "amber" },
          { label: "Prod. Acabado",   value: `${(totalProdAcab/1000).toFixed(0)} mil ton`, sub: "PRODUTO ACABADO", icon: Users, color: "purple" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 shrink-0`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Search size={14} className="text-gray-400" /> Filtros
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <input placeholder="Buscar por nº, descrição, cliente ou produto…"
              value={busca} onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <select value={safraSel} onChange={e => setSafraSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas as safras</option>
              {safras.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <select value={clienteSel} onChange={e => setClienteSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os clientes</option>
              {clientes.map(c => <option key={c} value={c}>{c.length > 30 ? c.slice(0,30)+"…" : c}</option>)}
            </select>
          </div>
          <div>
            <select value={tabelaSel} onChange={e => setTabelaSel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os tipos</option>
              {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Data do contrato — de</label>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={buscar} disabled={loading}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-60">
            <Search size={14} />
            {loading ? "Buscando…" : "Buscar"}
          </button>
          {buscado && (
            <button onClick={() => { setContratos([]); setBuscado(false); setBusca(""); setClienteSel(""); setTabelaSel(""); setDataIni(""); setDataFim("") }}
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
              <X size={14} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Gráfico drill-down: Tipo → Cliente → Produto */}
      {buscado && contratos.length > 0 && (
        <DrillBarChart
          titulo="Quantidade contratada — clique para detalhar"
          dados={contratos}
          niveis={[
            { campo: "descTabela", titulo: "Tipo" },
            { campo: "clienteNome", titulo: "Cliente" },
            { campo: "desProduto", titulo: "Produto" },
          ]}
          medidas={[{ campo: "qtdContratada", nome: "Qtd. contratada", cor: "#3b82f6" }]}
        />
      )}

      {/* Resultados */}
      {buscado && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Tabela principal */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                {contratos.length} contrato{contratos.length !== 1 ? "s" : ""}
                {tabelaSel === "GENERICA" && <span className="ml-2 text-gray-500">· {(qtdTotalBusca/1000).toFixed(1)} mil ton</span>}
                {tabelaSel !== "GENERICA" && qtdTotalBusca > 0 && <span className="ml-2 text-gray-500">· {qtdTotalBusca.toLocaleString("pt-BR")} und</span>}
              </p>
              <RefreshCw size={14} className="text-gray-400 cursor-pointer hover:text-blue-600" onClick={buscar} />
            </div>
            {contratos.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhum contrato encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Nº</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Cliente</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Produto</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Tipo</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Qtd Contrat.</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Data</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Safra</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sts.Assin</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sts.Estoq</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contratos.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-700">{c.numero}</span>
                          {c.filial && (
                            <span className="ml-1.5 text-[10px] text-gray-400 font-mono" title={c.filial}>
                              {c.filial.split("-")[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 max-w-[200px]">
                          <span title={c.descricao} className="block truncate">{c.descricao}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 max-w-[160px]">
                          <span title={c.clienteNome} className="block truncate">{c.clienteNome}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 font-medium max-w-[180px]">
                          <span title={c.desProduto} className="block truncate">{c.desProduto}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {c.descTabela && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TABELA_COR[c.descTabela] ?? "bg-gray-100 text-gray-600"}`}>
                              {c.descTabela}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                          {c.qtdContratada > 0 ? c.qtdContratada.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {c.dataCtr ? new Date(c.dataCtr).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{c.safra ?? "—"}</td>
                        <td className="px-3 py-2.5">{sts(c.stsAssinatura)}</td>
                        <td className="px-3 py-2.5">{sts(c.stsEstoque)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditando({ ...c, dataCtr: c.dataCtr ? c.dataCtr.slice(0,10) : null }); setErroForm("") }}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Editar">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => excluirContrato(c)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="Desativar">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Painel lateral: resumo por cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              Clientes ({clientesOrdenados.length})
            </p>
            {clientesOrdenados.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sem dados</p>
            ) : (
              <div className="space-y-2.5">
                {clientesOrdenados.map(([nome, v]) => {
                  const maxQtd = clientesOrdenados[0][1].qtd || 1
                  const pct = (v.qtd / maxQtd) * 100
                  return (
                    <div key={nome}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-xs text-gray-700 truncate max-w-[140px]" title={nome}>{nome.split(" ").slice(0,2).join(" ")}</span>
                        <span className="text-xs font-semibold text-gray-800 shrink-0 ml-1">{v.count}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 w-16 text-right">
                          {v.qtd >= 1000 ? `${(v.qtd/1000).toFixed(0)}k` : v.qtd.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Distribuição por tipo de tabela */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 size={14} className="text-gray-400" />
                Por tipo de produto
              </p>
              {totaisGeral.map(t => (
                <div key={t.descTabela} className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${TABELA_COR[t.descTabela] ?? "bg-gray-100 text-gray-600"}`}>
                    {t.descTabela}
                  </span>
                  <span className="text-xs text-gray-500">{t.count} contratos</span>
                  <span className="text-xs text-gray-400 ml-auto">{t.totalQtd >= 1000 ? `${(t.totalQtd/1000).toFixed(0)}k` : t.totalQtd.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!buscado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">Use os filtros acima e clique em <strong>Buscar</strong></p>
          <p className="text-sm mt-1">ou importe um novo arquivo Excel com o botão <strong>Importar Excel</strong></p>
        </div>
      )}

      {/* Modal criar/editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {editando.id ? <><Pencil size={16} className="text-blue-600"/> Editar contrato {editando.numero}</> : <><Plus size={16} className="text-blue-600"/> Novo contrato</>}
              </h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Número *" value={editando.numero ?? ""} onChange={v => setEditando(p => ({ ...p!, numero: v }))} disabled={!!editando.id} />
              <Campo label="Filial" value={editando.filial ?? ""} onChange={v => setEditando(p => ({ ...p!, filial: v }))} placeholder="010101-..." />
              <Campo label="Cliente *" value={editando.clienteNome ?? ""} onChange={v => setEditando(p => ({ ...p!, clienteNome: v }))} full />
              <Campo label="Descrição" value={editando.descricao ?? ""} onChange={v => setEditando(p => ({ ...p!, descricao: v }))} full />
              <Campo label="Cód. Produto" value={editando.codProduto ?? ""} onChange={v => setEditando(p => ({ ...p!, codProduto: v }))} />
              <Campo label="Descrição Produto" value={editando.desProduto ?? ""} onChange={v => setEditando(p => ({ ...p!, desProduto: v }))} />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo (tabela)</label>
                <input list="tabelas-list" value={editando.descTabela ?? ""} onChange={e => setEditando(p => ({ ...p!, descTabela: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <datalist id="tabelas-list">{tabelas.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <Campo label="Qtd. Contratada" type="number" value={String(editando.qtdContratada ?? 0)} onChange={v => setEditando(p => ({ ...p!, qtdContratada: Number(v) || 0 }))} />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Safra</label>
                <input list="safras-list" value={editando.safra ?? ""} onChange={e => setEditando(p => ({ ...p!, safra: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <datalist id="safras-list">{safras.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <Campo label="Data do contrato" type="date" value={(editando.dataCtr as string) ?? ""} onChange={v => setEditando(p => ({ ...p!, dataCtr: v }))} />
              <Campo label="Tipo Mercado" value={editando.tipoMercado ?? ""} onChange={v => setEditando(p => ({ ...p!, tipoMercado: v }))} />
              <Campo label="Modalidade" value={editando.modalidade ?? ""} onChange={v => setEditando(p => ({ ...p!, modalidade: v }))} />
              <Campo label="Sts. Assinatura" value={editando.stsAssinatura ?? ""} onChange={v => setEditando(p => ({ ...p!, stsAssinatura: v }))} />
              <Campo label="Sts. Estoque" value={editando.stsEstoque ?? ""} onChange={v => setEditando(p => ({ ...p!, stsEstoque: v }))} />
              <Campo label="Sts. Fiscal" value={editando.stsFiscal ?? ""} onChange={v => setEditando(p => ({ ...p!, stsFiscal: v }))} />
              <Campo label="Sts. Financeiro" value={editando.stsFinanceiro ?? ""} onChange={v => setEditando(p => ({ ...p!, stsFinanceiro: v }))} />
            </div>
            {erroForm && <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erroForm}</div>}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={salvarContrato} disabled={salvando}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                <Save size={15} /> {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, value, onChange, type = "text", placeholder, disabled, full }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean; full?: boolean
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500" />
    </div>
  )
}
