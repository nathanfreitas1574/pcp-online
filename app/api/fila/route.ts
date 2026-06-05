import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const fila = await prisma.filaCaminhao.findMany({ where: { status: { not: "FINALIZADO" } }, orderBy: [{ status: "asc" }, { dtChegada: "asc" }] })
  return NextResponse.json(fila)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const total = await prisma.filaCaminhao.count({ where: { status: { not: "FINALIZADO" } } })
  const item = await prisma.filaCaminhao.create({
    data: {
      placa: body.placa, motorista: body.motorista || null, clienteNome: body.clienteNome,
      produto: body.produto || null, transportadora: body.transportadora || null,
      localDestino: body.localDestino || null, observacao: body.observacao || null,
      posicao: total + 1, status: "AGUARDANDO",
    },
  })
  return NextResponse.json(item, { status: 201 })
}
