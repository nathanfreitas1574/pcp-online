import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { mapHeaders, cleanText, parsePeso, parseDataBR, normalizeHeader } from "../lib/marcacao-columns"
import { parseMes } from "../lib/varredura"
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })
const ALIASES: Record<string,string[]> = { semana:["semana"], mesLabel:["mes"], dataSegunda:["data segunda"], medSegundaVarredura:["medicao segunda varredura"], medSegundaCalcario:["medicao segunda calcario"], dataSexta:["data sexta"], medSextaVarredura:["medicao sexta varredura","medicao sext varredura"], medSextaCalcario:["medicao sexta calcario","medicao sext calcario"], expedicaoSemana:["expedicao na semana","expedicao semana"], geracaoIntervalo:["geracao no intervalo","geracao intervalo"], geracaoCalcario:["geracao de calcario","geracao calcario"], geracaoMP:["geracao de mp","geracao mp"], houveExpedicao:["houve expedicao"], calcarioFisico:["calcario fisico"], compraCalcario:["compra de calcario","compra calcario"], saldoAcumulado:["saldo acumulado"] }
async function main(){
  const wb=XLSX.readFile(process.argv[2],{cellDates:true})
  const aba=wb.SheetNames.find(n=>/controle semanal/i.test(normalizeHeader(n)))??wb.SheetNames[0]
  const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba],{header:1,raw:true,defval:null}) as unknown[][]
  let hi=0,hm:Record<string,number>={},best=0
  for(let i=0;i<Math.min(rows.length,8);i++){const m=mapHeaders(rows[i],ALIASES);if(Object.keys(m).length>best){best=Object.keys(m).length;hm=m;hi=i}}
  const get=(r:unknown[],f:string)=>{const i=hm[f];return i===undefined?null:r[i]}
  let n=0
  for(let i=hi+1;i<rows.length;i++){
    const semana=cleanText(get(rows[i],"semana")); if(!semana) continue
    const mesLabel=cleanText(get(rows[i],"mesLabel"))??""; const {ano,mesNum}=parseMes(mesLabel)
    const houve=cleanText(get(rows[i],"houveExpedicao"))
    const data={mesNum,mesLabel,dataSegunda:parseDataBR(get(rows[i],"dataSegunda")),medSegundaVarredura:parsePeso(get(rows[i],"medSegundaVarredura")),medSegundaCalcario:parsePeso(get(rows[i],"medSegundaCalcario")),dataSexta:parseDataBR(get(rows[i],"dataSexta")),medSextaVarredura:parsePeso(get(rows[i],"medSextaVarredura")),medSextaCalcario:parsePeso(get(rows[i],"medSextaCalcario")),expedicaoSemana:parsePeso(get(rows[i],"expedicaoSemana")),geracaoIntervalo:parsePeso(get(rows[i],"geracaoIntervalo")),geracaoCalcario:parsePeso(get(rows[i],"geracaoCalcario")),geracaoMP:parsePeso(get(rows[i],"geracaoMP")),houveExpedicao:!!houve&&/^s/i.test(houve),calcarioFisico:parsePeso(get(rows[i],"calcarioFisico")),compraCalcario:parsePeso(get(rows[i],"compraCalcario")),saldoAcumulado:parsePeso(get(rows[i],"saldoAcumulado"))}
    await prisma.varreduraSemanal.upsert({where:{ano_semana:{ano,semana}},update:data,create:{ano,semana,...data}})
    n++
  }
  console.log(`✅ ${n} semanas (aba ${aba})`)
  await prisma.$disconnect()
}
main().catch(e=>{console.error(e);process.exit(1)})
