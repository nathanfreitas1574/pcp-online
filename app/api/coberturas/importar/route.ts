import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { mapHeaders, cleanText, parsePeso, parseDataBR } from "@/lib/marcacao-columns"
import { candidatosNF } from "@/lib/cobertura"

const ALIASES: Record<string, string[]> = {
  codigoRomaneio:  ["romaneio", "cod romaneio", "codigo romaneio", "cod romaneio", "ordem"],
  produto:         ["produto", "descricao produto", "desc produto", "descricao"],
  cliente:         ["cliente", "razao social", "nome cliente", "cliente destino"],
  volume:          ["volume", "peso", "peso liquido", "quantidade", "qtd"],
  dataDescarga:    ["data descarga", "data da descarga", "descarga", "data carregamento", "dt descarga"],
  numeroNota:      ["numero nota", "num nota", "numero nf", "num nf", "nota fiscal", "nf", "nota", "doc original"],
  dataSolicitacao: ["data solicitacao", "data da solicitacao", "solicitacao", "data solic", "dt solicitacao"],
  observacao:      ["observacao", "obs", "observacoes"],
  boxCodigo:       ["box", "codigo box", "cod box"],
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]
  if (!rows.length) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 })

  // detecta cabeçalho nas primeiras linhas
  let headerIdx = 0, headerMap: Record<string, number> = {}, best = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i], ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  const camposReconhecidos = Object.keys(headerMap)
  const get = (row: unknown[], f: string) => { const i = headerMap[f]; return i === undefined ? null : row[i] }

  type Reg = { codigoRomaneio: string; produto: string; cliente: string; volume: number; dataDescarga: Date | null; numeroNota: string | null; dataSolicitacao: Date | null; observacao: string | null; boxCodigo: string | null }
  const regs: Reg[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue
    const codigoRomaneio = cleanText(get(row, "codigoRomaneio"))
    const produto = cleanText(get(row, "produto"))
    if (!codigoRomaneio && !produto) continue
    regs.push({
      codigoRomaneio: codigoRomaneio ?? "",
      produto: produto ?? "",
      cliente: cleanText(get(row, "cliente")) ?? "",
      volume: parsePeso(get(row, "volume")),
      dataDescarga: parseDataBR(get(row, "dataDescarga")),
      numeroNota: cleanText(get(row, "numeroNota")),
      dataSolicitacao: parseDataBR(get(row, "dataSolicitacao")),
      observacao: cleanText(get(row, "observacao")),
      boxCodigo: cleanText(get(row, "boxCodigo")),
    })
  }
  if (!regs.length) return NextResponse.json({ error: "Nenhuma linha válida encontrada.", camposReconhecidos }, { status: 400 })

  // Auto-conferência em lote: quais NFs já estão no contábil
  const todosCands = [...new Set(regs.flatMap(r => r.numeroNota ? candidatosNF(r.numeroNota) : []))]
  const noContabil = todosCands.length
    ? new Set((await prisma.estoqueContabil.findMany({ where: { docOriginal: { in: todosCands } }, select: { docOriginal: true } })).map(e => e.docOriginal))
    : new Set<string>()
  const estaCoberto = (nf: string | null) => !!nf && candidatosNF(nf).some(c => noContabil.has(c))

  const agora = new Date()
  let criados = 0, jaCobertos = 0
  for (const r of regs) {
    const coberto = estaCoberto(r.numeroNota)
    if (coberto) jaCobertos++
    await prisma.coberturaPendente.create({
      data: { ...r, status: coberto ? "COBERTO" : "PENDENTE", resolvidoEm: coberto ? agora : null, criadoPorNome: session.user.name ?? null },
    })
    criados++
  }

  return NextResponse.json({ ok: true, criados, jaCobertos, camposReconhecidos })
}
