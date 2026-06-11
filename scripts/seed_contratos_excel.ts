// Importa contratos de armazenagem de um Excel TOTVS direto para o banco.
// Uso: DATABASE_URL=... npx tsx scripts/seed_contratos_excel.ts "caminho/contratos.xlsx"
import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })

const txt = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim())
const parseDate = (v: unknown) => {
  if (!v) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  const file = process.argv[2]
  if (!file) { console.error("Informe o caminho do Excel"); process.exit(1) }

  const wb = XLSX.readFile(file, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: null }) as unknown[][]

  // Linha 2 (index 1) = cabeçalhos; dados a partir da linha 3 (index 2)
  const dados = rows.slice(2)

  let criados = 0, atualizados = 0
  for (const r of dados) {
    const numero = txt(r[1])
    if (!numero) continue
    const data = {
      ultAlt:        txt(r[2]),
      descricao:     txt(r[3]) ?? "",
      tipoMercado:   txt(r[4]),
      dataCtr:       parseDate(r[5]),
      ctrExterno:    txt(r[6]),
      codEntidade:   txt(r[7]),
      lojEntidade:   txt(r[8]),
      clienteNome:   txt(r[9]) ?? txt(r[10]) ?? "",
      safra:         txt(r[11]),
      codProduto:    txt(r[13]),
      desProduto:    txt(r[14]) ?? "",
      descTabela:    txt(r[15]),
      qtdContratada: r[16] ? parseFloat(String(r[16]).replace(/\./g, "").replace(",", ".")) || 0 : 0,
      stsAssinatura: txt(r[17]) ?? "Aberto",
      stsFiscal:     txt(r[18]) ?? "Aberto",
      stsFinanceiro: txt(r[19]) ?? "Aberto",
      stsEstoque:    txt(r[20]) ?? "Aberto",
      modalidade:    txt(r[22]),
      centroCusto:   txt(r[32]),
      ativo: true,
    }
    const existing = await prisma.contratoArmazenagem.findUnique({ where: { numero } })
    if (existing) { await prisma.contratoArmazenagem.update({ where: { numero }, data }); atualizados++ }
    else { await prisma.contratoArmazenagem.create({ data: { numero, ...data } }); criados++ }
  }
  console.log(`✅ ${criados} criados, ${atualizados} atualizados (total ${criados + atualizados})`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
