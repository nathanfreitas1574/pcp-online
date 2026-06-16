import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boxCodigo = searchParams.get("box") || undefined
  const usuario = searchParams.get("usuario") || undefined
  const conforme = searchParams.get("conforme")
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim = searchParams.get("dataFim") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (boxCodigo) where.box = { codigo: { contains: boxCodigo, mode: "insensitive" } }
  if (usuario) where.usuario = { name: { contains: usuario, mode: "insensitive" } }
  if (conforme === "true") where.conforme = true
  if (conforme === "false") where.conforme = false
  if (dataInicio || dataFim) {
    where.data = {}
    if (dataInicio) where.data.gte = new Date(dataInicio)
    if (dataFim) { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.data.lte = d }
  }

  const registros = await prisma.auditoriaBox.findMany({
    where, orderBy: { data: "desc" },
    include: { box: { select: { codigo: true, descricao: true } }, usuario: { select: { name: true } } },
  })

  const linhas = registros.map(r => ({
    "Data": r.data.toLocaleString("pt-BR", { timeZone: "UTC" }),
    "Box": r.box?.codigo ?? "",
    "Descrição": r.box?.descricao ?? "",
    "Usuário": r.usuario?.name ?? "",
    "Resultado": r.conforme ? "Conforme" : "Não conforme",
    "Observação": r.observacao ?? "",
    "Fotos": r.fotos?.length ?? 0,
  }))

  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Vistorias")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vistorias_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
