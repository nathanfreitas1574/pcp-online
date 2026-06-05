import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const t = await prisma.transportadora.findMany({ orderBy: { nome: "asc" } })
  return NextResponse.json(t)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const t = await prisma.transportadora.create({ data: { codigo: body.codigo, nome: body.nome, cnpj: body.cnpj || null, contato: body.contato || null, telefone: body.telefone || null } })
  return NextResponse.json(t, { status: 201 })
}
