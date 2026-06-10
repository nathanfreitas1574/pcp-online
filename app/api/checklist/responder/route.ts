import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  // body: { boxId, templateId, respostas: [{ itemId, resposta, conforme, observacao }] }

  const respostas = body.respostas as { itemId: string; resposta: string; conforme: boolean; observacao?: string }[]

  // Determina se aprovado: nenhuma resposta bloqueante com conforme=false
  const itens = await prisma.checklistItem.findMany({
    where: { id: { in: respostas.map(r => r.itemId) } },
    select: { id: true, bloqueante: true },
  })
  const bloqueantes = new Set(itens.filter(i => i.bloqueante).map(i => i.id))
  const aprovado = !respostas.some(r => bloqueantes.has(r.itemId) && !r.conforme)

  const checklist = await prisma.vistoriaChecklist.create({
    data: {
      boxId: body.boxId,
      templateId: body.templateId,
      aprovado,
      usuarioNome: session.user.name ?? null,
      observacao: body.observacao ?? null,
      respostas: {
        create: respostas.map(r => ({
          itemId: r.itemId,
          resposta: r.resposta,
          conforme: r.conforme,
          observacao: r.observacao ?? null,
        })),
      },
    },
    include: { respostas: true },
  })

  // Se não aprovado, bloquear box automaticamente
  if (!aprovado) {
    await prisma.box.update({
      where: { id: body.boxId },
      data: { statusLiberacao: "BLOQUEADO", motivoBloqueio: "Checklist de vistoria reprovado" },
    })
    await prisma.liberacaoBox.create({
      data: {
        boxId: body.boxId,
        statusAnterior: "LIBERADO",
        statusNovo: "BLOQUEADO",
        motivo: "Checklist de vistoria reprovado",
        usuarioNome: session.user.name ?? null,
      },
    })
  }

  return NextResponse.json({ checklist, aprovado }, { status: 201 })
}
