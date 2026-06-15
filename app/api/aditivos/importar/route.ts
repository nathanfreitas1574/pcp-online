import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { normalizeHeader, parsePeso } from "@/lib/marcacao-columns"

// Importa a aba "FISICO X CONTABIL" (pivotada: produtos nas colunas; linhas
// FÍSICO / CONTÁBIL). Cada coluna vira um aditivo (cliente - produto).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const fd = await req.formData()
  const file = fd.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true })
  // procura a aba "FISICO X CONTABIL", senão usa a primeira
  const nomeAba = wb.SheetNames.find(n => /fisico.*contabil/i.test(normalizeHeader(n))) ?? wb.SheetNames[0]
  const ws = wb.Sheets[nomeAba]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  const norm = (v: unknown) => normalizeHeader(v)
  const acharLinha = (chave: string) => rows.findIndex(r => r.some(c => norm(c) === chave))
  const rFis = acharLinha("fisico")
  const rCon = acharLinha("contabil")
  if (rFis < 0 || rCon < 0)
    return NextResponse.json({ error: "Não achei as linhas FÍSICO e CONTÁBIL na aba. Verifique o arquivo." }, { status: 400 })

  // linha de cabeçalho com os nomes dos produtos = a linha acima do FÍSICO
  const header = rows[Math.max(0, rFis - 1)] ?? []
  const fisRow = rows[rFis] ?? []
  const conRow = rows[rCon] ?? []

  let criados = 0, atualizados = 0
  for (let c = 1; c < header.length; c++) {
    const nome = header[c] ? String(header[c]).trim() : ""
    if (!nome || /^saldo$/i.test(nome)) continue
    const fisico = parsePeso(fisRow[c])
    const contabil = parsePeso(conRow[c])
    if (fisico === 0 && contabil === 0) continue
    // "LDC - SUPERSELEN" → cliente "LDC", produto "SUPERSELEN"
    const partes = nome.split(/\s*[-–]\s*/)
    const cliente = partes.length > 1 ? partes[0].trim() : ""
    const produto = partes.length > 1 ? partes.slice(1).join(" - ").trim() : nome

    const existe = await prisma.aditivoControle.findUnique({ where: { cliente_produto: { cliente, produto } } })
    await prisma.aditivoControle.upsert({
      where: { cliente_produto: { cliente, produto } },
      update: { fisico, contabil, atualizadoPor: session.user.name ?? null },
      create: { cliente, produto, fisico, contabil, atualizadoPor: session.user.name ?? null },
    })
    if (existe) atualizados++; else criados++
  }

  if (criados + atualizados === 0)
    return NextResponse.json({ error: "Nenhum produto válido encontrado na aba FÍSICO × CONTÁBIL." }, { status: 400 })

  return NextResponse.json({ ok: true, criados, atualizados, aba: nomeAba })
}
