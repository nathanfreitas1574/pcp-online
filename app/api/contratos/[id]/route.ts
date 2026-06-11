import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH — edita um contrato existente
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // monta apenas os campos enviados (atualização parcial)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  const setStr = (k: string) => { if (body[k] !== undefined) data[k] = body[k] === "" ? null : body[k] }
  ;["descricao", "clienteNome", "desProduto", "codProduto", "descTabela", "tipoMercado",
    "safra", "stsAssinatura", "stsFiscal", "stsFinanceiro", "stsEstoque", "modalidade",
    "centroCusto", "filial"].forEach(setStr)
  if (body.qtdContratada !== undefined) data.qtdContratada = Number(body.qtdContratada) || 0
  if (body.dataCtr !== undefined) data.dataCtr = body.dataCtr ? new Date(body.dataCtr) : null
  if (body.ativo !== undefined) data.ativo = !!body.ativo
  // campos obrigatórios não podem virar null
  if (data.descricao === null) data.descricao = ""
  if (data.clienteNome === null) data.clienteNome = ""
  if (data.desProduto === null) data.desProduto = ""

  const c = await prisma.contratoArmazenagem.update({ where: { id }, data })
  return NextResponse.json(c)
}

// DELETE — desativa (soft-delete) ou remove definitivo com ?hard=1
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const hard = new URL(req.url).searchParams.get("hard") === "1"
  if (hard) await prisma.contratoArmazenagem.delete({ where: { id } })
  else await prisma.contratoArmazenagem.update({ where: { id }, data: { ativo: false } })
  return NextResponse.json({ ok: true })
}
