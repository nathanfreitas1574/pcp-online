"use client"

import { useState } from "react"

export type BoxData = {
  id: string
  codigo: string
  descricao: string
  localizacao: string
  capacidade: number
  volumeAtual: number
  produto: string | null
  cliente: string | null
  diasEstocado?: number | null
  ultimoLacre?: string | null
}

function getLiquidColor(pct: number) {
  if (pct >= 90) return { bg: "#ef4444", wave: "#dc2626", text: "white" }
  if (pct >= 70) return { bg: "#f97316", wave: "#ea580c", text: "white" }
  if (pct >= 40) return { bg: "#22c55e", wave: "#16a34a", text: "white" }
  return { bg: "#3b82f6", wave: "#2563eb", text: "white" }
}

function BoxTank({
  pct,
  capacidade,
  volumeAtual,
  produto,
  cliente,
  diasEstocado,
}: {
  pct: number
  capacidade: number
  volumeAtual: number
  produto: string | null
  cliente: string | null
  diasEstocado?: number | null
}) {
  const clampedPct = Math.min(Math.max(pct, 0), 100)
  const { bg, wave, text } = getLiquidColor(clampedPct)
  const fillHeight = clampedPct

  return (
    <div className="relative w-full" style={{ height: 140 }}>
      {/* Container outline */}
      <div
        className="absolute inset-0 rounded-b-xl border-2 overflow-hidden"
        style={{ borderColor: bg, background: "#f8fafc" }}
      >
        {/* Liquid fill */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-in-out"
          style={{ height: `${fillHeight}%`, background: bg }}
        >
          {/* Wave SVG on top of liquid */}
          <svg
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className="absolute -top-3 left-0 w-full"
            style={{ height: 14 }}
          >
            <path
              d="M0,10 C50,0 100,20 150,10 C200,0 250,20 300,10 L300,20 L0,20 Z"
              fill={bg}
              opacity="0.8"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-150 0"
                to="0 0"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M0,10 C50,20 100,0 150,10 C200,20 250,0 300,10 L300,20 L0,20 Z"
              fill={wave}
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-150 0"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
          </svg>

          {/* Content inside liquid */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pt-4">
            {produto && (
              <p className="text-xs font-bold text-center leading-tight" style={{ color: text }}>
                {produto.length > 14 ? produto.substring(0, 14) + "…" : produto}
              </p>
            )}
            {cliente && (
              <p className="text-xs text-center opacity-90 leading-tight mt-0.5" style={{ color: text }}>
                {cliente.length > 14 ? cliente.substring(0, 14) + "…" : cliente}
              </p>
            )}
          </div>
        </div>

        {/* Empty state */}
        {clampedPct < 5 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-400 font-medium">LIVRE</p>
          </div>
        )}

        {/* Volume label — outside liquid when empty or top */}
        {clampedPct >= 5 && clampedPct < 30 && (
          <div className="absolute top-2 left-0 right-0 flex items-center justify-center">
            {produto && (
              <p className="text-xs font-bold text-gray-600 text-center px-1">{produto}</p>
            )}
          </div>
        )}
      </div>

      {/* % badge top right */}
      <div
        className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white z-10"
        style={{ background: bg, color: text }}
      >
        {Math.round(clampedPct)}%
      </div>

      {/* Capacity scale on left */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-1 -ml-5">
        {[100, 75, 50, 25, 0].map((tick) => (
          <div key={tick} className="flex items-center gap-0.5">
            <div className="w-1.5 h-px bg-gray-300" />
            <span className="text-gray-300" style={{ fontSize: 7 }}>{tick}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BoxVisual({
  box,
  onUpdate,
}: {
  box: BoxData
  onUpdate?: (id: string, volume: number, produto: string, cliente: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [novoVol, setNovoVol] = useState(String(box.volumeAtual))
  const [novoProduto, setNovoProduto] = useState(box.produto ?? "")
  const [novoCliente, setNovoCliente] = useState(box.cliente ?? "")
  const [saving, setSaving] = useState(false)

  const pct = box.capacidade > 0 ? (box.volumeAtual / box.capacidade) * 100 : 0
  const { bg } = getLiquidColor(pct)

  async function handleSave() {
    setSaving(true)
    const vol = parseFloat(novoVol) || 0
    await fetch(`/api/boxes/${box.id}/estoque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volumeAtual: vol, produto: novoProduto, cliente: novoCliente }),
    })
    setSaving(false)
    setEditing(false)
    onUpdate?.(box.id, vol, novoProduto, novoCliente)
    window.location.reload()
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-base">{box.codigo}</h3>
          <p className="text-xs text-gray-400">{box.localizacao}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition"
        >
          Editar
        </button>
      </div>

      {/* Tank visual */}
      <div className="pl-6">
        <BoxTank
          pct={pct}
          capacidade={box.capacidade}
          volumeAtual={box.volumeAtual}
          produto={box.produto}
          cliente={box.cliente}
          diasEstocado={box.diasEstocado}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Volume atual</p>
          <p className="font-bold text-gray-800">
            {box.volumeAtual.toLocaleString("pt-BR")}
            <span className="font-normal text-gray-400"> / {box.capacidade.toLocaleString("pt-BR")} ton</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Capacidade livre</p>
          <p className="font-bold" style={{ color: bg }}>
            {(box.capacidade - box.volumeAtual).toLocaleString("pt-BR")} ton
          </p>
        </div>
      </div>

      {box.diasEstocado && (
        <p className="text-xs text-gray-400 text-center">{box.diasEstocado} dias estocado</p>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">Atualizar Box {box.codigo}</h4>

            {/* Mini preview while editing */}
            <div className="mb-4 pl-6">
              <BoxTank
                pct={box.capacidade > 0 ? ((parseFloat(novoVol) || 0) / box.capacidade) * 100 : 0}
                capacidade={box.capacidade}
                volumeAtual={parseFloat(novoVol) || 0}
                produto={novoProduto || null}
                cliente={novoCliente || null}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume atual (ton)
                  <span className="text-gray-400 font-normal ml-1">— capacidade: {box.capacidade.toLocaleString("pt-BR")} ton</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={box.capacidade}
                  step="0.1"
                  value={novoVol}
                  onChange={(e) => setNovoVol(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max={box.capacidade}
                  step="100"
                  value={parseFloat(novoVol) || 0}
                  onChange={(e) => setNovoVol(e.target.value)}
                  className="w-full mt-2 accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <input
                  type="text"
                  value={novoProduto}
                  onChange={(e) => setNovoProduto(e.target.value)}
                  placeholder="Ex: UREIA 46%"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  placeholder="Ex: FTO"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 transition disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
