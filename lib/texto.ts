// Normalização de texto para casar cliente/produto entre sistemas diferentes
// (contratos TOTVS, marcação do Connect, cadastros internos).

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Nome de cliente normalizado: sem acento, maiúsculo, sem sufixos societários. */
export function normCliente(s: string | null | undefined): string {
  return semAcento(String(s ?? ""))
    .toUpperCase()
    .replace(/\b(S\.?A\.?|S\/A|LTDA\.?|EIRELI|ME|EPP|CIA|COMPANHIA)\b/g, "")
    .replace(/[.,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Palavras genéricas que não ajudam a distinguir produto
const STOP_PRODUTO = new Set([
  "DE", "DA", "DO", "E", "BB", "KG", "TON", "PO", "BIG", "BAG", "GR", "MG",
  "BRANCO", "BLACK", "SACO", "SACA", "GRANEL", "ADITIVO", "PRODUTO", "UN",
])

function tokenizar(s: string | null | undefined): string[] {
  return semAcento(String(s ?? "")).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
}
/** Fórmula NPK: grupos só de dígitos (ex.: "30 00 20" → ["00","20","30"]). */
function formulaProduto(s: string | null | undefined): string[] {
  return tokenizar(s).filter(t => /^\d{1,3}$/.test(t)).sort()
}
/** Palavras que distinguem o produto (com letra, len≥3, não genéricas). */
function palavrasProduto(s: string | null | undefined): string[] {
  return tokenizar(s).filter(t => t.length >= 3 && /[A-Z]/.test(t) && !STOP_PRODUTO.has(t))
}

/**
 * Casa duas descrições de produto de sistemas diferentes (contrato × marcação).
 * A fórmula NPK é o que distingue fertilizantes: "30 00 20" ≠ "00 18 18".
 * Regras:
 *  - ambas têm fórmula → as fórmulas precisam ser IGUAIS;
 *  - senão → precisam compartilhar ao menos uma palavra significativa.
 */
export function produtoMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const fa = formulaProduto(a), fb = formulaProduto(b)
  const wa = palavrasProduto(a), wb = palavrasProduto(b)
  const palavraEmComum = wa.some(w => wb.includes(w))

  if (fa.length && fb.length) {
    if (fa.join("-") !== fb.join("-")) return false   // NPK diferente → produtos diferentes
    // mesma fórmula: confirma com palavra em comum quando ambas têm palavras
    return wa.length && wb.length ? palavraEmComum : true
  }
  // ao menos uma sem fórmula → exige palavra significativa em comum
  return palavraEmComum
}
