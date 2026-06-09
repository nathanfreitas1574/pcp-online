import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ativas = searchParams.get("ativas") === "1"  // só AGUARDANDO e RECEBENDO
  const boxId  = searchParams.get("boxId")

  const where: Record<string, unknown> = {}
  if (ativas) where.status = { in: ["AGUARDANDO", "RECEBENDO"] }
  if (boxId)  where.boxId  = boxId

  const previsoes = await prisma.previsaoRecebimento.findMany({
    where,
    orderBy: { dataPrevisao: "asc" },
    include: {
      box:  { select: { id: true, codigo: true, descricao: true, armazemId: true, armazem: { select: { nome: true, codigo: true } } } },
      nave: { select: { id: true, nome: true, eta: true, status: true } },
    },
  })
  return NextResponse.json(previsoes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const previsao = await prisma.previsaoRecebimento.create({
    data: {
      boxId:        body.boxId,
      naveId:       body.naveId   || null,
      naveNome:     body.naveNome || null,
      produto:      body.produto,
      cliente:      body.cliente,
      volumePrev:   body.volumePrev ? Number(body.volumePrev) : null,
      dataPrevisao: new Date(body.dataPrevisao),
      observacao:   body.observacao || null,
      criadoPorNome: session.user.name ?? null,
    },
    include: {
      box:  { select: { codigo: true, descricao: true } },
      nave: { select: { nome: true } },
    },
  })
  return NextResponse.json(previsao, { status: 201 })
}
