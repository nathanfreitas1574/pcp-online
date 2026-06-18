import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/app/generated/prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { logReq } from "@/lib/log"
import { alertarLacreNaoConforme } from "@/lib/actions"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inicio = searchParams.get("inicio")
  const fim    = searchParams.get("fim")
  const status = searchParams.get("status")

  // Monta o where server-side (createdAt gte/lte + status)
  const where: Prisma.LacreWhereInput = {}

  if (inicio || fim) {
    where.createdAt = {
      ...(inicio ? { gte: startOfDay(parseISO(inicio)) } : {}),
      ...(fim    ? { lte: endOfDay(parseISO(fim)) }      : {}),
    }
  }

  if (status && status !== "TODOS") {
    if (status === "INATIVOS") where.inativado = true
    else                       where.status    = status as Prisma.LacreWhereInput["status"]
  }

  const lacres = await prisma.lacre.findMany({
    where,
    orderBy: { createdAt: "desc" }, take: 500,
    include: {
      box: { select: { codigo: true, descricao: true } },
      usuario: { select: { name: true } },
      inativadoPor: { select: { name: true } },
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
