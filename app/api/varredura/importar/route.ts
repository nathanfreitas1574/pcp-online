import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { mapHeaders, cleanText, parsePeso, parseDataBR, normalizeHeader } from "@/lib/marcacao-columns"
import { parseMes } from "@/lib/varredura"

const ALIASES: Record<string, string[]> = {
  semana:              ["semana"],
  mesLabel:            ["mes"],
  dataSegunda:         ["data segunda"],
  medSegundaVarredura: ["medicao segunda varredura"],
  medSegundaCalcario:  ["medicao segunda calcario"],
  dataSexta:           ["data sexta"],
  medSextaVarredura:   ["medicao sexta varredura", "medicao sext varredura"],
  medSextaCalcario:    ["medicao sexta calcario", "medicao sext calcario"],
  expedicaoSemana:     ["expedicao na semana", "expedicao semana"],
  geracaoIntervalo:    ["geracao no intervalo", "geracao intervalo"],
  geracaoCalcario:     ["geracao de calcario", "geracao calcario"],
  geracaoMP:           ["geracao de mp", "geracao mp"],
  houveExpedicao:      ["houve expedicao"],
  calcarioFisico:      ["calcario fisico"],
  compraCalcario:      ["compra de calcario", "compra calcario"],
  saldoAcumulado:      ["saldo acumulado"],
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
  const aba = wb.SheetNames.find(n => /controle semanal/i.test(normalizeHeader(n))) ?? wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba], { header: 1, raw: true, defval: null }) as unknown[][]

  // detecta a linha de cabeçalho nas primeiras 8 linhas
  let headerIdx = 0, headerMap: Record<string, number> = {}, best = 0
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const m = mapHeaders(rows[i], ALIASES)
    if (Object.keys(m).length > best) { best = Object.keys(m).length; headerMap = m; headerIdx = i }
  }
  if (best < 4) return NextResponse.json({ error: "Cabeçalho não reconhecido. Use a aba 'Controle Semanal'." }, { status: 400 })
  const get = (row: unknown[], f: string) => { const i = headerMap[f]; return i === undefined ? null : row[i] }

  let criados = 0, atualizados = 0
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const semana = cleanText(get(row, "semana"))
    if (!semana) continue
    const mesLabel = cleanText(get(row, "mesLabel")) ?? ""
    const { ano, mesNum } = parseMes(mesLabel)
    const houve = cleanText(get(row, "houveExpedicao"))
    const data = {
      mesNum, mesLabel,
      dataSegunda: parseDataBR(get(row, "dataSegunda")),
      medSegundaVarredura: parsePeso(get(row, "medSegundaVarredura")),
      medSegundaCalcario: parsePeso(get(row, "medSegundaCalcario")),
      dataSexta: parseDataBR(get(row, "dataSexta")),
      medSextaVarredura: parsePeso(get(row, "medSextaVarredura")),
      medSextaCalcario: parsePeso(get(row, "medSextaCalcario")),
      expedicaoSemana: parsePeso(get(row, "expedicaoSemana")),
      geracaoIntervalo: parsePeso(get(row, "geracaoIntervalo")),
      geracaoCalcario: parsePeso(get(row, "geracaoCalcario")),
      geracaoMP: parsePeso(get(row, "geracaoMP")),
      houveExpedicao: !!houve && /^s/i.test(houve),
      calcarioFisico: parsePeso(get(row, "calcarioFisico")),
      compraCalcario: parsePeso(get(row, "compraCalcario")),
      saldoAcumulado: parsePeso(get(row, "saldoAcumulado")),
    }
    const existe = await prisma.varreduraSemanal.findUnique({ where: { ano_semana: { ano, semana } } })
    await prisma.varreduraSemanal.upsert({ where: { ano_semana: { ano, semana } }, update: data, create: { ano, semana, ...data } })
    if (existe) atualizados++; else criados++
  }

  if (criados + atualizados === 0)
    return NextResponse.json({ error: "Nenhuma semana válida encontrada." }, { status: 400 })
  return NextResponse.json({ ok: true, criados, atualizados, aba })
}
