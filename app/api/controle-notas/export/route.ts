import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { TIPO_LABEL, STATUS_LABEL } from "@/lib/controle-notas"
import { mesRange } from "@/lib/cobertura"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") || undefined
  const status = searchParams.get("status") || undefined
  const filial = searchParams.get("filial") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined
  const mes = searchParams.get("mes") || undefined

  const range = mesRange(mes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (tipo) where.tipo = tipo
  if (status) where.statusAprovacao = status
  if (filial) where.filial = filial
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (range) where.data = { gte: range.gte, lt: range.lt }
  if (busca) where.OR = [
    { numero: { contains: busca, mode: "insensitive" } },
    { numeroNF: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
    { filial: { contains: busca, mode: "insensitive" } },
  ]

  const itens = await prisma.controleNota.findMany({ where, orderBy: { data: "desc" } })
  const fmtD = (d: Date | null) => d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""

  const linhas = itens.map(c => ({
    "Data": fmtD(c.data),
    "Filial": c.filial ?? "",
    "Usuário": c.usuario ?? "",
    "Número": c.numero,
    "Cliente": c.cliente ?? "",
    "Tipo": TIPO_LABEL[c.tipo] ?? c.tipo,
    "Código": c.codigoOperacao ?? "",
    "Descrição": c.descricao ?? "",
    "Nº NF": c.numeroNF ?? "",
    "Motivo": c.motivoErro ?? "",
    "Alerta contábil": c.alertaContabil ? "SIM — NF ainda no contábil" : "",
    "Status": STATUS_LABEL[c.statusAprovacao ?? ""] ?? (c.statusAprovacao ?? ""),
    "Validado por": c.validadoPor ?? "",
    "Validado em": fmtD(c.validadoEm),
    "Concluído em": fmtD(c.concluidoEm),
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
