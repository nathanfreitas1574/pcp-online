import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const maxOrdem = await prisma.checklistItem.aggregate({ where: { templateId: id }, _max: { ordem: true } })
  const item = await prisma.checklistItem.create({
    data: {
      templateId: id,
      pergunta: body.pergunta,
      tipo: body.tipo ?? "SIM_NAO",
      obrigatorio: body.obrigatorio ?? true,
      bloqueante: body.bloqueante ?? false,
      ordem: (maxOrdem._max.ordem ?? 0) + 1,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
