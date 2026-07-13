import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const atual = await prisma.programacaoSemanal.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: "Programação não encontrada" }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const d of DIAS) if (body[d] !== undefined) data[d] = Number(body[d]) || 0
  if (body.numeroContrato !== undefined) data.numeroContrato = body.numeroContrato || null
  if (body.turno !== undefined) data.turno = body.turno || null
  if (body.obs !== undefined) data.obs = body.obs || null
  if (body.produto !== undefined && body.produto) data.produto = body.produto
  if (body.clienteNome !== undefined && body.clienteNome) data.clienteNome = body.clienteNome
  if (body.boxId !== undefined) {
    data.boxId = body.boxId || null
    data.boxCodigo = body.boxId
      ? (await prisma.box.findUnique({ where: { id: body.boxId }, select: { codigo: true } }))?.codigo ?? null
      : null
  }

  // Recalcula o total a partir dos 7 dias (mesclando os que mudaram)
  const dias = DIAS.map(d => (data[d] !== undefined ? data[d] : (atual[d] as number)))
  data.total = dias.reduce((s, v) => s + v, 0)

  const prog = await prisma.programacaoSemanal.update({
    where: { id },
    data,
    include: { box: { select: { codigo: true } } },
  })
  return NextResponse.json({ ...prog, boxCodigo: prog.box?.codigo ?? prog.boxCodigo })
}

// DELETE — remove uma linha da programação
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.programacaoSemanal.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
