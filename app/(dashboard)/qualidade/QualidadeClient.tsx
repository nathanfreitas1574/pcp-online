"use client"

import { useState } from "react"
import { Plus, CheckCircle, XCircle, Clock, FlaskConical } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Registro = {
  id: string; boxId: string | null; boxCodigo: string | null
  produtoId: string | null; produtoDesc: string; clienteNome: string | null
  lote: string | null; resultado: string; umidade: number | null
  granulometria: number | null; pureza: number | null
  observacao: string | null; responsavel: string | null
  createdAt: Date | string
  box: { codigo: string } | null; produto: { descricao: string } | null
}

type Box = { id: string; codigo: string }
type Produto = { id: string; codigo: string; descricao: string }
type Cliente = { id: string; nome: string; codigo: string }

const RES_CONFIG: Record<string, { cor: string; bg: string; icon: React.ElementType }> = {
  APROVADO: { cor: "text-green-700", bg: "bg-green-100", icon: CheckCircle },
  REPROVADO: { cor: "text-red-700", bg: "bg-red-100", icon: XCircle },
  PENDENTE: { cor: "text-yellow-700", bg: "bg-yellow-100", icon: Clock },
}

export default function QualidadeClient({
  registros, boxes, produtos, clientes, aprovados, reprovados, pendentes
}: {
  registros: Registro[]; boxes: Box[]; produtos: Produto[]; clientes: Cliente[]
  aprovados: number; reprovados: number; pendentes: number
}) {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState("TODOS")
  const [form, setForm] = useState({
    boxId: "", produtoId: "", clienteNome: "", lote: "",
    resultado: "APROVADO", umidade: "", granulometria: "", pureza: "", observacao: "", responsavel: ""
  })

  const filtrados = filtro === "TODOS" ? registros : registros.filter((r) => r.resultado === filtro)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/qualidade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        produtoDesc: produtos.find((p) => p.id === form.produtoId)?.descricao ?? form.produtoId,
        umidade: form.umidade ? parseFloat(form.umidade) : null,
        granulometria: form.granulometria ? parseFloat(form.granulometria) : null,
        pureza: form.pureza ? parseFloat(form.pureza) : null,
      }),
    })
    setSaving(false); setShowModal(false); window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FlaskConical size={24} className="text-blue-600" /> Controle de Qualidade
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Análises de qualidade por lote, produto e box</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={15} /> Nova Análise
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Aprovados", valor: aprovados, Icon: CheckCircle, cor: "green" },
          { label: "Reprovados", valor: reprovados, Icon: XCircle, cor: "red" },
          { label: "Pendentes", valor: pendentes, Icon: Clock, cor: "yellow" },
        ].map(({ label, valor, Icon, cor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-${cor}-100 text-${cor}-600`}><Icon size={20} /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-800">{valor}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {["TODOS","APROVADO","REPROVADO","PENDENTE"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === f ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}>{f}</button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Data","Box","Produto","Cliente","Lote","Umidade","Granulom.","Pureza","Resultado","Responsável"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.map((r) => {
              const cfg = RES_CONFIG[r.resultado] ?? RES_CONFIG.PENDENTE
              const Icon = cfg.icon
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(r.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{r.boxCodigo ?? "—"}</span></td>
                  <td className="px-3 py-2 font-medium text-gray-800 text-xs">{r.produtoDesc}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{r.clienteNome ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.lote ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.umidade != null ? `${r.umidade}%` : "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.granulometria != null ? `${r.granulometria}%` : "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.pureza != null ? `${r.pureza}%` : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.cor}`}>
                      <Icon size={11} />{r.resultado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.responsavel ?? "—"}</td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-gray-400">Nenhuma análise registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Nova Análise de Qualidade</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Box</label>
                  <select value={form.boxId} onChange={(e) => setForm((f) => ({ ...f, boxId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Nenhum</option>
                    {boxes.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produtoId} onChange={(e) => setForm((f) => ({ ...f, produtoId: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                  <select value={form.clienteNome} onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Nenhum</option>
                    {clientes.map((c) => <option key={c.id} value={c.nome}>{c.codigo} — {c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lote</label>
                  <input value={form.lote} onChange={(e) => setForm((f) => ({ ...f, lote: e.target.value }))}
                    placeholder="Ex: L2026-001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: "umidade", label: "Umidade (%)" },
                  { field: "granulometria", label: "Granulometria (%)" },
                  { field: "pureza", label: "Pureza (%)" },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input type="number" step="0.01" min="0" max="100"
                      value={form[field as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Resultado *</label>
                <div className="grid grid-cols-3 gap-2">
                  {["APROVADO","PENDENTE","REPROVADO"].map((r) => (
                    <button key={r} type="button" onClick={() => setForm((f) => ({ ...f, resultado: r }))}
                      className={`py-2 rounded-lg text-sm font-medium border-2 transition ${
                        form.resultado === r
                          ? r === "APROVADO" ? "border-green-600 bg-green-50 text-green-700"
                            : r === "REPROVADO" ? "border-red-600 bg-red-50 text-red-700"
                            : "border-yellow-500 bg-yellow-50 text-yellow-700"
                          : "border-gray-200 text-gray-500"
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Responsável</label>
                <input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                  placeholder="Nome do analista" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">
                  {saving ? "Salvando…" : "Registrar Análise"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
