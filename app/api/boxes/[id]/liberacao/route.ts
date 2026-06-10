import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const historico = await prisma.liberacaoBox.findMany({
    where: { boxId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return NextResponse.json(historico)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const box = await prisma.box.findUnique({ where: { id }, select: { statusLiberacao: true } })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  const [updated] = await prisma.$transaction([
    prisma.box.update({
      where: { id },
      data: {
        statusLiberacao: body.statusNovo,
        motivoBloqueio: body.statusNovo === "BLOQUEADO" ? (body.motivo ?? null) : null,
      },
    }),
    prisma.liberacaoBox.create({
      data: {
        boxId: id,
        statusAnterior: box.statusLiberacao,
        statusNovo: body.statusNovo,
        motivo: body.motivo ?? null,
        usuarioNome: session.user.name ?? null,
      },
    }),
  ])
  return NextResponse.json(updated)
}
