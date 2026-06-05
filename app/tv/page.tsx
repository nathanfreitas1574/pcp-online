import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export const revalidate = 30

export default async function PainelTVPage() {
  const [boxes, alertasAbertos, tmpAtivos] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: { estoques: { include: { produto: true }, orderBy: { quantidade: "desc" }, take: 1 } },
      orderBy: { codigo: "asc" },
    }),
    prisma.alerta.count({ where: { status: "ABERTO" } }),
    prisma.tmpRegistro.findMany({ where: { status: "EM_ANDAMENTO" }, orderBy: { dtEntrada: "asc" } }),
  ])

  const totalCap = boxes.reduce((s, b) => s + b.capacidade, 0)
  const totalVol = boxes.reduce((s, b) => s + (b.estoques[0]?.quantidade ?? 0), 0)
  const pctGeral = totalCap > 0 ? ((totalVol / totalCap) * 100).toFixed(1) : "0.0"
  const boxesCriticos = boxes.filter((b) => b.capacidade > 0 && (b.estoques[0]?.quantidade ?? 0) / b.capacidade >= 0.9)
  const boxesOcupados = boxes.filter((b) => (b.estoques[0]?.quantidade ?? 0) > 0)
  const agora = new Date()

  return (
    <div style={{ background: "#0d1117", color: "#fff", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <style>{`
        body { background: #0d1117!important; }
        .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; padding:0 32px 20px; }
        .kpi { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:20px; text-align:center; }
        .kpi .v { font-size:52px; font-weight:bold; line-height:1; }
        .kpi .l { font-size:12px; color:#8b949e; margin-top:6px; text-transform:uppercase; letter-spacing:1px; }
        .boxes { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; }
        .bc { background:#161b22; border:2px solid #30363d; border-radius:10px; padding:10px; position:relative; }
        .bc .cod { font-size:13px; font-weight:bold; }
        .bc .prd { font-size:10px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .bc .badge { position:absolute; top:6px; right:6px; font-size:10px; font-weight:bold; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .bc .bar { height:5px; background:#21262d; border-radius:3px; margin-top:8px; }
        .tmps { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
        .tc { background:#161b22; border:2px solid; border-radius:10px; padding:14px; }
        .tc .pl { font-size:20px; font-weight:bold; letter-spacing:2px; }
        .tc .cl { font-size:12px; color:#8b949e; }
        .tc .tm { font-size:32px; font-weight:bold; margin-top:8px; }
        .sec { padding:0 32px 20px; }
        .sec h2 { font-size:13px; font-weight:600; color:#8b949e; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px; border-bottom:1px solid #21262d; padding-bottom:8px; }
      `}</style>

      <div style={{ background:"#1B6B2E", padding:"16px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"4px solid #C05A1A" }}>
        <div>
          <div style={{ fontSize:28, fontWeight:"bold" }}>PCP ONLINE</div>
          <div style={{ fontSize:13, color:"#A5D6A7" }}>Fertalvo — Painel Operacional</div>
        </div>
        <div style={{ fontSize:52, fontWeight:"bold" }}>{format(agora,"HH:mm",{locale:ptBR})}</div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:14, color:"#A5D6A7" }}>{format(agora,"EEEE",{locale:ptBR})}</div>
          <div style={{ fontSize:20, fontWeight:"bold" }}>{format(agora,"dd/MM/yyyy",{locale:ptBR})}</div>
          <div style={{ fontSize:11, color:"#81C784", marginTop:4 }}>Atualiza a cada 30s</div>
        </div>
      </div>

      <div className="kpis" style={{ paddingTop:20 }}>
        {[
          { l:"Ocupação Geral", v:`${pctGeral}%`, c: parseFloat(pctGeral)>=80?"#ef4444":"#22c55e" },
          { l:"Boxes Críticos", v:boxesCriticos.length, c: boxesCriticos.length>0?"#ef4444":"#22c55e" },
          { l:"Alertas Abertos", v:alertasAbertos, c: alertasAbertos>0?"#ef4444":"#22c55e" },
          { l:"Caminhões no Pátio", v:tmpAtivos.length, c:"#f97316" },
        ].map(({l,v,c})=>(
          <div key={l} className="kpi">
            <div className="v" style={{color:c}}>{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="sec">
        <h2>Boxes — {boxesOcupados.length} ocupados de {boxes.length}</h2>
        <div className="boxes">
          {boxes.map((box)=>{
            const vol = box.estoques[0]?.quantidade??0
            const pct = box.capacidade>0?(vol/box.capacidade)*100:0
            const prod = box.estoques[0]?.produto?.descricao
            const cor = pct>=90?"#ef4444":pct>=70?"#f97316":pct>=40?"#22c55e":"#3b82f6"
            const livre = vol===0
            return (
              <div key={box.id} className="bc" style={{borderColor:livre?"#30363d":cor,opacity:livre?0.5:1}}>
                <div className="cod">{box.codigo}</div>
                <div className="prd">{prod??"LIVRE"}</div>
                {!livre&&<div className="badge" style={{background:cor+"33",color:cor}}>{Math.round(pct)}%</div>}
                <div className="bar"><div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:cor,borderRadius:3}}/></div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sec">
        <h2>Caminhões no Pátio ({tmpAtivos.length})</h2>
        {tmpAtivos.length===0?(
          <p style={{color:"#8b949e",fontStyle:"italic",fontSize:14}}>Nenhum caminhão no pátio.</p>
        ):(
          <div className="tmps">
            {tmpAtivos.map((t)=>{
              const mins = Math.floor((Date.now()-new Date(t.dtEntrada).getTime())/60000)
              const cor = mins>=120?"#ef4444":mins>=60?"#f97316":"#22c55e"
              return (
                <div key={t.id} className="tc" style={{borderColor:cor}}>
                  <div className="pl">{t.placa}</div>
                  <div className="cl">{t.clienteNome} • {t.produto??"—"}</div>
                  <div className="tm" style={{color:cor}}>{Math.floor(mins/60)>0?`${Math.floor(mins/60)}h`:""}{mins%60}min</div>
                  <div style={{fontSize:11,color:"#8b949e"}}>{t.localDescarga??"—"}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{textAlign:"center",padding:"12px",color:"#8b949e",fontSize:11,borderTop:"1px solid #21262d"}}>
        PCP ONLINE — Fertalvo • {format(agora,"dd/MM/yyyy HH:mm",{locale:ptBR})} • Atualiza a cada 30 segundos
      </div>
    </div>
  )
}
