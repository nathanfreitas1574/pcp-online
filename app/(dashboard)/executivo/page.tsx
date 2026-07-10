import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ExecutivoClient from "./ExecutivoClient"

export const dynamic = "force-dynamic"

export default async function ExecutivoPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`

  const [
    boxes, alertasCriticos, naviosProximos, previsoes,
    recebimentoMes, expedicaoMes, custoMes, topClientes,
    vistoriaHoje, lacresNaoConformes, coberturaAgg,
  ] = await Promise.all([
    // Ocupação geral
    prisma.box.findMany({
      where: { ativo: true },
      include: { estoques: { orderBy: { quantidade: "desc" }, include: { produto: true } } },
    }),
    // Alertas críticos abertos
    prisma.alerta.findMany({
      where: { status: "ABERTO", severidade: "CRITICO" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Navios nos próximos 14 dias
    prisma.naveAgendada.findMany({
      where: {
        eta: { gte: hoje, lte: new Date(hoje.getTime() + 14 * 86400000) },
        status: { in: ["AGUARDANDO", "ATRACADA"] },
      },
      orderBy: { eta: "asc" },
    }),
    // Previsões de recebimento ativas
    prisma.previsaoRecebimento.findMany({
      where: { status: { in: ["AGUARDANDO", "RECEBENDO"] } },
      orderBy: { dataPrevisao: "asc" },
      include: { box: { select: { codigo: true } } },
    }),
    // Volume recebido no mês
    prisma.descargaRegistro.aggregate({
      where: { dtPortaria: { gte: inicioMes }, pesoEntrada: { not: null } },
      _sum: { pesoEntrada: true },
      _count: { id: true },
    }),
    // Volume expedido no mês
    prisma.expedicaoRegistro.aggregate({
      where: { data: { gte: inicioMes } },
      _sum: { realizado: true },
    }),
    // Custo do mês
    prisma.custoOperacional.aggregate({
      where: { mes: mesStr },
      _sum: { valor: true },
    }),
    // Top 5 clientes por estoque atual
    prisma.estoque.groupBy({
      by: ["clienteNome"],
      where: { clienteNome: { not: null } },
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: "desc" } },
      take: 5,
    }),
    // Vistorias realizadas hoje
    prisma.vistoriaBox.count({
      where: { data: { gte: new Date(hoje.toDateString()) } },
    }),
    // Lacres não conformes abertos
    prisma.lacre.count({
      where: { status: "NAO_CONFORME", inativado: false },
    }),
    // Cobertura pendente (descarregado sem NF no contábil)
    prisma.coberturaPendente.aggregate({ where: { status: "PENDENTE" }, _sum: { volume: true }, _count: { id: true } }),
  ])

  // Calcular KPIs de boxes
  const totalBoxes     = boxes.length
  const totalCap       = boxes.reduce((s, b) => s + b.capacidade, 0)
  const volBox = (b: { estoques: { quantidade: number }[] }) => b.estoques.reduce((s, e) => s + e.quantidade, 0)
  const totalVol       = boxes.reduce((s, b) => s + volBox(b), 0)
  const boxesLivres    = boxes.filter(b => volBox(b) === 0).length
  const boxesCriticos  = boxes.filter(b => b.capacidade > 0 && volBox(b) / b.capacidade >= 0.9).length
  const boxesBloqueados = boxes.filter(b => (b as { statusLiberacao?: string }).statusLiberacao === "BLOQUEADO").length
  const pctOcupacao    = totalCap > 0 ? (totalVol / totalCap) * 100 : 0

  const recebidoTon = (recebimentoMes._sum.pesoEntrada ?? 0) / 1000
  const expedidoTon = expedicaoMes._sum.realizado ?? 0
  const custoTotal  = custoMes._sum.valor ?? 0
  const custoPorTon = recebidoTon > 0 ? custoTotal / recebidoTon : null

  return (
    <ExecutivoClient
      kpis={{
        totalBoxes, totalCap, totalVol, pctOcupacao,
        boxesLivres, boxesCriticos, boxesBloqueados,
        recebidoTon, expedidoTon,
        custoTotal, custoPorTon,
        alertasCriticosCount: alertasCriticos.length,
        vistoriaHoje, lacresNaoConformes,
        coberturaPendenteVol: Math.round(coberturaAgg._sum.volume ?? 0),
        coberturaPendenteCount: coberturaAgg._count.id,
        mes: mesStr,
      }}
      alertasCriticos={alertasCriticos.map(a => ({
        id: a.id, titulo: a.titulo, descricao: a.descricao,
        tipo: a.tipo, createdAt: a.createdAt.toISOString(),
      }))}
      naviosProximos={naviosProximos.map(n => ({
        id: n.id, nome: n.nome, eta: n.eta.toISOString(),
        produto: n.produto, clienteNome: n.clienteNome,
        volumePrev: n.volumePrev, status: n.status,
      }))}
      previsoes={previsoes.map(p => ({
        id: p.id, produto: p.produto, cliente: p.cliente,
        boxCodigo: p.box?.codigo ?? "a definir", dataPrevisao: p.dataPrevisao.toISOString(),
        status: p.status, naveNome: p.naveNome, volumePrev: p.volumePrev,
      }))}
      topClientes={topClientes.map(c => ({
        nome: c.clienteNome ?? "—",
        volume: c._sum.quantidade ?? 0,
      }))}
    />
  )
}
