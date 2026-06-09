import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const armazens = await prisma.armazem.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: {
      boxes: {
        where: { ativo: true },
        orderBy: { codigo: "asc" },
        include: {
          estoques: { select: { quantidade: true }, orderBy: { quantidade: "desc" }, take: 1 },
          lacres:   { select: { status: true },     orderBy: { createdAt: "desc" },  take: 1 },
        },
      },
    },
  })
  return NextResponse.json(armazens)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const last = await prisma.armazem.findFirst({ orderBy: { ordem: "desc" } })
  const novo = await prisma.armazem.create({
    data: {
      codigo:    body.codigo.toUpperCase().trim(),
      nome:      body.nome.trim(),
      descricao: body.descricao?.trim() || null,
      ordem:     (last?.ordem ?? 0) + 1,
    },
    include: { boxes: { where: { ativo: true }, orderBy: { codigo: "asc" } } },
  })
  return NextResponse.json(novo, { status: 201 })
}
