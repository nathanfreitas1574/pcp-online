import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH { produto?, cliente?, quantidade? } → edita o produto da planta
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (b.produto !== undefined) data.produto = String(b.produto).trim()
  if (b.cliente !== undefined) data.cliente = b.cliente?.trim() || null
  if (b.quantidade !== undefined) data.quantidade = Number(b.quantidade) || 0

  const item = await prisma.plantaItem.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.plantaItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
