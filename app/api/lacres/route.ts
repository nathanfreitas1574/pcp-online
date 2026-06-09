import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logReq } from "@/lib/log"
import { alertarLacreNaoConforme } from "@/lib/actions"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const lacres = await prisma.lacre.findMany({
    orderBy: { createdAt: "desc" }, take: 50,
    include: {
      box: { select: { codigo: true, descricao: true } },
      usuario: { select: { name: true } },
    },
    // nomeLacrador é scalar, incluído automaticamente
  })
  return NextResponse.json(lacres)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const lacre = await prisma.lacre.create({
    data: {
      boxId: body.boxId,
      usuarioId: session.user.id,
      status: body.status,
      codigoLacre: body.codigoLacre || null,
      observacao: body.observacao || null,
    },
    include: { box: { select: { codigo: true } } },
  })

  // Log de atividade
  await logReq(req, "LACRES", "REGISTRAR", `Lacre registrado: ${lacre.status} — Box ${lacre.box.codigo}`, lacre.box.codigo)

  // Alerta automático se não conforme
  if (body.status === "NAO_CONFORME") {
    await alertarLacreNaoConforme(body.boxId, lacre.box.codigo, session.user.id)
  }

  return NextResponse.json(lacre, { status: 201 })
}
