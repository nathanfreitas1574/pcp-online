import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logReq } from "@/lib/log"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}

  // Campos de edição normal
  if (body.status       !== undefined) data.status       = body.status
  if (body.codigoLacre  !== undefined) data.codigoLacre  = body.codigoLacre  || null
  if (body.observacao   !== undefined) data.observacao   = body.observacao   || null
  if (body.nomeLacrador !== undefined) data.nomeLacrador = body.nomeLacrador || null
  if (body.boxId        !== undefined) data.boxId        = body.boxId

  // Inativação
  if (body.inativar === true) {
    data.inativado        = true
    data.inativadoEm      = new Date()
    data.inativadoPorId   = session.user.id
    data.inativadoPorNome = session.user.name ?? null
  }

  const lacre = await prisma.lacre.update({
    where: { id },
    data,
    include: {
      box:          { select: { codigo: true, descricao: true } },
      usuario:      { select: { name: true } },
      inativadoPor: { select: { name: true } },
    },
  })

  // Log da operação
  const acaoLog = body.inativar === true ? "INATIVAR" : "EDITAR"
  await logReq(req, "LACRES", acaoLog,
    body.inativar ? `Lacre inativado — Box ${lacre.box.codigo}` : `Lacre editado — Box ${lacre.box.codigo}`,
    lacre.box.codigo
  )

  return NextResponse.json({ lacre })
}

// DELETE real — apaga permanentemente (apenas para limpeza)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.lacre.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
