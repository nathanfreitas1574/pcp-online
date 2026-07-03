import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// data "YYYY-MM-DD" → meio-dia UTC (evita shift de fuso)
function parseData(s: unknown): Date {
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [a, m, d] = s.slice(0, 10).split("-").map(Number)
    return new Date(Date.UTC(a, m - 1, d, 12))
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12))
}

// POST — cria uma nova linha (entra no fim, prioridade = max + 1)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const ultimo = await prisma.viraProgramacao.aggregate({ _max: { prioridade: true } })
  const prioridade = (ultimo._max.prioridade ?? 0) + 1
  const linha = await prisma.viraProgramacao.create({
    data: {
      prioridade,
      data: parseData(b.data),
      clienteNome: b.clienteNome || null,
      produto: b.produto || null,
      boxOrigem: b.boxOrigem || null,
      boxDestino: b.boxDestino || null,
      volume: b.volume || null,
      turno: b.turno || null,
      obs: b.obs || null,
      status: b.status || "PROGRAMADO",
    },
  })
  return NextResponse.json({ ...linha, data: linha.data.toISOString().slice(0, 10) }, { status: 201 })
}
