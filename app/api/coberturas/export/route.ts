import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

// GET — exporta as coberturas (com os mesmos filtros) em Excel
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status) where.status = status
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (busca) where.OR = [
    { codigoRomaneio: { contains: busca, mode: "insensitive" } },
    { produto: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
  ]

  const itens = await prisma.coberturaPendente.findMany({ where, orderBy: { createdAt: "desc" } })
  const fmtD = (d: Date | null) => d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""

  const linhas = itens.map(c => ({
    "Romaneio": c.codigoRomaneio,
    "Nº Documento": c.numeroDocumento ?? "",
    "Placa": c.placa ?? "",
    "Produto": c.produto,
    "Cliente": c.cliente,
    "Volume (t)": c.volume,
    "Data Descarga": fmtD(c.dataDescarga),
    "Nº Nota": c.numeroNota ?? "",
    "Data Solicitação": fmtD(c.dataSolicitacao),
    "Status": c.status === "COBERTO" ? "Coberto" : "Pendente",
    "Box": c.boxCodigo ?? "",
    "Observação": c.observacao ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Coberturas")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="coberturas_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
