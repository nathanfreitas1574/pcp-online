import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (b.descricao !== undefined) data.descricao = String(b.descricao).trim().toUpperCase()
  if (b.ativo !== undefined) data.ativo = !!b.ativo
  const m = await prisma.motivoCancelamento.update({ where: { id }, data })
  return NextResponse.json(m)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.motivoCancelamento.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
