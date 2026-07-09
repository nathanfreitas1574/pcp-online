import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { statusAuto } from "@/lib/quebra-import"
import { NextRequest, NextResponse } from "next/server"

const r1 = (n: number) => Math.round(n * 10) / 10
const r3 = (n: number) => Math.round(n * 1000) / 1000

// GET — lista + painel de indicadores (filtros: ano, mes, status, cliente, produto, filial)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const ano = Number(sp.get("ano")) || 0        // 0 = todos
  const mes = Number(sp.get("mes")) || 0        // 0 = todos
  const fStatus = sp.get("status") || ""
  const fCliente = sp.get("cliente") || ""
  const fProduto = sp.get("produto") || ""
  const fFilial = sp.get("filial") || ""

  const todas = await prisma.quebraTecnica.findMany({ orderBy: [{ data: "desc" }, { createdAt: "desc" }] })

  // status efetivo = override manual OU automático
  const comStatus = todas.map((q) => ({
    ...q,
    data: q.data ? q.data.toISOString() : null,
    status: q.statusManual ?? statusAuto(q),
  }))

  // opções de filtro (do conjunto todo)
  const opAnos = [...new Set(todas.map((q) => q.data?.getUTCFullYear()).filter(Boolean) as number[])].sort((a, b) => b - a)
  const opClientes = [...new Set(todas.map((q) => q.cliente).filter(Boolean) as string[])].sort()
  const opProdutos = [...new Set(todas.map((q) => q.produto).filter(Boolean) as string[])].sort()
  const opFiliais = [...new Set(todas.map((q) => q.filial).filter(Boolean) as string[])].sort()

  // aplica filtros
  const rows = comStatus.filter((q) => {
    if (ano && (!q.data || new Date(q.data).getUTCFullYear() !== ano)) return false
    if (mes && (!q.data || new Date(q.data).getUTCMonth() + 1 !== mes)) return false
    if (fStatus && q.status !== fStatus) return false
    if (fCliente && q.cliente !== fCliente) return false
    if (fProduto && q.produto !== fProduto) return false
    if (fFilial && q.filial !== fFilial) return false
    return true
  })

  // KPIs sobre o conjunto filtrado
  const soma = (f: (q: typeof rows[number]) => number) => r1(rows.reduce((s, q) => s + f(q), 0))
  const cont = (st: string) => rows.filter((q) => q.status === st).length
  const kpis = {
    total: rows.length,
    aberto: cont("ABERTO"),
    andamento: cont("EM_ANDAMENTO"),
    finalizado: cont("FINALIZADO"),
    volumeMovimentado: soma((q) => q.volumeRecebido),
    volumeContrato: soma((q) => q.volumeContrato),
    quebraTotal: soma((q) => q.quebraTecnica),
    quebraFinalizada: r1(rows.filter((q) => q.status === "FINALIZADO").reduce((s, q) => s + q.quebraTecnica, 0)),
    quebraAndamento: r1(rows.filter((q) => q.status === "EM_ANDAMENTO").reduce((s, q) => s + q.quebraTecnica, 0)),
    quebraDisponivel: soma((q) => q.quebraDisponivel),
    quebraFutura: soma((q) => q.quebraFutura),
    saldoAReceber: soma((q) => q.saldoAReceber),
    sobra: soma((q) => q.sobra),
    difBalanca: soma((q) => q.difBalanca),
    pctMedio: (() => { const vr = rows.reduce((s, q) => s + q.volumeRecebido, 0); const qt = rows.reduce((s, q) => s + q.quebraTecnica, 0); return vr > 0 ? Math.round((qt / vr) * 10000) / 100 : 0 })(),
  }

  // agrupamentos (quebra + volume por produto / cliente / filial)
  const agrupa = (key: (q: typeof rows[number]) => string) => {
    const m = new Map<string, { nome: string; quebra: number; volume: number; n: number }>()
    for (const q of rows) {
      const k = key(q) || "(sem)"
      const g = m.get(k) ?? { nome: k, quebra: 0, volume: 0, n: 0 }
      g.quebra += q.quebraTecnica; g.volume += q.volumeRecebido; g.n++
      m.set(k, g)
    }
    return [...m.values()].map((g) => ({ ...g, quebra: r1(g.quebra), volume: r1(g.volume), pct: g.volume > 0 ? r3(g.quebra / g.volume) : 0 })).sort((a, b) => b.quebra - a.quebra)
  }

  return NextResponse.json({
    rows,
    kpis,
    porProduto: agrupa((q) => q.produto ?? "(sem produto)"),
    porCliente: agrupa((q) => q.cliente ?? "(sem cliente)"),
    porFilial: agrupa((q) => q.filial ?? "(sem filial)"),
    opcoes: { anos: opAnos, clientes: opClientes, produtos: opProdutos, filiais: opFiliais },
  })
}

// POST — cria uma linha em branco (ou com dados)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const q = await prisma.quebraTecnica.create({
    data: {
      data: b.data ? new Date(b.data) : new Date(),
      filial: b.filial ?? null, contrato: b.contrato ?? null,
      cliente: b.cliente ?? null, produto: b.produto ?? null, origemNavio: b.origemNavio ?? null,
      volumeContrato: Number(b.volumeContrato) || 0, volumeRecebido: Number(b.volumeRecebido) || 0,
      quebraTecnica: Number(b.quebraTecnica) || 0,
    },
  })
  return NextResponse.json(q, { status: 201 })
}
