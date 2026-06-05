import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const produtos = await prisma.produto.findMany({ orderBy: { descricao: "asc" } })
  return NextResponse.json(produtos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const produto = await prisma.produto.create({
    data: { codigo: body.codigo, descricao: body.descricao, unidade: body.unidade ?? "TON" },
  })
  return NextResponse.json(produto, { status: 201 })
}
