import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH — salva/edita a justificativa de uma divergência
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const justificativa: string = (body.justificativa ?? "").toString().trim()

  const item = await prisma.conciliacaoItem.update({
    where: { id },
    data: {
      justificativa: justificativa || null,
      justificadoPor: justificativa ? (session.user.name ?? session.user.email ?? "—") : null,
      justificadoEm:  justificativa ? new Date() : null,
    },
  })
  return NextResponse.json({ ok: true, item })
}
