// ─── Mapeamento de colunas da planilha de Marcação de Veículos ───────────────
// IMPORTANTE: as colunas do Excel exportado do TOTVS podem mudar de posição.
// Por isso o casamento é feito por NOME do cabeçalho (normalizado), nunca por
// índice fixo. Cada campo do banco tem uma lista de aliases possíveis.

/** Remove acentos, baixa caixa, colapsa espaços e remove pontuação leve. */
export function normalizeHeader(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining marks)
    .toLowerCase()
    .replace(/[._/\-]/g, " ") // pontuação leve e hífens viram espaço
    .replace(/\s+/g, " ")
    .trim()
}

/** Campo do model → lista de cabeçalhos aceitos (já normalizados). */
export const MARCACAO_FIELD_ALIASES: Record<string, string[]> = {
  numero:           ["#", "id", "numero", "num"],
  operacao:         ["operacao", "operação", "tipo operacao", "movimento"],
  check:            ["check", "checkagem"],
  ordem:            ["ordem", "ordem servico", "os"],
  status:           ["status", "situacao"],
  dataCheckin:      ["data check in", "data checkin", "check in", "data de check in"],
  dataMarcacao:     ["data hora marcacao", "data marcacao", "data/hora marcacao", "marcacao"],
  dataCarregamento: ["data carregamento", "data de carregamento", "data carga"],
  produto:          ["produto", "descricao produto", "mercadoria"],
  motorista:        ["motorista", "condutor"],
  tipoServico:      ["tipo de serv", "tipo de servico", "tipo servico", "servico"],
  obsMarcacao:      ["obs marcacao", "observacao marcacao", "observacao", "obs"],
  pedidoCliente:    ["pedido cliente", "pedido", "num pedido", "pedido do cliente"],
  clienteDestino:   ["cliente destino", "destino", "cliente de destino", "destinatario"],
  placa:            ["placa", "placa veiculo"],
  transportadora:   ["transportadora", "transp"],
  tipoVeiculo:      ["tipo veiculo", "tipo de veiculo", "veiculo"],
  cliente:          ["cliente", "cliente origem", "remetente"],
  local:            ["local", "localizacao", "local carregamento"],
  pesoPrevisto:     ["peso previsto", "previsto", "peso prev"],
  pesoFinal:        ["peso final", "peso bruto final", "peso saida"],
  pesoInicial:      ["peso inicial", "tara", "peso tara", "peso entrada"],
  pesoLiquido:      ["peso liquido", "liquido", "peso liq", "peso liquido kg", "peso liquido ton"],
  turno:            ["turno"],
  romaneio:         ["romaneio", "num romaneio"],
  lote:             ["lote"],
}

export const MARCACAO_NUMERIC_FIELDS = new Set([
  "pesoPrevisto", "pesoFinal", "pesoInicial", "pesoLiquido",
])

export const MARCACAO_DATE_FIELDS = new Set([
  "dataCheckin", "dataMarcacao", "dataCarregamento",
])

/**
 * Recebe a linha de cabeçalhos (array de strings, na ordem em que vieram no
 * arquivo) e devolve um mapa { campoDoModel: indiceDaColuna }.
 * Robusto a reordenação, colunas extras e variações de nome/acento.
 */
export function mapHeaders(
  headerRow: unknown[],
  fieldAliases: Record<string, string[]> = MARCACAO_FIELD_ALIASES,
): Record<string, number> {
  // índice normalizado → posição
  const normalizedToIndex = new Map<string, number>()
  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    if (norm && !normalizedToIndex.has(norm)) normalizedToIndex.set(norm, idx)
  })

  const map: Record<string, number> = {}
  const claimed = new Set<number>()

  // Passada 1 — matches EXATOS (prioridade alta). Garante que "Cliente" e
  // "Cliente Destino", por ex., fiquem em colunas distintas.
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    for (const alias of aliases) {
      const idx = normalizedToIndex.get(alias)
      if (idx !== undefined && !claimed.has(idx)) {
        map[field] = idx
        claimed.add(idx)
        break
      }
    }
  }

  // Passada 2 — fallback por match parcial, só para campos ainda não
  // resolvidos e colunas ainda não reivindicadas.
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    if (map[field] !== undefined) continue
    for (const [norm, idx] of normalizedToIndex) {
      if (claimed.has(idx)) continue
      if (aliases.some(a => norm === a || norm.includes(a) || a.includes(norm))) {
        map[field] = idx
        claimed.add(idx)
        break
      }
    }
  }
  return map
}

/** Converte célula de peso ("56.74", "1.234,56", "56,74") em número. */
export function parsePeso(v: unknown): number {
  if (v === null || v === undefined || v === "" || v === "–" || v === "-") return 0
  if (typeof v === "number") return v
  let s = String(v).trim().replace(/[^\d.,-]/g, "")
  if (s === "" || s === "-") return 0
  // Se tem vírgula e ponto: ponto = milhar, vírgula = decimal
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (s.includes(",")) {
    s = s.replace(",", ".")
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

/** Limpa texto: trata placeholders ("–", "-", "") como null. */
export function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === "" || s === "–" || s === "-" || s === "—") return null
  return s
}

/** Parse de data BR ("02/06/2026, 09:20" | "02/06/2026" | Date | ISO). */
export function parseDataBR(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  if (s === "" || s === "–" || s === "-") return null

  // "02/06/2026, 09:20" ou "02/06/2026 09:20" ou "02/06/2026"
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/)
  if (m) {
    const [, dd, mm, yyyy, hh, mi] = m
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh ?? 0), Number(mi ?? 0))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export type MarcacaoParsed = {
  numero: string
  operacao: string | null
  check: string | null
  ordem: string | null
  status: string | null
  dataCheckin: Date | null
  dataMarcacao: Date | null
  dataCarregamento: Date | null
  produto: string | null
  motorista: string | null
  tipoServico: string | null
  obsMarcacao: string | null
  pedidoCliente: string | null
  clienteDestino: string | null
  placa: string | null
  transportadora: string | null
  tipoVeiculo: string | null
  cliente: string | null
  local: string | null
  pesoPrevisto: number
  pesoFinal: number
  pesoInicial: number
  pesoLiquido: number
  turno: string | null
  romaneio: string | null
  lote: string | null
}

/**
 * Converte um array de linhas (incluindo a linha de cabeçalho) em registros
 * de marcação prontos para gravar. Detecta automaticamente qual linha é o
 * cabeçalho (primeira que contém "operacao"/"placa"/"produto" reconhecíveis).
 */
export function parseMarcacaoRows(rows: unknown[][]): MarcacaoParsed[] {
  if (!rows.length) return []

  // Detecta a linha de cabeçalho: procura a primeira linha que mapeie >= 5 campos
  let headerIdx = 0
  let bestMap: Record<string, number> = {}
  let bestCount = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i])
    const count = Object.keys(m).length
    if (count > bestCount) { bestCount = count; bestMap = m; headerIdx = i }
  }
  const headerMap = bestMap

  const get = (row: unknown[], field: string): unknown => {
    const idx = headerMap[field]
    return idx === undefined ? null : row[idx]
  }

  const out: MarcacaoParsed[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue

    const numero = cleanText(get(row, "numero"))
    if (!numero) continue // linha sem id da marcação é ignorada

    out.push({
      numero,
      operacao:         cleanText(get(row, "operacao")),
      check:            cleanText(get(row, "check")),
      ordem:            cleanText(get(row, "ordem")),
      status:           cleanText(get(row, "status")),
      dataCheckin:      parseDataBR(get(row, "dataCheckin")),
      dataMarcacao:     parseDataBR(get(row, "dataMarcacao")),
      dataCarregamento: parseDataBR(get(row, "dataCarregamento")),
      produto:          cleanText(get(row, "produto")),
      motorista:        cleanText(get(row, "motorista")),
      tipoServico:      cleanText(get(row, "tipoServico")),
      obsMarcacao:      cleanText(get(row, "obsMarcacao")),
      pedidoCliente:    cleanText(get(row, "pedidoCliente")),
      clienteDestino:   cleanText(get(row, "clienteDestino")),
      placa:            cleanText(get(row, "placa")),
      transportadora:   cleanText(get(row, "transportadora")),
      tipoVeiculo:      cleanText(get(row, "tipoVeiculo")),
      cliente:          cleanText(get(row, "cliente")),
      local:            cleanText(get(row, "local")),
      pesoPrevisto:     parsePeso(get(row, "pesoPrevisto")),
      pesoFinal:        parsePeso(get(row, "pesoFinal")),
      pesoInicial:      parsePeso(get(row, "pesoInicial")),
      pesoLiquido:      parsePeso(get(row, "pesoLiquido")),
      turno:            cleanText(get(row, "turno")),
      romaneio:         cleanText(get(row, "romaneio")),
      lote:             cleanText(get(row, "lote")),
    })
  }
  return out
}
