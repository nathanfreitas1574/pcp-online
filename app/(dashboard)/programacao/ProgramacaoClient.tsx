"use client"

import { useState } from "react"
import { Plus, Save, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const

// Estilo do realizado de um dia comparado ao programado daquele dia
function estiloDia(prog: number, real: number): { cls: string; sym: string } {
  if (real <= 0) return { cls: "text-gray-300", sym: "" }
  if (prog === 0) return { cls: "text-amber-600 bg-amber-50 rounded font-semibold", sym: "▲" }  // realizado sem programação
  if (real > prog + 0.05) return { cls: "text-amber-600 bg-amber-50 rounded font-semibold", sym: "▲" } // ultrapassou
  if (real >= prog - 0.05) return { cls: "text-green-700 bg-green-50 rounded font-semibold", sym: "✓" } // bateu
  return { cls: "text-blue-600", sym: "" } // parcial
}

type Prog = {
  id: string; clienteNome: string; produto: string; boxCodigo: string | null; numeroContrato: string | null
  dom: number; seg: number; ter: number; qua: number; qui: number; sex: number; sab: number
  total: number; realizado: number; tipo: string
}
type Box = { id: string; codigo: string }
type Cliente = { id: string; nome: string; codigo: string }
type Produto = { id: string; descricao: string; codigo: string }

export default function ProgramacaoClient({
  programacoes: inicial, boxes, clientes, produtos, semana, ano, diasSemana, realizadoPorDia
}: {
  programacoes: Prog[]; boxes: Box[]; clientes: Cliente[]; produtos: Produto[]
  semana: number; ano: number; diasSemana: string[]; realizadoPorDia: Record<string, number[]>
}) {
  const [rows, setRows] = useState<Prog[]>(inicial)
  const [saving, setSaving] = useState<string | null>(null)
  const [tipo, setTipo] = useState("RECEBIMENTO")
  const [novaLinha, setNovaLinha] = useState({ numeroContrato: "", clienteNome: "", produto: "", boxId: "" })
  const [addMode, setAddMode] = useState(false)
  const [buscandoCtr, setBuscandoCtr] = useState(false)
  const [ctrInfo, setCtrInfo] = useState<string>("")

  const realDe = (id: string) => realizadoPorDia[id] ?? [0, 0, 0, 0, 0, 0, 0]

  async function buscarContrato(numero: string) {
    if (!numero.trim()) { setCtrInfo(""); return }
    setBuscandoCtr(true); setCtrInfo("")
    try {
      const res = await fetch(`/api/contratos/lookup?numero=${encodeURIComponent(numero.trim())}`)
      const d = await res.json()
      const m = d.matches?.[0]
      if (m) {
        setNovaLinha(p => ({ ...p, clienteNome: m.clienteNome, produto: m.desProduto }))
        setCtrInfo(`✓ ${m.clienteNome} — ${m.desProduto}${d.matches.length > 1 ? ` (+${d.matches.length - 1} filial)` : ""}`)
      } else {
        setCtrInfo("Contrato não encontrado — preencha cliente/produto manualmente.")
      }
    } catch {
      setCtrInfo("Erro ao buscar contrato.")
    }
    setBuscandoCtr(false)
  }

  const filtradas = rows.filter((r) => r.tipo === tipo)
  const totaisDia = DIAS_KEYS.map((d) => filtradas.reduce((s, r) => s + (r[d] ?? 0), 0))
  const totalGeral = totaisDia.reduce((s, v) => s + v, 0)
  const realizadoDia = DIAS_KEYS.map((_, i) => filtradas.reduce((s, r) => s + (realDe(r.id)[i] ?? 0), 0))
  const realizadoGeral = realizadoDia.reduce((s, v) => s + v, 0)
  const fmt1 = (n: number) => n ? n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : ""

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
    setNovaLinha({ numeroContrato: "", clienteNome: "", produto: "", boxId: "" })
    setCtrInfo("")
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
                <th className="px-3 py-3 text-left font-medium min-w-20">Contrato</th>
                <th className="px-3 py-3 text-left font-medium min-w-24">Box</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Cliente</th>
                <th className="px-3 py-3 text-left font-medium min-w-32">Produto</th>
                {diasSemana.map((d, i) => (
                  <th key={i} className="px-2 py-3 text-center font-medium min-w-20">
                    <div>{DIAS[i]}</div>
                    <div className="text-xs opacity-70 font-normal">{format(new Date(d), "dd/MM", { locale: ptBR })}</div>
                    <div className="text-[9px] opacity-60 font-normal mt-0.5">prog / real</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">Total</th>
                <th className="px-3 py-3 text-center font-medium">Realiz.</th>
                <th className="px-3 py-3 text-center font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map((row) => {
                const real = realDe(row.id)
                const realTotal = real.reduce((s, v) => s + v, 0)
                return (
                <tr key={row.id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-gray-600">{row.numeroContrato ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{row.boxCodigo ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800 text-xs">{row.clienteNome}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.produto}</td>
                  {DIAS_KEYS.map((d, i) => {
                    const e = estiloDia(row[d] ?? 0, real[i])
                    return (
                    <td key={d} className="px-1 py-1 align-top">
                      <input
                        type="number"
                        min="0"
                        defaultValue={row[d] || ""}
                        onBlur={(ev) => salvarLinha(row, d, ev.target.value)}
                        className={`w-full text-center text-xs border rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          saving === row.id + d ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-400"
                        }`}
                        placeholder="0"
                      />
                      <div className={`text-center text-[10px] mt-0.5 px-0.5 ${e.cls}`} title="Realizado (marcação)">
                        {real[i] > 0 ? `${e.sym} ${fmt1(real[i])}`.trim() : "·"}
                      </div>
                    </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-bold text-gray-800 align-top">
                    {row.total.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-center align-top">
                    <span className={`text-xs font-bold ${realTotal >= row.total && row.total > 0 ? "text-green-600" : realTotal > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {realTotal > 0 ? fmt1(realTotal) : "—"}
                    </span>
                    {row.total > 0 && (
                      <div className="text-[10px] text-gray-400">{Math.round((realTotal / row.total) * 100)}%</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center align-top">
                    {(() => {
                      const saldo = row.total - realTotal
                      if (row.total === 0 && realTotal === 0) return <span className="text-gray-300 text-xs">—</span>
                      if (Math.abs(saldo) < 0.05) return <span className="text-green-600 text-xs font-bold" title="Programado atingido">✓ 0</span>
                      if (saldo > 0) return <span className="text-gray-500 text-xs font-medium" title="Falta realizar">{fmt1(saldo)}</span>
                      return <span className="text-amber-600 text-xs font-bold" title="Ultrapassou o programado">▲ +{fmt1(-saldo)}</span>
                    })()}
                  </td>
                </tr>
                )
              })}

              {/* Linha de nova entrada */}
              {addMode && (
                <tr className="bg-blue-50">
                  <td className="px-2 py-2">
                    <input value={novaLinha.numeroContrato} placeholder="Nº contr."
                      onChange={(e) => setNovaLinha((p) => ({ ...p, numeroContrato: e.target.value }))}
                      onBlur={(e) => buscarContrato(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscarContrato((e.target as HTMLInputElement).value)}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none font-mono" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={novaLinha.boxId} onChange={(e) => setNovaLinha((p) => ({ ...p, boxId: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none">
                      <option value="">Box...</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input list="clientes-list" value={novaLinha.clienteNome} placeholder={buscandoCtr ? "buscando…" : "Cliente *"}
                      onChange={(e) => setNovaLinha((p) => ({ ...p, clienteNome: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none" />
                    <datalist id="clientes-list">{clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo}</option>)}</datalist>
                  </td>
                  <td className="px-2 py-2">
                    <input list="produtos-list" value={novaLinha.produto} placeholder="Produto *"
                      onChange={(e) => setNovaLinha((p) => ({ ...p, produto: e.target.value }))}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none" />
                    <datalist id="produtos-list">{produtos.map((p) => <option key={p.id} value={p.descricao}>{p.codigo}</option>)}</datalist>
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
                  <td />
                </tr>
              )}
              {addMode && ctrInfo && (
                <tr className="bg-blue-50">
                  <td colSpan={14} className="px-3 pb-2 text-[11px] text-blue-700">{ctrInfo}</td>
                </tr>
              )}

              {/* Linha de totais */}
              {filtradas.length > 0 && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td colSpan={4} className="px-3 py-2.5 text-xs text-gray-600 font-semibold">TOTAL SEMANA</td>
                  {totaisDia.map((t, i) => {
                    const e = estiloDia(t, realizadoDia[i])
                    return (
                    <td key={i} className="px-2 py-2.5 text-center text-xs align-top">
                      <div className="text-blue-700">{t > 0 ? t.toLocaleString("pt-BR") : "—"}</div>
                      <div className={`text-[10px] px-0.5 ${e.cls}`}>{realizadoDia[i] > 0 ? `${e.sym} ${fmt1(realizadoDia[i])}`.trim() : ""}</div>
                    </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center text-blue-800 align-top">{totalGeral.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-center text-green-700 align-top">{realizadoGeral > 0 ? fmt1(realizadoGeral) : "—"}</td>
                  <td className="px-3 py-2.5 text-center align-top">
                    {(() => {
                      const saldo = totalGeral - realizadoGeral
                      if (totalGeral === 0 && realizadoGeral === 0) return <span className="text-gray-300 text-xs">—</span>
                      if (Math.abs(saldo) < 0.05) return <span className="text-green-600 text-xs">✓</span>
                      if (saldo > 0) return <span className="text-gray-600 text-xs">{fmt1(saldo)}</span>
                      return <span className="text-amber-600 text-xs">▲ +{fmt1(-saldo)}</span>
                    })()}
                  </td>
                </tr>
              )}

              {filtradas.length === 0 && !addMode && (
                <tr><td colSpan={14} className="py-12 text-center text-gray-400">
                  Nenhuma programação para a semana {semana}. Clique em "Adicionar linha" para começar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda dos indicadores */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-600">Realizado (marcação):</span>
        <span><span className="text-green-700 font-semibold">✓ verde</span> = atingiu o programado</span>
        <span><span className="text-amber-600 font-semibold">▲ âmbar</span> = ultrapassou / sem programação</span>
        <span><span className="text-blue-600 font-semibold">azul</span> = parcial</span>
        <span className="text-gray-400">|</span>
        <span><strong>Saldo</strong> = programado − realizado (▲+ = excedente)</span>
      </div>
    </div>
  )
}
