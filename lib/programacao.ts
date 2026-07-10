// Helpers de semana/data da Programação — tudo em UTC (imune a fuso/horário de verão
// e consistente entre servidor e navegador via strings YYYY-MM-DD).

export const DIA = 86400000
const pad = (n: number) => String(n).padStart(2, "0")

export const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
export const ddMM = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`

// Semana 1 contém 1º/jan e começa no domingo.
export function getSemanaAtual() {
  const h = new Date()
  const ano = h.getUTCFullYear()
  const jan1 = Date.UTC(ano, 0, 1)
  const hojeUTC = Date.UTC(ano, h.getUTCMonth(), h.getUTCDate())
  const dias = Math.round((hojeUTC - jan1) / DIA)
  const semana = Math.ceil((dias + new Date(jan1).getUTCDay() + 1) / 7)
  return { ano, semana }
}

export function domingoDaSemana(ano: number, semana: number): Date {
  const jan1Dow = new Date(Date.UTC(ano, 0, 1)).getUTCDay()
  return new Date(Date.UTC(ano, 0, 1 - jan1Dow) + (semana - 1) * 7 * DIA)
}

export function semanasDoAno(ano: number): number {
  const jan1 = Date.UTC(ano, 0, 1)
  const dias = Math.round((Date.UTC(ano, 11, 31) - jan1) / DIA)
  return Math.ceil((dias + new Date(jan1).getUTCDay() + 1) / 7)
}

export function diasDaSemana(ano: number, semana: number): Date[] {
  const dom = domingoDaSemana(ano, semana)
  return Array.from({ length: 7 }, (_, i) => new Date(dom.getTime() + i * DIA))
}

export function semanaDeData(d: Date): { ano: number; semana: number } {
  const ano = d.getUTCFullYear()
  const jan1 = Date.UTC(ano, 0, 1)
  const dUTC = Date.UTC(ano, d.getUTCMonth(), d.getUTCDate())
  const dias = Math.round((dUTC - jan1) / DIA)
  return { ano, semana: Math.ceil((dias + new Date(jan1).getUTCDay() + 1) / 7) }
}

// Marcação finalizada (status CHECKOUT) — robusto a "CHECK-OUT"/"Check Out".
export const ehCheckout = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/[^A-Z]/g, "").includes("CHECKOUT")

// Remove marcações duplicadas pelo ROMANEIO e pela ORDEM (a origem/Connect às vezes
// traz a mesma entrega em 2+ linhas com nº diferentes → inflava o realizado).
// Mantém a 1ª ocorrência de cada romaneio/ordem não-vazios; linhas sem ambos ficam todas.
export function dedupePorRomaneio<T extends { romaneio?: string | null; ordem?: string | null }>(arr: T[]): T[] {
  const romVistos = new Set<string>()
  const ordVistos = new Set<string>()
  const out: T[] = []
  for (const m of arr) {
    const rom = String(m.romaneio ?? "").trim()
    const ord = String(m.ordem ?? "").trim()
    if ((rom && romVistos.has(rom)) || (ord && ordVistos.has(ord))) continue
    if (rom) romVistos.add(rom)
    if (ord) ordVistos.add(ord)
    out.push(m)
  }
  return out
}

// nº de contrato normalizado (sem zeros à esquerda) p/ casar marcação (pedidoCliente) × contrato
export const normNumContrato = (s: string | null | undefined) => String(s ?? "").trim().replace(/^0+/, "") || "0"

// Classifica a operação da marcação: true = CARGA (expedição), false = DESCARGA, null = nenhuma.
export function ehCarga(operacao: string | null | undefined): boolean | null {
  const op = (operacao || "").toUpperCase()
  if (op.includes("DESCARGA")) return false
  if (op.includes("CARGA")) return true
  return null
}

export const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
