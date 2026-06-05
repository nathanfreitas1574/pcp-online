import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const boxes = await prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } })
  return NextResponse.json(boxes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const box = await prisma.box.create({
    data: {
      codigo: body.codigo,
      descricao: body.descricao,
      localizacao: body.localizacao,
      capacidade: body.capacidade,
    },
  })
  return NextResponse.json(box, { status: 201 })
}
