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

  if (body.codigo      !== undefined) data.codigo      = body.codigo.trim()
  if (body.descricao   !== undefined) data.descricao   = body.descricao.trim()
  if (body.localizacao !== undefined) data.localizacao = body.localizacao.trim()
  if (body.capacidade  !== undefined) data.capacidade  = Number(body.capacidade)
  if (body.armazemId   !== undefined) data.armazemId   = body.armazemId || null
  if (body.ativo       !== undefined) data.ativo       = body.ativo

  const updated = await prisma.box.update({
    where: { id },
    data,
    include: { armazem: { select: { id: true, codigo: true, nome: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.box.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
