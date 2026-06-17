// Regras do Controle de Notas Canceladas / Inutilizadas / Cancelamento Extemporâneo

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

// Fluxo de Validação PCP: ao solicitar = AGUARDANDO → PCP valida = VALIDADO →
// conferir NF no estoque (saiu = cancelada) = CANCELADO.
export const STATUS = ["AGUARDANDO", "VALIDADO", "CANCELADO"] as const
export type StatusNota = (typeof STATUS)[number]
export const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: "Aguardando validação",
  VALIDADO: "Validado",
  CANCELADO: "Cancelado",
}
