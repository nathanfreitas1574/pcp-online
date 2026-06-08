"use client"

import { useState } from "react"
import { Plus, Search, Warehouse, PackageCheck, PackageX, Gauge, ClipboardCheck } from "lucide-react"
import BoxVisual, { BoxData } from "@/components/BoxVisual"
import VistoriaDiariaModal from "@/components/VistoriaDiariaModal"

type BoxItem = BoxData & {
  alertasAbertos: number
  ultimoLacre?: string | null
  codigoLacre?: string | null
  movimentadoHoje?: boolean
}

export default function BoxesVisualClient({
  boxes,
  totalCapacidade,
  totalVolume,
  boxesCheios,
  boxesLivres,
}: {
  boxes: BoxItem[]
  totalCapacidade: number
  totalVolume: number
  boxesCheios: number
  boxesLivres: number
}) {
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<"TODOS" | "LIVRE" | "OCUPADO" | "CRITICO">("TODOS")
  const [showModal, setShowModal] = useState(false)
  const [showVistoria, setShowVistoria] = useState(false)
  const [visao, setVisao] = useState<"GRADE" | "LINHA">("GRADE")
  const [form, setForm] = useState({ codigo: "", descricao: "", localizacao: "", capacidade: "" })
  const [saving, setSaving] = useState(false)

  const pctTotal = totalCapacidade > 0 ? (totalVolume / totalCapacidade) * 100 : 0

  // Agrupa por linha de armazenagem a partir do código (ex: "AZ01A" -> "AZ01", "B01" -> "NAVE")
  function linhaDoBox(codigo: string) {
    if (/^B\d+/.test(codigo)) return "NAVE (B01–B12)"
    const az = codigo.match(/^AZ0?(\d+)/)
    if (az) return `AZ${az[1].padStart(2, "0")}`
    return "Outros"
  }

  const linhas = boxes.reduce<Record<string, BoxItem[]>>((acc, b) => {
    const linha = linhaDoBox(b.codigo)
    acc[linha] = acc[linha] ?? []
    acc[linha].push(b)
    return acc
  }, {})
  const linhasOrdenadas = Object.keys(linhas).sort()

  const filtered = boxes.filter((b) => {
    const pct = b.capacidade > 0 ? (b.volumeAtual / b.capacidade) * 100 : 0
    const matchSearch =
      b.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (b.produto ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.cliente ?? "").toLowerCase().includes(search.toLowerCase())
    const matchFiltro =
      filtro === "TODOS" ||
      (filtro === "LIVRE" && b.volumeAtual === 0) ||
      (filtro === "OCUPADO" && b.volumeAtual > 0 && pct < 90) ||
      (filtro === "CRITICO" && pct >= 90)
    return matchSearch && matchFiltro
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacidade: Number(form.capacidade) }),
    })
    setSaving(false)
    setShowModal(false)
    window.location.reload()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Box</h2>
          <p className="text-gray-500 text-sm mt-0.5">{boxes.length} boxes · ocupação visual em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVistoria(true)}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <ClipboardCheck size={16} /> Realizar Vistoria
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} /> Novo Box
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Ocupação Geral",
            value: `${pctTotal.toFixed(1)}%`,
            sub: `${totalVolume.toLocaleString("pt-BR")} / ${totalCapacidade.toLocaleString("pt-BR")} ton`,
            icon: Gauge,
            color: pctTotal >= 90 ? "red" : pctTotal >= 70 ? "orange" : "green",
          },
          {
            label: "Boxes Livres",
            value: boxesLivres,
            sub: "sem produto",
            icon: PackageX,
            color: "blue",
          },
          {
            label: "Boxes Cheios",
            value: boxesCheios,
            sub: "≥ 90% capacidade",
            icon: PackageCheck,
            color: "red",
          },
          {
            label: "Total Boxes",
            value: boxes.length,
            sub: "ativos",
            icon: Warehouse,
            color: "gray",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
              <p className="text-xs text-gray-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de ocupação global */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Capacidade total do armazém</span>
          <span className="font-bold text-gray-800">{pctTotal.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pctTotal}%`,
              background: pctTotal >= 90 ? "#ef4444" : pctTotal >= 70 ? "#f97316" : "#22c55e",
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{(totalCapacidade * 0.25).toLocaleString("pt-BR")} ton</span>
          <span>{(totalCapacidade * 0.5).toLocaleString("pt-BR")} ton</span>
          <span>{(totalCapacidade * 0.75).toLocaleString("pt-BR")} ton</span>
          <span>{totalCapacidade.toLocaleString("pt-BR")} ton</span>
        </div>
      </div>

      {/* Alternar visão */}
      <div className="flex gap-2 mb-4">
        {(["GRADE", "LINHA"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVisao(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              visao === v ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {v === "GRADE" ? "Visão em Grade" : "Visão por Linha de Armazenagem"}
          </button>
        ))}
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Buscar box, produto ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(["TODOS", "LIVRE", "OCUPADO", "CRITICO"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              filtro === f
                ? f === "CRITICO"
                  ? "bg-red-600 text-white"
                  : "bg-blue-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "CRITICO" ? "⚠ Crítico" : f}
            {f !== "TODOS" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({
                  f === "LIVRE" ? boxes.filter((b) => b.volumeAtual === 0).length :
                  f === "OCUPADO" ? boxes.filter((b) => b.volumeAtual > 0 && b.volumeAtual / b.capacidade < 0.9).length :
                  boxes.filter((b) => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9).length
                })
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        {[
          { cor: "#3b82f6", label: "< 40%" },
          { cor: "#22c55e", label: "40–70%" },
          { cor: "#f97316", label: "70–90%" },
          { cor: "#ef4444", label: "≥ 90% (crítico)" },
        ].map(({ cor, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ background: cor }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Visão em grade */}
      {visao === "GRADE" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((box) => (
            <div key={box.id} className="relative">
              {box.alertasAbertos > 0 && (
                <div className="absolute -top-1 -left-1 z-10 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                  {box.alertasAbertos}
                </div>
              )}
              {box.ultimoLacre === "NAO_CONFORME" && (
                <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  ⚠ Lacre
                </div>
              )}
              <BoxVisual box={box} />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              Nenhum box encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* Visão por linha de armazenagem */}
      {visao === "LINHA" && (
        <div className="space-y-6">
          {linhasOrdenadas.map((linha) => {
            const boxesLinha = linhas[linha].filter((b) => filtered.some((f) => f.id === b.id))
            if (boxesLinha.length === 0) return null
            return (
              <div key={linha} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  {linha} <span className="text-gray-400 font-normal text-sm">({boxesLinha.length} boxes)</span>
                  {linha === "AZ02" && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">com compactador</span>
                  )}
                  {["AZ03", "AZ04", "AZ05", "AZ06", "AZ07", "AZ08"].includes(linha) && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">lados A e B</span>
                  )}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {boxesLinha.map((box) => (
                    <div key={box.id} className="relative">
                      {box.alertasAbertos > 0 && (
                        <div className="absolute -top-1 -left-1 z-10 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                          {box.alertasAbertos}
                        </div>
                      )}
                      {box.ultimoLacre === "NAO_CONFORME" && (
                        <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          ⚠ Lacre
                        </div>
                      )}
                      <BoxVisual box={box} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              Nenhum box encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* Modal novo box */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Novo Box</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { name: "codigo", label: "Código (ex: AZ01A)" },
                { name: "descricao", label: "Descrição" },
                { name: "localizacao", label: "Localização (ex: Alvenaria)" },
                { name: "capacidade", label: "Capacidade (ton)", type: "number" },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    value={form[name as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60 transition"
                >
                  {saving ? "Criando…" : "Criar Box"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal vistoria do dia */}
      {showVistoria && (
        <VistoriaDiariaModal
          boxes={boxes.map((b) => ({
            id: b.id,
            codigo: b.codigo,
            descricao: b.descricao,
            capacidade: b.capacidade,
            volumeAtual: b.volumeAtual,
            produto: b.produto,
            cliente: b.cliente,
            navio: b.navio,
            dataRecebimento: b.dataRecebimento,
            codigoLacre: b.codigoLacre,
            movimentadoHoje: b.movimentadoHoje,
          }))}
          onClose={() => setShowVistoria(false)}
        />
      )}
    </div>
  )
}
