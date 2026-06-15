import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { normalizeHeader, parsePeso } from "../lib/marcacao-columns"
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })
async function main() {
  const wb = XLSX.readFile(process.argv[2], { cellDates: true })
  const aba = wb.SheetNames.find(n => /fisico.*contabil/i.test(normalizeHeader(n))) ?? wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba], { header: 1, raw: true, defval: null }) as unknown[][]
  const achar = (k: string) => rows.findIndex(r => r.some(c => normalizeHeader(c) === k))
  const rFis = achar("fisico"), rCon = achar("contabil")
  const header = rows[rFis-1] ?? [], fisRow = rows[rFis] ?? [], conRow = rows[rCon] ?? []
  let n = 0
  for (let c=1;c<header.length;c++){
    const nome = header[c]?String(header[c]).trim():""
    if(!nome||/^saldo$/i.test(nome)) continue
    const fisico=parsePeso(fisRow[c]), contabil=parsePeso(conRow[c])
    if(fisico===0&&contabil===0) continue
    const p=nome.split(/\s*[-–]\s*/); const cliente=p.length>1?p[0].trim():"", produto=p.length>1?p.slice(1).join(" - ").trim():nome
    await prisma.aditivoControle.upsert({ where:{cliente_produto:{cliente,produto}}, update:{fisico,contabil}, create:{cliente,produto,fisico,contabil} })
    n++
  }
  console.log(`✅ ${n} aditivos importados (aba ${aba})`)
  await prisma.$disconnect()
}
main().catch(e=>{console.error(e);process.exit(1)})
