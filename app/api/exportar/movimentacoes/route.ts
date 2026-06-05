import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as xlsx from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const movs = await prisma.movimentacao.findMany({
    orderBy: { createdAt: "desc" }, take: 500,
    include: { usuario: { select: { name: true } }, itens: { include: { produto: { select: { descricao: true } } } } },
  })

  const rows: Record<string, string | number>[] = []
  for (const m of movs) {
    for (const it of m.itens) {
      rows.push({
        "Tipo": m.tipo, "Status": m.status,
        "Origem": m.origem ?? "", "Destino": m.destino ?? "",
        "Data Prevista": new Date(m.dataPrevista).toLocaleDateString("pt-BR"),
        "Data Realizada": m.dataRealizada ? new Date(m.dataRealizada).toLocaleDateString("pt-BR") : "",
        "Viagens": m.viagens, "Produto": it.produto.descricao, "Quantidade": it.quantidade,
        "Responsável": m.usuario.name,
      })
    }
    if (m.itens.length === 0) {
      rows.push({
        "Tipo": m.tipo, "Status": m.status,
        "Origem": m.origem ?? "", "Destino": m.destino ?? "",
        "Data Prevista": new Date(m.dataPrevista).toLocaleDateString("pt-BR"),
        "Data Realizada": m.dataRealizada ? new Date(m.dataRealizada).toLocaleDateString("pt-BR") : "",
        "Viagens": m.viagens, "Produto": "", "Quantidade": 0, "Responsável": m.usuario.name,
      })
    }
  }

  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), "Movimentações")
  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimentacoes_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  })
}
