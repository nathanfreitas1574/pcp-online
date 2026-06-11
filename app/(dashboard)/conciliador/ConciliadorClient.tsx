"use client"

import { useState, useCallback, useEffect, useRef, Fragment } from "react"
import {
  GitCompareArrows, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  X, Search, Trash2, ArrowDownToLine, ArrowUpFromLine,
  ChevronDown, ChevronRight, Save, Clock,
} from "lucide-react"

type Lote = {
  id: string
  data: string
  tolerancia: number
  arquivoMarcacao: string | null
  arquivoRomaneio: string | null
  arquivoEstoque: string | null
  usuarioNome: string | null
  total: number
  conciliados: number
  divergentes: number
  descarga: number
  carga: number
}

type Item = {
  id: string
  origem: string
  operacao: string | null
  ordem: string | null
  numeroNF: string | null
  placa: string | null
  cliente: string | null
  produto: string | null
  produtoRomaneio: string | null
  produtoEstoque: string | null
  pesoMarcacao: number | null
  pesoRomaneio: number | null
  pesoEstoque: number | null
  difPeso: number | null
  presencaMarcacao: boolean
  presencaRomaneio: boolean
  presencaEstoque: boolean
  stsRomaneio: string | null
  armazem: string | null
  status: string
  divergencias: string | null
  justificativa: string | null
  justificadoPor: string | null
  justificadoEm: string | null
}

const DIV_LABEL: Record<string, string> = {
  SEM_ROMANEIO:            "Marcação sem romaneio",
  ROMANEIO_NAO_CONFIRMADO: "Romaneio não confirmado",
  ROMANEIO_SEM_NF:         "Romaneio sem NF",
  SEM_CONTADO:             "Não entrou no contado",
  PESO_DIVERGENTE:         "Peso divergente",
  CLIENTE_DIVERGENTE:      "Cliente divergente",
  SENTIDO_DIVERGENTE:      "Sentido divergente",
  CONTADO_SEM_CAMINHAO:    "Contado sem caminhão",
}

const fmt = (n: number | null, d = 2) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtInt = (n: number) => n.toLocaleString("pt-BR")
const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

function opBadge(op: string | null) {
  const o = (op || "").toUpperCase()
  if (o.includes("DESCARGA")) return "bg-amber-100 text-amber-700"
  if (o.includes("CARGA"))    return "bg-blue-100 text-blue-700"
  return "bg-gray-100 text-gray-600"
}

/** 3 bolinhas indicando presença em Marcação / Romaneio / Estoque */
function Presenca({ m, r, e }: { m: boolean; r: boolean; e: boolean }) {
  const dot = (on: boolean, label: string) => (
    <span title={label} className={`inline-block w-2.5 h-2.5 rounded-full ${on ? "bg-green-500" : "bg-gray-200"}`} />
  )
  return (
    <span className="inline-flex gap-1 items-center">
      {dot(m, "Marcação")}{dot(r, "Romaneio")}{dot(e, "Estoque contado")}
    </span>
  )
}

export default function ConciliadorClient({ lotesIniciais }: { lotesIniciais: Lote[] }) {
  const [lotes, setLotes] = useState<Lote[]>(lotesIniciais)
  const [loteSel, setLoteSel] = useState<Lote | null>(lotesIniciais[0] ?? null)
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  // upload
  const [showUpload, setShowUpload] = useState(lotesIniciais.length === 0)
  const refMarc = useRef<HTMLInputElement>(null)
  const refRom  = useRef<HTMLInputElement>(null)
  const refEst  = useRef<HTMLInputElement>(null)
  const [tolerancia, setTolerancia] = useState("0")
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  // filtros
  const [fStatus, setFStatus] = useState("")
  const [fOperacao, setFOperacao] = useState("")
  const [fDiv, setFDiv] = useState("")
  const [busca, setBusca] = useState("")

  // justificativa inline
  const [expandId, setExpandId] = useState<string | null>(null)
  const [justifText, setJustifText] = useState("")
  const [savingJustif, setSavingJustif] = useState(false)

  const carregarItens = useCallback(async (loteId: string) => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (fStatus)   qs.set("status", fStatus)
    if (fOperacao) qs.set("operacao", fOperacao)
    if (fDiv)      qs.set("divergencia", fDiv)
    if (busca)     qs.set("busca", busca)
    const r = await fetch(`/api/conciliacoes/${loteId}?${qs}`)
    const d = await r.json()
    setItens(d.itens ?? [])
    if (d.lote) setLoteSel(d.lote)
    setLoading(false)
  }, [fStatus, fOperacao, fDiv, busca])

  useEffect(() => { if (loteSel) carregarItens(loteSel.id) }, [loteSel?.id, carregarItens]) // eslint-disable-line react-hooks/exhaustive-deps

  async function recarregarLotes(selecionar?: string) {
    const r = await fetch("/api/conciliacoes")
    const d = await r.json()
    setLotes(d.lotes ?? [])
    if (selecionar) {
      const novo = (d.lotes ?? []).find((l: Lote) => l.id === selecionar)
      if (novo) setLoteSel(novo)
    }
  }

  async function conciliar() {
    const fm = refMarc.current?.files?.[0]
    const fr = refRom.current?.files?.[0]
    const fe = refEst.current?.files?.[0]
    if (!fm || !fr || !fe) { setMsg({ tipo: "erro", texto: "Selecione as 3 planilhas." }); return }
    setUploading(true); setMsg(null)
    const fd = new FormData()
    fd.append("marcacao", fm); fd.append("romaneio", fr); fd.append("estoque", fe)
    fd.append("tolerancia", tolerancia || "0")
    try {
      const r = await fetch("/api/conciliacoes", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) {
        setMsg({ tipo: "ok", texto: `Conciliado: ${d.resumo.conciliados} OK, ${d.resumo.divergentes} divergências (${d.fontes.romaneios} romaneios, ${d.fontes.estoque} estoque).` })
        await recarregarLotes(d.loteId)
        setShowUpload(false)
        if (refMarc.current) refMarc.current.value = ""
        if (refRom.current) refRom.current.value = ""
        if (refEst.current) refEst.current.value = ""
      } else {
        setMsg({ tipo: "erro", texto: d.error ?? "Falha na conciliação." })
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de rede ao enviar as planilhas." })
    }
    setUploading(false)
  }

  async function excluirLote(id: string) {
    if (!confirm("Excluir esta conciliação?")) return
    await fetch(`/api/conciliacoes/${id}`, { method: "DELETE" })
    const restantes = lotes.filter(l => l.id !== id)
    setLotes(restantes)
    setLoteSel(restantes[0] ?? null)
    if (!restantes.length) setItens([])
  }

  async function salvarJustificativa(itemId: string) {
    setSavingJustif(true)
    const r = await fetch(`/api/conciliacoes/itens/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ justificativa: justifText }),
    })
    if (r.ok) {
      const d = await r.json()
      setItens(prev => prev.map(it => it.id === itemId ? { ...it, ...d.item } : it))
      setExpandId(null); setJustifText("")
    }
    setSavingJustif(false)
  }

  function abrirJustif(it: Item) {
    if (expandId === it.id) { setExpandId(null); return }
    setExpandId(it.id); setJustifText(it.justificativa ?? "")
  }

  const pctConc = loteSel && loteSel.total > 0 ? (loteSel.conciliados / loteSel.total) * 100 : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
            <GitCompareArrows className="text-blue-700" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Conciliador de Carga/Descarga</h1>
            <p className="text-sm text-gray-500">Cruza Marcação × Romaneio × Estoque Contado e aponta divergências</p>
          </div>
        </div>
        <button onClick={() => setShowUpload(s => !s)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          <Upload size={16} /> Nova Conciliação
        </button>
      </div>

      {msg && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          msg.tipo === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {msg.tipo === "ok" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          <p className="flex-1 font-medium">{msg.texto}</p>
          <button onClick={() => setMsg(null)}><X size={15} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Painel de upload */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-gray-800 mb-1">Enviar planilhas do dia</h3>
          <p className="text-xs text-gray-500 mb-4">As colunas podem mudar de ordem — o sistema reconhece por nome. Formatos .xlsx/.xls.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[
              { ref: refMarc, label: "1. Marcação (Connect)", hint: "veículos marcados", color: "text-purple-600" },
              { ref: refRom,  label: "2. Romaneio (Proteus)", hint: "browse de romaneios", color: "text-blue-600" },
              { ref: refEst,  label: "3. Estoque Contado",    hint: "materiais de/em terceiros", color: "text-green-600" },
            ].map(({ ref, label, hint, color }) => (
              <label key={label} className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition block">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet size={16} className={color} />
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{hint}</p>
                <input ref={ref} type="file" accept=".xlsx,.xls"
                  onChange={() => setMsg(null)}
                  className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs w-full" />
              </label>
            ))}
          </div>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tolerância de peso (ton)</label>
              <input value={tolerancia} onChange={e => setTolerancia(e.target.value)} type="number" step="0.1" min="0"
                className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0 = exato" />
              <p className="text-[11px] text-gray-400 mt-1">0 = exato. Sugestão: 0,3–0,5 p/ diferença de balança.</p>
            </div>
            <button onClick={conciliar} disabled={uploading}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
              <GitCompareArrows size={16} />
              {uploading ? "Conciliando…" : "Conciliar"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Histórico de lotes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 h-fit">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
            <Clock size={13} /> Histórico
          </p>
          {lotes.length === 0 ? (
            <p className="text-xs text-gray-400 px-1 py-4 text-center">Nenhuma conciliação ainda.</p>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {lotes.map(l => (
                <button key={l.id} onClick={() => setLoteSel(l)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                    loteSel?.id === l.id ? "border-blue-300 bg-blue-50" : "border-transparent hover:bg-gray-50"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      {new Date(l.data).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-[11px] text-gray-400">{new Date(l.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] bg-green-100 text-green-700 px-1.5 rounded">{l.conciliados} ok</span>
                    <span className="text-[11px] bg-red-100 text-red-700 px-1.5 rounded">{l.divergentes} div</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhe do lote */}
        <div>
          {!loteSel ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
              <GitCompareArrows size={42} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Envie as 3 planilhas para iniciar a conciliação</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <Kpi icon={<FileSpreadsheet size={14}/>} label="Total" value={fmtInt(loteSel.total)} />
                <Kpi icon={<CheckCircle2 size={14}/>} label="Conciliados" value={fmtInt(loteSel.conciliados)} accent="text-green-600"
                     sub={`${fmt(pctConc,0)}%`} />
                <Kpi icon={<AlertTriangle size={14}/>} label="Divergências" value={fmtInt(loteSel.divergentes)} accent="text-red-600" />
                <Kpi icon={<ArrowDownToLine size={14}/>} label="Descargas" value={fmtInt(loteSel.descarga)} accent="text-amber-600" />
                <Kpi icon={<ArrowUpFromLine size={14}/>} label="Cargas" value={fmtInt(loteSel.carga)} accent="text-blue-600" />
              </div>

              {/* barra de progresso + meta */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctConc}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  tolerância {fmt(loteSel.tolerancia, 1)} t · {loteSel.arquivoRomaneio} · por {loteSel.usuarioNome ?? "—"}
                </span>
                <button onClick={() => excluirLote(loteSel.id)} className="text-gray-400 hover:text-red-600" title="Excluir conciliação">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Filtros */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="NF, ordem, placa, cliente…"
                      className={inp + " pl-8"} onKeyDown={e => e.key === "Enter" && carregarItens(loteSel.id)} />
                  </div>
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={inp}>
                    <option value="">Todos os status</option>
                    <option value="CONCILIADO">Conciliados</option>
                    <option value="DIVERGENTE">Divergentes</option>
                  </select>
                  <select value={fOperacao} onChange={e => setFOperacao(e.target.value)} className={inp}>
                    <option value="">Carga e descarga</option>
                    <option value="DESCARGA">Descarga</option>
                    <option value="CARGA">Carga</option>
                  </select>
                  <select value={fDiv} onChange={e => setFDiv(e.target.value)} className={inp}>
                    <option value="">Toda divergência</option>
                    {Object.entries(DIV_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={() => carregarItens(loteSel.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Aplicar</button>
                </div>
              </div>

              {/* Tabela de itens */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="w-6 px-2 py-2.5"></th>
                        <th className="text-left px-3 py-2.5 font-semibold">Op.</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Ordem</th>
                        <th className="text-left px-3 py-2.5 font-semibold">NF</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                        <th className="text-center px-3 py-2.5 font-semibold" title="Marcação · Romaneio · Estoque">M·R·E</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Pesos M/R/E</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Divergências</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itens.map(it => {
                        const divs = (it.divergencias || "").split(",").filter(Boolean)
                        const aberto = expandId === it.id
                        return (
                          <Fragment key={it.id}>
                            <tr className={`hover:bg-blue-50/40 cursor-pointer ${aberto ? "bg-blue-50/40" : ""}`} onClick={() => abrirJustif(it)}>
                              <td className="px-2 py-2 text-gray-400">{aberto ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</td>
                              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${opBadge(it.operacao)}`}>{it.operacao ?? "—"}</span></td>
                              <td className="px-3 py-2 font-mono text-xs">{it.ordem ?? "—"}</td>
                              <td className="px-3 py-2 font-mono text-xs">{it.numeroNF ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={it.cliente ?? ""}>{it.cliente ?? "—"}</td>
                              <td className="px-3 py-2 text-center"><Presenca m={it.presencaMarcacao} r={it.presencaRomaneio} e={it.presencaEstoque} /></td>
                              <td className="px-3 py-2 text-right tabular-nums text-xs whitespace-nowrap">
                                {fmt(it.pesoMarcacao)}/{fmt(it.pesoRomaneio)}/{fmt(it.pesoEstoque)}
                                {it.difPeso !== null && it.difPeso > 0 && <span className="text-gray-400"> (Δ{fmt(it.difPeso)})</span>}
                              </td>
                              <td className="px-3 py-2">
                                {it.status === "CONCILIADO"
                                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ OK</span>
                                  : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">divergente</span>}
                                {it.justificativa && <span className="ml-1 text-[10px] text-blue-600" title={it.justificativa}>✎</span>}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {divs.map(d => <span key={d} className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">{DIV_LABEL[d] ?? d}</span>)}
                                </div>
                              </td>
                            </tr>
                            {aberto && (
                              <tr className="bg-blue-50/30">
                                <td></td>
                                <td colSpan={8} className="px-4 py-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs text-gray-600">
                                    <div><b>Produto (marcação):</b> {it.produto ?? "—"}</div>
                                    <div><b>Produto (romaneio):</b> {it.produtoRomaneio ?? "—"}</div>
                                    <div><b>Produto (estoque):</b> {it.produtoEstoque ?? "—"}</div>
                                    <div><b>Placa:</b> {it.placa ?? "—"}</div>
                                    <div><b>Sts romaneio:</b> {it.stsRomaneio ?? "—"}</div>
                                    <div><b>Armazém:</b> {it.armazem ?? "—"}</div>
                                  </div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Justificativa</label>
                                  <div className="flex gap-2">
                                    <textarea value={justifText} onChange={e => setJustifText(e.target.value)} rows={2}
                                      placeholder="Explique a divergência (ex: NF lançada no dia seguinte, diferença de balança aceita…)"
                                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" onClick={e => e.stopPropagation()} />
                                    <button onClick={(e) => { e.stopPropagation(); salvarJustificativa(it.id) }} disabled={savingJustif}
                                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-stretch">
                                      <Save size={14} /> Salvar
                                    </button>
                                  </div>
                                  {it.justificadoPor && <p className="text-[11px] text-gray-400 mt-1">Justificado por {it.justificadoPor} {it.justificadoEm ? "· " + new Date(it.justificadoEm).toLocaleString("pt-BR") : ""}</p>}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                      {!loading && itens.length === 0 && (
                        <tr><td colSpan={9} className="text-center py-12 text-gray-400">Nenhum item com esses filtros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub, accent = "text-gray-800" }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium mb-1">{icon} {label}</div>
      <p className={`text-2xl font-bold ${accent}`}>{value}{sub && <span className="text-sm font-medium text-gray-400 ml-1">{sub}</span>}</p>
    </div>
  )
}
