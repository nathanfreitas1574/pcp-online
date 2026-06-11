import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — um lote + seus itens (com filtros)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status      = searchParams.get("status")      || undefined   // CONCILIADO | DIVERGENTE
  const operacao    = searchParams.get("operacao")    || undefined   // CARGA | DESCARGA
  const divergencia = searchParams.get("divergencia") || undefined   // tipo
  const busca       = searchParams.get("busca")       || undefined

  const lote = await prisma.conciliacaoLote.findUnique({ where: { id } })
  if (!lote) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { loteId: id }
  if (status)   where.status = status
  if (operacao) where.operacao = operacao
  if (divergencia) where.divergencias = { contains: divergencia }
  if (busca) where.OR = [
    { numeroNF: { contains: busca, mode: "insensitive" } },
    { ordem:    { contains: busca, mode: "insensitive" } },
    { placa:    { contains: busca, mode: "insensitive" } },
    { cliente:  { contains: busca, mode: "insensitive" } },
    { produto:  { contains: busca, mode: "insensitive" } },
  ]

  const itens = await prisma.conciliacaoItem.findMany({
    where,
    orderBy: [{ status: "asc" }, { operacao: "asc" }, { ordem: "asc" }],
    take: 2000,
  })

  return NextResponse.json({ lote, itens })
}

// DELETE — remove o lote (itens caem em cascata)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.conciliacaoLote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
