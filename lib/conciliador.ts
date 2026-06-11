// ─── Motor de conciliação de DESCARGA e CARGA ───────────────────────────────
// Cruza 3 fontes: Marcação (Connect) → Romaneio (Proteus) → Estoque Contado
// (Materiais De/Em Terceiros), ancorado no veículo (marcação).
//
//   DESCARGA  →  Romaneio sentido ENTRADA  →  Estoque Poder Terc. R (entrada)
//   CARGA     →  Romaneio sentido SAIDA    →  Estoque Poder Terc. D (saída)
//
// Chaves: Marcação.Ordem = Romaneio.Cod.Romaneio ; Romaneio.NumeroNF =
// Estoque.Doc.Original. Cliente: ClienteDestino = NomeEntidade = RazaoSocial.
import type { MarcacaoParsed } from "./marcacao-columns"
import type { RomaneioParsed } from "./romaneio-columns"
import type { EstoqueParsed } from "./estoque-columns"

export type StatusConc = "CONCILIADO" | "DIVERGENTE"
export type OrigemItem = "MARCACAO" | "ESTOQUE"

// Tipos de divergência (também usados como rótulos/labels)
export const DIVERGENCIAS = {
  SEM_ROMANEIO:           "Marcação sem romaneio",
  ROMANEIO_NAO_CONFIRMADO:"Romaneio não confirmado",
  ROMANEIO_SEM_NF:        "Romaneio sem nota fiscal",
  SEM_CONTADO:            "Não entrou no estoque contado",
  PESO_DIVERGENTE:        "Peso divergente",
  CLIENTE_DIVERGENTE:     "Cliente divergente",
  SENTIDO_DIVERGENTE:     "Sentido (entrada/saída) divergente",
  CONTADO_SEM_CAMINHAO:   "Contado sem caminhão (NF sem marcação)",
} as const
export type TipoDivergencia = keyof typeof DIVERGENCIAS

export type ItemConciliacao = {
  origem: OrigemItem
  operacao: string | null
  ordem: string | null
  numeroNF: string | null
  placa: string | null
  cliente: string | null
  produto: string | null
  produtoRomaneio: string | null
  produtoEstoque: string | null
  pesoMarcacao: number | null
  pesoRomaneio: number | null
  pesoEstoque: number | null
  difPeso: number | null
  presencaMarcacao: boolean
  presencaRomaneio: boolean
  presencaEstoque: boolean
  stsRomaneio: string | null
  armazem: string | null
  status: StatusConc
  divergencias: TipoDivergencia[]
}

export type ResultadoConciliacao = {
  itens: ItemConciliacao[]
  resumo: {
    total: number
    conciliados: number
    divergentes: number
    descarga: number
    carga: number
    porDivergencia: Record<string, number>
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function normCliente(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(S\.?A\.?|S\/A|LTDA\.?|EIRELI|ME|EPP|CIA|COMPANHIA)\b/g, "")
    .replace(/[.,/-]/g, " ").replace(/\s+/g, " ").trim()
}

/** Chave numérica sem zeros à esquerda — casa "000130990" com "130990". */
function normDoc(s: string | null | undefined): string {
  const t = String(s ?? "").trim().replace(/\s+/g, "")
  if (!t) return ""
  const semZero = t.replace(/^0+/, "")
  return semZero || "0"
}

function sentidoEsperado(operacao: string | null): "ENTRADA" | "SAIDA" | null {
  const o = (operacao || "").toUpperCase()
  if (o.includes("DESCARGA")) return "ENTRADA"
  if (o.includes("CARGA"))    return "SAIDA"
  return null
}

function maxDifPeso(pesos: (number | null)[]): number | null {
  const v = pesos.filter((p): p is number => p !== null && p > 0)
  if (v.length < 2) return null
  return Math.max(...v) - Math.min(...v)
}

export function conciliar(
  marcacoes: MarcacaoParsed[],
  romaneios: RomaneioParsed[],
  estoque: EstoqueParsed[],
  opts: { tolerancia?: number } = {},
): ResultadoConciliacao {
  const tol = opts.tolerancia ?? 0

  // Índices
  const romByCod = new Map<string, RomaneioParsed>()
  for (const r of romaneios) {
    const k = normDoc(r.codRomaneio)
    if (k && !romByCod.has(k)) romByCod.set(k, r)
  }
  const estByNF = new Map<string, EstoqueParsed[]>()
  for (const e of estoque) {
    const k = normDoc(e.docOriginal)
    if (!k) continue
    const arr = estByNF.get(k) ?? []
    arr.push(e)
    estByNF.set(k, arr)
  }

  const itens: ItemConciliacao[] = []
  const nfsComCaminhao = new Set<string>()       // NFs já cobertas por marcação
  const romaneiosUsados = new Set<string>()

  // ── 1. Forward: ancorado na marcação (carga e descarga) ──────────────────
  for (const m of marcacoes) {
    const operacao = m.operacao
    const ordemKey = normDoc(m.ordem || m.romaneio)
    const rom = ordemKey ? romByCod.get(ordemKey) : undefined
    if (rom) romaneiosUsados.add(normDoc(rom.codRomaneio))

    const nfKey = rom?.numeroNF ? normDoc(rom.numeroNF) : ""
    // escolhe a linha de estoque com sentido compatível, senão a primeira
    const sentEsper = sentidoEsperado(operacao)
    const estList = nfKey ? (estByNF.get(nfKey) ?? []) : []
    const est = estList.find(e => e.sentido === sentEsper) ?? estList[0]
    if (nfKey && est) nfsComCaminhao.add(nfKey)

    const divergencias: TipoDivergencia[] = []

    if (!rom) {
      divergencias.push("SEM_ROMANEIO")
    } else {
      if (rom.stsRomaneio && !/confirm/i.test(rom.stsRomaneio)) divergencias.push("ROMANEIO_NAO_CONFIRMADO")
      if (sentEsper && rom.sentido && rom.sentido !== sentEsper) divergencias.push("SENTIDO_DIVERGENTE")
      if (!rom.numeroNF) divergencias.push("ROMANEIO_SEM_NF")
      else if (!est) divergencias.push("SEM_CONTADO")
    }

    // cliente
    const clientes = [m.clienteDestino, rom?.nomeEntidade, est?.razaoSocial].filter(Boolean) as string[]
    if (clientes.length >= 2) {
      const norm = clientes.map(normCliente)
      const base = norm[0]
      if (norm.some(n => n && base && n !== base && !n.includes(base) && !base.includes(n)))
        divergencias.push("CLIENTE_DIVERGENTE")
    }

    // peso (tolerância)
    const pesoMarcacao = m.pesoPrevisto || null
    const pesoRomaneio = rom?.pesoLiquido || null
    const pesoEstoque  = est?.quantidade || null
    const dif = maxDifPeso([pesoMarcacao, pesoRomaneio, pesoEstoque])
    if (dif !== null && dif > tol) divergencias.push("PESO_DIVERGENTE")

    itens.push({
      origem: "MARCACAO",
      operacao,
      ordem: m.ordem || m.romaneio,
      numeroNF: rom?.numeroNF ?? null,
      placa: m.placa,
      cliente: m.clienteDestino ?? rom?.nomeEntidade ?? est?.razaoSocial ?? null,
      produto: m.produto,
      produtoRomaneio: rom?.desProduto ?? null,
      produtoEstoque: est?.descricao ?? null,
      pesoMarcacao, pesoRomaneio, pesoEstoque,
      difPeso: dif,
      presencaMarcacao: true,
      presencaRomaneio: !!rom,
      presencaEstoque: !!est,
      stsRomaneio: rom?.stsRomaneio ?? null,
      armazem: est?.armazem ?? null,
      status: divergencias.length === 0 ? "CONCILIADO" : "DIVERGENTE",
      divergencias,
    })
  }

  // ── 2. Reverse: contado/romaneio sem caminhão (bounded por janela de data) ─
  // Janela = intervalo das datas da marcação (com folga), p/ não varrer todo o
  // histórico das planilhas (estoque tem dezenas de milhares de linhas).
  const datasMarc = marcacoes
    .map(m => m.dataCarregamento || m.dataMarcacao || m.dataCheckin)
    .filter((d): d is Date => d instanceof Date)
    .map(d => d.getTime())
  let ini = -Infinity, fim = Infinity
  if (datasMarc.length) {
    ini = Math.min(...datasMarc) - 3 * 86400000   // 3 dias antes
    fim = Math.max(...datasMarc) + 1 * 86400000   // 1 dia depois
  }

  let reverseCount = 0
  const MAX_REVERSE = 1000
  for (const e of estoque) {
    if (reverseCount >= MAX_REVERSE) break
    if (e.sentido !== "ENTRADA" && e.sentido !== "SAIDA") continue
    const nfKey = normDoc(e.docOriginal)
    if (!nfKey || nfsComCaminhao.has(nfKey)) continue
    // dentro da janela de data (se houver datas na marcação)
    if (datasMarc.length) {
      const t = e.dtEmissao instanceof Date ? e.dtEmissao.getTime() : null
      if (t === null || t < ini || t > fim) continue
    } else {
      continue // sem datas na marcação não dá para limitar — pula reverse
    }
    const rom = romByCod.get(nfKey) // raramente bate (cod != NF), só informativo
    itens.push({
      origem: "ESTOQUE",
      operacao: e.sentido === "ENTRADA" ? "DESCARGA" : "CARGA",
      ordem: null,
      numeroNF: e.docOriginal,
      placa: null,
      cliente: e.razaoSocial,
      produto: e.descricao,
      produtoRomaneio: rom?.desProduto ?? null,
      produtoEstoque: e.descricao,
      pesoMarcacao: null,
      pesoRomaneio: rom?.pesoLiquido ?? null,
      pesoEstoque: e.quantidade || null,
      difPeso: null,
      presencaMarcacao: false,
      presencaRomaneio: !!rom,
      presencaEstoque: true,
      stsRomaneio: rom?.stsRomaneio ?? null,
      armazem: e.armazem,
      status: "DIVERGENTE",
      divergencias: ["CONTADO_SEM_CAMINHAO"],
    })
    reverseCount++
  }

  // ── Resumo ────────────────────────────────────────────────────────────────
  const porDivergencia: Record<string, number> = {}
  for (const it of itens)
    for (const d of it.divergencias) porDivergencia[d] = (porDivergencia[d] ?? 0) + 1

  const conciliados = itens.filter(i => i.status === "CONCILIADO").length
  return {
    itens,
    resumo: {
      total: itens.length,
      conciliados,
      divergentes: itens.length - conciliados,
      descarga: itens.filter(i => (i.operacao || "").toUpperCase().includes("DESCARGA")).length,
      carga:    itens.filter(i => { const o = (i.operacao || "").toUpperCase(); return o.includes("CARGA") && !o.includes("DESCARGA") }).length,
      porDivergencia,
    },
  }
}
