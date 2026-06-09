"use client"

import { useState, useEffect } from "react"
import { Lock, Camera, CheckCircle2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Box = { id: string; codigo: string; descricao: string }

const STATUS_OPTS = [
  { value: "FECHADO",       label: "Fechado — conforme",      color: "border-green-400 bg-green-50 text-green-700" },
  { value: "ABERTO",        label: "Aberto",                  color: "border-yellow-400 bg-yellow-50 text-yellow-700" },
  { value: "NAO_CONFORME",  label: "Não conforme",            color: "border-red-400 bg-red-50 text-red-700" },
]

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

export default function RegistrarLacrePage() {
  const [boxes, setBoxes]               = useState<Box[]>([])
  const [boxId, setBoxId]               = useState("")
  const [nomeLacrador, setNomeLacrador] = useState("")
  const [status, setStatus]             = useState("FECHADO")
  const [codigoLacre, setCodigoLacre]   = useState("")
  const [observacao, setObservacao]     = useState("")
  const [foto, setFoto]                 = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [done, setDone]                 = useState(false)
  const [erro, setErro]                 = useState("")
  const [agora, setAgora]               = useState(new Date())

  // Carregar boxes
  useEffect(() => {
    fetch("/api/public/boxes").then(r => r.json()).then(d => setBoxes(d.boxes ?? []))
  }, [])

  // Relógio em tempo real
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (!boxId)           { setErro("Selecione o box."); return }
    if (!nomeLacrador.trim()) { setErro("Informe seu nome."); return }

    setSaving(true)
    const res = await fetch("/api/public/lacre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxId, nomeLacrador, status, codigoLacre, observacao, foto }),
    })
    setSaving(false)

    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json().catch(() => ({}))
      setErro(d.error ?? "Erro ao salvar. Tente novamente.")
    }
  }

  function novoRegistro() {
    setBoxId(""); setNomeLacrador(""); setStatus("FECHADO")
    setCodigoLacre(""); setObservacao(""); setFoto(null)
    setDone(false); setErro("")
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (done) {
    const box = boxes.find(b => b.id === boxId)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Lacre registrado!</h2>
          <p className="text-sm text-gray-500 mb-2">
            {box ? `${box.codigo} — ${box.descricao}` : ""}
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {format(agora, "dd/MM/yyyy · HH:mm", { locale: ptBR })}
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-left space-y-1.5">
            <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Lacrador:</span> {nomeLacrador}</p>
            <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Status:</span> {STATUS_OPTS.find(s=>s.value===status)?.label}</p>
            {codigoLacre && <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Código:</span> {codigoLacre}</p>}
          </div>
          <button
            onClick={novoRegistro}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 transition"
          >
            Registrar outro lacre
          </button>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-700 text-white px-5 py-5">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Lock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Registrar Lacre</h1>
            <p className="text-blue-200 text-xs">Fertalvo — PCP Online</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white font-bold text-lg tabular-nums">
              {format(agora, "HH:mm:ss")}
            </p>
            <p className="text-blue-200 text-xs">
              {format(agora, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">

        {/* Nome do lacrador */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            👤 Seu nome <span className="text-red-500">*</span>
          </label>
          <input
            value={nomeLacrador}
            onChange={e => setNomeLacrador(e.target.value)}
            placeholder="Ex: João Silva"
            autoCapitalize="words"
            className={inp}
          />
        </div>

        {/* Box */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            📦 Box <span className="text-red-500">*</span>
          </label>
          <select value={boxId} onChange={e => setBoxId(e.target.value)} className={inp}>
            <option value="">Selecione o box…</option>
            {boxes.map(b => (
              <option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>
            ))}
          </select>
        </div>

        {/* Status do lacre */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔒 Status do lacre <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {STATUS_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  status === opt.value ? opt.color : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {status === opt.value ? "✓ " : ""}{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Código do lacre */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            🏷️ Código do lacre
          </label>
          <input
            value={codigoLacre}
            onChange={e => setCodigoLacre(e.target.value)}
            placeholder="Ex: L-00123 (opcional)"
            className={inp}
          />
        </div>

        {/* Foto */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            📷 Foto do lacre
          </label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-blue-400 bg-white transition active:scale-98">
            {foto ? (
              <img src={foto} alt="Foto" className="max-h-48 rounded-xl object-contain" />
            ) : (
              <>
                <Camera size={32} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-400 font-medium">Tirar foto / galeria</span>
                <span className="text-xs text-gray-300 mt-0.5">Toque para abrir a câmera</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFoto}
            />
          </label>
          {foto && (
            <button type="button" onClick={() => setFoto(null)} className="text-xs text-red-500 mt-1 hover:underline">
              Remover foto
            </button>
          )}
        </div>

        {/* Observação */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            📝 Observação
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            placeholder="Opcional — descreva qualquer irregularidade"
            className={inp}
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0" />
            {erro}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-base hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
        >
          {saving ? "Salvando…" : "Registrar Lacre"}
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Data/hora registrada automaticamente · Fertalvo PCP Online
        </p>
      </form>
    </div>
  )
}
