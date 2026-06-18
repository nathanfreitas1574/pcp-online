import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const clientes = await prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } })
  return NextResponse.json(clientes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const cliente = await prisma.cliente.create({
    data: { codigo: body.codigo, nome: body.nome, abreviado: body.abreviado || null, cnpj: body.cnpj || null },
  })
  return NextResponse.json(cliente, { status: 201 })
}
