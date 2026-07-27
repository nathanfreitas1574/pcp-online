import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normNumContrato } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

// GET ?numero= — busca o contrato no CONTROLE DE RECEBIMENTO (cliente/produto/linha de descarga).
// Usado pela Programação Semanal (tipo RECEBIMENTO): os contratos vêm de lá.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const numero = (req.nextUrl.searchParams.get("numero") ?? "").trim()
  if (!numero) return NextResponse.json({ matches: [] })

  const alvo = normNumContrato(numero)
  const regs = await prisma.recebimentoControle.findMany({
    where: { numeroContrato: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { numeroContrato: true, cliente: true, produtoAbreviado: true, linhaDescarga: true, tipoProduto: true },
    take: 2000,
  })
  const matches = regs
    .filter((r) => normNumContrato(r.numeroContrato) === alvo)
    .map((r) => ({ clienteNome: r.cliente, desProduto: r.produtoAbreviado, linhaDescarga: r.linhaDescarga, tipoProduto: r.tipoProduto }))
  // dedup (mais recente primeiro)
  const vistos = new Set<string>()
  const unicos = matches.filter((m) => { const k = `${m.clienteNome}|${m.desProduto}`; if (vistos.has(k)) return false; vistos.add(k); return true })
  return NextResponse.json({ matches: unicos })
}
