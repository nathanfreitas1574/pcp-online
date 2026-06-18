import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const boxId = body.boxId || null
  const boxCodigo = boxId ? (await prisma.box.findUnique({ where: { id: boxId }, select: { codigo: true } }))?.codigo ?? null : null

  const item = await prisma.inventarioItem.create({
    data: {
      inventarioId: body.inventarioId,
      produtoId: body.produtoId,
      usuarioId: body.usuarioId ?? session.user.id,
      boxId,
      boxCodigo,
      clienteNome: body.clienteNome || null,
      qtdSistema: body.qtdSistema,
      qtdContada: body.qtdContada,
      diferenca: body.diferenca,
      ajustado: false,
    },
    include: {
      produto: { select: { codigo: true, descricao: true, unidade: true } },
      usuario: { select: { name: true } },
    },
  })

  // Gerar alerta se divergência
  if (body.diferenca !== 0) {
    const produto = await prisma.produto.findUnique({ where: { id: body.produtoId }, select: { descricao: true } })
    await prisma.alerta.create({
      data: {
        tipo: "INVENTARIO_DIVERGENCIA",
        severidade: Math.abs(body.diferenca) > 1000 ? "CRITICO" : "AVISO",
        titulo: `Divergência no inventário: ${produto?.descricao ?? "Produto"}`,
        descricao: `Quantidade do sistema: ${body.qtdSistema} | Contada: ${body.qtdContada} | Diferença: ${body.diferenca > 0 ? "+" : ""}${body.diferenca}`,
        referencia: produto?.descricao,
        usuarioId: session.user.id,
      },
    })
  }

  return NextResponse.json(item, { status: 201 })
}
