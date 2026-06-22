import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const motivos = await prisma.motivoCancelamento.findMany({ orderBy: [{ ordem: "asc" }, { descricao: "asc" }] })
  return NextResponse.json(motivos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const descricao = String(b.descricao ?? "").trim().toUpperCase()
  if (!descricao) return NextResponse.json({ error: "Informe a descrição." }, { status: 400 })
  try {
    const m = await prisma.motivoCancelamento.create({ data: { descricao } })
    return NextResponse.json(m, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Esse motivo já existe." }, { status: 409 })
  }
}
