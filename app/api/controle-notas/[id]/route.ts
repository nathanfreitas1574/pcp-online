import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil, dataInputUTC } from "@/lib/cobertura"
import { normalizaTipo } from "@/lib/controle-notas"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  const atual = await prisma.controleNota.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })

  // ── Ações do fluxo de validação ──────────────────────────────────────────
  if (b.acao === "VALIDAR") {
    const c = await prisma.controleNota.update({
      where: { id },
      data: { statusAprovacao: "VALIDADO", validadoPor: session.user.name ?? "PCP", validadoEm: new Date() },
    })
    return NextResponse.json(c)
  }
  if (b.acao === "REABRIR") {
    const c = await prisma.controleNota.update({
      where: { id },
      data: { statusAprovacao: "AGUARDANDO", validadoPor: null, validadoEm: null, concluidoEm: null },
    })
    return NextResponse.json(c)
  }
  if (b.acao === "CONFERIR") {
    const nf = (atual.numeroNF || atual.numero || "").trim()
    const aindaNoContabil = nf ? await notaNoContabil(nf) : false
    if (aindaNoContabil) {
      // NF ainda lançada → não pode concluir o cancelamento
      const c = await prisma.controleNota.update({ where: { id }, data: { alertaContabil: true } })
      return NextResponse.json({ ...c, conferido: false, aindaNoContabil: true })
    }
    // NF saiu do contábil → cancelamento confirmado
    const c = await prisma.controleNota.update({
      where: { id },
      data: { statusAprovacao: "CANCELADO", concluidoEm: new Date(), alertaContabil: false },
    })
    return NextResponse.json({ ...c, conferido: true, aindaNoContabil: false })
  }

  // ── Edição normal ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const k of ["usuario", "cliente", "codigoOperacao", "descricao", "numeroNF", "motivoErro", "observacao", "filial"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k]
  }
  if (b.numero !== undefined) data.numero = String(b.numero).trim()
  if (b.tipo !== undefined) data.tipo = normalizaTipo(b.tipo)
  if (b.data !== undefined) data.data = dataInputUTC(b.data)

  const tipoFinal = data.tipo ?? atual.tipo
  const nf = (data.numeroNF ?? atual.numeroNF ?? data.numero ?? atual.numero ?? "").trim()
  if (tipoFinal === "INUTILIZACAO") data.alertaContabil = false
  else if (nf) data.alertaContabil = await notaNoContabil(nf)

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
