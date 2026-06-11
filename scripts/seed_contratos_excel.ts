// Importa contratos de armazenagem de um Excel TOTVS direto para o banco.
// Casa colunas por NOME do cabeçalho (robusto a reordenação) — mesma lógica
// do endpoint /api/contratos/importar.
// Uso: DATABASE_URL=... npx tsx scripts/seed_contratos_excel.ts "caminho/contratos.xlsx"
import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { parseContratoRows } from "../lib/contrato-columns"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })

async function main() {
  const file = process.argv[2]
  if (!file) { console.error("Informe o caminho do Excel"); process.exit(1) }

  const wb = XLSX.readFile(file, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // raw: true mantém Qtd.Contrat. numérica (TOTVS usa ponto como milhar)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  const { contratos, camposReconhecidos, colunasIgnoradas } = parseContratoRows(rows)
  console.log("Campos reconhecidos:", camposReconhecidos.join(", "))
  console.log("Colunas ignoradas:", colunasIgnoradas.join(", "))
  console.log(`${contratos.length} contratos parseados.`)

  let criados = 0, atualizados = 0
  for (const c of contratos) {
    const { filial, numero, ...rest } = c
    const data = { ...rest, ativo: true }
    const existing = await prisma.contratoArmazenagem.findUnique({ where: { filial_numero: { filial, numero } } })
    if (existing) { await prisma.contratoArmazenagem.update({ where: { filial_numero: { filial, numero } }, data }); atualizados++ }
    else { await prisma.contratoArmazenagem.create({ data: { filial, numero, ...data } }); criados++ }
  }
  console.log(`✅ ${criados} criados, ${atualizados} atualizados (total ${contratos.length})`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
