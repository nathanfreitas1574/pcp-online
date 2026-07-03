import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST { ids: string[] } — prioridade = índice + 1 (ordem de arraste)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids inválido" }, { status: 400 })
  // ignora ids que não existem mais (ex.: apagados noutra sessão) p/ não derrubar a transação
  const existentes = await prisma.viraProgramacao.findMany({ where: { id: { in: ids } }, select: { id: true } })
  const validos = new Set(existentes.map((e) => e.id))
  const ordenados = (ids as string[]).filter((id) => validos.has(id))
  await prisma.$transaction(
    ordenados.map((id, i) => prisma.viraProgramacao.update({ where: { id }, data: { prioridade: i + 1 } }))
  )
  return NextResponse.json({ ok: true })
}
