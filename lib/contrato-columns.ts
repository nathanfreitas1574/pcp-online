// ─── Mapeamento de colunas da planilha de Contratos de Armazenagem (TOTVS) ───
// Mesmo princípio da marcação: casa por NOME do cabeçalho (normalizado), nunca
// por índice fixo. Robusto a reordenação de colunas, colunas extras e variações
// de acento/caixa. Reaproveita os utilitários genéricos de marcacao-columns.
import { normalizeHeader, mapHeaders, cleanText, parsePeso, parseDataBR } from "./marcacao-columns"

/** Campo do model → cabeçalhos aceitos (normalizados). Ordem dos aliases:
 *  do mais específico (cabeçalho real do TOTVS) ao mais genérico. */
export const CONTRATO_FIELD_ALIASES: Record<string, string[]> = {
  filial:        ["filial", "cod filial", "codigo filial"],
  numero:        ["contrato", "num contrato", "no contrato", "numero contrato", "numero"],
  ultAlt:        ["ult alt", "ultima alteracao", "ult alteracao"],
  descricao:     ["descricao", "descricao contrato", "desc contrato"],
  tipoMercado:   ["tipo mercado", "mercado"],
  dataCtr:       ["data ctr", "data contrato", "dt contrato", "data do contrato"],
  ctrExterno:    ["ctr externo", "contrato externo"],
  codEntidade:   ["cod entidade", "codigo entidade"],
  lojEntidade:   ["loj entidade", "loja entidade"],
  clienteNome:   ["nom entidade", "nome entidade", "nom cliente", "nome cliente"],
  clienteNomeAlt:["nom loj ent", "nom loja ent", "nome loja entidade"],
  safra:         ["cod safra", "safra"],
  codProduto:    ["cod produto", "codigo produto"],
  desProduto:    ["des produto", "desc produto", "descricao produto"],
  descTabela:    ["desc tabela", "des tabela", "descricao tabela", "tabela"],
  qtdContratada: ["qtd contrat", "qtd contratada", "quantidade contratada", "quantidade"],
  stsAssinatura: ["sts assinat", "sts assinatura", "status assinatura"],
  stsFiscal:     ["sts fiscal", "status fiscal"],
  stsFinanceiro: ["sts financ", "sts financeiro", "status financeiro"],
  stsEstoque:    ["sts estoq", "sts estoque", "status estoque"],
  modalidade:    ["modalidade"],
  centroCusto:   ["centro custo", "centro de custo"],
}

export type ContratoParsed = {
  filial: string
  numero: string
  ultAlt: string | null
  descricao: string
  tipoMercado: string | null
  dataCtr: Date | null
  ctrExterno: string | null
  codEntidade: string | null
  lojEntidade: string | null
  clienteNome: string
  safra: string | null
  codProduto: string | null
  desProduto: string
  descTabela: string | null
  qtdContratada: number
  stsAssinatura: string
  stsFiscal: string
  stsFinanceiro: string
  stsEstoque: string
  modalidade: string | null
  centroCusto: string | null
}

/** Converte as linhas (incluindo cabeçalho) em contratos prontos para gravar.
 *  Detecta automaticamente a linha de cabeçalho (a planilha tem um título na
 *  primeira linha e os cabeçalhos na segunda). */
export function parseContratoRows(rows: unknown[][]): {
  contratos: ContratoParsed[]
  camposReconhecidos: string[]
  colunasIgnoradas: string[]
} {
  if (!rows.length) return { contratos: [], camposReconhecidos: [], colunasIgnoradas: [] }

  // Detecta a linha de cabeçalho nas primeiras 5 linhas
  let headerIdx = 0
  let headerMap: Record<string, number> = {}
  let bestCount = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i], CONTRATO_FIELD_ALIASES)
    const count = Object.keys(m).length
    if (count > bestCount) { bestCount = count; headerMap = m; headerIdx = i }
  }

  const camposReconhecidos = Object.keys(headerMap)
  const headerRow = rows[headerIdx] as unknown[]
  const usados = new Set(Object.values(headerMap))
  const colunasIgnoradas = headerRow
    .map((h, i) => ({ h: h == null ? "" : String(h).trim(), i }))
    .filter(({ h, i }) => h !== "" && !usados.has(i))
    .map(({ h }) => h)

  const get = (row: unknown[], field: string): unknown => {
    const idx = headerMap[field]
    return idx === undefined ? null : row[idx]
  }

  const contratos: ContratoParsed[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue

    const numero = cleanText(get(row, "numero"))
    if (!numero) continue

    contratos.push({
      filial:        cleanText(get(row, "filial")) ?? "",
      numero,
      ultAlt:        cleanText(get(row, "ultAlt")),
      descricao:     cleanText(get(row, "descricao")) ?? "",
      tipoMercado:   cleanText(get(row, "tipoMercado")),
      dataCtr:       parseDataBR(get(row, "dataCtr")),
      ctrExterno:    cleanText(get(row, "ctrExterno")),
      codEntidade:   cleanText(get(row, "codEntidade")),
      lojEntidade:   cleanText(get(row, "lojEntidade")),
      clienteNome:   cleanText(get(row, "clienteNome")) ?? cleanText(get(row, "clienteNomeAlt")) ?? "",
      safra:         cleanText(get(row, "safra")),
      codProduto:    cleanText(get(row, "codProduto")),
      desProduto:    cleanText(get(row, "desProduto")) ?? "",
      descTabela:    cleanText(get(row, "descTabela")),
      qtdContratada: parsePeso(get(row, "qtdContratada")),
      stsAssinatura: cleanText(get(row, "stsAssinatura")) ?? "Aberto",
      stsFiscal:     cleanText(get(row, "stsFiscal")) ?? "Aberto",
      stsFinanceiro: cleanText(get(row, "stsFinanceiro")) ?? "Aberto",
      stsEstoque:    cleanText(get(row, "stsEstoque")) ?? "Aberto",
      modalidade:    cleanText(get(row, "modalidade")),
      centroCusto:   cleanText(get(row, "centroCusto")),
    })
  }

  return { contratos, camposReconhecidos, colunasIgnoradas }
}
