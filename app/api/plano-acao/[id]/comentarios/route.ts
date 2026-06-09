import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const comentarios = await prisma.planoAcaoComentario.findMany({
    where: { planoId: id },
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ comentarios })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { texto } = await req.json()
  if (!texto?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 })

  const comentario = await prisma.planoAcaoComentario.create({
    data: { planoId: id, autorId: session.user.id, texto: texto.trim() },
    include: { autor: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ comentario }, { status: 201 })
}
