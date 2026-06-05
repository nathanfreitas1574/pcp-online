import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const registros = await prisma.qualidadeRegistro.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  return NextResponse.json(registros)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const registro = await prisma.qualidadeRegistro.create({
    data: {
      boxId: body.boxId || null,
      boxCodigo: body.boxId ? (await prisma.box.findUnique({ where: { id: body.boxId }, select: { codigo: true } }))?.codigo : null,
      produtoId: body.produtoId || null,
      produtoDesc: body.produtoDesc,
      clienteNome: body.clienteNome || null,
      lote: body.lote || null,
      resultado: body.resultado ?? "PENDENTE",
      umidade: body.umidade,
      granulometria: body.granulometria,
      pureza: body.pureza,
      observacao: body.observacao || null,
      responsavel: body.responsavel || session.user.name,
    },
  })
  // Alerta se reprovado
  if (body.resultado === "REPROVADO") {
    await prisma.alerta.create({
      data: {
        tipo: "NAO_CONFORMIDADE",
        severidade: "CRITICO",
        titulo: `Análise REPROVADA — ${body.produtoDesc}`,
        descricao: `Lote: ${body.lote ?? "—"} | Box: ${registro.boxCodigo ?? "—"} | Responsável: ${body.responsavel}`,
        referencia: body.lote ?? registro.boxCodigo ?? "—",
        boxId: body.boxId || null,
        usuarioId: session.user.id,
      },
    })
  }
  return NextResponse.json(registro, { status: 201 })
}
