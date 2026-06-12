import { prisma } from "./prisma"

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
