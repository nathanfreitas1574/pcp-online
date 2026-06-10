import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const custo = await prisma.custoOperacional.update({
    where: { id },
    data: {
      ...(body.tipo      !== undefined && { tipo: body.tipo }),
      ...(body.descricao !== undefined && { descricao: body.descricao }),
      ...(body.valor     !== undefined && { valor: Number(body.valor) }),
      ...(body.armazemId !== undefined && { armazemId: body.armazemId || null }),
    },
  })
  return NextResponse.json(custo)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.custoOperacional.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
