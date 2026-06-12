import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — produtos distintos do contábil (saldo por armazém 10/20/30) + de-para
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [agg, mapeamentos] = await Promise.all([
    prisma.estoqueContabil.groupBy({
      by: ["produto", "descricao", "armazem"],
      _sum: { saldo: true },
    }),
    prisma.estoqueDePara.findMany(),
  ])

  const mapByCod = new Map(mapeamentos.map(m => [m.codigoProduto, m.descricaoAbreviada]))

  // pivota por (código + descrição) com colunas de armazém
  const prods = new Map<string, { codigoProduto: string; descricao: string; saldo10: number; saldo20: number; saldo30: number; outros: number }>()
  for (const a of agg) {
    const cod = a.produto ?? "—"
    const key = cod + "||" + (a.descricao ?? "")
    const cur = prods.get(key) ?? { codigoProduto: cod, descricao: a.descricao ?? "—", saldo10: 0, saldo20: 0, saldo30: 0, outros: 0 }
    const s = a._sum.saldo ?? 0
    if (a.armazem === "10") cur.saldo10 += s
    else if (a.armazem === "20") cur.saldo20 += s
    else if (a.armazem === "30") cur.saldo30 += s
    else cur.outros += s
    prods.set(key, cur)
  }

  const lista = [...prods.values()]
    .map(p => ({
      ...p,
      total: p.saldo10 + p.saldo20 + p.saldo30 + p.outros,
      descricaoAbreviada: mapByCod.get(p.codigoProduto) ?? "",
    }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ lista, mapeados: mapeamentos.length })
}

// POST — salva mapeamentos (único ou em lote)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const itens: { codigoProduto: string; descricaoOriginal: string; descricaoAbreviada: string }[] =
    Array.isArray(body.mapeamentos) ? body.mapeamentos : [body]

  let salvos = 0; let removidos = 0
  for (const it of itens) {
    if (!it.codigoProduto) continue
    const abrev = (it.descricaoAbreviada ?? "").trim()
    if (!abrev) {
      // abreviada vazia → remove o mapeamento
      await prisma.estoqueDePara.deleteMany({ where: { codigoProduto: it.codigoProduto } })
      removidos++
      continue
    }
    await prisma.estoqueDePara.upsert({
      where: { codigoProduto: it.codigoProduto },
      update: { descricaoOriginal: it.descricaoOriginal ?? "", descricaoAbreviada: abrev },
      create: { codigoProduto: it.codigoProduto, descricaoOriginal: it.descricaoOriginal ?? "", descricaoAbreviada: abrev },
    })
    salvos++
  }

  return NextResponse.json({ ok: true, salvos, removidos })
}
