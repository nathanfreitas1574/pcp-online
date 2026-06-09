"use client"

/**
 * Seleção em cascata: Armazém → Box
 * Agrupa os boxes pelo armazemId (ou por código se não tiver armazém atribuído).
 */

import { useMemo } from "react"
import { Warehouse } from "lucide-react"

export type BoxOption = {
  id: string
  codigo: string
  descricao: string
  armazemId?: string | null
  armazemNome?: string | null
  armazemCodigo?: string | null
}

type Props = {
  boxes: BoxOption[]
  armazemSel: string   // id do armazém selecionado (ou "")
  boxSel: string       // id do box selecionado (ou "")
  onArmazem: (id: string) => void
  onBox: (id: string) => void
  obrigatorio?: boolean
  labelArmazem?: string
  labelBox?: string
  className?: string
}

function inferirArmazem(codigo: string): string {
  if (/^B\d+/.test(codigo))        return "Nave"
  if (/^(BAIA|AZ01)/i.test(codigo)) return "AZ1 — Baias"
  if (/^AZ02/i.test(codigo))        return "AZ2 — Compactador"
  if (/^AZ0[3-9]/i.test(codigo))    return "Estruturado"
  return "Outros"
}

export default function ArmazemBoxSelect({
  boxes, armazemSel, boxSel, onArmazem, onBox,
  obrigatorio = false,
  labelArmazem = "Armazém",
  labelBox = "Box",
  className = "",
}: Props) {
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

  // Monta lista de armazéns únicos a partir dos boxes
  const armazens = useMemo(() => {
    const map = new Map<string, { key: string; nome: string; ordem: number }>()
    boxes.forEach(b => {
      const key  = b.armazemId   ?? `__${inferirArmazem(b.codigo)}`
      const nome = b.armazemNome ?? inferirArmazem(b.codigo)
      if (!map.has(key)) {
        const ordem = key.startsWith("__") ? 99 : 0
        map.set(key, { key, nome, ordem })
      }
    })
    return [...map.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
  }, [boxes])

  // Filtra boxes pelo armazém selecionado
  const boxesFiltrados = useMemo(() => {
    if (!armazemSel) return []
    return boxes.filter(b => {
      const key = b.armazemId ?? `__${inferirArmazem(b.codigo)}`
      return key === armazemSel
    })
  }, [boxes, armazemSel])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Passo 1 — Armazém */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-1.5">
            <Warehouse size={14} className="text-blue-600" />
            {labelArmazem}
            {obrigatorio && <span className="text-red-500">*</span>}
          </span>
        </label>
        <select
          value={armazemSel}
          onChange={e => { onArmazem(e.target.value); onBox("") }}
          required={obrigatorio}
          className={inp}
        >
          <option value="">Selecione o armazém…</option>
          {armazens.map(a => (
            <option key={a.key} value={a.key}>{a.nome}</option>
          ))}
        </select>
      </div>

      {/* Passo 2 — Box (só aparece depois do armazém) */}
      {armazemSel && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labelBox}
            {obrigatorio && <span className="text-red-500">*</span>}
          </label>
          <select
            value={boxSel}
            onChange={e => onBox(e.target.value)}
            required={obrigatorio}
            className={inp}
          >
            <option value="">Selecione o box…</option>
            {boxesFiltrados.map(b => (
              <option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>
            ))}
          </select>
          {boxesFiltrados.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Nenhum box neste armazém.</p>
          )}
        </div>
      )}
    </div>
  )
}
