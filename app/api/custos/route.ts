import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes")  // "2025-06"

  const custos = await prisma.custoOperacional.findMany({
    where: mes ? { mes } : undefined,
    orderBy: { data: "desc" },
    include: { armazem: { select: { nome: true, codigo: true } } },
  })
  return NextResponse.json(custos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const data = new Date(body.data)
  const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`

  const custo = await prisma.custoOperacional.create({
    data: {
      data,
      mes,
      tipo: body.tipo,
      descricao: body.descricao,
      valor: Number(body.valor),
      armazemId: body.armazemId || null,
      criadoPorNome: session.user.name ?? null,
    },
    include: { armazem: { select: { nome: true, codigo: true } } },
  })
  return NextResponse.json(custo, { status: 201 })
}
