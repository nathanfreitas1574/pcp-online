import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros + totais (cobertura pendente)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status) where.status = status
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (busca) where.OR = [
    { codigoRomaneio: { contains: busca, mode: "insensitive" } },
    { produto: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
  ]

  const [itens, pendente, coberto] = await Promise.all([
    prisma.coberturaPendente.findMany({ where, orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.coberturaPendente.aggregate({ where: { status: "PENDENTE" }, _count: { id: true }, _sum: { volume: true } }),
    prisma.coberturaPendente.aggregate({ where: { status: "COBERTO" }, _count: { id: true }, _sum: { volume: true } }),
  ])

  return NextResponse.json({
    itens,
    pendente: { count: pendente._count.id, volume: pendente._sum.volume ?? 0 },
    coberto: { count: coberto._count.id, volume: coberto._sum.volume ?? 0 },
  })
}

// POST — cria uma cobertura pendente
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.codigoRomaneio?.trim()) return NextResponse.json({ error: "Informe o código do romaneio." }, { status: 400 })
  if (!b.produto?.trim()) return NextResponse.json({ error: "Informe o produto." }, { status: 400 })

  const c = await prisma.coberturaPendente.create({
    data: {
      codigoRomaneio: String(b.codigoRomaneio).trim(),
      produto: String(b.produto).trim(),
      cliente: String(b.cliente ?? "").trim(),
      volume: Number(b.volume) || 0,
      observacao: b.observacao?.trim() || null,
      boxCodigo: b.boxCodigo?.trim() || null,
      status: "PENDENTE",
      criadoPorNome: session.user.name ?? null,
    },
  })
  return NextResponse.json(c, { status: 201 })
}
