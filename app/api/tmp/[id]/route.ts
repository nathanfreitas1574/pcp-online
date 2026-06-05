import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const reg = await prisma.tmpRegistro.findUnique({ where: { id } })
  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const dtSaida = new Date(body.dtSaida)
  const tmpMinutos = Math.round((dtSaida.getTime() - new Date(reg.dtEntrada).getTime()) / 60000)
  const updated = await prisma.tmpRegistro.update({
    where: { id },
    data: { dtSaida, tmpMinutos, status: "CONCLUIDO" },
  })
  return NextResponse.json(updated)
}
