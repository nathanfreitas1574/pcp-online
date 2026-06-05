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

  let contratosCriados = 0
  let registrosCriados = 0

  try {
    // Aba CONTRATOS (PLANO CARGA)
    const abaContrato = wb.SheetNames.find((s) => s === "CONTRATOS")
    if (abaContrato) {
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[abaContrato], { defval: null })
      for (const row of rows) {
        const numero = String(row["Nº CONTRATO"] ?? row["CONTRATO"] ?? "").trim()
        const clienteNome = String(row["CLIENTE"] ?? "").trim()
        if (!numero || !clienteNome) continue

        let cliente = await prisma.cliente.findFirst({ where: { nome: { contains: clienteNome } } })
        if (!cliente) {
          cliente = await prisma.cliente.create({
            data: { codigo: clienteNome.substring(0, 10), nome: clienteNome },
          })
        }

        await prisma.contratoExpedicao.upsert({
          where: { id: `${numero}-${clienteNome}`.replace(/[^a-z0-9]/gi, "_") },
          update: { realizado: Number(row["REALIZADO"] ?? 0), saldo: Number(row["Saldo"] ?? 0) },
          create: {
            numero,
            clienteId: cliente.id,
            operacao: String(row["OPERAÇÃO"] ?? ""),
            produtoSistema: String(row["PRODUTO SISTEMA"] ?? ""),
            produtoAbreviado: String(row["PROD. ABREVIADO"] ?? ""),
            tipoProduto: String(row["TIPO DE PRODUTO"] ?? ""),
            mes: String(row["Mês"] ?? ""),
            semana: Number(row["Semana"] ?? 0) || null,
            volProgramado: Number(row["VOLUME PROGRAMADO"] ?? 0),
            realizado: Number(row["REALIZADO"] ?? 0),
            saldo: Number(row["Saldo"] ?? 0),
            status: String(row["STATUS"] ?? "PROGRAMADO"),
          },
        })
        contratosCriados++
      }
    }

    // Aba Dia a Dia (Base Expedição)
    const abaDia = wb.SheetNames.find((s) => s.toLowerCase().includes("dia"))
    if (abaDia) {
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[abaDia], { defval: 0 })
      for (const row of rows) {
        const clienteNome = String(row["CLIENTE"] ?? row["cliente"] ?? "").trim()
        const produto = String(row["PRODUTO"] ?? row["produto"] ?? "").trim()
        if (!clienteNome) continue

        const rawDate = row["DATA"] ?? row["data"]
        let data: Date = new Date()
        if (rawDate instanceof Date) data = rawDate
        else if (typeof rawDate === "number") data = new Date((rawDate - 25569) * 86400000)

        await prisma.expedicaoRegistro.create({
          data: {
            data,
            clienteNome,
            produto: produto || "—",
            linha: String(row["LINHA"] ?? row["linha"] ?? ""),
            operacao: String(row["OPERACAO"] ?? row["operacao"] ?? ""),
            turno: String(row["TURNO"] ?? row["turno"] ?? ""),
            orcado: Number(row["ORÇADO"] ?? row["orcado"] ?? 0),
            forecast: Number(row["FORECAST"] ?? row["forecast"] ?? 0),
            realizado: Number(row["REALIZADO"] ?? row["realizado"] ?? 0),
            capacidade: Number(row["CAPACIDADE"] ?? row["capacidade"] ?? 0),
          },
        })
        registrosCriados++
      }
    }

    return NextResponse.json({
      message: `Importado! ${contratosCriados} contratos e ${registrosCriados} registros diários.`,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao importar", detail: String(err) }, { status: 500 })
  }
}
