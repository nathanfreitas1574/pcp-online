import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

function parseData(s: unknown): Date | undefined {
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [a, m, d] = s.slice(0, 10).split("-").map(Number)
    return new Date(Date.UTC(a, m - 1, d, 12))
  }
  return undefined
}

const CAMPOS_TXT = ["clienteNome", "produto", "boxOrigem", "boxDestino", "volume", "turno", "obs", "status"] as const

// PATCH — edita campos de uma linha do vira
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const c of CAMPOS_TXT) if (b[c] !== undefined) data[c] = b[c] === "" ? (c === "status" ? "PROGRAMADO" : null) : b[c]
  if (b.prioridade !== undefined) data.prioridade = Number(b.prioridade) || 0
  if (b.data !== undefined) { const d = parseData(b.data); if (d) data.data = d }
  const linha = await prisma.viraProgramacao.update({ where: { id }, data })
  return NextResponse.json({ ...linha, data: linha.data.toISOString().slice(0, 10) })
}

// DELETE — remove uma linha do vira
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.viraProgramacao.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
