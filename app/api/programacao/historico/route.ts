import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { diasDaSemana, ymd, ehCheckout, ehCarga, getSemanaAtual, DIA } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

const DIAS_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const

// GET — histórico/cobrança da Programação: prog × real por mês e por cliente/produto.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = Number(searchParams.get("ano")) || getSemanaAtual().ano
  const mes = Number(searchParams.get("mes")) || 0           // 1-12 (0 = ano todo)
  const tipo = searchParams.get("tipo") || ""                 // RECEBIMENTO | EXPEDICAO | ""
  const fCliente = (searchParams.get("cliente") || "").trim()
  const fProduto = (searchParams.get("produto") || "").trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ano }
  if (tipo) where.tipo = tipo
  if (fCliente) where.clienteNome = { contains: fCliente, mode: "insensitive" }
  if (fProduto) where.produto = { contains: fProduto, mode: "insensitive" }

  const programacoes = await prisma.programacaoSemanal.findMany({ where })

  // Marcações CHECKOUT do ano (com folga de 1 semana p/ semanas que cruzam o ano)
  const ini = new Date(Date.UTC(ano, 0, 1) - 7 * DIA)
  const fim = new Date(Date.UTC(ano, 11, 31) + 8 * DIA)
  const marcacoesRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
    select: { clienteDestino: true, cliente: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true },
  })

  // Bucket por dia + operação(carga?) → lista (cliente/produto casam de forma flexível no laço)
  const bucket = new Map<string, { cliente: string | null; produto: string | null; peso: number }[]>()
  for (const m of marcacoesRaw) {
    if (!m.dataCarregamento || !ehCheckout(m.status)) continue
    const carga = ehCarga(m.operacao)
    if (carga === null) continue
    const key = `${ymd(new Date(m.dataCarregamento))}|${carga ? 1 : 0}`
    if (!bucket.has(key)) bucket.set(key, [])
    bucket.get(key)!.push({ cliente: m.clienteDestino || m.cliente, produto: m.produto, peso: m.pesoLiquido || 0 })
  }

  const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, prog: 0, real: 0 }))
  const cobMap = new Map<string, { cliente: string; produto: string; tipo: string; prog: number; real: number }>()
  const clientesSet = new Set<string>(), produtosSet = new Set<string>()
  let totProg = 0, totReal = 0

  for (const p of programacoes) {
    clientesSet.add(p.clienteNome); produtosSet.add(p.produto)
    const dias = diasDaSemana(ano, p.semana)
    const querCarga = p.tipo === "EXPEDICAO"
    for (let i = 0; i < 7; i++) {
      const progDia = (p[DIAS_KEYS[i]] as number) ?? 0
      const dia = dias[i]
      // dias de borda (semana 1/última) que caem em outro ano-calendário não contam aqui
      if (dia.getUTCFullYear() !== ano) continue
      const mesDia = dia.getUTCMonth() + 1
      const lista = bucket.get(`${ymd(dia)}|${querCarga ? 1 : 0}`) ?? []
      let realDia = 0
      for (const m of lista) if (clienteMatch(m.cliente, p.clienteNome) && produtoMatch(m.produto, p.produto)) realDia += m.peso
      // porMes acumula o ano inteiro (gráfico)
      porMes[mesDia - 1].prog += progDia
      porMes[mesDia - 1].real += realDia
      // cobrança/KPIs respeitam o filtro de mês
      if (!mes || mesDia === mes) {
        const k = `${p.clienteNome}|||${p.produto}|||${p.tipo}`
        if (!cobMap.has(k)) cobMap.set(k, { cliente: p.clienteNome, produto: p.produto, tipo: p.tipo, prog: 0, real: 0 })
        const c = cobMap.get(k)!
        c.prog += progDia; c.real += realDia
        totProg += progDia; totReal += realDia
      }
    }
  }

  const cobranca = [...cobMap.values()]
    .map(c => ({ ...c, naoRealizado: Math.max(c.prog - c.real, 0), pct: c.prog > 0 ? Math.round((c.real / c.prog) * 100) : 0 }))
    .filter(c => c.prog > 0 || c.real > 0)
    .sort((a, b) => b.naoRealizado - a.naoRealizado)

  return NextResponse.json({
    ano,
    porMes,
    cobranca,
    clientes: [...clientesSet].sort(),
    produtos: [...produtosSet].sort(),
    totais: { prog: totProg, real: totReal, naoRealizado: Math.max(totProg - totReal, 0) },
  })
}
