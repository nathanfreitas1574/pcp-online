import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Armazena comentários no campo `referencia` como JSON
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const alerta = await prisma.alerta.findUnique({ where: { id }, select: { id: true, descricao: true } })
  if (!alerta) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Comentários salvos nos logs de atividade vinculados ao alerta
  const comentarios = await prisma.logAtividade.findMany({
    where: { referencia: id, modulo: "COMENTARIO_ALERTA" },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(comentarios.map((c) => ({
    id: c.id,
    usuario: c.usuarioNome,
    texto: c.descricao,
    createdAt: c.createdAt,
  })))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const comentario = await prisma.logAtividade.create({
    data: {
      modulo: "COMENTARIO_ALERTA",
      acao: "COMENTAR",
      descricao: body.texto,
      referencia: id,
      usuarioId: session.user.id,
      usuarioNome: session.user.name,
    },
  })

  return NextResponse.json({
    id: comentario.id,
    usuario: comentario.usuarioNome,
    texto: comentario.descricao,
    createdAt: comentario.createdAt,
  }, { status: 201 })
}
