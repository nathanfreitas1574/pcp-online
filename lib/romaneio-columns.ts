// ─── Parser da planilha de Romaneios (browse do Proteus/TOTVS) ───────────────
// Casa por NOME de cabeçalho (robusto a reordenação). Linha 0 costuma ser o
// título "Listagem do Browse" e os cabeçalhos vêm na linha seguinte.
import { mapHeaders, cleanText, parsePeso, parseDataBR } from "./marcacao-columns"

export const ROMANEIO_FIELD_ALIASES: Record<string, string[]> = {
  codRomaneio:  ["cod romaneio", "codigo romaneio", "romaneio"],
  tipo:         ["tipo"],
  descTipo:     ["desc tipo", "descricao tipo"],
  placa:        ["placa"],
  nomeTransp:   ["nome transp", "nome transportadora", "transportadora"],
  nomeMotorista:["nome motor", "nome motorista", "motorista"],
  nomeEntidade: ["nome entidad", "nome entidade", "entidade", "razao social"],
  serieNF:      ["serie nf"],
  numeroNF:     ["numero nf", "num nf", "nota fiscal", "nf"],
  pesoLiquido:  ["peso liquido", "peso liq"],
  qtdFiscal:    ["qtd fiscal", "quantidade fiscal"],
  desProduto:   ["des produto", "desc produto", "descricao produto", "produto"],
  tabela:       ["tabela", "desc tabela"],
  stsRomaneio:  ["sts romaneio", "status romaneio"],
  stsFiscal:    ["sts fiscal", "status fiscal"],
  stsContrat:   ["sts contrat", "status contrato"],
  contrato:     ["contrato"],
  descContrato: ["desc contrat", "descricao contrato"],
  dataRom:      ["data rom", "data romaneio"],
  dataChegada:  ["data chegada"],
}

export type RomaneioParsed = {
  codRomaneio: string
  descTipo: string | null
  sentido: "ENTRADA" | "SAIDA" | null   // derivado de descTipo (E)/(S)
  placa: string | null
  nomeTransp: string | null
  nomeEntidade: string | null
  numeroNF: string | null
  pesoLiquido: number
  qtdFiscal: number
  desProduto: string | null
  tabela: string | null
  stsRomaneio: string | null
  contrato: string | null
  dataRom: Date | null
}

/** "(E) ENTRADA PARA DEPOSITO" → ENTRADA ; "(S) DEVOLUCAO..." → SAIDA */
export function sentidoDoTipo(descTipo: string | null): "ENTRADA" | "SAIDA" | null {
  if (!descTipo) return null
  const s = descTipo.trim().toUpperCase()
  if (s.startsWith("(E)") || /\bENTRADA\b/.test(s)) return "ENTRADA"
  if (s.startsWith("(S)") || /\bSAIDA\b|\bSAÍDA\b|\bDEVOLU/.test(s)) return "SAIDA"
  return null
}

export function parseRomaneioRows(rows: unknown[][]): {
  romaneios: RomaneioParsed[]
  camposReconhecidos: string[]
} {
  if (!rows.length) return { romaneios: [], camposReconhecidos: [] }

  // Detecta linha de cabeçalho nas primeiras 5 linhas
  let headerIdx = 0
  let headerMap: Record<string, number> = {}
  let best = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i], ROMANEIO_FIELD_ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  const get = (row: unknown[], f: string) => {
    const idx = headerMap[f]
    return idx === undefined ? null : row[idx]
  }

  const romaneios: RomaneioParsed[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue
    const codRomaneio = cleanText(get(row, "codRomaneio"))
    if (!codRomaneio) continue
    const descTipo = cleanText(get(row, "descTipo"))
    romaneios.push({
      codRomaneio,
      descTipo,
      sentido:      sentidoDoTipo(descTipo),
      placa:        cleanText(get(row, "placa")),
      nomeTransp:   cleanText(get(row, "nomeTransp")),
      nomeEntidade: cleanText(get(row, "nomeEntidade")),
      numeroNF:     cleanText(get(row, "numeroNF")),
      pesoLiquido:  parsePeso(get(row, "pesoLiquido")),
      qtdFiscal:    parsePeso(get(row, "qtdFiscal")),
      desProduto:   cleanText(get(row, "desProduto")),
      tabela:       cleanText(get(row, "tabela")),
      stsRomaneio:  cleanText(get(row, "stsRomaneio")),
      contrato:     cleanText(get(row, "contrato")),
      dataRom:      parseDataBR(get(row, "dataRom")),
    })
  }
  return { romaneios, camposReconhecidos: Object.keys(headerMap) }
}
