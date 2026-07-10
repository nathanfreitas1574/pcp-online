import { prisma } from "@/lib/prisma"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { ehCheckout, ehCarga, ymd, diasDaSemana, dedupePorRomaneio } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

// GET /api/integracao/producao — integração com o SGO System Online.
// Retorna a produção diária (programado × produzido por dia/cliente/produto/linha)
// no formato que o fetchPcpProduction() do SGO espera (array de registros).
// Auth: máquina-a-máquina via header "Authorization: Bearer <INTEGRACAO_SGO_KEY>".
export async function GET(req: NextRequest) {
  const key = process.env.INTEGRACAO_SGO_KEY
  if (!key) return NextResponse.json({ error: "Integração não configurada (defina INTEGRACAO_SGO_KEY)" }, { status: 503 })
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader !== `Bearer ${key}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias")) || 60, 1), 366)
  const hoje = new Date()
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 23, 59, 59))
  const ini = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - (dias - 1)))
  const anos = [...new Set([ini.getUTCFullYear(), fim.getUTCFullYear()])]

  const [progs, marcRaw, contratosExp] = await Promise.all([
    prisma.programacaoSemanal.findMany({
      where: { tipo: "EXPEDICAO", ano: { in: anos } },
      select: { ano: true, semana: true, clienteNome: true, produto: true, numeroContrato: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, produto: true, operacao: true, status: true, pesoLiquido: true, dataCarregamento: true, romaneio: true, ordem: true },
    }),
    prisma.contratoExpedicao.findMany({ select: { numero: true, linhaProducao: true, produtoAbreviado: true, produtoSistema: true, cliente: { select: { nome: true } } } }),
  ])

  // linha de produção por nº de contrato (definida no Controle de Expedição)
  const normNum = (s: string | null | undefined) => String(s ?? "").trim().replace(/^0+/, "") || "0"
  const linhaPorContrato = new Map<string, string>()
  for (const c of contratosExp) if (c.linhaProducao && !linhaPorContrato.has(normNum(c.numero))) linhaPorContrato.set(normNum(c.numero), c.linhaProducao)

  type Item = { id: string; date: string; line: string | null; cliente: string; product: string; programmed: number; produced: number }
  const itens = new Map<string, Item>()

  // 1) programado: Programação Semanal (EXPEDIÇÃO), dia a dia (seg..sab) dentro do range
  const DIAS_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const
  for (const p of progs) {
    const ds = diasDaSemana(p.ano, p.semana)
    for (let i = 1; i <= 6; i++) {
      const d = ds[i]
      if (d < ini || d > fim) continue
      const val = p[DIAS_KEYS[i - 1]] ?? 0
      if (val <= 0) continue
      const dia = ymd(d)
      const k = `${dia}|${p.clienteNome}|${p.produto}`
      const it = itens.get(k) ?? { id: k, date: dia, line: p.numeroContrato ? linhaPorContrato.get(normNum(p.numeroContrato)) ?? null : null, cliente: p.clienteNome, product: p.produto, programmed: 0, produced: 0 }
      it.programmed += val
      itens.set(k, it)
    }
  }

  // 2) produzido: Marcação CHECKOUT · CARGA (dedupe por romaneio), casada por dia + cliente + produto
  const cargas = dedupePorRomaneio(marcRaw.filter((m) => m.dataCarregamento && ehCheckout(m.status) && ehCarga(m.operacao) === true))
  for (const m of cargas) {
    const dia = ymd(new Date(m.dataCarregamento!))
    const cli = m.clienteDestino || m.cliente || "—"
    const peso = m.pesoLiquido || 0
    // tenta casar com um item programado do mesmo dia
    let alvo: Item | undefined
    for (const it of itens.values()) {
      if (it.date !== dia) continue
      if (clienteMatch(cli, it.cliente) && produtoMatch(m.produto, it.product)) { alvo = it; break }
    }
    if (!alvo) {
      // produzido sem programação → cria registro próprio (linha via contrato casado por cliente+produto)
      const k = `${dia}|${cli}|${m.produto ?? "—"}`
      alvo = itens.get(k)
      if (!alvo) {
        const ct = contratosExp.find((c) => clienteMatch(cli, c.cliente.nome) && produtoMatch(m.produto, c.produtoAbreviado || c.produtoSistema))
        alvo = { id: k, date: dia, line: ct?.linhaProducao ?? null, cliente: cli, product: m.produto ?? "—", programmed: 0, produced: 0 }
        itens.set(k, alvo)
      }
    }
    alvo.produced += peso
  }

  const items = [...itens.values()]
    .map((it) => ({ ...it, programmed: Math.round(it.programmed * 100) / 100, produced: Math.round(it.produced * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.cliente.localeCompare(b.cliente))

  return NextResponse.json({ items, dias, de: ymd(ini), ate: ymd(fim), total: items.length })
}
