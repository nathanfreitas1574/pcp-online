// Parser da aba "QUEBRAS" do Excel de Quebra Técnica (robusto a reordenação de colunas).

export type QuebraParsed = {
  data: Date | null
  filial: string | null
  contrato: string | null
  volumeContrato: number
  cliente: string | null
  produto: string | null
  origemNavio: string | null
  volumeRecebido: number
  quebraTecnica: number
  quebraDisponivel: number
  pctQuebra: number
  saldoAReceber: number
  sobra: number
  quebraFutura: number
  difBalanca: number
}

// número tolerante: aceita "1.234,56", "1234.56", #DIV/0!, null, Date acidental
function num(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "number") return isFinite(v) ? v : 0
  const s = String(v).trim()
  if (!s || s.includes("#")) return 0 // #DIV/0! etc.
  // remove milhar e troca vírgula decimal
  const limpo = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "")
  const n = parseFloat(limpo)
  return isFinite(n) ? n : 0
}
function txt(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}
function dt(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === "string") {
    const s = v.trim()
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
    if (m) { const [, d, mo, y] = m; const yy = y.length === 2 ? 2000 + Number(y) : Number(y); return new Date(Date.UTC(yy, Number(mo) - 1, Number(d))) }
  }
  return null
}

// mapeia coluna → índice pelo cabeçalho (contém a palavra-chave)
const CAMPOS: { key: keyof QuebraParsed; kws: string[] }[] = [
  { key: "data", kws: ["DATA"] },
  { key: "filial", kws: ["FILIAL"] },
  { key: "contrato", kws: ["CONTRATO"] },
  { key: "volumeContrato", kws: ["VOLUME CONTRATO", "VOL CONTRATO"] },
  { key: "cliente", kws: ["CLIENTE"] },
  { key: "produto", kws: ["PRODUTO"] },
  { key: "origemNavio", kws: ["ORIGEM", "NAVIO"] },
  { key: "volumeRecebido", kws: ["VOLUME RECEBIDO", "VOL RECEBIDO", "RECEBIDO"] },
  { key: "quebraTecnica", kws: ["QUEBRA TECNICA", "QUEBRA TÉCNICA"] },
  { key: "quebraDisponivel", kws: ["QUEBRA DISPONIVEL", "DISPONIVEL", "DISPONÍVEL"] },
  { key: "pctQuebra", kws: ["% QUEBRA", "%QUEBRA", "% DE QUEBRA"] },
  { key: "saldoAReceber", kws: ["SALDO A RECEBER", "SALDO"] },
  { key: "sobra", kws: ["SOBRA"] },
  { key: "quebraFutura", kws: ["QUEBRA FUTURA", "FUTURA"] },
  { key: "difBalanca", kws: ["DIF", "BALAN"] },
]

function norm(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim()
}

function mapColunas(header: unknown[]): Partial<Record<keyof QuebraParsed, number>> {
  const H = header.map(norm)
  const map: Partial<Record<keyof QuebraParsed, number>> = {}
  for (const c of CAMPOS) {
    // usa a keyword mais específica que casar
    for (const kw of c.kws.map(norm)) {
      const i = H.findIndex((h, idx) => h.includes(kw) && !Object.values(map).includes(idx))
      if (i >= 0) { map[c.key] = i; break }
    }
  }
  return map
}

export function parseQuebraRows(rows: unknown[][]): QuebraParsed[] {
  if (!rows.length) return []
  // acha o cabeçalho (linha com VOLUME RECEBIDO + QUEBRA TECNICA)
  let hIdx = 0, best = 0
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const m = mapColunas(rows[i])
    const score = Object.keys(m).length
    if (score > best) { best = score; hIdx = i }
  }
  const col = mapColunas(rows[hIdx])
  const get = (r: unknown[], k: keyof QuebraParsed) => { const i = col[k]; return i == null ? undefined : r[i] }

  const out: QuebraParsed[] = []
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r.some((v) => v != null && String(v).trim() !== "")) continue
    const produto = txt(get(r, "produto"))
    const cliente = txt(get(r, "cliente"))
    const volumeRecebido = num(get(r, "volumeRecebido"))
    const quebraTecnica = num(get(r, "quebraTecnica"))
    // ignora linhas totalmente vazias de conteúdo
    if (!produto && !cliente && !volumeRecebido && !quebraTecnica) continue
    out.push({
      data: dt(get(r, "data")),
      filial: txt(get(r, "filial")),
      contrato: txt(get(r, "contrato")),
      volumeContrato: num(get(r, "volumeContrato")),
      cliente, produto,
      origemNavio: txt(get(r, "origemNavio")),
      volumeRecebido,
      quebraTecnica,
      quebraDisponivel: num(get(r, "quebraDisponivel")),
      pctQuebra: num(get(r, "pctQuebra")),
      saldoAReceber: num(get(r, "saldoAReceber")),
      sobra: num(get(r, "sobra")),
      quebraFutura: num(get(r, "quebraFutura")),
      difBalanca: num(get(r, "difBalanca")),
    })
  }
  return out
}

// Status automático a partir do saldo/volume (override manual tem prioridade fora daqui)
export function statusAuto(q: { volumeRecebido: number; saldoAReceber: number }): "ABERTO" | "EM_ANDAMENTO" | "FINALIZADO" {
  if ((q.volumeRecebido || 0) <= 0) return "ABERTO"
  if ((q.saldoAReceber || 0) > 0.001) return "EM_ANDAMENTO"
  return "FINALIZADO"
}
