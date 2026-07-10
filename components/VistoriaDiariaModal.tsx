"use client"

import { useState, useEffect } from "react"
import { Camera, ClipboardCheck, Lock, Unlock, Pencil, ExternalLink, Ruler, History, Truck, Plus, ChevronDown } from "lucide-react"
import ArmazemBoxSelect from "@/components/ArmazemBoxSelect"
import { STATUS_USO_CFG, type StatusUsoBox } from "@/components/BoxVisual"
import { clienteMatch, produtoMatch } from "@/lib/texto"

type DescargaRef = { data: string; cliente: string; clienteDestino: string; produto: string; peso: number }

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
  statusUso?: StatusUsoBox | null
  obsBox?: string | null
  itens?: { produtoId: string; produto: string; cliente: string; quantidade: number; navio?: string }[]
}

// linha editável de produto do box na vistoria (espelho da fábrica no dia)
type ItemEdit = { produtoId: string | null; produto: string; cliente: string; quantidade: string; navio: string }

const inp = "w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

export default function VistoriaDiariaModal({
  boxes,
  boxInicial,
  onClose,
  onSaved,
}: {
  boxes: VistoriaBoxOption[]
  boxInicial?: string | null   // abre já com este box selecionado (ex.: vindo do "Editar" do card)
  onClose: () => void
  onSaved?: (boxId: string, updates: Pick<VistoriaBoxOption, "volumeAtual" | "produto" | "cliente" | "navio" | "statusUso" | "obsBox">) => void
}) {
  const [armazemSel, setArmazemSel] = useState("")
  const [boxId, setBoxId] = useState("")
  const [lacreConforme, setLacreConforme] = useState(true)
  const [observacao, setObservacao] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  // Campos editáveis — produtos do box (várias linhas) + lacre
  const [itensEdit, setItensEdit] = useState<ItemEdit[]>([])
  const [editLacre, setEditLacre] = useState("")
  const totalItens = itensEdit.reduce((s, i) => s + (parseFloat(i.quantidade) || 0), 0)

  // Semáforo de uso + OBS
  const [editStatusUso, setEditStatusUso] = useState<StatusUsoBox>("LIVRE")
  const [editObsBox, setEditObsBox] = useState("")

  // Medição física
  const [showMedicao, setShowMedicao] = useState(false)
  const [volMedido, setVolMedido] = useState("")
  const [obsMedicao, setObsMedicao] = useState("")
  const [savingMedicao, setSavingMedicao] = useState(false)
  const [msgMedicao, setMsgMedicao] = useState("")

  // Descargas recentes (CHECKOUT) da Marcação — REFERÊNCIA (não altera volume sozinho)
  const DIAS_REF = 10
  const [descRecentes, setDescRecentes] = useState<DescargaRef[]>([])
  const [refHoje, setRefHoje] = useState("")
  const [showDescargas, setShowDescargas] = useState(false)
  useEffect(() => {
    fetch(`/api/marcacoes/descargas-recentes?dias=${DIAS_REF}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setDescRecentes(d.descargas ?? []); setRefHoje(d.hoje ?? "") } })
      .catch(() => {})
  }, [])

  const box = boxes.find((b) => b.id === boxId) ?? null
  const hoje = new Date().toLocaleDateString("pt-BR")

  // Pré-seleciona o box quando o modal é aberto a partir do card (Editar → vistoria)
  useEffect(() => {
    if (!boxInicial) return
    const b = boxes.find((x) => x.id === boxInicial)
    if (!b) return
    setArmazemSel(b.armazemId ?? "")
    selectBox(b.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxInicial])

  // Descargas que casam com QUALQUER produto/cliente lançado nas linhas (ao vivo)
  const linhasValidas = itensEdit.filter((i) => i.produto.trim() && i.cliente.trim())
  const descCasadas = linhasValidas.length
    ? descRecentes.filter(d => linhasValidas.some(l =>
        (clienteMatch(d.cliente, l.cliente) || clienteMatch(d.clienteDestino, l.cliente)) &&
        produtoMatch(d.produto, l.produto)))
    : []
  const descHoje = descCasadas.filter(d => d.data === refHoje)
  const totalHoje = descHoje.reduce((s, d) => s + d.peso, 0)
  const totalPeriodo = descCasadas.reduce((s, d) => s + d.peso, 0)
  const fmtT = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

  function selectBox(id: string) {
    setBoxId(id)
    setLacreConforme(true)
    setMsg("")
    setShowMedicao(false)
    setMsgMedicao("")
    const b = boxes.find((x) => x.id === id)
    if (b) {
      const doBox: ItemEdit[] = (b.itens?.length
        ? b.itens.map((i) => ({ produtoId: i.produtoId, produto: i.produto, cliente: i.cliente, quantidade: String(i.quantidade || ""), navio: i.navio ?? "" }))
        : b.produto
          ? [{ produtoId: null, produto: b.produto, cliente: b.cliente ?? "", quantidade: String(b.volumeAtual || ""), navio: b.navio ?? "" }]
          : [])
      setItensEdit(doBox.length ? doBox : [{ produtoId: null, produto: "", cliente: "", quantidade: "", navio: "" }])
      setEditLacre(b.codigoLacre ?? "")
      setEditStatusUso((b.statusUso as StatusUsoBox) ?? "LIVRE")
      setEditObsBox(b.obsBox ?? "")
      setVolMedido(String(b.volumeAtual))
    }
  }

  async function handleMedicao() {
    if (!box) return
    setSavingMedicao(true)
    setMsgMedicao("")
    const res = await fetch(`/api/boxes/${box.id}/medicao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volumeMedido: parseFloat(volMedido) || 0, observacao: obsMedicao }),
    })
    setSavingMedicao(false)
    if (res.ok) {
      const dif = (parseFloat(volMedido) || 0) - totalItens
      setMsgMedicao(`✅ Medição registrada! Diferença: ${dif >= 0 ? "+" : ""}${dif.toLocaleString("pt-BR")} ton`)
      setObsMedicao("")
    } else {
      setMsgMedicao("Erro ao registrar medição.")
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

    // 1. Sincroniza os PRODUTOS do box com as linhas da vistoria (espelho da fábrica no dia)
    const finais = itensEdit.filter((i) => i.produto.trim())
    const originais = box.itens ?? []
    // remove produtos que saíram da lista
    for (const o of originais) {
      const continua = finais.some((f) => f.produtoId === o.produtoId || f.produto.trim().toUpperCase() === o.produto.trim().toUpperCase())
      if (!continua) await fetch(`/api/boxes/${box.id}/itens?produtoId=${encodeURIComponent(o.produtoId)}`, { method: "DELETE" }).catch(() => {})
    }
    // grava/atualiza cada linha (produto, cliente, quantidade, navio)
    for (const f of finais) {
      await fetch(`/api/boxes/${box.id}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto: f.produto.trim(), cliente: f.cliente.trim(), quantidade: parseFloat(f.quantidade) || 0, navio: f.navio || null }),
      }).catch(() => {})
    }
    // campos do box (semáforo, observação, capacidade) — sem mexer nos estoques
    await fetch(`/api/boxes/${box.id}/estoque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volumeAtual: totalItens,
        capacidade: box.capacidade,
        statusUso:  editStatusUso,
        obsBox:     editObsBox || null,
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
        volumeAtual: totalItens,
        produto:     finais[0]?.produto || null,
        cliente:     finais[0]?.cliente || null,
        navio:       finais[0]?.navio || null,
        statusUso:   editStatusUso,
        obsBox:      editObsBox || null,
      })
      setMsg("✅ Vistoria registrada com sucesso!")
      // Após 2 s, limpa o formulário mas MANTÉM o armazém selecionado
      setTimeout(() => {
        setMsg("")
        setBoxId("")
        setObservacao("")
        setFoto(null)
        setLacreConforme(true)
        setItensEdit([])
        setEditLacre("")
        setEditObsBox("")
        setEditStatusUso("LIVRE")
        setShowMedicao(false)
        setMsgMedicao("")
        setVolMedido("")
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

                {/* Produtos do box — espelho da fábrica no dia (várias linhas) */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_84px_24px] gap-1.5 text-[10px] font-semibold text-gray-500 px-0.5">
                    <span>Produto</span><span>Cliente</span><span className="text-right">Qtd (ton)</span><span />
                  </div>
                  {itensEdit.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_84px_24px] gap-1.5 items-center">
                      <input value={it.produto} placeholder="Ex: UREIA 46%"
                        onChange={(e) => setItensEdit((p) => p.map((x, i) => i === idx ? { ...x, produto: e.target.value } : x))} className={inp} />
                      <input value={it.cliente} placeholder="Ex: FTO"
                        onChange={(e) => setItensEdit((p) => p.map((x, i) => i === idx ? { ...x, cliente: e.target.value } : x))} className={inp} />
                      <input type="number" min="0" step="0.1" value={it.quantidade} placeholder="0"
                        onChange={(e) => setItensEdit((p) => p.map((x, i) => i === idx ? { ...x, quantidade: e.target.value } : x))} className={`${inp} text-right`} />
                      <button type="button" title="Remover produto" onClick={() => setItensEdit((p) => p.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-600 text-sm">✕</button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setItensEdit((p) => [...p, { produtoId: null, produto: "", cliente: "", quantidade: "", navio: "" }])}
                      className="flex items-center gap-1 text-xs font-medium text-blue-700 border border-blue-200 bg-white rounded-lg px-2.5 py-1.5 hover:bg-blue-50">
                      <Plus size={13} /> Adicionar produto
                    </button>
                    <p className="text-sm">
                      <span className="text-gray-500 text-xs">Total do box: </span>
                      <strong className={totalItens > box.capacidade ? "text-red-600" : "text-gray-800"}>{fmtT(totalItens)} ton</strong>
                      <span className="text-gray-400 text-xs"> / {box.capacidade.toLocaleString("pt-BR")}</span>
                    </p>
                  </div>
                </div>

                {/* Navio (1º produto) + Número do lacre */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Navio</label>
                    <input
                      type="text"
                      value={itensEdit[0]?.navio ?? ""}
                      onChange={(e) => setItensEdit((p) => p.map((x, i) => i === 0 ? { ...x, navio: e.target.value } : x))}
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

              {/* ── Referência: descargas da Marcação (CHECKOUT) — NÃO altera volume sozinho ── */}
              <div className="border border-emerald-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 text-sm font-semibold text-emerald-800">
                  <div className="flex items-center gap-2"><Truck size={15} /> Entrou via Marcação (referência)</div>
                  <span className="text-[11px] font-normal text-emerald-600">últimos {DIAS_REF} dias</span>
                </div>
                <div className="p-4 space-y-2 bg-emerald-50/30">
                  {linhasValidas.length === 0 ? (
                    <p className="text-xs text-gray-500">Preencha <strong>Cliente</strong> e <strong>Produto</strong> acima para ver as descargas casadas da Marcação de Veículos.</p>
                  ) : descCasadas.length === 0 ? (
                    <p className="text-xs text-gray-500">Nenhuma descarga (CHECKOUT) casou com os produtos/clientes lançados nos últimos {DIAS_REF} dias.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                        <div><span className="text-gray-500 text-xs">Hoje: </span><strong className="text-emerald-700">{fmtT(totalHoje)} t</strong> <span className="text-gray-400 text-xs">({descHoje.length} carga{descHoje.length !== 1 ? "s" : ""})</span></div>
                        <div><span className="text-gray-500 text-xs">Últimos {DIAS_REF} dias: </span><strong className="text-gray-700">{fmtT(totalPeriodo)} t</strong> <span className="text-gray-400 text-xs">({descCasadas.length})</span></div>
                      </div>
                      {totalHoje > 0 && (
                        <button type="button" disabled={itensEdit.length !== 1}
                          title={itensEdit.length !== 1 ? "Com mais de um produto, ajuste a quantidade na linha correspondente" : undefined}
                          onClick={() => setItensEdit((p) => p.map((x, i) => i === 0 ? { ...x, quantidade: String(((parseFloat(x.quantidade) || 0) + totalHoje)) } : x))}
                          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 hover:bg-emerald-50">
                          <Plus size={13} /> Somar hoje ao volume (+{fmtT(totalHoje)} t)
                        </button>
                      )}
                      <button type="button" onClick={() => setShowDescargas(v => !v)}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 hover:underline">
                        <ChevronDown size={12} className={showDescargas ? "rotate-180 transition" : "transition"} /> {showDescargas ? "ocultar" : "ver"} descargas
                      </button>
                      {showDescargas && (
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-emerald-100 bg-white divide-y divide-gray-50">
                          {descCasadas.slice(0, 30).map((d, i) => (
                            <div key={i} className="flex items-center justify-between px-2.5 py-1 text-[11px]">
                              <span className="text-gray-500 tabular-nums">{d.data.slice(8, 10)}/{d.data.slice(5, 7)}</span>
                              <span className="flex-1 px-2 text-gray-700 truncate">{d.produto}</span>
                              <span className="font-semibold text-gray-800 tabular-nums">{fmtT(d.peso)} t</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 leading-tight">Referência da Marcação — não altera o volume automaticamente (a Marcação não informa o box de destino). Confira e ajuste o volume acima se necessário.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Semáforo de uso do box */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  Status de uso do box
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.entries(STATUS_USO_CFG) as [StatusUsoBox, typeof STATUS_USO_CFG[StatusUsoBox]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditStatusUso(key)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                        editStatusUso === key
                          ? `${cfg.bg} ${cfg.cor} border-current`
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-base">{cfg.emoji}</span>
                      <span className="leading-tight text-center">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observação livre do box */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação do box (opcional)</label>
                <input
                  type="text"
                  value={editObsBox}
                  onChange={e => setEditObsBox(e.target.value)}
                  placeholder="Ex: Aguardando limpeza, Reservado cliente X…"
                  className={inp}
                />
              </div>

              {/* ── Medição Física ── */}
              <div className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMedicao(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition text-sm font-semibold text-purple-700"
                >
                  <div className="flex items-center gap-2">
                    <Ruler size={14} />
                    Medição Física / Inventário
                  </div>
                  <span className="text-xs font-normal text-purple-500">{showMedicao ? "▲ fechar" : "▼ abrir"}</span>
                </button>
                {showMedicao && (
                  <div className="p-4 space-y-3 bg-purple-50/30">
                    <p className="text-xs text-gray-500">
                      Registra a contagem física do box. Calculamos automaticamente a diferença em relação ao sistema ({fmtT(totalItens)} ton).
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Volume medido fisicamente (ton)</label>
                      <input
                        type="number" min="0" step="0.1"
                        value={volMedido}
                        onChange={e => setVolMedido(e.target.value)}
                        className={inp}
                      />
                      {volMedido && (
                        <p className={`text-xs mt-1 font-semibold ${
                          (parseFloat(volMedido)||0) - totalItens >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          Diferença: {((parseFloat(volMedido)||0)-totalItens)>=0?"+":""}
                          {((parseFloat(volMedido)||0)-totalItens).toLocaleString("pt-BR")} ton
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Observação da medição</label>
                      <input type="text" value={obsMedicao} onChange={e => setObsMedicao(e.target.value)}
                        placeholder="Ex: Contagem presencial com trena" className={inp} />
                    </div>
                    {msgMedicao && (
                      <p className={`text-xs font-medium ${msgMedicao.includes("✅") ? "text-green-700" : "text-red-600"}`}>{msgMedicao}</p>
                    )}
                    <button
                      type="button" onClick={handleMedicao} disabled={savingMedicao || !volMedido}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <History size={14} />
                      {savingMedicao ? "Registrando…" : "Registrar Medição"}
                    </button>
                  </div>
                )}
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
