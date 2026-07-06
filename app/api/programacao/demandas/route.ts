import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Outras demandas internas da semana

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ano = Number(req.nextUrl.searchParams.get("ano"))
  const semana = Number(req.nextUrl.searchParams.get("semana"))
  if (!Number.isInteger(ano) || !Number.isInteger(semana))
    return NextResponse.json({ error: "ano/semana inválidos" }, { status: 400 })
  const demandas = await prisma.demandaInterna.findMany({ where: { ano, semana }, orderBy: { createdAt: "asc" } })
  return NextResponse.json({ demandas })
}

// POST — cria uma linha em branco na semana
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const ano = Number(b.ano), semana = Number(b.semana)
  if (!Number.isInteger(ano) || !Number.isInteger(semana) || semana < 1 || semana > 53)
    return NextResponse.json({ error: "ano/semana inválidos" }, { status: 400 })
  const d = await prisma.demandaInterna.create({ data: { ano, semana, turno1: true } })
  return NextResponse.json(d, { status: 201 })
}
