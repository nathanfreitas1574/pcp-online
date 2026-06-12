// Importa o estoque contábil (Materiais De/Em Terceiros) de um Excel direto no
// banco, substituindo o snapshot anterior. Mesma lógica do endpoint.
// Uso: DATABASE_URL=... npx tsx scripts/seed_estoque_contabil.ts "caminho/arquivo.xlsx"
import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { parseEstoqueRows } from "../lib/estoque-columns"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })

async function main() {
  const file = process.argv[2]
  if (!file) { console.error("Informe o caminho do Excel"); process.exit(1) }

  const wb = XLSX.readFile(file, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]
  const { estoque, camposReconhecidos } = parseEstoqueRows(rows)
  console.log("Campos reconhecidos:", camposReconhecidos.join(", "))
  console.log(`${estoque.length} registros parseados.`)

  const importadoEm = new Date()
  const regs = estoque.map(e => ({
    filial: e.filial, produto: e.produto, descricao: e.descricao, armazem: e.armazem,
    razaoSocial: e.razaoSocial, docOriginal: e.docOriginal ?? "", serieDoc: e.serieDoc,
    dtEmissao: e.dtEmissao, quantidade: e.quantidade, totalNF: e.totalNF, tes: e.tes,
    tipoDeEm: e.tipoDeEm, saldo: e.saldo, poderTerc: e.poderTerc, sentido: e.sentido, importadoEm,
  }))

  await prisma.estoqueContabil.deleteMany({})
  const LOTE = 4000
  for (let i = 0; i < regs.length; i += LOTE) {
    await prisma.estoqueContabil.createMany({ data: regs.slice(i, i + LOTE) })
    process.stdout.write(`\r  ${Math.min(i + LOTE, regs.length)}/${regs.length}`)
  }
  console.log(`\n✅ ${regs.length} registros importados.`)
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
