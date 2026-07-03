import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST { ids: string[] } — grava a ordem manual das linhas (ordem = índice)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids inválido" }, { status: 400 })
  await prisma.$transaction(
    ids.map((id: string, i: number) =>
      prisma.programacaoSemanal.update({ where: { id }, data: { ordem: i } })
    )
  )
  return NextResponse.json({ ok: true })
}
