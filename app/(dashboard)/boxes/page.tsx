import { prisma } from "@/lib/prisma"
import BoxesVisualClient from "./BoxesVisualClient"

export const dynamic = "force-dynamic"

export default async function BoxesPage() {
  const [boxes, alertasAbertos, previsoes, navios, contabilAgg] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: {
        estoques: {
          include: { produto: true },
          orderBy: { quantidade: "desc" },
          take: 1,
        },
        lacres: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        armazem: { select: { id: true, codigo: true, nome: true } },
      },
      orderBy: { codigo: "asc" },
    }),
    prisma.alerta.groupBy({
      by: ["boxId"],
      where: { status: "ABERTO", boxId: { not: null } },
      _count: { id: true },
    }),
    // previsões ativas (AGUARDANDO ou RECEBENDO)
    prisma.previsaoRecebimento.findMany({
      where: { status: { in: ["AGUARDANDO", "RECEBENDO"] } },
      orderBy: { dataPrevisao: "asc" },
      select: {
        id: true, boxId: true, naveNome: true, produto: true,
        cliente: true, volumePrev: true, dataPrevisao: true, status: true,
        nave: { select: { nome: true, eta: true } },
      },
    }),
    // navios disponíveis para vincular ao agendar
    prisma.naveAgendada.findMany({
      where: { status: { in: ["AGUARDANDO", "ATRACADA", "DESCARREGANDO"] } },
      orderBy: { eta: "asc" },
      select: { id: true, nome: true, eta: true, produto: true, clienteNome: true },
    }),
    // estoque contábil granel (armazém 10) — saldo atual, p/ comparar com o físico
    prisma.estoqueContabil.aggregate({ where: { armazem: "10" }, _sum: { saldo: true } }),
  ])

  // Mapa boxId → contagem de alertas abertos
  const alertasPorBox = new Map(
    alertasAbertos.map((a) => [a.boxId as string, a._count.id])
  )

  // Mapa boxId → próxima previsão ativa
  const previsaoPorBox = new Map<string, typeof previsoes[0]>()
  for (const p of previsoes) {
    if (!previsaoPorBox.has(p.boxId)) previsaoPorBox.set(p.boxId, p)
  }

  const boxesData = boxes.map((b) => {
    const prev = previsaoPorBox.get(b.id)
    return {
      id: b.id,
      codigo: b.codigo,
      descricao: b.descricao,
      localizacao: b.localizacao,
      capacidade: b.capacidade,
      volumeAtual: b.estoques[0]?.quantidade ?? 0,
      produto: b.estoques[0]?.produto?.descricao ?? null,
      cliente: b.estoques[0]?.clienteNome ?? null,
      navio: b.estoques[0]?.navio ?? null,
      dataRecebimento: b.estoques[0]?.dataRecebimento ?? null,
      ultimoLacre: b.lacres[0]?.status ?? null,
      codigoLacre: b.lacres[0]?.codigoLacre ?? null,
      movimentadoHoje: b.estoques[0]
        ? new Date(b.estoques[0].updatedAt).toDateString() === new Date().toDateString()
        : false,
      alertasAbertos: alertasPorBox.get(b.id) ?? 0,
      armazemId: b.armazem?.id ?? null,
      armazemCodigo: b.armazem?.codigo ?? null,
      armazemNome: b.armazem?.nome ?? null,
      statusLiberacao: b.statusLiberacao ?? "LIBERADO",
      statusUso: b.statusUso ?? "LIVRE",
      obsBox: b.obsBox ?? null,
      // previsão de recebimento
      previsao: prev
        ? {
            id: prev.id,
            naveNome: prev.naveNome ?? prev.nave?.nome ?? null,
            produto: prev.produto,
            cliente: prev.cliente,
            volumePrev: prev.volumePrev,
            dataPrevisao: prev.dataPrevisao.toISOString(),
            status: prev.status as string,
          }
        : null,
    }
  })

  const totalCapacidade = boxesData.reduce((s, b) => s + b.capacidade, 0)
  const totalVolume = boxesData.reduce((s, b) => s + b.volumeAtual, 0)
  const boxesCheios = boxesData.filter(
    (b) => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9
  ).length
  const boxesLivres = boxesData.filter((b) => b.volumeAtual === 0).length

  return (
    <BoxesVisualClient
      boxes={boxesData}
      totalCapacidade={totalCapacidade}
      totalVolume={totalVolume}
      boxesCheios={boxesCheios}
      boxesLivres={boxesLivres}
      todasPrevisoes={previsoes.map(p => ({
        id: p.id,
        boxId: p.boxId,
        naveNome: p.naveNome ?? p.nave?.nome ?? null,
        produto: p.produto,
        cliente: p.cliente,
        volumePrev: p.volumePrev,
        dataPrevisao: p.dataPrevisao.toISOString(),
        status: p.status as string,
      }))}
      naviosDisponiveis={navios.map(n => ({
        id: n.id,
        nome: n.nome,
        eta: n.eta.toISOString(),
        produto: n.produto,
        clienteNome: n.clienteNome,
      }))}
      contabilGranel={contabilAgg._sum.saldo != null ? Math.round(contabilAgg._sum.saldo) : null}
    />
  )
}
