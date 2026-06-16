// Regras do Controle de Notas Canceladas / Inutilizadas / Cancelamento Extemporâneo

// 👉 Valor FIXO da taxa de cancelamento extemporâneo (R$). Altere aqui se mudar.
export const TAXA_EXTEMP_FIXA = 150

export const TIPOS = ["CANCELAMENTO", "INUTILIZACAO", "EXTEMPORANEO"] as const
export type TipoNota = (typeof TIPOS)[number]

export const DESC: Record<string, string> = {
  CANCELAMENTO: "CANCELAMENTO AUTORIZADO",
  INUTILIZACAO: "INUTILIZACAO DE NUMERACAO AUTORIZADA",
  EXTEMPORANEO: "CANCELAMENTO EXTEMPORANEO",
}
export const CODIGO: Record<string, string> = {
  CANCELAMENTO: "015-CA",
  INUTILIZACAO: "030-INA",
  EXTEMPORANEO: "015-CAE",
}
export const TIPO_LABEL: Record<string, string> = {
  CANCELAMENTO: "Cancelamento",
  INUTILIZACAO: "Inutilização",
  EXTEMPORANEO: "Cancelamento extemporâneo",
}

export function normalizaTipo(t: unknown): TipoNota {
  const v = String(t ?? "").toUpperCase()
  if (v === "INUTILIZACAO") return "INUTILIZACAO"
  if (v.includes("EXTEMPOR")) return "EXTEMPORANEO"
  return "CANCELAMENTO"
}

// token do link de aprovação (32 hex). Web Crypto — funciona no server e no client.
export function gerarToken(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "")
}
