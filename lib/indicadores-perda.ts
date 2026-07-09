// Config dos indicadores de perda (% mensal vs meta, YTD ponderado)
export const PERDA_TIPOS = [
  {
    tipo: "EMBALAGEM",
    titulo: "Quebra de Embalagens (%)",
    subtitulo: "Percentual de quebras em relação ao total de embalagens movimentadas",
    labelBase: "Embalagens movimentadas",
    labelPerda: "Embalagens quebradas",
    metaPadrao: 0.15,
    usaSemanas: false,
  },
  {
    tipo: "ADITIVO",
    titulo: "Quebra de Aditivo (%)",
    subtitulo: "Percentual de quebra de aditivo em relação ao volume de fertilizante movimentado",
    labelBase: "Volume de fertilizante movimentado (t)",
    labelPerda: "Volume de quebra de aditivo (t)",
    metaPadrao: 0.15,
    usaSemanas: false,
  },
  {
    tipo: "VARREDURA",
    titulo: "Geração de Varredura (%)",
    subtitulo: "Percentual de varredura gerada em relação ao volume total movimentado",
    labelBase: "Volume total movimentado (t)",
    labelPerda: "Varredura gerada (t)",
    metaPadrao: 0.15,
    usaSemanas: true, // alimentação semanal S1..S5
  },
] as const

export type PerdaTipo = (typeof PERDA_TIPOS)[number]["tipo"]
export const metaPadraoDe = (tipo: string) => PERDA_TIPOS.find((t) => t.tipo === tipo)?.metaPadrao ?? 0.15
export const usaSemanas = (tipo: string) => PERDA_TIPOS.find((t) => t.tipo === tipo)?.usaSemanas ?? false

// Indicadores operacionais extras (reutilizam a MESMA tabela IndicadorPerda com mapeamento de campos):
// TOLERANCIA — base = veículos carregados (qtd) · perda = retorno na pesagem (t) · meta = kg/veículo (90)
//   meta mensal (t) = veículos × meta ÷ 1000 · KPI% = retorno ÷ meta mensal · MAIOR é melhor
// VIRA — base = gasto realizado (R$) · perda = retorno cobrado (R$) · meta = meta mensal R$ (20.000)
//   saldo líquido = gasto − retorno · dentro da meta se saldo ≤ meta · obs mensal p/ justificativas
// BALANCO — base = volume recebido (t) · s1/s2/s3 = expedição Big Bag/Granel/Prod.Acabado (t) · meta = % quebra técnica (0,5)
//   quebra gerada = recebido × meta% · varredura vem do tipo VARREDURA · saldo segurança = quebra − varredura
export const TIPOS_EXTRAS = ["TOLERANCIA", "VIRA", "BALANCO"] as const
export const METAS_EXTRAS: Record<string, number> = { TOLERANCIA: 90, VIRA: 20000, BALANCO: 0.5 }
export const TIPOS_VALIDOS = [...PERDA_TIPOS.map((t) => t.tipo as string), ...TIPOS_EXTRAS]

const r2 = (n: number) => Math.round(n * 100) / 100
const r3 = (n: number) => Math.round(n * 1000) / 1000

// perda efetiva do mês (varredura = soma das semanas)
export function perdaMes(tipo: string, row: { perda: number; s1: number; s2: number; s3: number; s4: number; s5: number }): number {
  return usaSemanas(tipo) ? r3(row.s1 + row.s2 + row.s3 + row.s4 + row.s5) : row.perda
}
// resultado % do mês = perda ÷ base × 100
export function resultadoMes(base: number, perda: number): number | null {
  return base > 0 ? r3((perda / base) * 100) : null
}
// YTD ponderado = Σperda ÷ Σbase × 100 (nunca média simples dos %)
export function ytdPonderado(meses: { base: number; perdaEfetiva: number }[]): { base: number; perda: number; pct: number | null } {
  const base = meses.reduce((s, m) => s + m.base, 0)
  const perda = meses.reduce((s, m) => s + m.perdaEfetiva, 0)
  return { base: r2(base), perda: r2(perda), pct: base > 0 ? r3((perda / base) * 100) : null }
}
