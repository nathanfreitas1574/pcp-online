import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const TXT = ["cliente", "produto", "local", "obs"] as const
const BOOL = ["turno1", "turno2", "turno3"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const c of TXT) if (b[c] !== undefined) data[c] = b[c] === "" ? null : b[c]
  for (const c of BOOL) if (b[c] !== undefined) data[c] = Boolean(b[c])
  if (b.quantidade !== undefined) data.quantidade = Number(b.quantidade) || 0
  const d = await prisma.demandaInterna.update({ where: { id }, data })
  return NextResponse.json(d)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.demandaInterna.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
