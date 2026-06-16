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

// ── Placa → transportadora / motorista (a partir da Marcação de Veículos) ──────

/** Normaliza placa: maiúsculas, só letras/dígitos (ignora hífen e espaços). */
export function normalizaPlaca(placa: string | null | undefined): string {
  return String(placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export type DadosVeiculo = { transportadora: string | null; motorista: string | null }

/** Mapa placa-normalizada → {transportadora, motorista} a partir da Marcação
 *  (marcação mais recente vence). Use para preenchimento em lote. */
export async function mapaVeiculosPorPlaca(): Promise<Map<string, DadosVeiculo>> {
  const marcs = await prisma.marcacaoVeiculo.findMany({
    where: { placa: { not: null } },
    select: { placa: true, transportadora: true, motorista: true, dataMarcacao: true, createdAt: true },
    orderBy: [{ dataMarcacao: "asc" }, { createdAt: "asc" }],
  })
  const mapa = new Map<string, DadosVeiculo>()
  for (const m of marcs) {
    const key = normalizaPlaca(m.placa)
    if (!key) continue
    // como está ordenado asc, a última escrita (mais recente) prevalece
    mapa.set(key, { transportadora: m.transportadora ?? null, motorista: m.motorista ?? null })
  }
  return mapa
}

/** Busca transportadora/motorista de UMA placa (marcação mais recente). */
export async function dadosVeiculoPorPlaca(placa: string | null | undefined): Promise<DadosVeiculo | null> {
  const key = normalizaPlaca(placa)
  if (!key) return null
  const marcs = await prisma.marcacaoVeiculo.findMany({
    where: { placa: { not: null }, OR: [{ transportadora: { not: null } }, { motorista: { not: null } }] },
    select: { placa: true, transportadora: true, motorista: true },
    orderBy: [{ dataMarcacao: "desc" }, { createdAt: "desc" }],
    take: 500,
  })
  const achou = marcs.find(m => normalizaPlaca(m.placa) === key)
  return achou ? { transportadora: achou.transportadora ?? null, motorista: achou.motorista ?? null } : null
}
