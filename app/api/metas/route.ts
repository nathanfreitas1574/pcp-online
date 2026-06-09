import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes") ? Number(searchParams.get("mes")) : new Date().getMonth() + 1
  const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : new Date().getFullYear()
  const metas = await prisma.meta.findMany({ where: { mes, ano } })
  return NextResponse.json({ metas })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { tipo, valor, mes, ano } = await req.json()
  const meta = await prisma.meta.upsert({
    where: { tipo_mes_ano: { tipo, mes: Number(mes), ano: Number(ano) } },
    update: { valor: Number(valor) },
    create: { tipo, valor: Number(valor), mes: Number(mes), ano: Number(ano) },
  })
  return NextResponse.json({ meta })
}
