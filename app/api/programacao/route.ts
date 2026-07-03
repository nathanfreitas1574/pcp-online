import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  // nova linha entra no fim da lista (maior ordem + 1)
  const ultimo = await prisma.programacaoSemanal.aggregate({
    where: { ano: body.ano, semana: body.semana, tipo: body.tipo }, _max: { ordem: true },
  })
  const proxOrdem = (ultimo._max.ordem ?? 0) + 1
  const prog = await prisma.programacaoSemanal.upsert({
    where: { ano_semana_clienteNome_produto_tipo: { ano: body.ano, semana: body.semana, clienteNome: body.clienteNome, produto: body.produto, tipo: body.tipo } },
    update: { numeroContrato: body.numeroContrato || undefined },
    create: {
      ano: body.ano, semana: body.semana,
      dataInicio: new Date(body.dataInicio), dataFim: new Date(body.dataFim),
      boxId: body.boxId || null,
      boxCodigo: body.boxId ? (await prisma.box.findUnique({ where: { id: body.boxId }, select: { codigo: true } }))?.codigo : null,
      numeroContrato: body.numeroContrato || null,
      clienteNome: body.clienteNome, produto: body.produto, tipo: body.tipo,
      ordem: proxOrdem,
    },
    include: { box: { select: { codigo: true } } },
  })
  return NextResponse.json({ ...prog, boxCodigo: prog.box?.codigo ?? prog.boxCodigo }, { status: 201 })
}

// DELETE — apaga a programação inteira de uma semana/tipo (?ano=&semana=&tipo=)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const ano = Number(sp.get("ano"))
  const semana = Number(sp.get("semana"))
  const tipo = sp.get("tipo") || undefined
  if (!Number.isInteger(ano) || !Number.isInteger(semana))
    return NextResponse.json({ error: "ano/semana inválidos" }, { status: 400 })
  const r = await prisma.programacaoSemanal.deleteMany({ where: { ano, semana, ...(tipo ? { tipo } : {}) } })
  return NextResponse.json({ ok: true, removidas: r.count })
}
