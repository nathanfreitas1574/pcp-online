import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inicio = searchParams.get("inicio")
  const fim = searchParams.get("fim")

  const where: { dtPortaria?: { gte?: Date; lte?: Date } } = {}
  if (inicio || fim) {
    where.dtPortaria = {}
    if (inicio) where.dtPortaria.gte = new Date(`${inicio}T00:00:00`)
    if (fim) where.dtPortaria.lte = new Date(`${fim}T23:59:59`)
  }

  const registros = await prisma.descargaRegistro.findMany({
    where,
    orderBy: { dtPortaria: "desc" },
    take: 500,
  })

  return NextResponse.json({ registros })
}
