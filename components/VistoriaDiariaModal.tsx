"use client"

import { useState } from "react"
import { Camera, ClipboardCheck, Lock, Unlock, Pencil, ExternalLink } from "lucide-react"
import ArmazemBoxSelect from "@/components/ArmazemBoxSelect"

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
  armazemId?: string | null
  armazemNome?: string | null
  armazemCodigo?: string | null
}

const inp = "w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

export default function VistoriaDiariaModal({
  boxes,
  onClose,
  onSaved,
}: {
  boxes: VistoriaBoxOption[]
  onClose: () => void
  onSaved?: (boxId: string, updates: Pick<VistoriaBoxOption, "volumeAtual" | "produto" | "cliente" | "navio">) => void
}) {
  const [armazemSel, setArmazemSel] = useState("")
  const [boxId, setBoxId] = useState("")
  const [lacreConforme, setLacreConforme] = useState(true)
  const [observacao, setObservacao] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  // Campos editáveis
  const [editProduto, setEditProduto] = useState("")
  const [editCliente, setEditCliente] = useState("")
  const [editNavio, setEditNavio] = useState("")
  const [editVolume, setEditVolume] = useState("")
  const [editLacre, setEditLacre] = useState("")

  const box = boxes.find((b) => b.id === boxId) ?? null
  const hoje = new Date().toLocaleDateString("pt-BR")

  function selectBox(id: string) {
    setBoxId(id)
    setLacreConforme(true)
    setMsg("")
    const b = boxes.find((x) => x.id === id)
    if (b) {
      setEditProduto(b.produto ?? "")
      setEditCliente(b.cliente ?? "")
      setEditNavio(b.navio ?? "")
      setEditVolume(String(b.volumeAtual))
      setEditLacre(b.codigoLacre ?? "")
    }
  }

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

    // 1. Atualizar estoque do box com os valores editados
    await fetch(`/api/boxes/${box.id}/estoque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volumeAtual: parseFloat(editVolume) || 0,
        produto: editProduto || null,
        cliente: editCliente || null,
        navio: editNavio || null,
        capacidade: box.capacidade,
      }),
    })

    // 2. Registrar vistoria do dia
    const res = await fetch("/api/vistoria-diaria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boxId: box.id,
        lacreConforme,
        codigoLacre: editLacre || null,
        observacao,
        foto,
      }),
    })

    setSaving(false)
    if (res.ok) {
      // Notifica o pai com os novos valores — SEM recarregar a página
      onSaved?.(box.id, {
        volumeAtual: parseFloat(editVolume) || 0,
        produto:     editProduto || null,
        cliente:     editCliente || null,
        navio:       editNavio  || null,
      })
      setMsg("✅ Vistoria registrada com sucesso!")
      // Após 2 s, limpa o formulário mas MANTÉM o armazém selecionado
      setTimeout(() => {
        setMsg("")
        setBoxId("")
        setObservacao("")
        setFoto(null)
        setLacreConforme(true)
        setEditProduto("")
        setEditCliente("")
        setEditNavio("")
        setEditVolume("")
        setEditLacre("")
      }, 2000)
    } else {
      setMsg("Erro ao registrar vistoria.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-blue-700" />
            <h3 className="font-bold text-gray-800 text-lg">Vistoria do Dia</h3>
          </div>
          <a
            href="/registrar-lacre"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition font-medium"
          >
            <Lock size={12} />
            Reg. Lacre
            <ExternalLink size={11} />
          </a>
        </div>
        <p className="text-sm text-gray-500 mb-4">Lançamento referente a {hoje}</p>

        <div className="space-y-4">
          {/* Seleção em cascata: Armazém → Box */}
          <ArmazemBoxSelect
            boxes={boxes}
            armazemSel={armazemSel}
            boxSel={boxId}
            onArmazem={setArmazemSel}
            onBox={id => selectBox(id)}
            obrigatorio
            labelArmazem="1. Selecione o armazém"
            labelBox="2. Selecione o box"
          />

          {box && (
            <>
              {/* Cabeçalho: data + capacidade (somente leitura) */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Data</p>
                  <p className="font-semibold text-gray-800">{hoje}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Capacidade</p>
                  <p className="font-semibold text-gray-800">{box.capacidade.toLocaleString("pt-BR")} ton</p>
                </div>
              </div>

              {/* Campos editáveis */}
              <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <Pencil size={13} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Dados do box — edite se necessário</p>
                </div>

                {/* Volume */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Volume atual (ton)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={box.capacidade}
                    step="0.1"
                    value={editVolume}
                    onChange={(e) => setEditVolume(e.target.value)}
                    className={inp}
                  />
                </div>

                {/* Produto + Cliente */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Produto</label>
                    <input
                      type="text"
                      value={editProduto}
                      onChange={(e) => setEditProduto(e.target.value)}
                      placeholder="Ex: UREIA 46%"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                    <input
                      type="text"
                      value={editCliente}
                      onChange={(e) => setEditCliente(e.target.value)}
                      placeholder="Ex: FTO"
                      className={inp}
                    />
                  </div>
                </div>

                {/* Navio + Número do lacre */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Navio</label>
                    <input
                      type="text"
                      value={editNavio}
                      onChange={(e) => setEditNavio(e.target.value)}
                      placeholder="Ex: MSC Lucinda"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número do lacre</label>
                    <input
                      type="text"
                      value={editLacre}
                      onChange={(e) => setEditLacre(e.target.value)}
                      placeholder="Ex: L-00123"
                      className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* Confirmação do lacre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmação do lacre</label>
                {!box.movimentadoHoje && (
                  <p className="text-xs text-gray-500 mb-2">
                    Este box não foi movimentado hoje — deve permanecer lacrado.
                    {editLacre && <> Número registrado: <strong>{editLacre}</strong>.</>} Confirme se está conforme.
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

              {/* Observação */}
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
