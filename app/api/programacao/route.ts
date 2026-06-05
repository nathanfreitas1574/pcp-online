import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const prog = await prisma.programacaoSemanal.upsert({
    where: { ano_semana_clienteNome_produto_tipo: { ano: body.ano, semana: body.semana, clienteNome: body.clienteNome, produto: body.produto, tipo: body.tipo } },
    update: {},
    create: {
      ano: body.ano, semana: body.semana,
      dataInicio: new Date(body.dataInicio), dataFim: new Date(body.dataFim),
      boxId: body.boxId || null,
      boxCodigo: body.boxId ? (await prisma.box.findUnique({ where: { id: body.boxId }, select: { codigo: true } }))?.codigo : null,
      clienteNome: body.clienteNome, produto: body.produto, tipo: body.tipo,
    },
    include: { box: { select: { codigo: true } } },
  })
  return NextResponse.json({ ...prog, boxCodigo: prog.box?.codigo ?? prog.boxCodigo }, { status: 201 })
}
