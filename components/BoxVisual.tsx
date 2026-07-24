"use client"

import { useState, useEffect } from "react"
import { Plus, X, Trash2, Package, Truck } from "lucide-react"

export type StatusUsoBox = "LIVRE" | "CONSUMO" | "PROGRAMADO" | "BLOQUEADO"

export type BoxItemRow = {
  produtoId: string
  produto: string
  cliente: string
  quantidade: number
  navio?: string
  dataRecebimento?: string
}

export type BoxData = {
  id: string
  codigo: string
  descricao: string
  localizacao: string
  capacidade: number
  volumeAtual: number
  produto: string | null
  cliente: string | null
  navio?: string | null
  dataRecebimento?: string | Date | null
  diasEstocado?: number | null
  ultimoLacre?: string | null
  statusUso?: StatusUsoBox | null
  obsBox?: string | null
  itens?: BoxItemRow[]
  // Referência da Marcação (descargas CHECKOUT casadas por cliente+produto) — não altera o volume
  descargaHoje?: number | null
  descargaPeriodo?: number | null
  descargaDias?: number | null
}

// Configuração visual do semáforo de uso
export const STATUS_USO_CFG: Record<StatusUsoBox, { cor: string; bg: string; label: string; emoji: string }> = {
  LIVRE:      { cor: "text-green-700",  bg: "bg-green-100",  label: "Livre",      emoji: "🟢" },
  CONSUMO:    { cor: "text-amber-700",  bg: "bg-amber-100",  label: "Em Consumo", emoji: "🟡" },
  PROGRAMADO: { cor: "text-blue-700",   bg: "bg-blue-100",   label: "Programado", emoji: "🔵" },
  BLOQUEADO:  { cor: "text-red-700",    bg: "bg-red-100",    label: "Bloqueado",  emoji: "🔴" },
}

// Paleta em tons de verde (a equipe não gosta de vermelho): quanto mais cheio,
// mais escuro o verde. Baixo volume fica azul.
function getLiquidColor(pct: number) {
  if (pct >= 90) return { bg: "#15803d", wave: "#166534", text: "white" } // muito cheio — verde escuro
  if (pct >= 75) return { bg: "#16a34a", wave: "#15803d", text: "white" } // quase cheio — verde
  if (pct >= 40) return { bg: "#22c55e", wave: "#16a34a", text: "white" } // enchendo — verde claro
  return { bg: "#3b82f6", wave: "#2563eb", text: "white" }                // baixo — azul
}

function BoxTank({
  pct,
  produto,
  cliente,
  nItens,
}: {
  pct: number
  produto: string | null
  cliente: string | null
  nItens?: number
}) {
  const clampedPct = Math.min(Math.max(pct, 0), 100)
  const { bg, wave, text } = getLiquidColor(clampedPct)
  const fillHeight = clampedPct

  return (
    <div className="relative w-full" style={{ height: 140 }}>
      {/* Container outline */}
      <div
        className="absolute inset-0 rounded-b-xl border-2 overflow-hidden"
        style={{ borderColor: bg, background: "#f8fafc" }}
      >
        {/* Liquid fill */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-in-out"
          style={{ height: `${fillHeight}%`, background: bg }}
        >
          {/* Wave SVG on top of liquid */}
          <svg
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className="absolute -top-3 left-0 w-full"
            style={{ height: 14 }}
          >
            <path
              d="M0,10 C50,0 100,20 150,10 C200,0 250,20 300,10 L300,20 L0,20 Z"
              fill={bg}
              opacity="0.8"
            >
              <animateTransform attributeName="transform" type="translate" from="-150 0" to="0 0" dur="2s" repeatCount="indefinite" />
            </path>
            <path
              d="M0,10 C50,20 100,0 150,10 C200,20 250,0 300,10 L300,20 L0,20 Z"
              fill={wave}
              opacity="0.5"
            >
              <animateTransform attributeName="transform" type="translate" from="0 0" to="-150 0" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>

          {/* Content inside liquid */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pt-4">
            {produto && (
              <p className="text-xs font-bold text-center leading-tight" style={{ color: text }}>
                {produto.length > 14 ? produto.substring(0, 14) + "…" : produto}
              </p>
            )}
            {cliente && (
              <p className="text-xs text-center opacity-90 leading-tight mt-0.5" style={{ color: text }}>
                {cliente.length > 14 ? cliente.substring(0, 14) + "…" : cliente}
              </p>
            )}
            {nItens && nItens > 1 && (
              <p className="text-[10px] text-center font-semibold mt-0.5 px-1.5 py-0.5 rounded-full bg-white/25" style={{ color: text }}>
                +{nItens - 1} produto{nItens - 1 > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Empty state */}
        {clampedPct < 5 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-400 font-medium">LIVRE</p>
          </div>
        )}

        {/* Volume label — outside liquid when empty or top */}
        {clampedPct >= 5 && clampedPct < 30 && (
          <div className="absolute top-2 left-0 right-0 flex items-center justify-center">
            {produto && (
              <p className="text-xs font-bold text-gray-600 text-center px-1">{produto}</p>
            )}
          </div>
        )}
      </div>

      {/* % badge top right */}
      <div
        className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white z-10"
        style={{ background: bg, color: text }}
      >
        {Math.round(clampedPct)}%
      </div>

      {/* Capacity scale on left */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-1 -ml-5">
        {[100, 75, 50, 25, 0].map((tick) => (
          <div key={tick} className="flex items-center gap-0.5">
            <div className="w-1.5 h-px bg-gray-300" />
            <span className="text-gray-300" style={{ fontSize: 7 }}>{tick}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BoxVisual({
  box,
  onUpdate,
  onVistoria,
  produtos = [],
  clientes = [],
}: {
  box: BoxData
  onUpdate?: (id: string, updates: Partial<BoxData>) => void
  onVistoria?: (boxId: string) => void   // abre a Vistoria do Dia já neste box
  produtos?: string[]
  clientes?: string[]
}) {
  // Itens do box (vários produtos) — fonte única do volume
  const [itens, setItens] = useState<BoxItemRow[]>(() =>
    box.itens && box.itens.length
      ? box.itens
      : box.produto
        ? [{ produtoId: "__legacy__", produto: box.produto, cliente: box.cliente ?? "", quantidade: box.volumeAtual }]
        : []
  )

  // Re-sincroniza quando o pai atualiza os itens (ex.: vistoria salvou) — sem isso o
  // card/vistoria reabria com a lista antiga e regravava produtos já removidos
  useEffect(() => {
    if (box.itens) setItens(box.itens)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.itens])

  const [editing, setEditing] = useState(false)
  const [showItens, setShowItens] = useState(false)
  const [novaCapacidade, setNovaCapacidade] = useState(String(box.capacidade))
  const [savingCap, setSavingCap] = useState(false)

  // formulário de adicionar item
  const [fProduto, setFProduto] = useState("")
  const [fCliente, setFCliente] = useState("")
  const [fQtd, setFQtd] = useState("")
  const [addingItem, setAddingItem] = useState(false)

  const localVol = itens.reduce((s, i) => s + i.quantidade, 0)
  const primary = itens[0]
  const localProd = primary?.produto ?? null
  const localCli = primary?.cliente ?? null
  const pct = box.capacidade > 0 ? (localVol / box.capacidade) * 100 : 0
  const { bg } = getLiquidColor(pct)

  function notify(next: BoxItemRow[]) {
    const vol = next.reduce((s, i) => s + i.quantidade, 0)
    onUpdate?.(box.id, { volumeAtual: vol, produto: next[0]?.produto ?? null, cliente: next[0]?.cliente ?? null })
  }

  async function salvarCapacidade() {
    setSavingCap(true)
    const cap = parseFloat(novaCapacidade) || box.capacidade
    await fetch(`/api/boxes/${box.id}/estoque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacidade: cap, volumeAtual: localVol }),
    })
    setSavingCap(false)
    setEditing(false)
    onUpdate?.(box.id, { capacidade: cap })
  }

  async function adicionarItem() {
    const produto = fProduto.trim()
    if (!produto) return
    setAddingItem(true)
    const quantidade = parseFloat(fQtd) || 0
    const cliente = fCliente.trim()
    const res = await fetch(`/api/boxes/${box.id}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto, cliente, quantidade }),
    }).then((r) => r.json()).catch(() => null)

    const produtoId = res?.produtoId ?? `tmp_${produto.toLowerCase()}`
    const next = (() => {
      const idx = itens.findIndex((i) => i.produto.toLowerCase() === produto.toLowerCase())
      const row: BoxItemRow = { produtoId, produto, cliente, quantidade }
      if (idx >= 0) { const c = [...itens]; c[idx] = row; return c }
      return [...itens, row]
    })()
    next.sort((a, b) => b.quantidade - a.quantidade)
    setItens(next); notify(next)
    setFProduto(""); setFCliente(""); setFQtd(""); setAddingItem(false)
  }

  async function removerItem(produtoId: string) {
    await fetch(`/api/boxes/${box.id}/itens?produtoId=${encodeURIComponent(produtoId)}`, { method: "DELETE" })
    const next = itens.filter((i) => i.produtoId !== produtoId)
    setItens(next); notify(next)
  }

  const statusCfg = box.statusUso ? STATUS_USO_CFG[box.statusUso] : STATUS_USO_CFG.LIVRE

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-base">{box.codigo}</h3>
          <p className="text-xs text-gray-400">{box.localizacao}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowItens(true)}
            title="Adicionar / gerenciar produtos"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
          >
            <Plus size={13} /> {itens.length || ""}
          </button>
          <button
            onClick={() => { setNovaCapacidade(String(box.capacidade)); setEditing(true) }}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Semáforo de uso */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusCfg.bg} ${statusCfg.cor}`}>
        <span>{statusCfg.emoji}</span>
        <span>{statusCfg.label}</span>
        {box.obsBox && <span className="ml-1 font-normal opacity-80 truncate">— {box.obsBox}</span>}
      </div>

      {/* Referência: descarregado hoje via Marcação (CHECKOUT, casado por cliente+produto) */}
      {(box.descargaHoje ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"
          title={`Descargas finalizadas (CHECKOUT) casadas por cliente+produto nos últimos ${box.descargaDias ?? 10} dias. Referência da Marcação — confira e ajuste o volume na Vistoria.`}>
          <Truck size={13} className="shrink-0" />
          <span>{(box.descargaHoje ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t descarregado hoje (Marcação)</span>
        </div>
      )}

      {/* Tank visual */}
      <div className="pl-6">
        <BoxTank pct={pct} produto={localProd} cliente={localCli} nItens={itens.length} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Volume atual</p>
          <p className="font-bold text-gray-800">
            {localVol.toLocaleString("pt-BR")}
            <span className="font-normal text-gray-400"> / {box.capacidade.toLocaleString("pt-BR")} ton</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Capacidade livre</p>
          <p className="font-bold" style={{ color: bg }}>
            {(box.capacidade - localVol).toLocaleString("pt-BR")} ton
          </p>
        </div>
      </div>

      {/* Lista de produtos do box (chips) */}
      {itens.length > 0 && (
        <div className="flex flex-col gap-1">
          {itens.map((i) => (
            <div key={i.produtoId} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded-lg px-2 py-1">
              <Package size={11} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-700 truncate flex-1">{i.produto}</span>
              {i.cliente && <span className="text-gray-400 truncate max-w-20">{i.cliente}</span>}
              <span className="font-semibold text-gray-600 tabular-nums shrink-0">{i.quantidade.toLocaleString("pt-BR")} t</span>
            </div>
          ))}
        </div>
      )}

      {box.diasEstocado && (
        <p className="text-xs text-gray-400 text-center">{box.diasEstocado} dias estocado</p>
      )}

      {/* Alerta de lacre — no rodapé do card p/ não cobrir o nome do box */}
      {box.ultimoLacre === "NAO_CONFORME" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <span className="shrink-0">⚠</span> Lacre não conforme
        </div>
      )}

      {/* ── Modal gerenciar itens (vários produtos) ── */}
      {showItens && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-gray-800 text-lg">Produtos do Box {box.codigo}</h4>
              <button onClick={() => setShowItens(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {localVol.toLocaleString("pt-BR")} t de {box.capacidade.toLocaleString("pt-BR")} t · {pct.toFixed(0)}% ocupado
            </p>

            {/* lista atual */}
            <div className="space-y-2 mb-4">
              {itens.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-3">Nenhum produto. Adicione abaixo.</p>
              )}
              {itens.map((i) => (
                <div key={i.produtoId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Package size={14} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{i.produto}</p>
                    {i.cliente && <p className="text-xs text-gray-500 truncate">{i.cliente}</p>}
                  </div>
                  <span className="text-sm font-bold text-gray-700 tabular-nums shrink-0">{i.quantidade.toLocaleString("pt-BR")} t</span>
                  <button onClick={() => removerItem(i.produtoId)} title="Remover"
                    className="text-gray-300 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            {/* adicionar */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adicionar produto</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Produto</label>
                <input list="bx-produtos" value={fProduto} onChange={(e) => setFProduto(e.target.value)}
                  placeholder="Ex: UREIA 46%"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id="bx-produtos">{produtos.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cliente</label>
                  <input list="bx-clientes" value={fCliente} onChange={(e) => setFCliente(e.target.value)}
                    placeholder="Ex: FTO"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <datalist id="bx-clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantidade (t)</label>
                  <input type="number" min="0" step="0.1" value={fQtd} onChange={(e) => setFQtd(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={adicionarItem} disabled={addingItem || !fProduto.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                <Plus size={15} /> {addingItem ? "Adicionando…" : "Adicionar produto"}
              </button>
              <p className="text-[11px] text-gray-400">Adicionar um produto já existente atualiza a quantidade dele.</p>
            </div>

            <button onClick={() => setShowItens(false)}
              className="w-full mt-4 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal editar capacidade ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">Box {box.codigo}</h4>

            <div className="mb-4 pl-6">
              <BoxTank pct={(parseFloat(novaCapacidade) || box.capacidade) > 0 ? (localVol / (parseFloat(novaCapacidade) || box.capacidade)) * 100 : 0}
                produto={localProd} cliente={localCli} nItens={itens.length} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade do box (ton)</label>
              <input type="number" min="1" step="100" value={novaCapacidade}
                onChange={(e) => setNovaCapacidade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-2">
                Para incluir/remover produtos, use o botão <span className="font-semibold text-blue-600">+</span> no card.
              </p>
            </div>

            {onVistoria && (
              <button type="button" onClick={() => { setEditing(false); onVistoria(box.id) }}
                className="w-full mt-3 flex items-center justify-center gap-2 border border-green-300 text-green-700 bg-green-50 rounded-lg py-2.5 text-sm font-medium hover:bg-green-100 transition">
                ✅ Lançar vistoria deste box
              </button>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={salvarCapacidade} disabled={savingCap}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 transition disabled:opacity-60">
                {savingCap ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
