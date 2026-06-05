"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"

type Resultado = { tipo: string; titulo: string; subtitulo: string; href: string }

const COR_TIPO: Record<string, string> = {
  Box: "bg-blue-100 text-blue-700",
  Produto: "bg-green-100 text-green-700",
  Cliente: "bg-purple-100 text-purple-700",
  Alerta: "bg-red-100 text-red-700",
  "Movimentação": "bg-yellow-100 text-yellow-700",
}

export default function BuscaGlobal() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick as EventListener)
    return () => document.removeEventListener("mousedown", handleClick as EventListener)
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    clearTimeout(timer.current)
    if (val.length < 2) { setResultados([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResultados(data.resultados ?? [])
      setOpen(true)
      setLoading(false)
    }, 300)
  }

  function navegar(href: string) {
    setQuery(""); setOpen(false); setResultados([])
    router.push(href)
  }

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar qualquer coisa..."
          className="w-full pl-8 pr-7 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false) }} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading && <div className="px-4 py-3 text-sm text-gray-400">Buscando...</div>}
          {!loading && resultados.length === 0 && <div className="px-4 py-3 text-sm text-gray-400">Nenhum resultado para &quot;{query}&quot;</div>}
          {resultados.map((r, i) => (
            <button
              key={i}
              onClick={() => navegar(r.href)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition border-b border-gray-50 last:border-0"
            >
              <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${COR_TIPO[r.tipo] ?? "bg-gray-100 text-gray-600"}`}>{r.tipo}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                <p className="text-xs text-gray-400 truncate">{r.subtitulo}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
