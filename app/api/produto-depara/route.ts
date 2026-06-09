import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const depara = await prisma.produtoDePara.findMany({
    orderBy: { produto: { descricao: "asc" } },
    include: {
      produto: { select: { id: true, codigo: true, descricao: true, unidade: true } },
    },
  })
  return NextResponse.json(depara)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { descricaoOrigem, produtoId } = body as { descricaoOrigem: string; produtoId: string }

  if (!descricaoOrigem?.trim() || !produtoId)
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })

  // Verifica se a descrição já está mapeada
  const existe = await prisma.produtoDePara.findUnique({
    where: { descricaoOrigem: descricaoOrigem.trim() },
  })
  if (existe) {
    return NextResponse.json({ error: "Essa descrição já está mapeada" }, { status: 409 })
  }

  const novo = await prisma.produtoDePara.create({
    data: {
      descricaoOrigem: descricaoOrigem.trim(),
      produtoId,
      criadoPorNome: session.user.name ?? null,
    },
    include: {
      produto: { select: { id: true, codigo: true, descricao: true, unidade: true } },
    },
  })
  return NextResponse.json(novo, { status: 201 })
}
