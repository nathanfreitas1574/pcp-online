import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  const body = await req.json()
  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(body.pergunta    !== undefined && { pergunta: body.pergunta }),
      ...(body.tipo        !== undefined && { tipo: body.tipo }),
      ...(body.obrigatorio !== undefined && { obrigatorio: body.obrigatorio }),
      ...(body.bloqueante  !== undefined && { bloqueante: body.bloqueante }),
      ...(body.ordem       !== undefined && { ordem: body.ordem }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  await prisma.checklistItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
