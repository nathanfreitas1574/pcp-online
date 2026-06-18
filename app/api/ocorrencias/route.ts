import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ocorrencias = await prisma.ocorrencia.findMany({
    include: { criadoPor: { select: { id: true, name: true } }, box: { select: { id: true, codigo: true } } },
    orderBy: [{ status: "asc" }, { gravidade: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ ocorrencias })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { tipo, descricao, local, boxId, boxCodigo, foto, gravidade, responsavel, observacao } = await req.json()
  if (!tipo || !descricao) return NextResponse.json({ error: "Tipo e descrição obrigatórios" }, { status: 400 })
  let resolvedBoxId: string | null = boxId || null
  if (!resolvedBoxId && boxCodigo) {
    const box = await prisma.box.findFirst({ where: { codigo: boxCodigo } })
    resolvedBoxId = box?.id ?? null
  }
  const ocorrencia = await prisma.ocorrencia.create({
    data: {
      tipo, descricao, gravidade: gravidade ?? "MEDIA",
      local: local || null, boxId: resolvedBoxId,
      foto: foto || null, responsavel: responsavel || null,
      criadoPorId: session.user.id,
    },
    include: { criadoPor: { select: { id: true, name: true } }, box: { select: { id: true, codigo: true } } },
  })
  return NextResponse.json({ ocorrencia }, { status: 201 })
}
