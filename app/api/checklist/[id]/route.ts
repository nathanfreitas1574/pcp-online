import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const t = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      ...(body.nome      !== undefined && { nome: body.nome }),
      ...(body.descricao !== undefined && { descricao: body.descricao }),
      ...(body.ativo     !== undefined && { ativo: body.ativo }),
    },
    include: { itens: { orderBy: { ordem: "asc" } } },
  })
  return NextResponse.json(t)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.checklistTemplate.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
