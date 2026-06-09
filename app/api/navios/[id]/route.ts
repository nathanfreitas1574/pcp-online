import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.nome !== undefined) data.nome = body.nome
  if (body.eta !== undefined) data.eta = new Date(body.eta)
  if (body.produto !== undefined) data.produto = body.produto || null
  if (body.volumePrev !== undefined) data.volumePrev = body.volumePrev ? Number(body.volumePrev) : null
  if (body.clienteNome !== undefined) data.clienteNome = body.clienteNome || null
  if (body.origem !== undefined) data.origem = body.origem || null
  if (body.berco !== undefined) data.berco = body.berco || null
  if (body.status !== undefined) data.status = body.status
  if (body.observacao !== undefined) data.observacao = body.observacao || null
  const navio = await prisma.naveAgendada.update({ where: { id }, data })
  return NextResponse.json({ navio })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.naveAgendada.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
