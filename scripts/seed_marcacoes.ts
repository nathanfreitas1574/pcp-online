// Importa marcações de veículos de um Excel para o banco (seed/local).
// Uso: DATABASE_URL=... npx tsx scripts/seed_marcacoes.ts "caminho/arquivo.xlsx"
import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { parseMarcacaoRows, mapHeaders } from "../lib/marcacao-columns"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })

async function main() {
  const file = process.argv[2]
  if (!file) { console.error("Informe o caminho do Excel"); process.exit(1) }

  const wb = XLSX.readFile(file, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  const mapeadas = mapHeaders(rows[0])
  console.log("Campos reconhecidos:", Object.keys(mapeadas).join(", "))

  const registros = parseMarcacaoRows(rows)
  console.log(`${registros.length} marcações parseadas.`)
  if (registros.length) console.log("Amostra:", JSON.stringify(registros[0], null, 2))

  let criados = 0, atualizados = 0
  for (const r of registros) {
    const { numero, ...rest } = r
    const data = { ...rest, ativo: true }
    const existing = await prisma.marcacaoVeiculo.findUnique({ where: { numero } })
    if (existing) { await prisma.marcacaoVeiculo.update({ where: { numero }, data }); atualizados++ }
    else { await prisma.marcacaoVeiculo.create({ data: { numero, ...data } }); criados++ }
  }
  console.log(`✅ ${criados} criados, ${atualizados} atualizados (total ${registros.length})`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
