import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.codigo    !== undefined) data.codigo    = body.codigo.toUpperCase().trim()
  if (body.nome      !== undefined) data.nome      = body.nome.trim()
  if (body.descricao !== undefined) data.descricao = body.descricao?.trim() || null
  if (body.ordem     !== undefined) data.ordem     = Number(body.ordem)
  if (body.ativo     !== undefined) data.ativo     = body.ativo

  const updated = await prisma.armazem.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Desvincula boxes antes de inativar
  await prisma.box.updateMany({ where: { armazemId: id }, data: { armazemId: null } })
  await prisma.armazem.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
