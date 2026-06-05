import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = { status: body.status }
  if (body.status === "CHAMADO") data.dtChamada = new Date()
  if (body.status === "EM_DESCARGA") data.dtEntrada = new Date()
  const item = await prisma.filaCaminhao.update({ where: { id }, data })
  return NextResponse.json(item)
}
