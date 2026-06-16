"use client"

import { useState, useEffect, useCallback } from "react"
import { ClipboardCheck, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Camera, X } from "lucide-react"

type Vistoria = {
  id: string; data: string; boxCodigo: string; boxDescricao: string
  usuario: string; conforme: boolean; observacao: string | null; fotos: number; fotosUrls: string[]
}
type FotoModal = { box: string; data: string; fotos: string[] }
type Props = { boxes: string[]; usuarios: string[] }

const dtH = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "UTC" })
const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

export default function HistoricoVistoriasClient({ boxes, usuarios }: Props) {
  const [itens, setItens] = useState<Vistoria[]>([])
  const [tot, setTot] = useState({ total: 0, conformes: 0, naoConformes: 0 })
  const [loading, setLoading] = useState(true)
  const [box, setBox] = useState("")
  const [usuario, setUsuario] = useState("")
  const [conforme, setConforme] = useState("")
  const [dataIni, setDataIni] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [fotoModal, setFotoModal] = useState<FotoModal | null>(null)

  const qs = useCallback(() => {
    const p = new URLSearchParams()
    if (box) p.set("box", box)
    if (usuario) p.set("usuario", usuario)
    if (conforme) p.set("conforme", conforme)
    if (dataIni) p.set("dataInicio", dataIni)
    if (dataFim) p.set("dataFim", dataFim)
    return p.toString()
  }, [box, usuario, conforme, dataIni, dataFim])

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/vistorias?" + qs())
    const d = await r.json()
    setItens(d.itens ?? [])
    setTot({ total: d.total ?? 0, conformes: d.conformes ?? 0, naoConformes: d.naoConformes ?? 0 })
    setLoading(false)
  }, [qs])
  useEffect(() => { carregar() }, [carregar])

  function limpar() { setBox(""); setUsuario(""); setConforme(""); setDataIni(""); setDataFim("") }
  function exportarExcel() { window.open("/api/vistorias/export?" + qs(), "_blank") }
  function exportarPDF() {
    const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))
    const linhas = itens.map(v => `<tr><td>${dtH(v.data)}</td><td>${esc(v.boxCodigo)}</td><td>${esc(v.usuario)}</td><td>${v.conforme ? "Conforme" : "Não conforme"}</td><td>${esc(v.observacao ?? "")}</td><td style="text-align:center">${v.fotos || ""}</td></tr>`).join("")
    const html = `<html><head><meta charset="utf-8"><title>Vistorias</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:18px;color:#111}h1{font-size:16px;margin:0}p{color:#555;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}</style></head><body><h1>Relatório de Vistorias</h1><p>${itens.length} registro(s) &middot; ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Data</th><th>Box</th><th>Usuário</th><th>Resultado</th><th>Observação</th><th>Fotos</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`
    const w = window.open("", "_blank"); if (!w) { alert("Permita pop-ups para PDF."); return }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center"><ClipboardCheck className="text-teal-700" size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Histórico de Vistorias</h1>
            <p className="text-sm text-gray-500">Vistorias diárias dos boxes (Realizar Vistoria) — com relatório</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarExcel} disabled={itens.length === 0} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"><FileSpreadsheet size={15} className="text-green-600" /> Excel</button>
          <button onClick={exportarPDF} disabled={itens.length === 0} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"><FileText size={15} className="text-red-600" /> PDF</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><ClipboardCheck size={14}/> Total de vistorias</div>
          <p className="text-2xl font-bold text-gray-800">{tot.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1"><CheckCircle2 size={14}/> Conformes</div>
          <p className="text-2xl font-bold text-green-700">{tot.conformes} <span className="text-sm font-medium text-gray-400">· {tot.total > 0 ? Math.round((tot.conformes / tot.total) * 100) : 0}%</span></p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${tot.naoConformes > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1"><AlertTriangle size={14}/> Não conformes</div>
          <p className={`text-2xl font-bold ${tot.naoConformes > 0 ? "text-red-700" : "text-gray-800"}`}>{tot.naoConformes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={box} onChange={e => setBox(e.target.value)} className={inp}>
            <option value="">Todos os boxes</option>
            {boxes.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={usuario} onChange={e => setUsuario(e.target.value)} className={inp}>
            <option value="">Todos os usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={conforme} onChange={e => setConforme(e.target.value)} className={inp}>
            <option value="">Conformes e não conformes</option>
            <option value="true">Só conformes</option>
            <option value="false">Só não conformes</option>
          </select>
          <div><label className="block text-[11px] text-gray-400 mb-0.5">de</label><input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className={inp + " py-1.5"} /></div>
          <div><label className="block text-[11px] text-gray-400 mb-0.5">até</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inp + " py-1.5"} /></div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={limpar} className="text-gray-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Limpar filtros</button>
          <div className="ml-auto self-center text-sm text-gray-500">{loading ? "Carregando…" : `${itens.length} vistoria(s)`}</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Data / Hora</th>
                <th className="text-left px-3 py-2.5 font-semibold">Box</th>
                <th className="text-left px-3 py-2.5 font-semibold">Usuário</th>
                <th className="text-left px-3 py-2.5 font-semibold">Resultado</th>
                <th className="text-left px-3 py-2.5 font-semibold">Observação</th>
                <th className="text-center px-3 py-2.5 font-semibold">Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map(v => (
                <tr key={v.id} className={v.conforme ? "hover:bg-teal-50/30" : "bg-red-50/40"}>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{dtH(v.data)}</td>
                  <td className="px-3 py-2"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{v.boxCodigo}</span></td>
                  <td className="px-3 py-2 text-gray-700">{v.usuario}</td>
                  <td className="px-3 py-2">
                    {v.conforme
                      ? <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">✓ Conforme</span>
                      : <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded">⚠ Não conforme</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-[300px] truncate" title={v.observacao ?? ""}>{v.observacao || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {v.fotos > 0
                      ? <button onClick={() => setFotoModal({ box: v.boxCodigo, data: dtH(v.data), fotos: v.fotosUrls })} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"><Camera size={13} /> ver {v.fotos > 1 ? `(${v.fotos})` : ""}</button>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
              {!loading && itens.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma vistoria encontrada. As vistorias são registradas pelo botão <strong>Realizar Vistoria</strong> na Gestão de Box.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de fotos */}
      {fotoModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setFotoModal(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                <div>
                  <p className="font-bold text-gray-800 text-sm">Fotos da vistoria — Box {fotoModal.box}</p>
                  <p className="text-xs text-gray-400">{fotoModal.data}</p>
                </div>
              </div>
              <button onClick={() => setFotoModal(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fotoModal.fotos.length === 0 && <p className="text-gray-400 text-sm col-span-2 text-center py-8">Sem fotos registradas.</p>}
              {fotoModal.fotos.map((f, i) => (
                <a key={i} href={f} target="_blank" rel="noopener noreferrer" className="block border border-gray-200 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-400 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt={`Foto ${i + 1}`} className="w-full h-auto object-contain bg-gray-50" />
                </a>
              ))}
            </div>
            <div className="px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400">Clique na imagem para abrir em tamanho real.</div>
          </div>
        </div>
      )}
    </div>
  )
}
