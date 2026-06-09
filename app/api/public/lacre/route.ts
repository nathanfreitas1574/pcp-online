import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Rota pública — sem autenticação — para registro via formulário externo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.boxId) {
      return NextResponse.json({ error: "boxId é obrigatório" }, { status: 400 })
    }
    if (!body.nomeLacrador?.trim()) {
      return NextResponse.json({ error: "Nome do lacrador é obrigatório" }, { status: 400 })
    }

    const lacre = await prisma.lacre.create({
      data: {
        boxId:        body.boxId,
        nomeLacrador: String(body.nomeLacrador).trim(),
        status:       body.status || "FECHADO",
        codigoLacre:  body.codigoLacre || null,
        observacao:   body.observacao  || null,
        foto:         body.foto        || null,
        // usuarioId fica null — registro externo
      },
      include: { box: { select: { codigo: true, descricao: true } } },
    })

    return NextResponse.json({ lacre }, { status: 201 })
  } catch (err) {
    console.error("Erro ao registrar lacre público:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
