import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { dataInputUTC } from "@/lib/cobertura"
import { ehCheckout, ehCarga, ymd, semanaDeData, getSemanaAtual } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

// GET — registros do mês + realizado (marcação CHECKOUT/DESCARGA) + dados do painel
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const atual = getSemanaAtual()
  const hoje = new Date()
  const ano = Number(searchParams.get("ano")) || atual.ano
  const mesesParam = searchParams.get("meses")
  let meses = (mesesParam ? mesesParam.split(",").map(Number) : [Number(searchParams.get("mes")) || (hoje.getUTCMonth() + 1)])
    .filter(m => Number.isInteger(m) && m >= 1 && m <= 12)
  if (!meses.length) meses = [hoje.getUTCMonth() + 1]
  meses = [...new Set(meses)]
  const mesesSet = new Set(meses)
  const unidade = searchParams.get("unidade") || undefined
  const tipoProduto = searchParams.get("tipoProduto") || undefined
  const cliente = searchParams.get("cliente") || undefined

  // filtra pela DATA real do registro (só o(s) mês(es) selecionado(s)); sem data → cai pelo mês de referência
  const rangesMes = meses.map(m => ({ data: { gte: new Date(Date.UTC(ano, m - 1, 1)), lte: new Date(Date.UTC(ano, m, 1) - 1) } }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ano, OR: [...rangesMes, { data: null, mes: { in: meses } }] }
  if (unidade) where.unidade = unidade
  if (tipoProduto) where.tipoProduto = tipoProduto
  if (cliente) where.cliente = cliente

  const [registros, todos] = await Promise.all([
    prisma.recebimentoControle.findMany({ where, orderBy: [{ data: "asc" }, { cliente: "asc" }] }),
    prisma.recebimentoControle.findMany({ select: { ano: true, mes: true, unidade: true, tipoProduto: true, cliente: true } }),
  ])

  // marcações finalizadas (CHECKOUT) de DESCARGA nos meses selecionados
  const ini = new Date(Date.UTC(ano, Math.min(...meses) - 1, 1))
  const fim = new Date(Date.UTC(ano, Math.max(...meses), 1) - 1)
  const marcRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
    select: { clienteDestino: true, cliente: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true },
  })
  const descargas = marcRaw.filter(m => ehCheckout(m.status) && ehCarga(m.operacao) === false && m.dataCarregamento
    && mesesSet.has(new Date(m.dataCarregamento).getUTCMonth() + 1))

  // calcula realizado por registro + realizado por dia (painel)
  const realizadoDiaMap = new Map<string, number>()
  const itens = registros.map(r => {
    const rm = r.data ? new Date(r.data).getUTCMonth() + 1 : r.mes // mês do registro (data real ou referência)
    let realizado = 0
    for (const m of descargas) {
      if (new Date(m.dataCarregamento!).getUTCMonth() + 1 !== rm) continue // realizado só do mês do registro
      if (!clienteMatch(m.clienteDestino || m.cliente, r.cliente)) continue
      if (!produtoMatch(m.produto, r.produtoAbreviado)) continue
      const peso = m.pesoLiquido || 0
      realizado += peso
      const d = ymd(new Date(m.dataCarregamento!))
      realizadoDiaMap.set(d, (realizadoDiaMap.get(d) ?? 0) + peso)
    }
    const confirmado = (r.volumeProgramado || 0) + (r.adicionado || 0) - (r.cancelado || 0)
    const saldo = confirmado - realizado
    return {
      ...r,
      data: r.data ? r.data.toISOString() : null,
      confirmado, realizado, saldo,
    }
  })

  // agregações do painel
  const soma = (arr: typeof itens) => arr.reduce((a, x) => ({ confirmado: a.confirmado + x.confirmado, realizado: a.realizado + x.realizado, saldo: a.saldo + x.saldo }), { confirmado: 0, realizado: 0, saldo: 0 })
  const agrupar = (campo: "cliente" | "produtoAbreviado" | "tipoProduto") => {
    const m = new Map<string, { nome: string; confirmado: number; realizado: number; saldo: number }>()
    for (const x of itens) {
      const k = (x[campo] as string) || "(vazio)"
      if (!m.has(k)) m.set(k, { nome: k, confirmado: 0, realizado: 0, saldo: 0 })
      const g = m.get(k)!; g.confirmado += x.confirmado; g.realizado += x.realizado; g.saldo += x.saldo
    }
    return [...m.values()].sort((a, b) => b.confirmado - a.confirmado)
  }
  const realizadoDia = [...realizadoDiaMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([dia, valor]) => ({ dia, valor }))

  const opcoes = {
    anos: [...new Set(todos.map(t => t.ano))].sort((a, b) => b - a),
    unidades: [...new Set(todos.map(t => t.unidade).filter(Boolean) as string[])].sort(),
    tiposProduto: [...new Set(todos.map(t => t.tipoProduto).filter(Boolean) as string[])].sort(),
    clientes: [...new Set(todos.map(t => t.cliente).filter(Boolean))].sort(),
  }

  return NextResponse.json({
    ano, meses,
    itens,
    painel: { cotas: soma(itens), porCliente: agrupar("cliente"), porProduto: agrupar("produtoAbreviado"), porTipo: agrupar("tipoProduto"), realizadoDia },
    opcoes,
  })
}

// POST — cria um registro (manual). Calcula ano/mes/semana a partir da data.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  const data = dataInputUTC(b.data)
  const base = data ?? new Date()
  const { ano, semana } = semanaDeData(base)
  const mes = base.getUTCMonth() + 1

  const c = await prisma.recebimentoControle.create({
    data: {
      data,
      ano: Number(b.ano) || ano,
      mes: Number(b.mes) || mes,
      semana: Number(b.semana) || semana,
      unidade: b.unidade?.trim() || "ROO",
      status: b.status?.trim() || "PREVISTO",
      numeroContrato: b.numeroContrato?.trim() || null,
      cliente: String(b.cliente ?? "").trim(),
      produtoAbreviado: String(b.produtoAbreviado ?? "").trim(),
      tipoProduto: b.tipoProduto?.trim() || null,
      navio: b.navio?.trim() || null,
      origem: b.origem?.trim() || null,
      volumeProgramado: Number(b.volumeProgramado) || 0,
      cancelado: Number(b.cancelado) || 0,
      adicionado: Number(b.adicionado) || 0,
      obs: b.obs?.trim() || null,
      criadoPorNome: session.user.name ?? null,
    },
  })
  return NextResponse.json(c, { status: 201 })
}
