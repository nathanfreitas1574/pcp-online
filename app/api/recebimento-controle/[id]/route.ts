import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { dataInputUTC } from "@/lib/cobertura"
import { semanaDeData } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const k of ["unidade", "status", "numeroContrato", "cliente", "produtoAbreviado", "tipoProduto", "navio", "origem", "obs"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  }
  for (const k of ["volumeProgramado", "cancelado", "adicionado"]) {
    if (b[k] !== undefined) data[k] = Number(b[k]) || 0
  }
  if (b.data !== undefined) {
    const d = dataInputUTC(b.data)
    data.data = d
    if (d) { const s = semanaDeData(d); data.ano = s.ano; data.mes = d.getUTCMonth() + 1; data.semana = s.semana }
  }
  if (data.cliente === null) data.cliente = ""
  if (data.produtoAbreviado === null) data.produtoAbreviado = ""
  // data de finalização: preenche ao virar FINALIZADO, limpa ao sair desse status
  if (b.status !== undefined) {
    data.dataFinalizacao = b.status === "FINALIZADO" ? (dataInputUTC(b.dataFinalizacao) ?? new Date()) : null
  } else if (b.dataFinalizacao !== undefined) {
    data.dataFinalizacao = dataInputUTC(b.dataFinalizacao)
  }

  const c = await prisma.recebimentoControle.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.recebimentoControle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
