import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { parseEstoqueRows } from "@/lib/estoque-columns"

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
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]
  if (!rows.length) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 })

  const { estoque, camposReconhecidos } = parseEstoqueRows(rows)
  if (!estoque.length)
    return NextResponse.json({ error: "Nenhum registro válido (verifique a coluna 'Doc.Original').", camposReconhecidos }, { status: 400 })

  const importadoEm = new Date()
  const registros = estoque.map(e => ({
    filial: e.filial, produto: e.produto, descricao: e.descricao, armazem: e.armazem,
    razaoSocial: e.razaoSocial, docOriginal: e.docOriginal ?? "", serieDoc: e.serieDoc,
    dtEmissao: e.dtEmissao, quantidade: e.quantidade, totalNF: e.totalNF, tes: e.tes,
    tipoDeEm: e.tipoDeEm, saldo: e.saldo, poderTerc: e.poderTerc, sentido: e.sentido, importadoEm,
  }))

  // Substitui o snapshot anterior (estado atual do estoque contábil)
  await prisma.estoqueContabil.deleteMany({})
  const LOTE = 2000
  for (let i = 0; i < registros.length; i += LOTE) {
    await prisma.estoqueContabil.createMany({ data: registros.slice(i, i + LOTE) })
  }

  return NextResponse.json({ ok: true, total: registros.length, importadoEm, camposReconhecidos })
}
