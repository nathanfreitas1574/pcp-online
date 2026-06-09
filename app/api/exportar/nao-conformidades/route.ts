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

  const [alertas, lacresNaoConformes, qualidadeReprovada, inventarioDivergencias] = await Promise.all([
    prisma.alerta.findMany({
      where: { createdAt: { gte: inicio, lt: fim }, tipo: "NAO_CONFORMIDADE" },
      include: { box: { select: { codigo: true } }, usuario: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lacre.findMany({
      where: { createdAt: { gte: inicio, lt: fim }, status: "NAO_CONFORME" },
      include: { box: { select: { codigo: true } }, usuario: { select: { name: true } } },
    }),
    prisma.qualidadeRegistro.findMany({
      where: { createdAt: { gte: inicio, lt: fim }, resultado: "REPROVADO" },
    }),
    prisma.inventarioItem.findMany({
      where: { createdAt: { gte: inicio, lt: fim }, diferenca: { not: 0 }, ajustado: false },
      include: { produto: { select: { descricao: true } }, usuario: { select: { name: true } } },
    }),
  ])

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório NC — ${meses[mes-1]}/${ano}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; color: #1f2937; font-size: 12px; }
  .header { background: #1B6B2E; color: white; padding: 24px 32px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi .n { font-size: 32px; font-weight: bold; color: #C05A1A; }
  .kpi .l { font-size: 11px; color: #6b7280; margin-top: 4px; }
  h2 { font-size: 14px; color: #1B6B2E; border-bottom: 2px solid #1B6B2E; padding-bottom: 6px; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1B6B2E; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
  .red { background: #fee2e2; color: #991b1b; }
  .yellow { background: #fef9c3; color: #713f12; }
  .footer { text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 12px; }
  .sem-dados { color: #9ca3af; font-style: italic; text-align: center; padding: 16px; }
</style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Não Conformidades</h1>
    <p>Fertalvo — PCP ONLINE &nbsp;|&nbsp; ${meses[mes-1]}/${ano} &nbsp;|&nbsp; Gerado em ${new Date().toLocaleString("pt-BR")}</p>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="n">${alertas.length}</div><div class="l">Alertas NC</div></div>
    <div class="kpi"><div class="n">${lacresNaoConformes.length}</div><div class="l">Lacres NC</div></div>
    <div class="kpi"><div class="n">${qualidadeReprovada.length}</div><div class="l">Análises Reprovadas</div></div>
    <div class="kpi"><div class="n">${inventarioDivergencias.length}</div><div class="l">Divergências Inventário</div></div>
  </div>

  <h2>Alertas de Não Conformidade (${alertas.length})</h2>
  ${alertas.length === 0 ? '<p class="sem-dados">Nenhum alerta no período.</p>' : `
  <table>
    <tr><th>Data</th><th>Título</th><th>Box</th><th>Responsável</th><th>Status</th></tr>
    ${alertas.map(a=>`<tr>
      <td>${new Date(a.createdAt).toLocaleDateString("pt-BR")}</td>
      <td>${a.titulo}</td>
      <td>${a.box?.codigo ?? "—"}</td>
      <td>${a.usuario?.name ?? "Sistema"}</td>
      <td><span class="badge ${a.status==="RESOLVIDO"?"yellow":"red"}">${a.status}</span></td>
    </tr>`).join("")}
  </table>`}

  <h2>Lacres Não Conformes (${lacresNaoConformes.length})</h2>
  ${lacresNaoConformes.length === 0 ? '<p class="sem-dados">Nenhum lacre não conforme no período.</p>' : `
  <table>
    <tr><th>Data</th><th>Box</th><th>Código Lacre</th><th>Observação</th><th>Responsável</th></tr>
    ${lacresNaoConformes.map(l=>`<tr>
      <td>${new Date(l.createdAt).toLocaleDateString("pt-BR")}</td>
      <td>${l.box?.codigo ?? "—"}</td>
      <td>${l.codigoLacre ?? "—"}</td>
      <td>${l.observacao ?? "—"}</td>
      <td>${l.usuario?.name ?? l.nomeLacrador ?? "—"}</td>
    </tr>`).join("")}
  </table>`}

  <h2>Análises de Qualidade Reprovadas (${qualidadeReprovada.length})</h2>
  ${qualidadeReprovada.length === 0 ? '<p class="sem-dados">Nenhuma análise reprovada no período.</p>' : `
  <table>
    <tr><th>Data</th><th>Produto</th><th>Box</th><th>Lote</th><th>Responsável</th></tr>
    ${qualidadeReprovada.map(q=>`<tr>
      <td>${new Date(q.createdAt).toLocaleDateString("pt-BR")}</td>
      <td>${q.produtoDesc}</td>
      <td>${q.boxCodigo ?? "—"}</td>
      <td>${q.lote ?? "—"}</td>
      <td>${q.responsavel ?? "—"}</td>
    </tr>`).join("")}
  </table>`}

  <h2>Divergências de Inventário Não Ajustadas (${inventarioDivergencias.length})</h2>
  ${inventarioDivergencias.length === 0 ? '<p class="sem-dados">Nenhuma divergência pendente no período.</p>' : `
  <table>
    <tr><th>Data</th><th>Produto</th><th>Qtd Sistema</th><th>Qtd Contada</th><th>Diferença</th><th>Operador</th></tr>
    ${inventarioDivergencias.map(i=>`<tr>
      <td>${new Date(i.createdAt).toLocaleDateString("pt-BR")}</td>
      <td>${i.produto.descricao}</td>
      <td>${i.qtdSistema}</td>
      <td>${i.qtdContada}</td>
      <td style="color:${i.diferenca<0?"#dc2626":"#16a34a"};font-weight:bold">${i.diferenca>0?"+":""}${i.diferenca}</td>
      <td>${i.usuario.name}</td>
    </tr>`).join("")}
  </table>`}

  <div class="footer">PCP ONLINE — Fertalvo | Relatório de Não Conformidades ${meses[mes-1]}/${ano} | Imprima com Ctrl+P → Salvar como PDF</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="relatorio_nc_${mes}_${ano}.html"`,
    },
  })
}
