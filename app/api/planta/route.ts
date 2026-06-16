import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET ?armazemId= → itens da planta + estado do balcão
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const armazemId = new URL(req.url).searchParams.get("armazemId") || ""
  if (!armazemId) return NextResponse.json({ error: "armazemId obrigatório" }, { status: 400 })

  const [itens, cfg] = await Promise.all([
    prisma.plantaItem.findMany({ where: { armazemId }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] }),
    prisma.plantaConfig.findUnique({ where: { armazemId } }),
  ])

  return NextResponse.json({ itens, balcaoFechado: cfg?.balcaoFechado ?? false })
}

// POST { armazemId, produto, cliente, quantidade } → adiciona produto
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const b = await req.json()
  if (!b.armazemId) return NextResponse.json({ error: "armazemId obrigatório" }, { status: 400 })
  if (!b.produto?.trim()) return NextResponse.json({ error: "Informe o produto." }, { status: 400 })

  const max = await prisma.plantaItem.aggregate({ where: { armazemId: b.armazemId }, _max: { ordem: true } })

  const item = await prisma.plantaItem.create({
    data: {
      armazemId: b.armazemId,
      produto: String(b.produto).trim(),
      cliente: b.cliente?.trim() || null,
      quantidade: Number(b.quantidade) || 0,
      ordem: (max._max.ordem ?? 0) + 1,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
