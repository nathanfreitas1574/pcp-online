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
  for (const k of ["tipoProduto", "operacao", "linhaProducao", "status"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  }
  if (b.volProgramado !== undefined) data.volProgramado = Number(b.volProgramado) || 0
  const c = await prisma.contratoExpedicao.update({ where: { id }, data, include: { cliente: { select: { nome: true } } } })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.expedicaoRegistro.updateMany({ where: { contratoId: id }, data: { contratoId: null } })
  await prisma.contratoExpedicao.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
