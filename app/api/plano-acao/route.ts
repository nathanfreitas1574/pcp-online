import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const prioridade = searchParams.get("prioridade")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (prioridade) where.prioridade = prioridade

  const planos = await prisma.planoAcao.findMany({
    where,
    include: { criadoPor: { select: { id: true, name: true } } },
    orderBy: [
      { prioridade: "asc" },
      { quando: "asc" },
    ],
  })

  return NextResponse.json({ planos })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { oQue, porQue, quem, onde, quando, como, quantoCusta, prioridade, observacao } = body

  if (!oQue || !porQue || !quem || !onde || !quando || !como) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }

  const plano = await prisma.planoAcao.create({
    data: {
      oQue,
      porQue,
      quem,
      onde,
      quando: new Date(quando),
      como,
      quantoCusta: quantoCusta ? Number(quantoCusta) : null,
      prioridade: prioridade ?? "MEDIA",
      criadoPorId: session.user.id,
    },
    include: { criadoPor: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ plano }, { status: 201 })
}
