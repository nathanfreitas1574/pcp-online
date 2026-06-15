import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (b.cliente !== undefined) data.cliente = String(b.cliente).trim()
  if (b.produto !== undefined) data.produto = String(b.produto).trim()
  if (b.fisico !== undefined) data.fisico = Number(b.fisico) || 0
  if (b.contabil !== undefined) data.contabil = Number(b.contabil) || 0
  if (b.custoUnitario !== undefined) data.custoUnitario = Number(b.custoUnitario) || 0
  if (b.observacao !== undefined) data.observacao = b.observacao?.trim() || null
  data.atualizadoPor = session.user.name ?? null

  const c = await prisma.aditivoControle.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.aditivoControle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
