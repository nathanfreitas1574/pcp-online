"use client"

import { useState } from "react"
import { Camera, ClipboardCheck, Lock, Unlock } from "lucide-react"

export type VistoriaBoxOption = {
  id: string
  codigo: string
  descricao: string
  capacidade: number
  volumeAtual: number
  produto: string | null
  cliente: string | null
  navio?: string | null
  dataRecebimento?: string | Date | null
  codigoLacre?: string | null
  movimentadoHoje?: boolean
}

export default function VistoriaDiariaModal({
  boxes,
  onClose,
}: {
  boxes: VistoriaBoxOption[]
  onClose: () => void
}) {
  const [boxId, setBoxId] = useState("")
  const [lacreConforme, setLacreConforme] = useState(true)
  const [observacao, setObservacao] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const box = boxes.find((b) => b.id === boxId) ?? null
  const hoje = new Date().toLocaleDateString("pt-BR")

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!box) return
    setSaving(true)
    setMsg("")
    const res = await fetch("/api/vistoria-diaria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boxId: box.id,
        lacreConforme,
        codigoLacre: box.codigoLacre,
        observacao,
        foto,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg("Vistoria registrada com sucesso!")
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setMsg("Erro ao registrar vistoria.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={20} className="text-blue-700" />
          <h3 className="font-bold text-gray-800 text-lg">Vistoria do Dia</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Lançamento referente a {hoje}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o box</label>
            <select
              value={boxId}
              onChange={(e) => { setBoxId(e.target.value); setLacreConforme(true); setMsg("") }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione…</option>
              {boxes.map((b) => (
                <option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>
              ))}
            </select>
          </div>

          {box && (
            <>
              {/* Dados auto-preenchidos */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Data</p>
                  <p className="font-medium text-gray-800">{hoje}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Volume</p>
                  <p className="font-medium text-gray-800">
                    {box.volumeAtual.toLocaleString("pt-BR")} / {box.capacidade.toLocaleString("pt-BR")} ton
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Produto</p>
                  <p className="font-medium text-gray-800">{box.produto ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Cliente</p>
                  <p className="font-medium text-gray-800">{box.cliente ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Navio</p>
                  <p className="font-medium text-gray-800">{box.navio ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Data recebimento</p>
                  <p className="font-medium text-gray-800">
                    {box.dataRecebimento ? new Date(box.dataRecebimento).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs">Número do lacre</p>
                  <p className="font-medium text-gray-800">{box.codigoLacre ?? "Sem lacre registrado"}</p>
                </div>
              </div>

              {/* Confirmação de lacre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmação do lacre</label>
                {!box.movimentadoHoje && (
                  <p className="text-xs text-gray-500 mb-2">
                    Este box não foi movimentado hoje — deve permanecer lacrado com o número{" "}
                    <strong>{box.codigoLacre ?? "registrado"}</strong>. Confirme se está conforme.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLacreConforme(true)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition ${
                      lacreConforme ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Lock size={16} /> Box lacrado — conforme
                  </button>
                  <button
                    type="button"
                    onClick={() => setLacreConforme(false)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition ${
                      !lacreConforme ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Unlock size={16} /> Não conforme
                  </button>
                </div>
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto da vistoria</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 transition">
                  {foto ? (
                    <img src={foto} alt="Foto da vistoria" className="max-h-40 rounded-lg object-contain" />
                  ) : (
                    <>
                      <Camera size={28} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Tirar foto / selecionar imagem</span>
                    </>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                </label>
                {foto && (
                  <button type="button" onClick={() => setFoto(null)} className="text-xs text-red-600 mt-1 hover:underline">
                    Remover foto
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  placeholder="Opcional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {msg && (
            <div className={`px-4 py-2 rounded-lg text-sm ${msg.includes("sucesso") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {msg}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!box || saving}
            className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition"
          >
            {saving ? "Salvando…" : "Registrar Vistoria"}
          </button>
        </div>
      </div>
    </div>
  )
}
