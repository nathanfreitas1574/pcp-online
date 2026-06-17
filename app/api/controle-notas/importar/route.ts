import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { mapHeaders, cleanText, parseDataBR } from "@/lib/marcacao-columns"
import { candidatosNF } from "@/lib/cobertura"

const ALIASES: Record<string, string[]> = {
  data:           ["data"],
  usuario:        ["nome", "usuario", "operador"],
  numero:         ["numero", "numeracao", "romaneio", "num romaneio", "numero romaneio"],
  cliente:        ["cliente", "entidade", "cliente entidade", "nome entidade"],
  codigoOperacao: ["codigo", "cod operacao", "operacao", "tipo operacao", "cod"],
  descricao:      ["descricao", "lancamento", "evento"],
  numeroNF:       ["numero nf", "num nf", "nota fiscal", "numero nota", "nf"],
  motivoErro:     ["motivo", "erro", "tipo erro", "motivo erro"],
}

function tipoDe(codigo: string | null, desc: string | null): string {
  const s = `${codigo ?? ""} ${desc ?? ""}`.toUpperCase()
  if (s.includes("INA") || s.includes("INUTILIZ")) return "INUTILIZACAO"
  return "CANCELAMENTO"
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const fd = await req.formData()
  const file = fd.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  let headerIdx = 0, headerMap: Record<string, number> = {}, best = 0
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const m = mapHeaders(rows[i], ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  if (best < 3) return NextResponse.json({ error: "Cabeçalho não reconhecido." }, { status: 400 })
  const get = (row: unknown[], f: string) => { const i = headerMap[f]; return i === undefined ? null : row[i] }

  type Reg = { data: Date | null; usuario: string | null; numero: string; cliente: string | null; tipo: string; codigoOperacao: string | null; descricao: string | null; numeroNF: string | null; motivoErro: string | null }
  const regs: Reg[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const numero = cleanText(get(row, "numero"))
    if (!numero) continue // linhas sem número (gaps em laranja) são ignoradas
    const codigoOperacao = cleanText(get(row, "codigoOperacao"))
    const descricao = cleanText(get(row, "descricao"))
    regs.push({
      data: parseDataBR(get(row, "data")),
      usuario: cleanText(get(row, "usuario")),
      numero,
      cliente: cleanText(get(row, "cliente")),
      tipo: tipoDe(codigoOperacao, descricao),
      codigoOperacao, descricao,
      numeroNF: cleanText(get(row, "numeroNF")),
      motivoErro: cleanText(get(row, "motivoErro")),
    })
  }
  if (!regs.length) return NextResponse.json({ error: "Nenhuma linha válida encontrada.", camposReconhecidos: Object.keys(headerMap) }, { status: 400 })

  // validação em lote: cancelamentos cuja NF ainda está no contábil
  const cands = [...new Set(regs.filter(r => r.tipo === "CANCELAMENTO").flatMap(r => candidatosNF(r.numeroNF || r.numero)))]
  const noContabil = cands.length
    ? new Set((await prisma.estoqueContabil.findMany({ where: { docOriginal: { in: cands } }, select: { docOriginal: true } })).map(e => e.docOriginal))
    : new Set<string>()
  const alerta = (r: Reg) => r.tipo === "CANCELAMENTO" && candidatosNF(r.numeroNF || r.numero).some(c => noContabil.has(c))

  // Dedup: ignora os que já existem (por número + NF + tipo) e repetidos no próprio arquivo
  const chave = (numero: string, numeroNF: string | null, tipo: string) =>
    `${(numero ?? "").trim()}|${(numeroNF ?? "").trim()}|${tipo}`
  const existentes = new Set(
    (await prisma.controleNota.findMany({ select: { numero: true, numeroNF: true, tipo: true } }))
      .map(c => chave(c.numero, c.numeroNF, c.tipo)),
  )
  const noArquivo = new Set<string>()

  let criados = 0, alertas = 0, pulados = 0
  for (const r of regs) {
    const k = chave(r.numero, r.numeroNF, r.tipo)
    if (existentes.has(k) || noArquivo.has(k)) { pulados++; continue }
    noArquivo.add(k)
    const alertaContabil = alerta(r)
    if (alertaContabil) alertas++
    await prisma.controleNota.create({ data: { ...r, alertaContabil, criadoPorNome: session.user.name ?? null } })
    criados++
  }

  return NextResponse.json({ ok: true, criados, alertas, pulados, camposReconhecidos: Object.keys(headerMap) })
}
