import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET ?data=YYYY-MM-DD — estado dos boxes naquele dia (histórico por dia).
// Se o dia pedido não tem snapshot, devolve o mais recente ANTERIOR (estado vigente).
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dataStr = req.nextUrl.searchParams.get("data") || ""
  const m = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const hoje = new Date()
  const pedida = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()))

  // dia efetivo = último snapshot ≤ data pedida
  const ultimo = await prisma.boxSnapshot.findFirst({
    where: { data: { lte: pedida } },
    orderBy: { data: "desc" },
    select: { data: true },
  })
  if (!ultimo) return NextResponse.json({ dataPedida: dataStr, dataEfetiva: null, boxes: [], total: 0, dias: [] })

  const [boxes, diasDisponiveis] = await Promise.all([
    prisma.boxSnapshot.findMany({ where: { data: ultimo.data }, orderBy: { boxCodigo: "asc" } }),
    prisma.boxSnapshot.findMany({ distinct: ["data"], orderBy: { data: "desc" }, select: { data: true }, take: 90 }),
  ])
  const total = Math.round(boxes.reduce((s, b) => s + b.volume, 0) * 10) / 10
  const capacidade = boxes.reduce((s, b) => s + b.capacidade, 0)

  return NextResponse.json({
    dataPedida: dataStr || ultimo.data.toISOString().slice(0, 10),
    dataEfetiva: ultimo.data.toISOString().slice(0, 10),
    total, capacidade,
    ocupacao: capacidade > 0 ? Math.round((total / capacidade) * 1000) / 10 : 0,
    boxes: boxes.map((b) => ({
      boxCodigo: b.boxCodigo, volume: Math.round(b.volume * 10) / 10, capacidade: b.capacidade,
      produto: b.produto, cliente: b.cliente, statusUso: b.statusUso,
    })),
    dias: diasDisponiveis.map((d) => d.data.toISOString().slice(0, 10)),
  })
}
