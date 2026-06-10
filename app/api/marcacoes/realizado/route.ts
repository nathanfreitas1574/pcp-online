import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/** Normaliza nome de cliente para casar marcação ↔ contrato. */
function normCliente(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(S\.?A\.?|S\/A|LTDA\.?|EIRELI|ME|EPP|CIA|COMPANHIA)\b/g, "")
    .replace(/[.,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// GET — comparativo Contratado (ContratoArmazenagem) vs Realizado (MarcacaoVeiculo)
// Casa por nome de cliente normalizado: clienteDestino ↔ clienteNome.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const safra = searchParams.get("safra") || undefined

  const [contratos, marcacoes] = await Promise.all([
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true, ...(safra ? { safra } : {}) },
      select: { clienteNome: true, qtdContratada: true, descTabela: true, desProduto: true, safra: true },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true },
      select: { clienteDestino: true, cliente: true, pesoLiquido: true, operacao: true, produto: true },
    }),
  ])

  // Agrega contratado por cliente normalizado
  const mapa = new Map<string, {
    cliente: string
    contratado: number
    realizadoCarga: number
    realizadoDescarga: number
    veiculos: number
    contratos: number
  }>()

  for (const c of contratos) {
    const key = normCliente(c.clienteNome)
    if (!key) continue
    const cur = mapa.get(key) ?? { cliente: c.clienteNome, contratado: 0, realizadoCarga: 0, realizadoDescarga: 0, veiculos: 0, contratos: 0 }
    cur.contratado += c.qtdContratada || 0
    cur.contratos += 1
    if (!cur.cliente || cur.cliente.length < c.clienteNome.length) cur.cliente = c.clienteNome
    mapa.set(key, cur)
  }

  for (const m of marcacoes) {
    const nome = m.clienteDestino || m.cliente
    const key = normCliente(nome)
    if (!key) continue
    const cur = mapa.get(key) ?? { cliente: nome || "—", contratado: 0, realizadoCarga: 0, realizadoDescarga: 0, veiculos: 0, contratos: 0 }
    const op = (m.operacao || "").toUpperCase()
    if (op.includes("DESCARGA")) cur.realizadoDescarga += m.pesoLiquido || 0
    else cur.realizadoCarga += m.pesoLiquido || 0
    cur.veiculos += 1
    mapa.set(key, cur)
  }

  const comparativo = Array.from(mapa.values())
    .map(r => {
      const realizado = r.realizadoCarga + r.realizadoDescarga
      const saldo = r.contratado - realizado
      const pct = r.contratado > 0 ? (realizado / r.contratado) * 100 : null
      return { ...r, realizado, saldo, pct }
    })
    .sort((a, b) => b.contratado - a.contratado)

  const totais = comparativo.reduce(
    (acc, r) => {
      acc.contratado += r.contratado
      acc.realizado += r.realizado
      acc.veiculos += r.veiculos
      return acc
    },
    { contratado: 0, realizado: 0, veiculos: 0 },
  )

  return NextResponse.json({ comparativo, totais })
}
