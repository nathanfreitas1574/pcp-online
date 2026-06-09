import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const tarefas = await prisma.planoAcaoTarefa.findMany({
    where: { planoId: id },
    orderBy: { ordem: "asc" },
  })
  return NextResponse.json({ tarefas })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { descricao, responsavel, prazo } = await req.json()
  if (!descricao?.trim()) return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 })

  const count = await prisma.planoAcaoTarefa.count({ where: { planoId: id } })

  const tarefa = await prisma.planoAcaoTarefa.create({
    data: {
      planoId: id,
      descricao: descricao.trim(),
      responsavel: responsavel?.trim() || null,
      prazo: prazo ? new Date(prazo) : null,
      ordem: count,
    },
  })

  // Recalcular progresso do plano
  await recalcularProgresso(id)

  return NextResponse.json({ tarefa }, { status: 201 })
}

async function recalcularProgresso(planoId: string) {
  const tarefas = await prisma.planoAcaoTarefa.findMany({ where: { planoId } })
  if (tarefas.length === 0) return
  const pct = Math.round((tarefas.filter(t => t.concluida).length / tarefas.length) * 100)
  await prisma.planoAcao.update({ where: { id: planoId }, data: { progresso: pct } })
}
