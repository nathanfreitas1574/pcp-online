import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH — editar a descrição de origem ou trocar o produto destino
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.descricaoOrigem !== undefined) data.descricaoOrigem = body.descricaoOrigem.trim()
  if (body.produtoId      !== undefined) data.produtoId       = body.produtoId

  const updated = await prisma.produtoDePara.update({
    where: { id },
    data,
    include: { produto: { select: { id: true, codigo: true, descricao: true, unidade: true } } },
  })
  return NextResponse.json(updated)
}

// DELETE — remove o mapeamento
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.produtoDePara.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
