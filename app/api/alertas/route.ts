import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "ABERTO"
  const onlyCount = searchParams.get("count") === "1"

  if (onlyCount) {
    const count = await prisma.alerta.count({ where: { status: "ABERTO" } })
    return NextResponse.json({ count })
  }

  const alertas = await prisma.alerta.findMany({
    where: status === "TODOS" ? {} : { status: status as "ABERTO" | "LIDO" | "RESOLVIDO" },
    orderBy: [{ severidade: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      box: { select: { codigo: true } },
      usuario: { select: { name: true } },
    },
  })

  return NextResponse.json(alertas)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const alerta = await prisma.alerta.create({
    data: {
      tipo: body.tipo,
      severidade: body.severidade ?? "AVISO",
      titulo: body.titulo,
      descricao: body.descricao,
      referencia: body.referencia,
      boxId: body.boxId ?? null,
      usuarioId: session.user.id,
    },
  })
  return NextResponse.json(alerta, { status: 201 })
}
