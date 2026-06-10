import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — histórico de medições do box
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const medicoes = await prisma.medicaoBox.findMany({
    where: { boxId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json(medicoes)
}

// POST — registrar nova medição
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { volumeMedido, observacao } = body

  // Busca volume atual do sistema
  const estoqueAtual = await prisma.estoque.findFirst({
    where: { boxId: id },
    orderBy: { quantidade: "desc" },
  })
  const volumeAntes = estoqueAtual?.quantidade ?? 0
  const diferenca   = (parseFloat(volumeMedido) || 0) - volumeAntes

  const medicao = await prisma.medicaoBox.create({
    data: {
      boxId:        id,
      volumeAntes,
      volumeMedido: parseFloat(volumeMedido) || 0,
      diferenca,
      observacao:   observacao || null,
      usuarioNome:  session.user.name ?? session.user.email ?? "Desconhecido",
    },
  })

  return NextResponse.json(medicao)
}
