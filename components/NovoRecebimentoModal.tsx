"use client"

import { useState } from "react"
import { Ship, X, Plus, Calendar, Package, User, Box as BoxIcon } from "lucide-react"
import ArmazemBoxSelect from "@/components/ArmazemBoxSelect"

type BoxOption = {
  id: string; codigo: string; descricao: string
  armazemId?: string | null; armazemNome?: string | null; armazemCodigo?: string | null
}
type NavioOption = {
  id: string; nome: string; eta: string; produto?: string | null; clienteNome?: string | null
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

export default function NovoRecebimentoModal({
  boxes,
  navios,
  onClose,
  onSaved,
}: {
  boxes: BoxOption[]
  navios: NavioOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [armazemSel, setArmazemSel] = useState("")
  const [boxId, setBoxId]           = useState("")
  const [naveId, setNaveId]         = useState("")
  const [naveNome, setNaveNome]     = useState("")
  const [produto, setProduto]       = useState("")
  const [cliente, setCliente]       = useState("")
  const [volumePrev, setVolumePrev] = useState("")
  const [dataPrevisao, setData]     = useState("")
  const [observacao, setObs]        = useState("")
  const [saving, setSaving]         = useState(false)
  const [erro, setErro]             = useState("")

  // Ao selecionar um navio, preenche automaticamente campos relacionados
  function selectNavio(id: string) {
    setNaveId(id)
    const n = navios.find(x => x.id === id)
    if (n) {
      setNaveNome(n.nome)
      if (n.produto)     setProduto(n.produto)
      if (n.clienteNome) setCliente(n.clienteNome)
      if (!dataPrevisao) setData(n.eta.slice(0, 10))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!boxId)        { setErro("Selecione um box."); return }
    if (!dataPrevisao) { setErro("Informe a data de previsão."); return }
    if (!produto)      { setErro("Informe o produto."); return }
    if (!cliente)      { setErro("Informe o cliente."); return }

    setSaving(true); setErro("")
    const res = await fetch("/api/previsao-recebimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boxId, naveId: naveId || null, naveNome: naveNome || null,
        produto, cliente, volumePrev: volumePrev || null,
        dataPrevisao, observacao: observacao || null,
      }),
    })
    setSaving(false)
    if (res.ok) { onSaved() }
    else        { setErro("Erro ao salvar. Tente novamente.") }
  }

  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg"><Ship size={18} className="text-blue-700" /></div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Programar Recebimento</h3>
              <p className="text-xs text-gray-500">Agende o recebimento de produto em um box</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Navio (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Ship size={12} className="text-blue-600" /> Navio (opcional)
            </label>
            {navios.length > 0 ? (
              <select value={naveId} onChange={e => selectNavio(e.target.value)} className={inp}>
                <option value="">— Selecione ou deixe em branco —</option>
                {navios.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.nome} · ETA {new Date(n.eta).toLocaleDateString("pt-BR")}
                    {n.produto ? ` · ${n.produto}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input value={naveNome} onChange={e => setNaveNome(e.target.value)}
                placeholder="Nome do navio (ex: MSC Lucinda)" className={inp} />
            )}
            {navios.length > 0 && naveId === "" && (
              <input value={naveNome} onChange={e => setNaveNome(e.target.value)} className={`${inp} mt-2`}
                placeholder="Ou digite o nome manualmente" />
            )}
          </div>

          {/* Box em cascata */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <BoxIcon size={12} className="text-blue-600" /> Box de destino <span className="text-red-500">*</span>
            </label>
            <ArmazemBoxSelect
              boxes={boxes}
              armazemSel={armazemSel}
              boxSel={boxId}
              onArmazem={setArmazemSel}
              onBox={setBoxId}
              obrigatorio
              labelArmazem="1. Selecione o armazém"
              labelBox="2. Selecione o box"
            />
          </div>

          {/* Produto + Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <Package size={12} className="text-blue-600" /> Produto <span className="text-red-500">*</span>
              </label>
              <input value={produto} onChange={e => setProduto(e.target.value)}
                required placeholder="Ex: UREIA 46%" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <User size={12} className="text-blue-600" /> Cliente <span className="text-red-500">*</span>
              </label>
              <input value={cliente} onChange={e => setCliente(e.target.value)}
                required placeholder="Ex: FTO" className={inp} />
            </div>
          </div>

          {/* Data previsão + Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <Calendar size={12} className="text-blue-600" /> Data de previsão <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dataPrevisao} onChange={e => setData(e.target.value)}
                min={hoje} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Volume previsto (ton)</label>
              <input type="number" min="0" step="0.1" value={volumePrev}
                onChange={e => setVolumePrev(e.target.value)} placeholder="Opcional" className={inp} />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
            <textarea rows={2} value={observacao} onChange={e => setObs(e.target.value)}
              placeholder="Opcional" className={`${inp} resize-none`} />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <Plus size={15} />
              {saving ? "Salvando…" : "Programar Recebimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
