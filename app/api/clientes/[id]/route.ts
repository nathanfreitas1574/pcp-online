import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const cliente = await prisma.cliente.update({
    where: { id },
    data: { codigo: body.codigo, nome: body.nome, cnpj: body.cnpj || null, ativo: body.ativo },
  })
  return NextResponse.json(cliente)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.cliente.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
