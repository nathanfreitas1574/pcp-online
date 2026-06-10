import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

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
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as unknown[][]

  // Linha 2 (index 1) = cabeçalhos; dados a partir de linha 3 (index 2)
  const dados = rows.slice(2)

  let criados = 0; let atualizados = 0
  for (const row of dados) {
    const r = row as (string | number | Date | null)[]
    const numero = r[1] ? String(r[1]).trim() : null
    if (!numero) continue

    const parseDate = (v: unknown) => {
      if (!v) return null
      if (v instanceof Date) return v
      const d = new Date(String(v))
      return isNaN(d.getTime()) ? null : d
    }

    const data = {
      ultAlt:        r[2]  ? String(r[2]).trim()  : null,
      descricao:     r[3]  ? String(r[3]).trim()  : "",
      tipoMercado:   r[4]  ? String(r[4]).trim()  : null,
      dataCtr:       parseDate(r[5]),
      ctrExterno:    r[6]  ? String(r[6]).trim()  : null,
      codEntidade:   r[7]  ? String(r[7]).trim()  : null,
      lojEntidade:   r[8]  ? String(r[8]).trim()  : null,
      clienteNome:   r[9]  ? String(r[9]).trim()  : (r[10] ? String(r[10]).trim() : ""),
      safra:         r[11] ? String(r[11]).trim() : null,
      codProduto:    r[13] ? String(r[13]).trim() : null,
      desProduto:    r[14] ? String(r[14]).trim() : "",
      descTabela:    r[15] ? String(r[15]).trim() : null,
      qtdContratada: r[16] ? parseFloat(String(r[16]).replace(",", ".")) || 0 : 0,
      stsAssinatura: r[17] ? String(r[17]).trim() : "Aberto",
      stsFiscal:     r[18] ? String(r[18]).trim() : "Aberto",
      stsFinanceiro: r[19] ? String(r[19]).trim() : "Aberto",
      stsEstoque:    r[20] ? String(r[20]).trim() : "Aberto",
      modalidade:    r[22] ? String(r[22]).trim() : null,
      centroCusto:   r[32] ? String(r[32]).trim() : null,
      ativo: true,
    }

    const existing = await prisma.contratoArmazenagem.findUnique({ where: { numero } })
    if (existing) {
      await prisma.contratoArmazenagem.update({ where: { numero }, data })
      atualizados++
    } else {
      await prisma.contratoArmazenagem.create({ data: { numero, ...data } })
      criados++
    }
  }

  return NextResponse.json({ ok: true, criados, atualizados, total: criados + atualizados })
}
