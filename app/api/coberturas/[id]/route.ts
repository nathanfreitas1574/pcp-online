import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil } from "@/lib/cobertura"
import { NextRequest, NextResponse } from "next/server"

// PATCH — edita ou marca como coberto/pendente
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const k of ["codigoRomaneio", "produto", "cliente", "observacao", "boxCodigo", "numeroNota", "numeroDocumento", "placa"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  }
  if (b.volume !== undefined) data.volume = Number(b.volume) || 0
  if (b.dataDescarga !== undefined)    data.dataDescarga    = b.dataDescarga    ? new Date(b.dataDescarga)    : null
  if (b.dataSolicitacao !== undefined) data.dataSolicitacao = b.dataSolicitacao ? new Date(b.dataSolicitacao) : null
  if (b.status !== undefined) {
    data.status = b.status
    data.resolvidoEm = b.status === "COBERTO" ? new Date() : null
  }
  if (data.codigoRomaneio === null) data.codigoRomaneio = ""
  if (data.produto === null) data.produto = ""
  if (data.cliente === null) data.cliente = ""

  // Auto-finalizar: se informou a NF e ela está no contábil → COBERTO
  let autoCoberto = false
  if (b.numeroNota !== undefined && b.numeroNota?.trim() && b.status === undefined) {
    if (await notaNoContabil(b.numeroNota)) {
      data.status = "COBERTO"
      data.resolvidoEm = new Date()
      autoCoberto = true
    }
  }

  const c = await prisma.coberturaPendente.update({ where: { id }, data })
  return NextResponse.json({ ...c, autoCoberto })
}

// DELETE — remove
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.coberturaPendente.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
