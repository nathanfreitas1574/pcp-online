import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const alerta = await prisma.alerta.update({
    where: { id },
    data: {
      status: body.status,
      resolvidoPor: body.status === "RESOLVIDO" ? session.user.name : undefined,
      resolvidoEm: body.status === "RESOLVIDO" ? new Date() : undefined,
    },
  })
  return NextResponse.json(alerta)
}
