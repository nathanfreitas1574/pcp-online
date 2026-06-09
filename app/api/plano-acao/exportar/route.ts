import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const PRIORIDADE = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" }
const STATUS = { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" }

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planos = await prisma.planoAcao.findMany({
    include: { criadoPor: { select: { name: true } }, tarefas: true },
    orderBy: [{ prioridade: "asc" }, { quando: "asc" }],
  })

  const hoje = new Date()

  const rows = planos.map((p, i) => ({
    "#": i + 1,
    "O que": p.oQue,
    "Por quê": p.porQue,
    "Quem (Responsável)": p.quem,
    "Onde": p.onde,
    "Quando (Prazo)": format(new Date(p.quando), "dd/MM/yyyy", { locale: ptBR }),
    "Como": p.como,
    "Custo estimado (R$)": p.quantoCusta ?? "",
    "Prioridade": PRIORIDADE[p.prioridade],
    "Status": STATUS[p.status],
    "Progresso (%)": p.progresso,
    "Sub-tarefas": p.tarefas.length,
    "Sub-tarefas concluídas": p.tarefas.filter(t => t.concluida).length,
    "Situação prazo": p.status === "CONCLUIDO"
      ? "Concluído"
      : new Date(p.quando) < hoje
        ? `Vencido (${Math.floor((hoje.getTime() - new Date(p.quando).getTime()) / 86400000)}d atraso)`
        : `No prazo (${Math.floor((new Date(p.quando).getTime() - hoje.getTime()) / 86400000)}d restantes)`,
    "Criado por": p.criadoPor.name,
    "Criado em": format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR }),
    "Concluído em": p.dataConclusao ? format(new Date(p.dataConclusao), "dd/MM/yyyy", { locale: ptBR }) : "",
    "Observação": p.observacao ?? "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Larguras de coluna
  ws["!cols"] = [
    { wch: 4 }, { wch: 40 }, { wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
    { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, "Plano de Ação")

  // Aba resumo executivo
  const resumo = [
    ["Relatório — Plano de Ação 5W2H", ""],
    ["Gerado em:", format(hoje, "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ["", ""],
    ["Total de ações:", planos.length],
    ["Em andamento:", planos.filter(p => p.status === "EM_ANDAMENTO").length],
    ["Pendentes:", planos.filter(p => p.status === "PENDENTE").length],
    ["Concluídos:", planos.filter(p => p.status === "CONCLUIDO").length],
    ["Cancelados:", planos.filter(p => p.status === "CANCELADO").length],
    ["Vencidos:", planos.filter(p => p.status !== "CONCLUIDO" && p.status !== "CANCELADO" && new Date(p.quando) < hoje).length],
    ["Alta prioridade:", planos.filter(p => p.prioridade === "ALTA").length],
    ["Custo total (R$):", planos.reduce((s, p) => s + (p.quantoCusta ?? 0), 0)],
  ]
  const wsRes = XLSX.utils.aoa_to_sheet(resumo)
  wsRes["!cols"] = [{ wch: 24 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumo Executivo")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const nomeArq = `plano-acao-${format(hoje, "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArq}"`,
    },
  })
}
