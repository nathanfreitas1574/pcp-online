"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ShieldCheck, CheckCircle2, AlertTriangle, Clock, Landmark, FileCheck2 } from "lucide-react"

type Reg = {
  numero: string; cliente: string | null; data: string | null; numeroNF: string | null
  motivoErro: string | null; observacao: string | null; usuario: string | null
  statusAprovacao: string | null
  aprovadoFiscal: boolean; aprovadoFiscalPor: string | null; aprovadoFiscalEm: string | null
  aprovadoFinanceiro: boolean; aprovadoFinanceiroPor: string | null; aprovadoFinanceiroEm: string | null
  taxaCancelamento: number | null
}

const dt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"
const dtH = (s: string | null) => s ? new Date(s).toLocaleString("pt-BR") : ""
const brl = (n: number | null) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function AprovarNotaPage() {
  const params = useParams<{ token: string }>()
  const search = useSearchParams()
  const token = params.token
  const papel = (search.get("p") === "financeiro" ? "financeiro" : search.get("p") === "fiscal" ? "fiscal" : "") as "" | "fiscal" | "financeiro"

  const [reg, setReg] = useState<Reg | null>(null)
  const [loading, setLoading] = useState(true)
  const [naoExiste, setNaoExiste] = useState(false)
  const [nome, setNome] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/public/aprovar-nota?token=${encodeURIComponent(token)}`)
    if (r.ok) setReg(await r.json())
    else setNaoExiste(true)
    setLoading(false)
  }, [token])
  useEffect(() => { carregar() }, [carregar])

  async function validar(qualPapel: "fiscal" | "financeiro") {
    setErro("")
    if (!nome.trim()) { setErro("Informe seu nome para validar."); return }
    setSalvando(true)
    const r = await fetch("/api/public/aprovar-nota", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, papel: qualPapel, nome }),
    })
    const d = await r.json().catch(() => ({}))
    setSalvando(false)
    if (r.ok) { setNome(""); await carregar() }
    else setErro(d.error ?? "Erro ao validar.")
  }

  if (loading) return <Wrap><p className="text-center text-gray-400 py-10">Carregando…</p></Wrap>
  if (naoExiste || !reg) return (
    <Wrap><div className="text-center py-8"><AlertTriangle className="text-amber-500 mx-auto mb-2" size={40} /><p className="font-semibold text-gray-700">Registro não encontrado</p><p className="text-sm text-gray-500">O link pode estar incorreto ou expirado.</p></div></Wrap>
  )

  const aprovado = reg.statusAprovacao === "APROVADO"

  const Cartao = ({ tipoPapel, ok, por, em, icon }: { tipoPapel: "fiscal" | "financeiro"; ok: boolean; por: string | null; em: string | null; icon: React.ReactNode }) => {
    const titulo = tipoPapel === "fiscal" ? "Fiscal Interno" : "Financeiro"
    const destaque = papel === tipoPapel
    return (
      <div className={`rounded-2xl border p-4 ${ok ? "bg-green-50 border-green-200" : destaque ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">{icon} {titulo}</div>
          {ok
            ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 size={14} /> Validado</span>
            : <span className="flex items-center gap-1 text-xs font-semibold text-gray-400"><Clock size={14} /> Pendente</span>}
        </div>
        {ok ? (
          <p className="text-xs text-gray-500">por <strong className="text-gray-700">{por}</strong>{em ? ` · ${dtH(em)}` : ""}</p>
        ) : (!aprovado && (papel === "" || destaque)) ? (
          <button onClick={() => validar(tipoPapel)} disabled={salvando}
            className="mt-1 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition">
            {salvando ? "Validando…" : `Validar como ${titulo}`}
          </button>
        ) : (
          <p className="text-xs text-gray-400">Aguardando validação.</p>
        )}
      </div>
    )
  }

  return (
    <Wrap>
      <div className="flex flex-col items-center text-center mb-4">
        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 mb-2"><ShieldCheck className="text-white" size={24} /></div>
        <h1 className="text-lg font-bold text-gray-800">Aprovação de Cancelamento Extemporâneo</h1>
        <p className="text-xs text-gray-500">{papel === "fiscal" ? "Validação do Fiscal Interno" : papel === "financeiro" ? "Validação do Financeiro" : "Validação Fiscal Interno + Financeiro"}</p>
      </div>

      {/* Dados do registro */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 text-sm">
        <Linha k="Número" v={reg.numero} mono />
        <Linha k="NF cancelada" v={reg.numeroNF || "—"} mono />
        <Linha k="Cliente" v={reg.cliente || "—"} />
        <Linha k="Data" v={dt(reg.data)} />
        <Linha k="Motivo" v={reg.motivoErro || "—"} />
        <Linha k="Lançado por" v={reg.usuario || "—"} />
        {reg.observacao && <Linha k="Observação" v={reg.observacao} />}
      </div>

      {/* Status final */}
      {aprovado ? (
        <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-4 text-center">
          <FileCheck2 className="text-green-600 mx-auto mb-1" size={28} />
          <p className="font-bold text-green-800">Cancelamento aprovado</p>
          <p className="text-sm text-green-700 mt-1">Taxa de cancelamento gerada: <strong>{brl(reg.taxaCancelamento)}</strong></p>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 mb-4 text-xs text-purple-800 text-center">
          A taxa de cancelamento (<strong>valor fixo</strong>) será gerada quando o Fiscal Interno <strong>e</strong> o Financeiro validarem.
        </div>
      )}

      {/* Nome (quando ainda há algo a validar) */}
      {!aprovado && (
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Seu nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Quem está validando" />
        </div>
      )}

      <div className="space-y-3">
        <Cartao tipoPapel="fiscal" ok={reg.aprovadoFiscal} por={reg.aprovadoFiscalPor} em={reg.aprovadoFiscalEm} icon={<FileCheck2 size={15} className="text-purple-600" />} />
        <Cartao tipoPapel="financeiro" ok={reg.aprovadoFinanceiro} por={reg.aprovadoFinanceiroPor} em={reg.aprovadoFinanceiroEm} icon={<Landmark size={15} className="text-purple-600" />} />
      </div>

      {erro && <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm"><AlertTriangle size={15} /> {erro}</div>}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6">{children}</div>
    </div>
  )
}

function Linha({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 text-xs">{k}</span>
      <span className={`text-gray-700 text-right ${mono ? "font-mono text-xs" : "text-sm"}`}>{v}</span>
    </div>
  )
}
