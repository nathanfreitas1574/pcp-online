import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tarefaId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, tarefaId } = await params
  const body = await req.json()
  const { concluida, descricao, responsavel, prazo } = body

  const data: Record<string, unknown> = {}
  if (concluida !== undefined) data.concluida = concluida
  if (descricao !== undefined) data.descricao = descricao
  if (responsavel !== undefined) data.responsavel = responsavel || null
  if (prazo !== undefined) data.prazo = prazo ? new Date(prazo) : null

  const tarefa = await prisma.planoAcaoTarefa.update({ where: { id: tarefaId }, data })

  // Recalcular progresso automaticamente
  const tarefas = await prisma.planoAcaoTarefa.findMany({ where: { planoId: id } })
  const pct = tarefas.length > 0
    ? Math.round((tarefas.filter(t => t.concluida).length / tarefas.length) * 100)
    : 0
  const plano = await prisma.planoAcao.update({
    where: { id },
    data: { progresso: pct },
    include: { criadoPor: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ tarefa, plano })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tarefaId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, tarefaId } = await params
  await prisma.planoAcaoTarefa.delete({ where: { id: tarefaId } })

  // Recalcular progresso
  const tarefas = await prisma.planoAcaoTarefa.findMany({ where: { planoId: id } })
  const pct = tarefas.length > 0
    ? Math.round((tarefas.filter(t => t.concluida).length / tarefas.length) * 100)
    : 0
  const plano = await prisma.planoAcao.update({
    where: { id },
    data: { progresso: pct },
    include: { criadoPor: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ ok: true, plano })
}
