import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { parseContratoRows } from "@/lib/contrato-columns"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  // classificação escolhida na importação (aplicada a TODAS as linhas do arquivo)
  const TIPOS = ["COMPRA", "VENDA", "ARMAZEM_IND"]
  const tipoRaw = String(formData.get("tipoContrato") ?? "").trim().toUpperCase()
  const tipoContrato = TIPOS.includes(tipoRaw) ? tipoRaw : null

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // raw: true → mantém Qtd.Contrat. como número cru (TOTVS usa ponto como
  // separador de milhar; formatado viraria "12.071" e seria lido como 12,071).
  // cellDates: true → datas reais viram Date. Texto continua texto.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  if (!rows.length)
    return NextResponse.json({ error: "Planilha vazia" }, { status: 400 })

  // Casa as colunas por NOME do cabeçalho (robusto a reordenação)
  const { contratos, camposReconhecidos, colunasIgnoradas } = parseContratoRows(rows)

  if (!contratos.length)
    return NextResponse.json({
      error: "Nenhum contrato válido encontrado. Verifique se a planilha tem as colunas 'Contrato' e dados.",
      camposReconhecidos,
    }, { status: 400 })

  let criados = 0
  let atualizados = 0
  for (const c of contratos) {
    const { filial, numero, ...rest } = c
    // só sobrescreve o tipo se um foi escolhido na importação (senão preserva o existente)
    const data = { ...rest, ativo: true, ...(tipoContrato ? { tipoContrato } : {}) }
    // Unicidade por filial+numero (o mesmo nº se repete entre filiais)
    const existing = await prisma.contratoArmazenagem.findUnique({ where: { filial_numero: { filial, numero } } })
    if (existing) {
      await prisma.contratoArmazenagem.update({ where: { filial_numero: { filial, numero } }, data })
      atualizados++
    } else {
      await prisma.contratoArmazenagem.create({ data: { filial, numero, ...data } })
      criados++
    }
  }

  return NextResponse.json({
    ok: true,
    criados,
    atualizados,
    total: contratos.length,
    camposReconhecidos,
    colunasIgnoradas,
  })
}
