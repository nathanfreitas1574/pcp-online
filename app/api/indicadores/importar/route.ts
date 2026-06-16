import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { mapHeaders, cleanText, parsePeso, normalizeHeader } from "@/lib/marcacao-columns"

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const ALIASES: Record<string, string[]> = {
  indicador:     ["indicador"],
  meta:          ["meta"],
  unidade:       ["u m", "um", "unidade"],
  sentidoIdeal:  ["sentido ideal", "sentido"],
  desdobramento: ["desdobramento"],
  recursoMedido: ["recurso medido", "recurso"],
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const fd = await req.formData()
  const file = fd.get("file") as File | null
  const area = (fd.get("area") as string) || "PCP"
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true })
  const aba = wb.SheetNames.find(n => normalizeHeader(n).includes(normalizeHeader(area))) ?? wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba], { header: 1, raw: true, defval: null }) as unknown[][]

  // detecta cabeçalho
  let headerIdx = 0, headerMap: Record<string, number> = {}, best = 0
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const m = mapHeaders(rows[i], ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  if (headerMap.recursoMedido === undefined)
    return NextResponse.json({ error: "Cabeçalho não reconhecido (faltou 'Recurso Medido')." }, { status: 400 })

  // colunas dos meses = à direita de recursoMedido, mapeadas pela data do cabeçalho
  const headerRow = rows[headerIdx]
  const mesCol: Record<string, number> = {}
  let ano = new Date().getFullYear()
  for (let c = headerMap.recursoMedido + 1; c < headerRow.length; c++) {
    const h = headerRow[c]
    if (h instanceof Date) { mesCol[MESES[h.getMonth()]] = c; ano = h.getFullYear() }
    else {
      const n = normalizeHeader(h)
      const idx = MESES.findIndex(m => n.startsWith(m))
      if (idx >= 0) mesCol[MESES[idx]] = c
    }
  }

  const get = (row: unknown[], f: string) => { const i = headerMap[f]; return i === undefined ? null : row[i] }
  const sentidoDe = (s: string | null) => { const n = (s ?? "").toLowerCase(); return n.includes("menor") ? "MENOR" : n.includes("maior") ? "MAIOR" : null }

  let criados = 0, atualizados = 0, ordem = 0
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const indicador = cleanText(get(row, "indicador"))
    const recursoMedido = cleanText(get(row, "recursoMedido"))
    if (!indicador || !recursoMedido) continue
    ordem++
    const ehObs = /observ/i.test(recursoMedido)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      ordem,
      meta: get(row, "meta") != null ? parsePeso(get(row, "meta")) : null,
      unidade: cleanText(get(row, "unidade")),
      sentidoIdeal: sentidoDe(cleanText(get(row, "sentidoIdeal"))),
      desdobramento: cleanText(get(row, "desdobramento")),
      obs: null as string | null,
    }
    const obsParts: string[] = []
    for (const m of MESES) {
      const cidx = mesCol[m]
      const v = cidx !== undefined ? row[cidx] : null
      if (ehObs) { const t = cleanText(v); if (t) obsParts.push(`${m}: ${t}`); data[m] = 0 }
      else data[m] = parsePeso(v)
    }
    if (ehObs) data.obs = obsParts.join(" · ") || null

    const existe = await prisma.indicadorPcp.findUnique({ where: { ano_area_indicador_recursoMedido: { ano, area, indicador, recursoMedido } } })
    await prisma.indicadorPcp.upsert({ where: { ano_area_indicador_recursoMedido: { ano, area, indicador, recursoMedido } }, update: data, create: { ano, area, indicador, recursoMedido, ...data } })
    if (existe) atualizados++; else criados++
  }

  if (criados + atualizados === 0)
    return NextResponse.json({ error: "Nenhuma linha de indicador encontrada." }, { status: 400 })
  return NextResponse.json({ ok: true, criados, atualizados, ano, aba, meses: Object.keys(mesCol).length })
}
