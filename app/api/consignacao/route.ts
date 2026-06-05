import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const consignacoes = await prisma.consignacao.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      cliente: { select: { nome: true, codigo: true } },
      itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
    },
  })
  return NextResponse.json(consignacoes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const consignacao = await prisma.consignacao.create({
    data: {
      clienteId: body.clienteId,
      numeroNF: body.numeroNF,
      dataEmissao: new Date(body.dataEmissao),
      valorTotal: body.valorTotal,
      status: "PENDENTE",
      itens: {
        create: (body.itens ?? [])
          .filter((it: { produtoId: string }) => it.produtoId)
          .map((it: { produtoId: string; quantidade: number; valorUnitario: number; valorTotal: number }) => ({
            produtoId: it.produtoId,
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            valorTotal: it.valorTotal,
          })),
      },
    },
  })
  return NextResponse.json(consignacao, { status: 201 })
}
