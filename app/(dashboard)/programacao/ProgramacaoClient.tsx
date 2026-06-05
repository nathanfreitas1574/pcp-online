"use client"

import { useState } from "react"
import { Plus, Save, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const

type Prog = {
  id: string; clienteNome: string; produto: string; boxCodigo: string | null
  dom: number; seg: number; ter: number; qua: number; qui: number; sex: number; sab: number
  total: number; realizado: number; tipo: string
}
type Box = { id: string; codigo: string }
type Cliente = { id: string; nome: string; codigo: string }
type Produto = { id: string; descricao: string; codigo: string }

export default function ProgramacaoClient({
  programacoes: inicial, boxes, clientes, produtos, semana, ano, diasSemana
}: {
  programacoes: Prog[]; boxes: Box[]; clientes: Cliente[]; produtos: Produto[]
  semana: number; ano: number; diasSemana: string[]
}) {
  const [rows, setRows] = useState<Prog[]>(inicial)
  const [saving, setSaving] = useState<string | null>(null)
  const [tipo, setTipo] = useState("RECEBIMENTO")
  const [novaLinha, setNovaLinha] = useState({ clienteNome: "", produto: "", boxId: "" })
  const [addMode, setAddMode] = useState(false)

  const filtradas = rows.filter((r) => r.tipo === tipo)
  const totaisDia = DIAS_KEYS.map((d) => filtradas.reduce((s, r) => s + (r[d] ?? 0), 0))
  const totalGeral = totaisDia.reduce((s, v) => s + v, 0)

  async function salvarLinha(row: Prog, campo: typeof DIAS_KEYS[number], valor: string) {
    const num = parseFloat(valor) || 0
    const updated = { ...row, [campo]: num, total: DIAS_KEYS.reduce((s, d) => s + (d === campo ? num : (row[d] ?? 0)), 0) }
    setRows((prev) => prev.map((r) => r.id === row.id ? updated : r))
    setSaving(row.id + campo)
    await fetch(`/api/programacao/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: num }),
    })
    setSaving(null)
  }

  async function adicionarLinha() {
    if (!novaLinha.clienteNome || !novaLinha.produto) return
    setSaving("nova")
    const res = await fetch("/api/programacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novaLinha, semana, ano, tipo, dataInicio: diasSemana[0], dataFim: diasSemana[6] }),
    })
    const nova = await res.json()
    setRows((prev) => [...prev, nova])
    setNovaLinha({ clienteNome: "", produto: "", boxId: "" })
    setAddMode(false)
    setSaving(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Programação Semanal</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            <Calendar size={13} className="inline mr-1" />
            Semana {semana}/{ano} — {format(new Date(diasSemana[1]), "dd/MM", { locale: ptBR })} a {format(new Date(diasSemana[6]), "dd/MM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            {["RECEBIMENTO", "EXPEDICAO"].map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tipo === t ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
                {t === "RECEBIMENTO" ? "Recebimento" : "Expedição"}
              </button>
            ))}
          </div>
          <button onClick={() => setAddMode(true)}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            <Plus size={15} /> Adicionar linha
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-medium min-w-28">Box</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Cliente</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Produto</th>
                {diasSemana.map((d, i) => (
                  <th key={i} className="px-2 py-3 text-center font-medium min-w-20">
                    <div>{DIAS[i]}</div>
                    <div className="text-xs opacity-70 font-normal">{format(new Date(d), "dd/MM", { locale: ptBR })}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">Total</th>
                <th className="px-3 py-3 text-center font-medium">Realizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{row.boxCodigo ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800 text-xs">{row.clienteNome}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.produto}</td>
                  {DIAS_KEYS.map((d) => (
                    <td key={d} className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        defaultValue={row[d] || ""}
                        onBlur={(e) => salvarLinha(row, d, e.target.value)}
                        className={`w-full text-center text-xs border rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          saving === row.id + d ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-400"
                        }`}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-bold text-gray-800">
                    {row.total.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium ${row.realizado >= row.total && row.total > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {row.realizado.toLocaleString("pt-BR")}
                    </span>
                  </td>
                </tr>
              ))}

              {/* Linha de nova entrada */}
              {addMode && (
                <tr className="bg-blue-50">
                  <td className="px-2 py-2">
                    <select value={novaLinha.boxId} onChange={(e) => setNovaLinha((p) => ({ ...p, boxId: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none">
                      <option value="">Box...</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={novaLinha.clienteNome} onChange={(e) => setNovaLinha((p) => ({ ...p, clienteNome: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none">
                      <option value="">Cliente *</option>
                      {clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={novaLinha.produto} onChange={(e) => setNovaLinha((p) => ({ ...p, produto: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none">
                      <option value="">Produto *</option>
                      {produtos.map((p) => <option key={p.id} value={p.descricao}>{p.codigo}</option>)}
                    </select>
                  </td>
                  {DIAS_KEYS.map((d) => <td key={d} className="px-1 py-2"><div className="w-full h-7 bg-gray-100 rounded" /></td>)}
                  <td className="px-2 py-2">
                    <button onClick={adicionarLinha} disabled={saving === "nova"}
                      className="flex items-center gap-1 bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-800 disabled:opacity-60">
                      <Save size={12} /> {saving === "nova" ? "…" : "OK"}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => setAddMode(false)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </td>
                </tr>
              )}

              {/* Linha de totais */}
              {filtradas.length > 0 && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-gray-600 font-semibold">TOTAL SEMANA</td>
                  {totaisDia.map((t, i) => (
                    <td key={i} className="px-2 py-2.5 text-center text-xs text-blue-700">
                      {t > 0 ? t.toLocaleString("pt-BR") : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center text-blue-800">{totalGeral.toLocaleString("pt-BR")}</td>
                  <td />
                </tr>
              )}

              {filtradas.length === 0 && !addMode && (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">
                  Nenhuma programação para a semana {semana}. Clique em "Adicionar linha" para começar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
