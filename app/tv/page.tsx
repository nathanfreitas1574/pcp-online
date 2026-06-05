import { prisma } from "@/lib/prisma"

export const revalidate = 30 // atualiza a cada 30s

export default async function PainelTVPage() {
  const [boxes, alertasAbertos, tmpAtivos, movProgramadas] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: {
        estoques: { include: { produto: true }, orderBy: { quantidade: "desc" }, take: 1 },
      },
      orderBy: { codigo: "asc" },
    }),
    prisma.alerta.count({ where: { status: "ABERTO" } }),
    prisma.tmpRegistro.findMany({
      where: { status: "EM_ANDAMENTO" },
      orderBy: { dtEntrada: "asc" },
    }),
    prisma.movimentacao.count({ where: { status: "PROGRAMADA" } }),
  ])

  const totalCap = boxes.reduce((s, b) => s + b.capacidade, 0)
  const totalVol = boxes.reduce((s, b) => s + (b.estoques[0]?.quantidade ?? 0), 0)
  const pctGeral = totalCap > 0 ? ((totalVol / totalCap) * 100).toFixed(1) : "0.0"

  const boxesOcupados = boxes.filter((b) => (b.estoques[0]?.quantidade ?? 0) > 0)
  const boxesCriticos = boxes.filter((b) => {
    const vol = b.estoques[0]?.quantidade ?? 0
    return b.capacidade > 0 && (vol / b.capacidade) >= 0.9
  })

  const agora = new Date()

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PCP ONLINE — Painel Operacional</title>
        <meta httpEquiv="refresh" content="30" />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#0d1117; color:#fff; font-family: 'Segoe UI', Arial, sans-serif; min-height:100vh; }
          .header { background:#1B6B2E; padding:16px 32px; display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #C05A1A; }
          .header h1 { font-size:28px; font-weight:bold; letter-spacing:2px; }
          .header .hora { font-size:24px; color:#A5D6A7; }
          .header .sub { font-size:13px; color:#A5D6A7; }
          .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; padding:20px 32px; }
          .kpi { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:20px; text-align:center; }
          .kpi .valor { font-size:48px; font-weight:bold; line-height:1; }
          .kpi .label { font-size:13px; color:#8b949e; margin-top:6px; text-transform:uppercase; letter-spacing:1px; }
          .kpi.verde .valor { color:#22c55e; }
          .kpi.amarelo .valor { color:#f59e0b; }
          .kpi.vermelho .valor { color:#ef4444; }
          .kpi.azul .valor { color:#3b82f6; }
          .kpi.laranja .valor { color:#f97316; }
          .secao { padding:0 32px 20px; }
          .secao h2 { font-size:16px; font-weight:600; color:#8b949e; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px; border-bottom:1px solid #21262d; padding-bottom:8px; }
          .boxes-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
          .box-card { background:#161b22; border:2px solid #30363d; border-radius:10px; padding:10px; position:relative; overflow:hidden; }
          .box-card .codigo { font-size:14px; font-weight:bold; }
          .box-card .produto { font-size:11px; color:#8b949e; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .box-card .pct-badge { position:absolute; top:6px; right:6px; font-size:11px; font-weight:bold; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
          .box-card .barra { height:6px; background:#21262d; border-radius:3px; margin-top:8px; overflow:hidden; }
          .box-card .barra-fill { height:100%; border-radius:3px; transition:width 0.5s; }
          .box-card.livre { border-color:#21262d; opacity:0.5; }
          .tmp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
          .tmp-card { background:#161b22; border:2px solid #30363d; border-radius:10px; padding:14px; }
          .tmp-card .placa { font-size:20px; font-weight:bold; letter-spacing:2px; }
          .tmp-card .cliente { font-size:12px; color:#8b949e; }
          .tmp-card .tempo { font-size:32px; font-weight:bold; margin-top:8px; }
          .sem-dados { color:#8b949e; font-style:italic; font-size:14px; padding:16px 0; }
          .footer { text-align:center; padding:12px; color:#8b949e; font-size:11px; border-top:1px solid #21262d; margin-top:auto; }
        `}</style>
        <script dangerouslySetInnerHTML={{__html: `
          // Cronômetros
          function calcTmp(entrada) {
            const mins = Math.floor((Date.now() - new Date(entrada).getTime()) / 60000);
            const h = Math.floor(mins / 60), m = mins % 60;
            return h > 0 ? h+'h'+m+'min' : m+'min';
          }
          function cor(mins) {
            if (mins >= 120) return '#ef4444';
            if (mins >= 60) return '#f97316';
            return '#22c55e';
          }
          setInterval(() => {
            document.querySelectorAll('[data-entrada]').forEach(el => {
              const entrada = el.getAttribute('data-entrada');
              const mins = Math.floor((Date.now() - new Date(entrada).getTime()) / 60000);
              el.textContent = calcTmp(entrada);
              el.style.color = cor(mins);
            });
            // Hora
            const h = document.getElementById('hora');
            if(h) h.textContent = new Date().toLocaleTimeString('pt-BR');
          }, 10000);
        `}} />
      </head>
      <body>
        <div className="header">
          <div>
            <h1>PCP ONLINE</h1>
            <div className="sub">Fertalvo — Painel Operacional</div>
          </div>
          <div className="hora" id="hora">
            {agora.toLocaleTimeString("pt-BR")}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,color:"#A5D6A7"}}>{agora.toLocaleDateString("pt-BR",{weekday:"long"})}</div>
            <div style={{fontSize:18,fontWeight:"bold"}}>{agora.toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpis">
          <div className={`kpi ${parseFloat(pctGeral) >= 80 ? "vermelho" : parseFloat(pctGeral) >= 50 ? "amarelo" : "verde"}`}>
            <div className="valor">{pctGeral}%</div>
            <div className="label">Ocupação Geral</div>
          </div>
          <div className={`kpi ${boxesCriticos.length > 0 ? "vermelho" : "verde"}`}>
            <div className="valor">{boxesCriticos.length}</div>
            <div className="label">Boxes Críticos</div>
          </div>
          <div className={`kpi ${alertasAbertos > 0 ? "vermelho" : "verde"}`}>
            <div className="valor">{alertasAbertos}</div>
            <div className="label">Alertas Abertos</div>
          </div>
          <div className="kpi azul">
            <div className="valor">{tmpAtivos.length}</div>
            <div className="label">Caminhões no Pátio</div>
          </div>
          <div className="kpi laranja">
            <div className="valor">{movProgramadas}</div>
            <div className="label">Mov. Programadas</div>
          </div>
        </div>

        {/* Boxes */}
        <div className="secao">
          <h2>Status dos Boxes — {boxesOcupados.length}/{boxes.length} ocupados</h2>
          <div className="boxes-grid">
            {boxes.map((box) => {
              const vol = box.estoques[0]?.quantidade ?? 0
              const pct = box.capacidade > 0 ? (vol / box.capacidade) * 100 : 0
              const produto = box.estoques[0]?.produto?.descricao
              const cor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : pct >= 40 ? "#22c55e" : "#3b82f6"
              const livre = vol === 0
              return (
                <div key={box.id} className={`box-card${livre ? " livre" : ""}`} style={{borderColor: livre ? undefined : cor}}>
                  <div className="codigo">{box.codigo}</div>
                  <div className="produto">{produto ?? "LIVRE"}</div>
                  {!livre && (
                    <div className="pct-badge" style={{background: cor+"33", color: cor}}>
                      {Math.round(pct)}%
                    </div>
                  )}
                  <div className="barra">
                    <div className="barra-fill" style={{width:`${Math.min(pct,100)}%`, background: cor}} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* TMP */}
        <div className="secao">
          <h2>Caminhões no Pátio ({tmpAtivos.length})</h2>
          {tmpAtivos.length === 0 ? (
            <p className="sem-dados">Nenhum caminhão no pátio no momento.</p>
          ) : (
            <div className="tmp-grid">
              {tmpAtivos.map((t) => {
                const mins = Math.floor((Date.now() - new Date(t.dtEntrada).getTime()) / 60000)
                const cor = mins >= 120 ? "#ef4444" : mins >= 60 ? "#f97316" : "#22c55e"
                return (
                  <div key={t.id} className="tmp-card" style={{borderColor: cor}}>
                    <div className="placa">{t.placa}</div>
                    <div className="cliente">{t.clienteNome} • {t.produto ?? "—"}</div>
                    <div className="tempo" data-entrada={t.dtEntrada.toISOString()} style={{color: cor}}>
                      {Math.floor(mins / 60) > 0 ? `${Math.floor(mins/60)}h` : ""}{mins%60}min
                    </div>
                    <div style={{fontSize:11,color:"#8b949e"}}>{t.localDescarga ?? "—"}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="footer">
          Atualiza automaticamente a cada 30 segundos • PCP ONLINE Fertalvo • {agora.toLocaleString("pt-BR")}
        </div>
      </body>
    </html>
  )
}
