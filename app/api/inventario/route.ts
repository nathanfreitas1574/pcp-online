import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const inventarios = await prisma.inventario.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { itens: { include: { produto: true } } },
  })
  return NextResponse.json(inventarios)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const inventario = await prisma.inventario.create({
    data: {
      tipo: body.tipo,
      data: new Date(body.data),
      status: "ABERTO",
    },
  })
  return NextResponse.json(inventario, { status: 201 })
}
