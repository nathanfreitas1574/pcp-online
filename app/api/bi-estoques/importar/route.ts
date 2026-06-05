import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as xlsx from "xlsx"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true })

  let snapshotsCriados = 0
  let quebrasCriadas = 0

  try {
    const primeira = wb.SheetNames[0]
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[primeira], { defval: 0 })

    for (const row of rows) {
      const clienteNome = String(row["CLIENTE"] ?? row["Cliente"] ?? "").trim()
      const produto = String(row["PRODUTO"] ?? row["Produto"] ?? "").trim()
      if (!clienteNome || !produto) continue

      const rawDate = row["DATA"] ?? row["Data"]
      let data: Date = new Date()
      if (rawDate instanceof Date) data = rawDate

      await prisma.estoqueSnapshot.upsert({
        where: { data_clienteNome_produto: { data, clienteNome, produto } },
        update: {
          entradas: Number(row["ENTRADAS"] ?? row["Entradas"] ?? 0),
          saidas: Number(row["SAIDAS"] ?? row["Saídas"] ?? 0),
          saldoFinal: Number(row["SALDO"] ?? row["Saldo Final"] ?? 0),
        },
        create: {
          data,
          clienteNome,
          produto,
          classe: String(row["CLASSE"] ?? row["Classe"] ?? ""),
          saldoInicial: Number(row["SALDO INICIAL"] ?? row["Saldo Inicial"] ?? 0),
          entradas: Number(row["ENTRADAS"] ?? row["Entradas"] ?? 0),
          saidas: Number(row["SAIDAS"] ?? row["Saídas"] ?? 0),
          saldoFinal: Number(row["SALDO"] ?? row["Saldo Final"] ?? 0),
        },
      })
      snapshotsCriados++
    }

    return NextResponse.json({
      message: `Importado! ${snapshotsCriados} snapshots de estoque e ${quebrasCriadas} quebras.`,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao importar", detail: String(err) }, { status: 500 })
  }
}
