import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (tipo) where.tipo = tipo
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (busca) where.OR = [
    { numero: { contains: busca, mode: "insensitive" } },
    { numeroNF: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
  ]

  const itens = await prisma.controleNota.findMany({ where, orderBy: { data: "desc" } })
  const fmtD = (d: Date | null) => d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""

  const linhas = itens.map(c => ({
    "Data": fmtD(c.data),
    "Usuário": c.usuario ?? "",
    "Número": c.numero,
    "Cliente": c.cliente ?? "",
    "Tipo": c.tipo === "CANCELAMENTO" ? "Cancelamento" : "Inutilização",
    "Código": c.codigoOperacao ?? "",
    "Descrição": c.descricao ?? "",
    "Nº NF": c.numeroNF ?? "",
    "Motivo": c.motivoErro ?? "",
    "Alerta contábil": c.alertaContabil ? "SIM — NF ainda no contábil" : "",
    "Observação": c.observacao ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Notas")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="controle_notas_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
