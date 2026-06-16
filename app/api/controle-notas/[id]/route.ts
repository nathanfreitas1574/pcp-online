import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil, dataInputUTC } from "@/lib/cobertura"
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
  for (const k of ["usuario", "cliente", "codigoOperacao", "descricao", "numeroNF", "motivoErro", "observacao"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  }
  if (b.numero !== undefined) data.numero = String(b.numero).trim()
  if (b.tipo !== undefined) data.tipo = b.tipo === "INUTILIZACAO" ? "INUTILIZACAO" : "CANCELAMENTO"
  if (b.data !== undefined) data.data = dataInputUTC(b.data)

  // revalida a NF se mudou número/NF/tipo
  const atual = await prisma.controleNota.findUnique({ where: { id } })
  const tipoFinal = data.tipo ?? atual?.tipo
  const nf = (data.numeroNF ?? atual?.numeroNF ?? data.numero ?? atual?.numero ?? "").trim()
  if (tipoFinal === "CANCELAMENTO" && nf) data.alertaContabil = await notaNoContabil(nf)
  else if (tipoFinal === "INUTILIZACAO") data.alertaContabil = false

  const c = await prisma.controleNota.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.controleNota.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
