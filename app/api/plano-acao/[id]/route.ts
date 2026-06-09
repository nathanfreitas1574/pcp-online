import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { oQue, porQue, quem, onde, quando, como, quantoCusta,
          prioridade, status, progresso, observacao, dataConclusao } = body

  const data: Record<string, unknown> = {}
  if (oQue !== undefined) data.oQue = oQue
  if (porQue !== undefined) data.porQue = porQue
  if (quem !== undefined) data.quem = quem
  if (onde !== undefined) data.onde = onde
  if (quando !== undefined) data.quando = new Date(quando)
  if (como !== undefined) data.como = como
  if (quantoCusta !== undefined) data.quantoCusta = quantoCusta ? Number(quantoCusta) : null
  if (prioridade !== undefined) data.prioridade = prioridade
  if (status !== undefined) {
    data.status = status
    if (status === "CONCLUIDO" && !dataConclusao) {
      data.dataConclusao = new Date()
      data.progresso = 100
    }
  }
  if (progresso !== undefined) data.progresso = Number(progresso)
  if (observacao !== undefined) data.observacao = observacao
  if (dataConclusao !== undefined) data.dataConclusao = dataConclusao ? new Date(dataConclusao) : null

  const plano = await prisma.planoAcao.update({
    where: { id },
    data,
    include: { criadoPor: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ plano })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.planoAcao.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
