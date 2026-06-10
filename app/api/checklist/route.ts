import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const templates = await prisma.checklistTemplate.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: { itens: { orderBy: { ordem: "asc" } } },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const template = await prisma.checklistTemplate.create({
    data: { nome: body.nome, descricao: body.descricao ?? null },
    include: { itens: true },
  })
  return NextResponse.json(template, { status: 201 })
}
