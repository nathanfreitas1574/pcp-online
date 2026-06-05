import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as xlsx from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const alertas = await prisma.alerta.findMany({
    orderBy: { createdAt: "desc" },
    include: { box: { select: { codigo: true } }, usuario: { select: { name: true } } },
  })

  const rows = alertas.map((a) => ({
    "Tipo": a.tipo,
    "Severidade": a.severidade,
    "Status": a.status,
    "Título": a.titulo,
    "Descrição": a.descricao,
    "Box": a.box?.codigo ?? "",
    "Referência": a.referencia ?? "",
    "Responsável": a.usuario?.name ?? "",
    "Resolvido Por": a.resolvidoPor ?? "",
    "Criado em": new Date(a.createdAt).toLocaleString("pt-BR"),
  }))

  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), "Alertas")
  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="alertas_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  })
}
