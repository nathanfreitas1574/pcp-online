import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === "ENCERRADA") data.dataFechamento = new Date()
  }
  if (body.resolucao !== undefined) data.resolucao = body.resolucao
  if (body.responsavel !== undefined) data.responsavel = body.responsavel
  if (body.gravidade !== undefined) data.gravidade = body.gravidade
  if (body.planoAcaoId !== undefined) data.planoAcaoId = body.planoAcaoId
  const ocorrencia = await prisma.ocorrencia.update({
    where: { id }, data,
    include: { criadoPor: { select: { id: true, name: true } }, box: { select: { id: true, codigo: true } } },
  })
  return NextResponse.json({ ocorrencia })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.ocorrencia.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
