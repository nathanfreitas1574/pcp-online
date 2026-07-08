import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Ações / demandas internas — lista VIVA (não trava por semana)

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const demandas = await prisma.demandaInterna.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ demandas })
}

// POST — cria uma ação em branco (guarda ano/semana só como referência de quando foi criada)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const ano = Number(b.ano), semana = Number(b.semana)
  const d = await prisma.demandaInterna.create({
    data: {
      ano: Number.isInteger(ano) ? ano : 0,
      semana: Number.isInteger(semana) ? semana : 0,
      status: "PENDENTE",
    },
  })
  return NextResponse.json(d, { status: 201 })
}
