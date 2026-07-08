import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { DIA, ymd, ddMM, getSemanaAtual, semanasDoAno, diasDaSemana, ehCheckout } from "@/lib/programacao"

export const dynamic = "force-dynamic"

export default async function ProgramacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; semana?: string }>
}) {
  const sp = await searchParams
  const atual = getSemanaAtual()
  const ano = Number(sp.ano) || atual.ano
  const maxSemana = semanasDoAno(ano)
  const semana = Math.min(Math.max(Number(sp.semana) || atual.semana, 1), maxSemana)

  const [programacoes, boxes, clientes, produtos, contratosExp] = await Promise.all([
    prisma.programacaoSemanal.findMany({
      where: { ano, semana },
      orderBy: [{ ordem: "asc" }, { clienteNome: "asc" }, { produto: "asc" }],
      include: { box: { select: { codigo: true } } },
    }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, codigo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" }, select: { id: true, descricao: true, codigo: true } }),
    // Linha de Produção vem do Controle de Expedição (definida lá, refletida aqui)
    prisma.contratoExpedicao.findMany({ orderBy: { numero: "asc" }, select: { numero: true, linhaProducao: true } }),
  ])
  // Ações internas — lista VIVA (não trava por semana); serializa datas p/ o cliente
  const demandasRaw = await prisma.demandaInterna.findMany({ orderBy: { createdAt: "desc" } })
  const demandas = demandasRaw.map(d => ({
    id: d.id,
    quantidade: d.quantidade,
    local: d.local,
    obs: d.obs,
    responsavel: d.responsavel,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    dataInicio: d.dataInicio ? d.dataInicio.toISOString() : null,
    dataFim: d.dataFim ? d.dataFim.toISOString() : null,
  }))

  // mapa nº contrato (sem zeros à esquerda) → linha de produção
  const normNum = (s: string | null | undefined) => String(s ?? "").trim().replace(/^0+/, "") || "0"
  const linhaPorContrato: Record<string, string> = {}
  for (const c of contratosExp) {
    if (c.linhaProducao && !(normNum(c.numero) in linhaPorContrato)) linhaPorContrato[normNum(c.numero)] = c.linhaProducao
  }

  // Datas da semana SELECIONADA (Dom → Sáb), em UTC
  const diasSemana = diasDaSemana(ano, semana)
  // payload neutro para o cliente (sem reinterpretação de fuso)
  const dias = diasSemana.map(d => ({ ymd: ymd(d), label: ddMM(d) }))

  // ── Realizado por dia: marcações FINALIZADAS (status CHECKOUT) ─────────────
  const semanaIni = diasSemana[0]
  const semanaFim = new Date(diasSemana[6].getTime() + DIA - 1)
  const marcacoesRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: semanaIni, lte: semanaFim } },
    select: { clienteDestino: true, cliente: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true },
  })
  const marcacoes = marcacoesRaw.filter(m => ehCheckout(m.status))

  const idxPorData = new Map<string, number>()
  diasSemana.forEach((d, i) => idxPorData.set(ymd(d), i))

  const realizadoPorDia: Record<string, number[]> = {}
  for (const prog of programacoes) {
    const arr = [0, 0, 0, 0, 0, 0, 0]
    const querCarga = prog.tipo === "EXPEDICAO"
    for (const m of marcacoes) {
      if (!m.dataCarregamento) continue
      const op = (m.operacao || "").toUpperCase()
      const ehDescarga = op.includes("DESCARGA")
      const ehCarga = op.includes("CARGA") && !ehDescarga
      if (querCarga ? !ehCarga : !ehDescarga) continue
      if (!clienteMatch(m.clienteDestino || m.cliente, prog.clienteNome)) continue
      if (!produtoMatch(m.produto, prog.produto)) continue
      const idx = idxPorData.get(ymd(new Date(m.dataCarregamento)))
      if (idx === undefined) continue
      arr[idx] += m.pesoLiquido || 0
    }
    realizadoPorDia[prog.id] = arr
  }

  return (
    <ProgramacaoClient
      key={`${ano}-${semana}`}
      programacoes={programacoes}
      boxes={boxes}
      clientes={clientes}
      produtos={produtos}
      semana={semana}
      ano={ano}
      maxSemana={maxSemana}
      dias={dias}
      realizadoPorDia={realizadoPorDia}
      linhaPorContrato={linhaPorContrato}
      demandasIniciais={demandas}
    />
  )
}
