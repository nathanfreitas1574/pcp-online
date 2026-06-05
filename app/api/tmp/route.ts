import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const reg = await prisma.tmpRegistro.create({
    data: { placa: body.placa, motorista: body.motorista || null, clienteNome: body.clienteNome, produto: body.produto || null, localDescarga: body.localDescarga || null, dtEntrada: new Date(body.dtEntrada), usuarioId: session.user.id },
  })
  return NextResponse.json(reg, { status: 201 })
}
