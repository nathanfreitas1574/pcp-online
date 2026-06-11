// ─── Parser da planilha de Estoque Contado (Materiais De/Em Terceiros) ───────
// Casa por NOME de cabeçalho (robusto a reordenação). Cabeçalhos na linha 0.
import { mapHeaders, cleanText, parsePeso, parseDataBR } from "./marcacao-columns"

export const ESTOQUE_FIELD_ALIASES: Record<string, string[]> = {
  filial:      ["filial"],
  produto:     ["produto", "cod produto"],
  descricao:   ["descricao", "desc produto", "des produto"],
  unidMedida:  ["unid medida", "unidade medida", "um"],
  armazem:     ["armazem", "armazém", "local"],
  clienteForn: ["cliente forn", "cliente fornecedor", "cliente forn."],
  razaoSocial: ["razao social", "razão social", "nome entidade", "nome cliente"],
  tipoCliFor:  ["tipo cli for", "tipo cliente fornecedor"],
  docOriginal: ["doc original", "documento original", "doc orig", "nota fiscal", "numero nf"],
  serieDoc:    ["serie do doc", "serie doc", "serie"],
  dtEmissao:   ["dt emissao", "data emissao", "emissao"],
  quantidade:  ["quantidade", "qtd", "qtde"],
  precoUnit:   ["preco unit", "preço unit", "preco unitario"],
  totalNF:     ["total nf", "valor nf", "total"],
  tes:         ["t e s", "tes"],
  tipoDeEm:    ["tipo de em", "de em", "tipo de/em"],
  saldo:       ["saldo"],
  ultEntrega:  ["ult entrega", "ultima entrega"],
  poderTerc:   ["poder terc", "poder terceiro", "poder de terceiro"],
  atendido:    ["atendido"],
}

export type EstoqueParsed = {
  filial: string | null
  produto: string | null
  descricao: string | null
  armazem: string | null
  razaoSocial: string | null
  docOriginal: string | null
  serieDoc: string | null
  dtEmissao: Date | null
  quantidade: number
  totalNF: number
  tes: string | null
  tipoDeEm: string | null
  saldo: number
  poderTerc: string | null              // "R" = entrada, "D" = saída
  sentido: "ENTRADA" | "SAIDA" | null   // derivado de poderTerc
}

/** poderTerc R → ENTRADA ; D → SAIDA */
export function sentidoDoPoder(poderTerc: string | null): "ENTRADA" | "SAIDA" | null {
  if (!poderTerc) return null
  const s = poderTerc.trim().toUpperCase()
  if (s === "R") return "ENTRADA"
  if (s === "D") return "SAIDA"
  return null
}

export function parseEstoqueRows(rows: unknown[][]): {
  estoque: EstoqueParsed[]
  camposReconhecidos: string[]
} {
  if (!rows.length) return { estoque: [], camposReconhecidos: [] }

  let headerIdx = 0
  let headerMap: Record<string, number> = {}
  let best = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i], ESTOQUE_FIELD_ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  const get = (row: unknown[], f: string) => {
    const idx = headerMap[f]
    return idx === undefined ? null : row[idx]
  }

  const estoque: EstoqueParsed[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue
    const docOriginal = cleanText(get(row, "docOriginal"))
    // linha sem documento não serve para conciliar
    if (!docOriginal) continue
    const poderTerc = cleanText(get(row, "poderTerc"))
    estoque.push({
      filial:      cleanText(get(row, "filial")),
      produto:     cleanText(get(row, "produto")),
      descricao:   cleanText(get(row, "descricao")),
      armazem:     cleanText(get(row, "armazem")),
      razaoSocial: cleanText(get(row, "razaoSocial")),
      docOriginal,
      serieDoc:    cleanText(get(row, "serieDoc")),
      dtEmissao:   parseDataBR(get(row, "dtEmissao")),
      quantidade:  parsePeso(get(row, "quantidade")),
      totalNF:     parsePeso(get(row, "totalNF")),
      tes:         cleanText(get(row, "tes")),
      tipoDeEm:    cleanText(get(row, "tipoDeEm")),
      saldo:       parsePeso(get(row, "saldo")),
      poderTerc,
      sentido:     sentidoDoPoder(poderTerc),
    })
  }
  return { estoque, camposReconhecidos: Object.keys(headerMap) }
}
