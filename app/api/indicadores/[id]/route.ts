import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const m of MESES) if (b[m] !== undefined) data[m] = Number(b[m]) || 0
  if (b.meta !== undefined) data.meta = b.meta != null && b.meta !== "" ? Number(b.meta) : null
  if (b.unidade !== undefined) data.unidade = b.unidade?.trim() || null
  if (b.sentidoIdeal !== undefined) data.sentidoIdeal = b.sentidoIdeal || null
  if (b.desdobramento !== undefined) data.desdobramento = b.desdobramento?.trim() || null
  if (b.obs !== undefined) data.obs = b.obs?.trim() || null
  if (b.indicador !== undefined) data.indicador = String(b.indicador).trim()
  if (b.recursoMedido !== undefined) data.recursoMedido = String(b.recursoMedido).trim()

  const c = await prisma.indicadorPcp.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.indicadorPcp.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
