import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const item = await prisma.inventarioItem.update({
    where: { id },
    data: { ajustado: body.ajustado },
    include: {
      produto: { select: { codigo: true, descricao: true, unidade: true } },
      usuario: { select: { name: true } },
    },
  })
  return NextResponse.json(item)
}
