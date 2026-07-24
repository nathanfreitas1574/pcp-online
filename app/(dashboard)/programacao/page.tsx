import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { DIA, ymd, ddMM, getSemanaAtual, semanasDoAno, diasDaSemana, ehCheckout, dedupePorRomaneio, normNumContrato } from "@/lib/programacao"

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
    select: { clienteDestino: true, cliente: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true, romaneio: true, ordem: true, pedidoCliente: true, tipoServico: true },
  })
  const marcacoes = dedupePorRomaneio(marcacoesRaw.filter(m => ehCheckout(m.status)))

  const idxPorData = new Map<string, number>()
  diasSemana.forEach((d, i) => idxPorData.set(ymd(d), i))

  // Contratos presentes no quadro: carga com Pedido Cliente conhecido SÓ entra na linha
  // do MESMO contrato (evita o fuzzy cruzar produtos do mesmo cliente, ex.: UREIA 46% × TSP 46)
  const contratosQuadro = new Set(programacoes.map(p => normNumContrato(p.numeroContrato)).filter(n => n !== "0"))
  // quantas linhas cada contrato tem (por tipo): 1 linha → casa direto pelo contrato
  // (o apelido do produto pode divergir do nome da marcação); 2+ → produto desempata
  const linhasPorContrato = new Map<string, number>()
  for (const p of programacoes) {
    const n = normNumContrato(p.numeroContrato)
    if (n === "0") continue
    const k = `${p.tipo}|${n}`
    linhasPorContrato.set(k, (linhasPorContrato.get(k) ?? 0) + 1)
  }

  // Afinidade BIG BAG × GRANEL entre o tipoServico da carga e o texto do produto da linha —
  // desempata quando o MESMO contrato tem 2+ linhas na semana (uma granel, outra bag)
  const afinidade = (tipoServico: string | null, produtoLinha: string): number => {
    const ts = (tipoServico ?? "").toUpperCase()
    const pl = produtoLinha.toUpperCase()
    const linhaBag = /\bBB\b|BIG ?BAG|\bBAG\b/.test(pl)
    const linhaGranel = /\bGR\b|GRANEL/.test(pl)
    if (ts.includes("BIG BAG") || ts.includes("BAG")) return linhaBag ? 1 : linhaGranel ? -1 : 0
    if (ts.includes("GRANEL")) return linhaGranel ? 1 : linhaBag ? -1 : 0
    return 0
  }

  // Cada carga é atribuída a UMA linha só (não duplica o realizado com contrato repetido)
  const realizadoPorDia: Record<string, number[]> = {}
  for (const prog of programacoes) realizadoPorDia[prog.id] = [0, 0, 0, 0, 0, 0, 0]
  for (const m of marcacoes) {
    if (!m.dataCarregamento) continue
    const op = (m.operacao || "").toUpperCase()
    const ehDescarga = op.includes("DESCARGA")
    const ehCargaOp = op.includes("CARGA") && !ehDescarga
    if (!ehDescarga && !ehCargaOp) continue
    const idx = idxPorData.get(ymd(new Date(m.dataCarregamento)))
    if (idx === undefined) continue
    const ped = normNumContrato(m.pedidoCliente)

    const candidatas = programacoes.filter(prog => {
      if ((prog.tipo === "EXPEDICAO") !== ehCargaOp) return false
      if (ped !== "0" && contratosQuadro.has(ped)) {
        // check por CONTRATO (marcação traz o contrato no Pedido Cliente);
        // produto só desempata quando o contrato tem 2+ linhas
        if (ped !== normNumContrato(prog.numeroContrato)) return false
        const nLinhas = linhasPorContrato.get(`${prog.tipo}|${ped}`) ?? 1
        return nLinhas <= 1 || produtoMatch(m.produto, prog.produto)
      }
      // sem contrato na marcação → fallback fuzzy cliente + produto
      return clienteMatch(m.clienteDestino || m.cliente, prog.clienteNome) && produtoMatch(m.produto, prog.produto)
    })
    if (!candidatas.length) continue
    let melhor = candidatas[0]
    let best = afinidade(m.tipoServico, melhor.produto)
    for (const c of candidatas.slice(1)) {
      const a = afinidade(m.tipoServico, c.produto)
      if (a > best) { melhor = c; best = a }
    }
    realizadoPorDia[melhor.id][idx] += m.pesoLiquido || 0
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
