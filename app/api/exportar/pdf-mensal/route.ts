import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))
  const mes = parseInt(searchParams.get("mes") ?? String(new Date().getMonth() + 1))

  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 1)

  const [alertas, inventarios, movs, lacres, tmpRegs] = await Promise.all([
    prisma.alerta.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
    prisma.inventario.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
    prisma.movimentacao.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
    prisma.lacre.groupBy({ by: ["status"], where: { createdAt: { gte: inicio, lt: fim } }, _count: { id: true } }),
    prisma.tmpRegistro.aggregate({ where: { createdAt: { gte: inicio, lt: fim }, status: "CONCLUIDO" }, _avg: { tmpMinutos: true }, _count: { id: true } }),
    prisma.alerta.groupBy({ by: ["tipo"], where: { createdAt: { gte: inicio, lt: fim } }, _count: { id: true } }),
  ])

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Relatório KPIs — ${meses[mes-1]}/${ano}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1f2937; }
  h1 { color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; }
  h2 { color: #374151; margin-top: 30px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin: 20px 0; }
  .kpi { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi-valor { font-size: 2rem; font-weight: bold; color: #1e40af; }
  .kpi-label { font-size: 0.8rem; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #1e3a8a; color: white; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 40px; font-size: 0.75rem; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <h1>📊 Relatório KPIs — ${meses[mes-1]}/${ano}</h1>
  <p>Gerado em: ${new Date().toLocaleString("pt-BR")} | Sistema: PCP ONLINE — Fertalvo</p>

  <h2>Indicadores do Período</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-valor">${alertas}</div><div class="kpi-label">Alertas Gerados</div></div>
    <div class="kpi"><div class="kpi-valor">${inventarios}</div><div class="kpi-label">Inventários Realizados</div></div>
    <div class="kpi"><div class="kpi-valor">${movs}</div><div class="kpi-label">Movimentações</div></div>
    <div class="kpi"><div class="kpi-valor">${tmpRegs._count.id}</div><div class="kpi-label">Caminhões Atendidos</div></div>
    <div class="kpi"><div class="kpi-valor">${Math.round(tmpRegs._avg.tmpMinutos ?? 0)}min</div><div class="kpi-label">TMP Médio</div></div>
    <div class="kpi"><div class="kpi-valor">${lacres.filter(l=>l.status==="NAO_CONFORME").reduce((s,l)=>s+l._count.id,0)}</div><div class="kpi-label">Lacres Não Conformes</div></div>
  </div>

  <h2>Lacres por Status</h2>
  <table>
    <tr><th>Status</th><th>Quantidade</th></tr>
    ${lacres.map(l=>`<tr><td>${l.status}</td><td>${l._count.id}</td></tr>`).join("")}
  </table>

  <p class="footer">PCP ONLINE — Fertalvo | Relatório gerado automaticamente</p>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="relatorio_kpis_${mes}_${ano}.html"`,
    },
  })
}
