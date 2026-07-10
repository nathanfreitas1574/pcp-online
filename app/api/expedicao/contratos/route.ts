import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, produtoMatch, normCliente } from "@/lib/texto"
import { ehCheckout, ehCarga, diasDaSemana, semanasDoAno, DIA, dedupePorRomaneio } from "@/lib/programacao"

const DIAS_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const // seg..sab (dom fora)
const normNum = (s: string | null | undefined) => String(s ?? "").trim().replace(/^0+/, "") || "0"

// GET — contratos de expedição com Vol.Prog (da Programação Semanal), Realizado (da Marcação),
// Saldo e % no período (ano / mês / semana)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const now = new Date()
  const ano = Number(sp.get("ano")) || now.getUTCFullYear()
  const mes = Number(sp.get("mes")) || 0 // 0 = todos
  const semana = Number(sp.get("semana")) || 0 // 0 = todas

  // intervalo de datas do período
  let ini: Date, fim: Date
  if (semana > 0) {
    const d = diasDaSemana(ano, semana)
    ini = d[0]; fim = new Date(d[6].getTime() + DIA - 1)
  } else if (mes > 0) {
    ini = new Date(Date.UTC(ano, mes - 1, 1)); fim = new Date(Date.UTC(ano, mes, 1) - 1)
  } else {
    ini = new Date(Date.UTC(ano, 0, 1)); fim = new Date(Date.UTC(ano + 1, 0, 1) - 1)
  }

  const [contratos, progs, marcRaw, totvs] = await Promise.all([
    prisma.contratoExpedicao.findMany({ orderBy: { createdAt: "desc" }, include: { cliente: { select: { nome: true } } } }),
    prisma.programacaoSemanal.findMany({
      where: { ano, tipo: "EXPEDICAO" },
      select: { numeroContrato: true, semana: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, produto: true, operacao: true, status: true, pesoLiquido: true, romaneio: true, ordem: true, pedidoCliente: true },
    }),
    // tipo de contrato (definido na importação dos Contratos TOTVS)
    prisma.contratoArmazenagem.findMany({ where: { tipoContrato: { not: null } }, select: { numero: true, clienteNome: true, tipoContrato: true } }),
  ])
  // casa por número + cliente (desambigua o mesmo nº em filiais/tipos diferentes); fallback só nº
  const tipoPorChave = new Map<string, string>()
  const tipoPorNum = new Map<string, string>()
  for (const t of totvs) {
    if (!t.tipoContrato) continue
    const kNum = normNum(t.numero)
    const kFull = `${kNum}|${normCliente(t.clienteNome)}`
    if (!tipoPorChave.has(kFull)) tipoPorChave.set(kFull, t.tipoContrato)
    if (!tipoPorNum.has(kNum)) tipoPorNum.set(kNum, t.tipoContrato)
  }
  const tipoDoContrato = (numero: string, cliente: string) =>
    tipoPorChave.get(`${normNum(numero)}|${normCliente(cliente)}`) ?? tipoPorNum.get(normNum(numero)) ?? null

  // Vol. Programado por contrato = soma dos dias da Programação Semanal (EXPEDIÇÃO) que caem no período
  const progPorNum = new Map<string, number>()
  for (const p of progs) {
    if (!p.numeroContrato) continue
    const dias = diasDaSemana(ano, p.semana)
    for (let i = 1; i <= 6; i++) {
      const d = dias[i]
      if (d >= ini && d <= fim) {
        const k = normNum(p.numeroContrato)
        progPorNum.set(k, (progPorNum.get(k) ?? 0) + (p[DIAS_KEYS[i - 1]] ?? 0))
      }
    }
  }

  // Realizado = Marcação CHECKOUT · CARGA no período (dedupe por romaneio/ordem)
  const cargas = dedupePorRomaneio(marcRaw.filter((m) => ehCheckout(m.status) && ehCarga(m.operacao) === true))
  // carga com Pedido Cliente conhecido na lista SÓ conta no contrato correspondente
  const numerosLista = new Set(contratos.map((c) => normNum(c.numero)).filter((n) => n !== "0"))

  const rows = contratos.map((c) => {
    const programado = progPorNum.get(normNum(c.numero)) ?? 0
    const numC = normNum(c.numero)
    let realizado = 0
    for (const m of cargas) {
      const ped = normNum(m.pedidoCliente)
      if (ped !== "0" && numerosLista.has(ped)) {
        // check por CONTRATO + produto
        if (ped !== numC) continue
        if (!produtoMatch(m.produto, c.produtoAbreviado || c.produtoSistema)) continue
      } else {
        // sem contrato na marcação → fallback fuzzy cliente + produto
        if (!clienteMatch(m.clienteDestino || m.cliente, c.cliente.nome)) continue
        if (!produtoMatch(m.produto, c.produtoAbreviado || c.produtoSistema)) continue
      }
      realizado += m.pesoLiquido || 0
    }
    realizado = Math.round(realizado * 10) / 10
    const saldo = Math.round((programado - realizado) * 10) / 10
    const pct = programado > 0 ? Math.round((realizado / programado) * 1000) / 10 : null
    return {
      id: c.id, numero: c.numero, cliente: { nome: c.cliente.nome }, produtoAbreviado: c.produtoAbreviado,
      tipoProduto: c.tipoProduto, operacao: c.operacao, linhaProducao: c.linhaProducao, mes: c.mes, semana: c.semana,
      // tipo manual (editável) tem prioridade sobre o derivado do TOTVS
      tipoContrato: c.tipoContratoManual ?? tipoDoContrato(c.numero, c.cliente.nome),
      dataInicio: c.dataInicio ? c.dataInicio.toISOString() : null,
      dataFim: c.dataFim ? c.dataFim.toISOString() : null,
      volProgramado: programado, realizado, saldo, pct, status: c.status,
    }
  })

  const totalProgramado = [...progPorNum.values()].reduce((s, v) => s + v, 0)
  const totalRealizado = Math.round(cargas.reduce((s, m) => s + (m.pesoLiquido || 0), 0) * 10) / 10
  return NextResponse.json({ ano, mes, semana, rows, totalProgramado, totalRealizado, semanas: semanasDoAno(ano) })
}
