import { prisma } from "./prisma"

/** Converte "YYYY-MM-DD" (input de data) numa Date estável ao meio-dia UTC,
 *  evitando o deslocamento de fuso (a data aparecer D+1 ou D-1). */
export function dataInputUTC(s: unknown): Date | null {
  if (!s) return null
  const str = String(s).trim()
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`)
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/** Candidatos de número de NF (com/sem zeros à esquerda) p/ casar com docOriginal. */
export function candidatosNF(num: string): string[] {
  const limpo = String(num).trim().replace(/\D/g, "")
  if (!limpo) return []
  const semZero = limpo.replace(/^0+/, "") || "0"
  return [...new Set([String(num).trim(), limpo, semZero, limpo.padStart(6, "0"), limpo.padStart(9, "0")])]
}

/** True se a NF já está lançada no estoque contábil. */
export async function notaNoContabil(numeroNota: string | null | undefined): Promise<boolean> {
  if (!numeroNota || !String(numeroNota).trim()) return false
  const cands = candidatosNF(numeroNota)
  if (!cands.length) return false
  const achou = await prisma.estoqueContabil.findFirst({ where: { docOriginal: { in: cands } }, select: { id: true } })
  return !!achou
}
