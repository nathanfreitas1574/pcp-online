import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normNumContrato } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

// GET ?numero= — busca o contrato no CONTROLE DE EXPEDIÇÃO.
// O mesmo nº pode existir 2+ vezes com operações/tipos diferentes (ex.: GRANEL × BIG BAG);
// a Programação Semanal usa este lookup para oferecer QUAL operação programar.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const numero = (req.nextUrl.searchParams.get("numero") ?? "").trim()
  if (!numero) return NextResponse.json({ matches: [] })

  const alvo = normNumContrato(numero)
  const regs = await prisma.contratoExpedicao.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      numero: true, operacao: true, tipoProduto: true, linhaProducao: true,
      produtoAbreviado: true, produtoSistema: true, status: true,
      cliente: { select: { nome: true } },
    },
    take: 3000,
  })
  const matches = regs
    .filter((c) => normNumContrato(c.numero) === alvo)
    .map((c) => ({
      clienteNome: c.cliente.nome,
      desProduto: c.produtoAbreviado || c.produtoSistema || "",
      operacao: c.operacao,
      tipoProduto: c.tipoProduto,
      linhaProducao: c.linhaProducao,
      status: c.status,
    }))
  // dedup por cliente+produto+operação+tipo (mais recente primeiro)
  const vistos = new Set<string>()
  const unicos = matches.filter((m) => {
    const k = `${m.clienteNome}|${m.desProduto}|${m.operacao ?? ""}|${m.tipoProduto ?? ""}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
  return NextResponse.json({ matches: unicos })
}
