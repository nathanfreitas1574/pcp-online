import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — lista de aditivos + totais (físico × contábil × diferença × custo perda)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const itens = await prisma.aditivoControle.findMany({ orderBy: [{ ordem: "asc" }, { cliente: "asc" }, { produto: "asc" }] })

  const totais = itens.reduce(
    (acc, a) => {
      acc.fisico += a.fisico
      acc.contabil += a.contabil
      const dif = a.fisico - a.contabil
      acc.diferenca += dif
      if (dif < 0) acc.custoPerda += -dif * (a.custoUnitario || 0)
      return acc
    },
    { fisico: 0, contabil: 0, diferenca: 0, custoPerda: 0 },
  )

  return NextResponse.json({ itens, totais })
}

// POST — cria/atualiza um aditivo (upsert por cliente+produto)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.produto?.trim()) return NextResponse.json({ error: "Informe o produto." }, { status: 400 })
  const cliente = String(b.cliente ?? "").trim()
  const produto = String(b.produto).trim()

  const data = {
    fisico: Number(b.fisico) || 0,
    contabil: Number(b.contabil) || 0,
    custoUnitario: Number(b.custoUnitario) || 0,
    observacao: b.observacao?.trim() || null,
    atualizadoPor: session.user.name ?? null,
  }
  const c = await prisma.aditivoControle.upsert({
    where: { cliente_produto: { cliente, produto } },
    update: data,
    create: { cliente, produto, ...data },
  })
  return NextResponse.json(c, { status: 201 })
}
