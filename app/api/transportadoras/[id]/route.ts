import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const t = await prisma.transportadora.update({ where: { id }, data: { codigo: body.codigo, nome: body.nome, cnpj: body.cnpj || null, contato: body.contato || null, telefone: body.telefone || null, ativo: body.ativo } })
  return NextResponse.json(t)
}
