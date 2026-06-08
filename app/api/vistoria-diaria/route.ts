import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logAtividade, alertarLacreNaoConforme } from "@/lib/actions"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { boxId, lacreConforme, codigoLacre, observacao, foto } = body as {
    boxId: string
    lacreConforme: boolean
    codigoLacre?: string
    observacao?: string
    foto?: string
  }

  const box = await prisma.box.findUnique({ where: { id: boxId } })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  const status = lacreConforme ? "FECHADO" : "NAO_CONFORME"

  const [auditoria, lacre] = await prisma.$transaction([
    prisma.auditoriaBox.create({
      data: {
        boxId,
        usuarioId: session.user.id,
        observacao: observacao || null,
        fotos: foto ? [foto] : [],
        conforme: lacreConforme,
      },
    }),
    prisma.lacre.create({
      data: {
        boxId,
        usuarioId: session.user.id,
        status,
        codigoLacre: codigoLacre || null,
        observacao: observacao || null,
        foto: foto || null,
      },
      include: { box: { select: { codigo: true } } },
    }),
  ])

  await logAtividade(
    "VISTORIA",
    "REGISTRAR",
    `Vistoria do dia registrada — Box ${box.codigo}: lacre ${lacreConforme ? "conforme" : "não conforme"}`,
    box.codigo
  )

  if (!lacreConforme) {
    await alertarLacreNaoConforme(boxId, box.codigo, session.user.id)
  }

  return NextResponse.json({ auditoria, lacre }, { status: 201 })
}
