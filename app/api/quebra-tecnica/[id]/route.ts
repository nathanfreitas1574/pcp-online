import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const TXT = ["filial", "contrato", "cliente", "produto", "origemNavio", "statusManual", "obs"] as const
const NUM = ["volumeContrato", "volumeRecebido", "quebraTecnica", "quebraDisponivel", "pctQuebra", "saldoAReceber", "sobra", "quebraFutura", "difBalanca"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const k of TXT) if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  for (const k of NUM) if (b[k] !== undefined) data[k] = Number(b[k]) || 0
  if (b.data !== undefined) data.data = b.data ? new Date(b.data) : null
  const q = await prisma.quebraTecnica.update({ where: { id }, data })
  return NextResponse.json(q)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.quebraTecnica.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
