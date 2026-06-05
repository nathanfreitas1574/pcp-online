import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as xlsx from "xlsx"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true })

  let contratosCriados = 0
  let programacoesCriadas = 0
  let registrosCriados = 0

  try {
    // Aba Contrato
    if (wb.SheetNames.includes("Contrato")) {
      const ws = wb.Sheets["Contrato"]
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

      for (const row of rows) {
        const numero = String(row["Nº CONTRATO"] ?? row["numero"] ?? "").trim()
        const clienteNome = String(row["CLIENTE"] ?? "").trim()
        if (!numero || !clienteNome) continue

        let cliente = await prisma.cliente.findFirst({ where: { nome: { contains: clienteNome } } })
        if (!cliente) {
          cliente = await prisma.cliente.create({
            data: { codigo: clienteNome.substring(0, 10), nome: clienteNome },
          })
        }

        await prisma.contratoDescarga.upsert({
          where: { numero },
          update: {
            volProgramado: Number(row["VOLUME PROGRAMADO"] ?? 0),
            volConfirmado: Number(row["VOLUME CONFIRMADO"] ?? 0),
            cancelado: Number(row["CANCELADO"] ?? 0),
            adicionado: Number(row["ADICIONADO"] ?? 0),
            realizado: Number(row["REALIZADO"] ?? 0),
            saldo: Number(row["Saldo"] ?? 0),
            status: String(row["STATUS"] ?? "PROGRAMADO"),
          },
          create: {
            numero,
            clienteId: cliente.id,
            produtoDesc: String(row["Produto sistema"] ?? row["PRODUTO"] ?? ""),
            produtoAbreviado: String(row["Produto abreviado"] ?? ""),
            tipoProduto: String(row["Tipo de Prdotuo"] ?? row["Tipo de Produto"] ?? ""),
            navio: String(row["NAVIO"] ?? ""),
            origem: String(row["ORIGEM"] ?? ""),
            mes: String(row["Mês"] ?? ""),
            semana: Number(row["Semana"] ?? 0) || null,
            volProgramado: Number(row["VOLUME PROGRAMADO"] ?? 0),
            volConfirmado: Number(row["VOLUME CONFIRMADO"] ?? 0),
            cancelado: Number(row["CANCELADO"] ?? 0),
            adicionado: Number(row["ADICIONADO"] ?? 0),
            realizado: Number(row["REALIZADO"] ?? 0),
            saldo: Number(row["Saldo"] ?? 0),
            status: String(row["STATUS"] ?? "PROGRAMADO"),
          },
        })
        contratosCriados++
      }
    }

    // Aba PROGRAMAÇÃO SEMANAL
    if (wb.SheetNames.includes("PROGRAMAÇÃO SEMANAL")) {
      const ws = wb.Sheets["PROGRAMAÇÃO SEMANAL"]
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: 0 })

      for (const row of rows) {
        const numeroContrato = String(row["Nº CONTRATO"] ?? "").trim()
        if (!numeroContrato) continue

        const contrato = await prisma.contratoDescarga.findUnique({ where: { numero: numeroContrato } })
        if (!contrato) continue

        const rawDate = row["DATA"]
        let data: Date
        if (rawDate instanceof Date) {
          data = rawDate
        } else if (typeof rawDate === "number") {
          data = xlsx.SSF.parse_date_code ? new Date(1900, 0, rawDate - 1) : new Date()
        } else {
          data = new Date()
        }

        await prisma.descargaProgramacao.create({
          data: {
            contratoId: contrato.id,
            data,
            mes: String(row["MÊS"] ?? ""),
            semana: Number(row["SEMANA"] ?? 0) || null,
            clienteNome: String(row["CLIENTE"] ?? ""),
            produto: String(row["PRODUTO"] ?? ""),
            armazem: String(row["ARMAZEM"] ?? ""),
            box: String(row["BOX"] ?? ""),
            volume: Number(row["VOLUME "] ?? row["VOLUME"] ?? 0),
            seg: Number(row["SEG"] ?? 0),
            ter: Number(row["TER"] ?? 0),
            qua: Number(row["QUA"] ?? 0),
            qui: Number(row["QUI"] ?? 0),
            sex: Number(row["SEX"] ?? 0),
            sab: Number(row["SÁB"] ?? row["SAB"] ?? 0),
            realizado: Number(row["Realizado"] ?? 0),
            saldo: Number(row["Saldo"] ?? 0),
          },
        })
        programacoesCriadas++
      }
    }

    // Aba RELATÓRIO DIÁRIO
    if (wb.SheetNames.includes("RELATÓRIO DIÁRIO")) {
      const ws = wb.Sheets["RELATÓRIO DIÁRIO"]
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

      for (const row of rows) {
        const cliente = String(row["CLIENTE"] ?? "").trim()
        const produto = String(row["PRODUTO"] ?? "").trim()
        if (!cliente || !produto) continue

        const rawPortaria = row["DT/H PORTARIA"]
        let dtPortaria: Date | null = null
        if (rawPortaria instanceof Date) dtPortaria = rawPortaria
        else if (typeof rawPortaria === "number") dtPortaria = new Date((rawPortaria - 25569) * 86400000)

        const rawSaida = row["DATA E HORA SAÍDA"] ?? row["DT/H SAÍDA"]
        let dtSaida: Date | null = null
        if (rawSaida instanceof Date) dtSaida = rawSaida
        else if (typeof rawSaida === "number") dtSaida = new Date((rawSaida - 25569) * 86400000)

        const tmpMinutos = dtPortaria && dtSaida
          ? Math.round((dtSaida.getTime() - dtPortaria.getTime()) / 60000)
          : Number(row["TEMPO TRANSITO"] ?? 0) || null

        await prisma.descargaRegistro.create({
          data: {
            romaneio: String(row["ROMANEIO"] ?? ""),
            placa: String(row["PLACA"] ?? ""),
            motorista: String(row["MOTORISTA"] ?? ""),
            clienteNome: cliente,
            transportadora: String(row["TRANSPORTADORA"] ?? ""),
            produto,
            localDescarga: String(row["LOCAL"] ?? ""),
            tipoVeiculo: String(row["TIPO DE VEICULO"] ?? ""),
            origem: String(row["ORIGEM DO CARREGAMENTO"] ?? ""),
            pesoEntrada: null,
            pesoSaida: Number(row["PESO SAIDA"] ?? row["PESO"] ?? 0) || null,
            status: String(row["STATUS"] ?? "REALIZADO"),
            turno: String(row["TURNO"] ?? ""),
            dtPortaria,
            dtSaida,
            tmpMinutos,
            notaFiscal: String(row["NOTA FISCAL"] ?? ""),
          },
        })
        registrosCriados++
      }
    }

    return NextResponse.json({
      message: `Importado! ${contratosCriados} contratos, ${programacoesCriadas} programações, ${registrosCriados} registros diários.`,
      contratosCriados,
      programacoesCriadas,
      registrosCriados,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao importar", detail: String(err) }, { status: 500 })
  }
}
