import { prisma } from "@/lib/prisma"
import BoxesVisualClient from "./BoxesVisualClient"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { ehCheckout, ymd, DIA, dedupePorRomaneio } from "@/lib/programacao"

export const dynamic = "force-dynamic"

const DIAS_DESC = 10 // janela da referência de descargas (Marcação)

export default async function BoxesPage() {
  const [boxes, alertasAbertos, previsoes, navios, contabilAgg, coberturaAgg, produtosCad, clientesCad] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: {
        estoques: {
          include: { produto: true },
          orderBy: { quantidade: "desc" },
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
    // cobertura pendente (descarregado sem NF) — explica o gap físico − contábil
    prisma.coberturaPendente.aggregate({ where: { status: "PENDENTE" }, _sum: { volume: true }, _count: { id: true } }),
    // listas mestre p/ os datalists do "+" (adicionar item ao box)
    prisma.produto.findMany({ where: { ativo: true }, select: { descricao: true, abreviado: true }, orderBy: { descricao: "asc" } }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { nome: true, abreviado: true }, orderBy: { nome: "asc" } }),
  ])

  // Mapa boxId → contagem de alertas abertos
  const alertasPorBox = new Map(
    alertasAbertos.map((a) => [a.boxId as string, a._count.id])
  )

  // Mapa boxId → próxima previsão ativa (previsões sem box ficam só na lista geral)
  const previsaoPorBox = new Map<string, typeof previsoes[0]>()
  for (const p of previsoes) {
    if (p.boxId && !previsaoPorBox.has(p.boxId)) previsaoPorBox.set(p.boxId, p)
  }

  // ── Referência de descargas da Marcação (CHECKOUT) dos últimos N dias ──────
  // Casa por cliente+produto contra os itens do box (NÃO altera o volume — só referência).
  const hojeD = new Date()
  const corteDesc = new Date(Date.UTC(hojeD.getUTCFullYear(), hojeD.getUTCMonth(), hojeD.getUTCDate()) - (DIAS_DESC - 1) * DIA)
  const hojeYmd = ymd(hojeD)
  const descRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, operacao: { contains: "DESCARGA" }, dataCarregamento: { gte: corteDesc } },
    select: { cliente: true, clienteDestino: true, produto: true, pesoLiquido: true, dataCarregamento: true, status: true, romaneio: true, ordem: true },
  })
  const descargas = dedupePorRomaneio(descRaw.filter((m) => ehCheckout(m.status) && m.dataCarregamento))
    .map((m) => ({
      data: ymd(new Date(m.dataCarregamento!)),
      cliente: m.cliente ?? "",
      clienteDestino: m.clienteDestino ?? "",
      produto: m.produto ?? "",
      peso: m.pesoLiquido || 0,
    }))

  const boxesData = boxes.map((b) => {
    const prev = previsaoPorBox.get(b.id)
    // descargas (Marcação) que casam com algum item do box (cliente+produto)
    const itensBox = b.estoques.map((e) => ({ cliente: e.clienteNome ?? "", produto: e.produto?.descricao ?? "" })).filter((x) => x.produto)
    let descargaHoje = 0, descargaPeriodo = 0
    if (itensBox.length && descargas.length) {
      for (const d of descargas) {
        const casa = itensBox.some((it) =>
          (clienteMatch(d.cliente, it.cliente) || clienteMatch(d.clienteDestino, it.cliente)) &&
          produtoMatch(d.produto, it.produto))
        if (!casa) continue
        descargaPeriodo += d.peso
        if (d.data === hojeYmd) descargaHoje += d.peso
      }
    }
    // um box pode ter VÁRIOS produtos → volume = soma; "principal" = o maior (estoques[0])
    const volumeTotal = b.estoques.reduce((s, e) => s + e.quantidade, 0)
    const itens = b.estoques.map((e) => ({
      produtoId: e.produtoId,
      produto: e.produto?.descricao ?? "",
      cliente: e.clienteNome ?? "",
      quantidade: e.quantidade,
      navio: e.navio ?? "",
      dataRecebimento: e.dataRecebimento ? e.dataRecebimento.toISOString().slice(0, 10) : "",
    }))
    return {
      id: b.id,
      codigo: b.codigo,
      descricao: b.descricao,
      localizacao: b.localizacao,
      capacidade: b.capacidade,
      volumeAtual: volumeTotal,
      produto: b.estoques[0]?.produto?.descricao ?? null,
      cliente: b.estoques[0]?.clienteNome ?? null,
      navio: b.estoques[0]?.navio ?? null,
      dataRecebimento: b.estoques[0]?.dataRecebimento ?? null,
      itens,
      ultimoLacre: b.lacres[0]?.status ?? null,
      codigoLacre: b.lacres[0]?.codigoLacre ?? null,
      movimentadoHoje: b.estoques.some(
        (e) => new Date(e.updatedAt).toDateString() === new Date().toDateString()
      ),
      alertasAbertos: alertasPorBox.get(b.id) ?? 0,
      descargaHoje, descargaPeriodo, descargaDias: DIAS_DESC,
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
      coberturaPendente={{ volume: Math.round(coberturaAgg._sum.volume ?? 0), count: coberturaAgg._count.id }}
      produtosCad={[...new Set(produtosCad.flatMap(p => [p.descricao, p.abreviado].filter(Boolean) as string[]))]}
      clientesCad={[...new Set(clientesCad.flatMap(c => [c.nome, c.abreviado].filter(Boolean) as string[]))]}
    />
  )
}
