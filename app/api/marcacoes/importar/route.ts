import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { parseMarcacaoRows, mapHeaders } from "@/lib/marcacao-columns"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // raw: true mantém números crus (evita ambiguidade de separador de milhar);
  // cellDates: true converte datas reais em Date. Texto continua texto.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  if (!rows.length)
    return NextResponse.json({ error: "Planilha vazia" }, { status: 400 })

  // Diagnóstico: quais colunas foram reconhecidas (robusto a reordenação)
  let headerRow = rows[0]
  let mapeadas = mapHeaders(rows[0])
  for (let i = 1; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i])
    if (Object.keys(m).length > Object.keys(mapeadas).length) { mapeadas = m; headerRow = rows[i] }
  }
  const camposReconhecidos = Object.keys(mapeadas)
  const colunasIgnoradas = (headerRow as unknown[])
    .map((h, i) => ({ h: h == null ? "" : String(h).trim(), i }))
    .filter(({ h, i }) => h !== "" && !Object.values(mapeadas).includes(i))
    .map(({ h }) => h)

  const registros = parseMarcacaoRows(rows)
  if (!registros.length)
    return NextResponse.json({
      error: "Nenhuma marcação válida encontrada. Verifique se a planilha tem as colunas '#' e dados.",
      camposReconhecidos,
    }, { status: 400 })

  let criados = 0
  let atualizados = 0
  for (const r of registros) {
    const data = {
      operacao:         r.operacao,
      check:            r.check,
      ordem:            r.ordem,
      status:           r.status,
      dataCheckin:      r.dataCheckin,
      dataMarcacao:     r.dataMarcacao,
      dataCarregamento: r.dataCarregamento,
      produto:          r.produto,
      motorista:        r.motorista,
      tipoServico:      r.tipoServico,
      obsMarcacao:      r.obsMarcacao,
      pedidoCliente:    r.pedidoCliente,
      clienteDestino:   r.clienteDestino,
      placa:            r.placa,
      transportadora:   r.transportadora,
      tipoVeiculo:      r.tipoVeiculo,
      cliente:          r.cliente,
      local:            r.local,
      pesoPrevisto:     r.pesoPrevisto,
      pesoFinal:        r.pesoFinal,
      pesoInicial:      r.pesoInicial,
      pesoLiquido:      r.pesoLiquido,
      turno:            r.turno,
      romaneio:         r.romaneio,
      lote:             r.lote,
      ativo:            true,
    }
    const existing = await prisma.marcacaoVeiculo.findUnique({ where: { numero: r.numero } })
    if (existing) {
      await prisma.marcacaoVeiculo.update({ where: { numero: r.numero }, data })
      atualizados++
    } else {
      await prisma.marcacaoVeiculo.create({ data: { numero: r.numero, ...data } })
      criados++
    }
  }

  return NextResponse.json({
    ok: true,
    criados,
    atualizados,
    total: registros.length,
    camposReconhecidos,
    colunasIgnoradas,
  })
}
