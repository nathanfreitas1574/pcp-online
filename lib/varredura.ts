const MESES = ["JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]
const ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

/** "JANEIRO 2026" | "jan/26" → { ano, mesNum }. */
export function parseMes(label: unknown): { ano: number; mesNum: number } {
  const s = String(label ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
  let mesNum = 0
  for (let i = 0; i < 12; i++) {
    if (s.includes(MESES[i]) || new RegExp(`\\b${ABREV[i]}\\b`).test(s)) { mesNum = i + 1; break }
  }
  const m = s.match(/(20\d{2})/) || s.match(/\/(\d{2})\b/)
  let ano = new Date().getFullYear()
  if (m) ano = m[1].length === 4 ? Number(m[1]) : 2000 + Number(m[1])
  return { ano, mesNum: mesNum || 1 }
}

export const MES_LABEL = (mesNum: number) => MESES[Math.max(0, Math.min(11, mesNum - 1))]
