import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as xlsx from "xlsx"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inventarioId = searchParams.get("id")

  const where = inventarioId ? { id: inventarioId } : {}
  const inventarios = await prisma.inventario.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      itens: {
        include: {
          produto: { select: { codigo: true, descricao: true, unidade: true } },
          usuario: { select: { name: true } },
        },
      },
    },
  })

  const rows: Record<string, string | number>[] = []
  for (const inv of inventarios) {
    for (const item of inv.itens) {
      rows.push({
        "Tipo Inventário": inv.tipo,
        "Data": new Date(inv.data).toLocaleDateString("pt-BR"),
        "Status": inv.status,
        "Código Produto": item.produto.codigo,
        "Produto": item.produto.descricao,
        "Unidade": item.produto.unidade,
        "Qtd Sistema": item.qtdSistema,
        "Qtd Contada": item.qtdContada,
        "Diferença": item.diferenca,
        "Ajustado": item.ajustado ? "Sim" : "Não",
        "Operador": item.usuario.name,
      })
    }
  }

  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(rows)
  xlsx.utils.book_append_sheet(wb, ws, "Inventário")
  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventario_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  })
}
