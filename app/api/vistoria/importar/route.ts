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

  let criados = 0

  try {
    const primeira = wb.SheetNames[0]
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[primeira], { defval: null })

    for (const row of rows) {
      const boxCodigo = String(row["BOX"] ?? row["Box"] ?? row["Código"] ?? "").trim()
      if (!boxCodigo) continue

      const rawDate = row["DATA"] ?? row["Data"]
      let data: Date = new Date()
      if (rawDate instanceof Date) data = rawDate

      data.setHours(0, 0, 0, 0)

      const estoque = Number(row["ESTOQUE"] ?? row["Estoque"] ?? 0)
      const capacidade = Number(row["CAPACIDADE"] ?? row["Capacidade"] ?? 0)
      const pctOcupacao = capacidade > 0 ? (estoque / capacidade) * 100 : 0

      await prisma.vistoriaBox.upsert({
        where: { boxCodigo_data: { boxCodigo, data } },
        update: {
          clienteNome: String(row["CLIENTE"] ?? row["Cliente"] ?? ""),
          produto: String(row["PRODUTO"] ?? row["Produto"] ?? ""),
          classe: String(row["CLASSE"] ?? row["Classe"] ?? ""),
          estoque,
          capacidade,
          pctOcupacao,
          diasEstocado: Number(row["DIAS ESTOCADO"] ?? row["Dias Estocado"] ?? 0) || null,
          statusBox: String(row["STATUS BOX"] ?? row["Status Box"] ?? "LIVRE"),
        },
        create: {
          boxCodigo,
          boxTipo: String(row["TIPO"] ?? row["Tipo"] ?? "ESTRUTURADO"),
          data,
          clienteNome: String(row["CLIENTE"] ?? row["Cliente"] ?? "") || null,
          produto: String(row["PRODUTO"] ?? row["Produto"] ?? "") || null,
          classe: String(row["CLASSE"] ?? row["Classe"] ?? "") || null,
          estoque,
          capacidade,
          pctOcupacao,
          diasEstocado: Number(row["DIAS ESTOCADO"] ?? row["Dias Estocado"] ?? 0) || null,
          statusBox: String(row["STATUS BOX"] ?? row["Status Box"] ?? "LIVRE"),
        },
      })
      criados++
    }

    return NextResponse.json({ message: `Importado! ${criados} registros de vistoria.` })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao importar", detail: String(err) }, { status: 500 })
  }
}
