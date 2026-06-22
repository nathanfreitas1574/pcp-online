import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST — cria um contrato de expedição informando SÓ o número (resto vem do TOTVS)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const b = await req.json()
  const numero = String(b.numero ?? "").trim()
  if (!numero) return NextResponse.json({ error: "Informe o número do contrato." }, { status: 400 })

  // busca no contrato TOTVS (com/sem zeros à esquerda)
  const cands = [...new Set([numero, numero.replace(/^0+/, "") || numero, numero.padStart(6, "0")])]
  const totvs = await prisma.contratoArmazenagem.findFirst({ where: { numero: { in: cands } } })
  if (!totvs) return NextResponse.json({ error: "Contrato não encontrado no Contratos TOTVS." }, { status: 404 })

  // resolve o cliente no cadastro (acha por nome ou cria)
  let cliente = await prisma.cliente.findFirst({ where: { nome: { equals: totvs.clienteNome, mode: "insensitive" } } })
  if (!cliente) {
    const baseCod = (totvs.clienteNome.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "CLI")
    let codigo = baseCod
    if (await prisma.cliente.findUnique({ where: { codigo } })) codigo = `${baseCod}${String(Date.now()).slice(-4)}`
    cliente = await prisma.cliente.create({ data: { codigo, nome: totvs.clienteNome } })
  }

  const c = await prisma.contratoExpedicao.create({
    data: {
      numero,
      clienteId: cliente.id,
      produtoSistema: totvs.desProduto,
      produtoAbreviado: totvs.desProduto,
      tipoProduto: b.tipoProduto?.trim() || null,
      operacao: b.operacao?.trim() || null,
      status: "PROGRAMADO",
    },
    include: { cliente: { select: { nome: true } } },
  })
  return NextResponse.json(c, { status: 201 })
}
