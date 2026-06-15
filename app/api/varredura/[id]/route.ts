import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseMes } from "@/lib/varredura"
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
  const numFields = ["medSegundaVarredura", "medSegundaCalcario", "medSextaVarredura", "medSextaCalcario",
    "expedicaoSemana", "geracaoIntervalo", "geracaoCalcario", "geracaoMP", "calcarioFisico", "compraCalcario", "saldoAcumulado"]
  for (const k of numFields) if (b[k] !== undefined) data[k] = Number(b[k]) || 0
  if (b.semana !== undefined) data.semana = String(b.semana).trim()
  if (b.mesLabel !== undefined) { data.mesLabel = String(b.mesLabel).trim(); const p = parseMes(b.mesLabel); data.ano = p.ano; data.mesNum = p.mesNum }
  if (b.dataSegunda !== undefined) data.dataSegunda = b.dataSegunda ? new Date(b.dataSegunda) : null
  if (b.dataSexta !== undefined) data.dataSexta = b.dataSexta ? new Date(b.dataSexta) : null
  if (b.houveExpedicao !== undefined) data.houveExpedicao = !!b.houveExpedicao
  if (b.observacao !== undefined) data.observacao = b.observacao?.trim() || null

  const c = await prisma.varreduraSemanal.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.varreduraSemanal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
