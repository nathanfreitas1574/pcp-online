import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.status       !== undefined) data.status       = body.status
  if (body.produto      !== undefined) data.produto      = body.produto
  if (body.cliente      !== undefined) data.cliente      = body.cliente
  if (body.naveNome     !== undefined) data.naveNome     = body.naveNome
  if (body.naveId       !== undefined) data.naveId       = body.naveId || null
  if (body.volumePrev   !== undefined) data.volumePrev   = body.volumePrev ? Number(body.volumePrev) : null
  if (body.dataPrevisao !== undefined) data.dataPrevisao = new Date(body.dataPrevisao)
  if (body.observacao   !== undefined) data.observacao   = body.observacao || null

  const previsao = await prisma.previsaoRecebimento.update({
    where: { id },
    data,
    include: {
      box:  { select: { codigo: true, descricao: true } },
      nave: { select: { nome: true } },
    },
  })
  return NextResponse.json(previsao)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.previsaoRecebimento.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
