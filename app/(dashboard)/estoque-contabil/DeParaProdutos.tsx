"use client"

import { useState, useEffect, useCallback } from "react"
import { Save, Search, RefreshCw, ArrowLeftRight, CheckCircle2 } from "lucide-react"

type Linha = {
  codigoProduto: string; descricao: string
  saldo10: number; saldo20: number; saldo30: number; outros: number; total: number
  descricaoAbreviada: string
}

const fmt = (n: number) => n ? n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"

export default function DeParaProdutos({ produtosVistoria }: { produtosVistoria: string[] }) {
  const [lista, setLista] = useState<Linha[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState("")
  const [soPendentes, setSoPendentes] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/estoque-contabil/depara")
    const d = await r.json()
    setLista(d.lista ?? [])
    setEdits({})
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const valor = (l: Linha) => edits[l.codigoProduto] ?? l.descricaoAbreviada
  const setAbrev = (cod: string, val: string) => setEdits(p => ({ ...p, [cod]: val }))

  async function salvar() {
    const mapeamentos = lista
      .filter(l => edits[l.codigoProduto] !== undefined && edits[l.codigoProduto] !== l.descricaoAbreviada)
      .map(l => ({ codigoProduto: l.codigoProduto, descricaoOriginal: l.descricao, descricaoAbreviada: edits[l.codigoProduto] }))
    if (!mapeamentos.length) { setMsg("Nada alterado para salvar."); return }
    setSalvando(true); setMsg("")
    const r = await fetch("/api/estoque-contabil/depara", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mapeamentos }),
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) { setMsg(`✅ ${d.salvos} salvos${d.removidos ? `, ${d.removidos} removidos` : ""}.`); await carregar() }
    else setMsg(d.error ?? "Erro ao salvar.")
  }

  const filtradas = lista.filter(l => {
    if (soPendentes && valor(l)) return false
    if (!busca) return true
    const b = busca.toLowerCase()
    return l.codigoProduto.toLowerCase().includes(b) || l.descricao.toLowerCase().includes(b)
  })
  const mapeados = lista.filter(l => valor(l)).length
  const alterados = lista.filter(l => edits[l.codigoProduto] !== undefined && edits[l.codigoProduto] !== l.descricaoAbreviada).length

  return (
    <div>
      {/* Barra de ações */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar código ou descrição…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={soPendentes} onChange={e => setSoPendentes(e.target.checked)} />
          Só pendentes
        </label>
        <div className="text-sm text-gray-500">
          <CheckCircle2 size={14} className="inline text-green-500 mr-1" />
          {mapeados}/{lista.length} mapeados
          {alterados > 0 && <span className="ml-2 text-amber-600 font-medium">· {alterados} não salvos</span>}
        </div>
        <button onClick={carregar} className="text-gray-400 hover:text-blue-600 p-1.5" title="Recarregar"><RefreshCw size={15} /></button>
        <button onClick={salvar} disabled={salvando || alterados === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
          <Save size={15} /> {salvando ? "Salvando…" : "Salvar de-para"}
        </button>
      </div>

      {msg && <div className="mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{msg}</div>}

      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <ArrowLeftRight size={13} /> Para cada produto do contábil, informe a <strong>descrição abreviada</strong> (a mesma usada na vistoria). Vários produtos podem apontar para o mesmo nome.
      </p>

      {/* Tabela de-para */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Código</th>
                <th className="text-left px-3 py-2.5 font-semibold">Descrição (contábil)</th>
                <th className="text-right px-3 py-2.5 font-semibold">Arm. 10</th>
                <th className="text-right px-3 py-2.5 font-semibold">Arm. 20</th>
                <th className="text-right px-3 py-2.5 font-semibold">Arm. 30</th>
                <th className="text-right px-3 py-2.5 font-semibold">Total</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[220px]">→ Descrição abreviada (vistoria)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(l => {
                const v = valor(l)
                const alterado = edits[l.codigoProduto] !== undefined && edits[l.codigoProduto] !== l.descricaoAbreviada
                return (
                  <tr key={l.codigoProduto} className={alterado ? "bg-amber-50/50" : v ? "" : "bg-red-50/30"}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{l.codigoProduto}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[280px] truncate" title={l.descricao}>{l.descricao}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fmt(l.saldo10)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fmt(l.saldo20)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fmt(l.saldo30)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800">{fmt(l.total)}</td>
                    <td className="px-3 py-1.5">
                      <input list="produtos-vistoria" value={v}
                        onChange={e => setAbrev(l.codigoProduto, e.target.value)}
                        placeholder="— não mapeado —"
                        className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${alterado ? "border-amber-400 bg-amber-50" : v ? "border-gray-200" : "border-red-200"}`} />
                    </td>
                  </tr>
                )
              })}
              {!loading && filtradas.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  {lista.length === 0 ? "Importe o estoque contábil primeiro para listar os produtos." : "Nenhum produto encontrado."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <datalist id="produtos-vistoria">
        {produtosVistoria.map(p => <option key={p} value={p} />)}
      </datalist>
    </div>
  )
}
