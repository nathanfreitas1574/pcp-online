import * as XLSX from "xlsx"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { mapHeaders, cleanText, parsePeso, normalizeHeader } from "../lib/marcacao-columns"
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })
const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]
const ALIASES:Record<string,string[]>={indicador:["indicador"],meta:["meta"],unidade:["u m","um","unidade"],sentidoIdeal:["sentido ideal","sentido"],desdobramento:["desdobramento"],recursoMedido:["recurso medido","recurso"]}
async function main(){
  const area=process.argv[3]||"PCP"
  const wb=XLSX.readFile(process.argv[2],{cellDates:true})
  const aba=wb.SheetNames.find(n=>normalizeHeader(n).includes(normalizeHeader(area)))??wb.SheetNames[0]
  const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba],{header:1,raw:true,defval:null}) as unknown[][]
  let hi=0,hm:Record<string,number>={},best=0
  for(let i=0;i<Math.min(rows.length,6);i++){const m=mapHeaders(rows[i],ALIASES);if(Object.keys(m).length>best){best=Object.keys(m).length;hm=m;hi=i}}
  const hr=rows[hi]; const mesCol:Record<string,number>={}; let ano=new Date().getFullYear()
  for(let c=hm.recursoMedido+1;c<hr.length;c++){const h=hr[c]; if(h instanceof Date){mesCol[MESES[h.getMonth()]]=c;ano=h.getFullYear()} else {const n=normalizeHeader(h);const idx=MESES.findIndex(m=>n.startsWith(m));if(idx>=0)mesCol[MESES[idx]]=c}}
  const get=(r:unknown[],f:string)=>{const i=hm[f];return i===undefined?null:r[i]}
  const sent=(s:string|null)=>{const n=(s??"").toLowerCase();return n.includes("menor")?"MENOR":n.includes("maior")?"MAIOR":null}
  let n=0,ordem=0
  for(let i=hi+1;i<rows.length;i++){
    const ind=cleanText(get(rows[i],"indicador")),rec=cleanText(get(rows[i],"recursoMedido"))
    if(!ind||!rec) continue
    ordem++
    const ehObs=/observ/i.test(rec); const obsParts:string[]=[]
    const data:any={ordem,meta:get(rows[i],"meta")!=null?parsePeso(get(rows[i],"meta")):null,unidade:cleanText(get(rows[i],"unidade")),sentidoIdeal:sent(cleanText(get(rows[i],"sentidoIdeal"))),desdobramento:cleanText(get(rows[i],"desdobramento")),obs:null}
    for(const m of MESES){const ci=mesCol[m];const v=ci!==undefined?rows[i][ci]:null; if(ehObs){const t=cleanText(v);if(t)obsParts.push(`${m}: ${t}`);data[m]=0} else data[m]=parsePeso(v)}
    if(ehObs)data.obs=obsParts.join(" · ")||null
    await prisma.indicadorPcp.upsert({where:{ano_area_indicador_recursoMedido:{ano,area,indicador:ind,recursoMedido:rec}},update:data,create:{ano,area,indicador:ind,recursoMedido:rec,...data}})
    n++
  }
  console.log(`✅ ${n} linhas (area ${area}, ano ${ano}, aba ${aba})`)
  await prisma.$disconnect()
}
main().catch(e=>{console.error(e);process.exit(1)})
