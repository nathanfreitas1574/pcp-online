import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const prog = await prisma.programacaoSemanal.update({
    where: { id },
    data: {
      ...body,
      total: ["dom","seg","ter","qua","qui","sex","sab"].reduce(async (s, d) => {
        const current = await prisma.programacaoSemanal.findUnique({ where: { id }, select: { [d]: true } })
        return (await s) + (body[d] ?? current?.[d as keyof typeof current] ?? 0)
      }, Promise.resolve(0)),
    },
  })
  return NextResponse.json(prog)
}
