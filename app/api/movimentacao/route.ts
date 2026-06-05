import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const movimentacoes = await prisma.movimentacao.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      usuario: { select: { name: true } },
      itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
    },
  })
  return NextResponse.json(movimentacoes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const mov = await prisma.movimentacao.create({
    data: {
      usuarioId: session.user.id,
      tipo: body.tipo,
      status: "PROGRAMADA",
      origem: body.origem || null,
      destino: body.destino || null,
      dataPrevista: new Date(body.dataPrevista),
      viagens: body.viagens ?? 1,
      observacao: body.observacao || null,
      itens: {
        create: (body.itens ?? [])
          .filter((it: { produtoId: string; quantidade: number }) => it.produtoId && it.quantidade)
          .map((it: { produtoId: string; quantidade: number }) => ({
            produtoId: it.produtoId,
            quantidade: it.quantidade,
          })),
      },
    },
  })
  return NextResponse.json(mov, { status: 201 })
}
