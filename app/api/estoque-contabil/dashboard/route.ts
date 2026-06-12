import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET — agrega o estoque contábil por produto (nome abreviado via de-para),
// cliente e armazém, para o dashboard drill-down.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [agg, depara] = await Promise.all([
    prisma.estoqueContabil.groupBy({
      by: ["produto", "descricao", "razaoSocial", "armazem"],
      _sum: { saldo: true },
    }),
    prisma.estoqueDePara.findMany({ select: { codigoProduto: true, descricaoAbreviada: true } }),
  ])

  const mapAbrev = new Map(depara.map(d => [d.codigoProduto, d.descricaoAbreviada]))

  const NOME_ARM: Record<string, string> = { "10": "10 · Produto", "20": "20 · Aditivo", "30": "30 · Insumos" }

  const dados = agg
    .filter(a => (a._sum.saldo ?? 0) !== 0)
    .map(a => ({
      produto: mapAbrev.get(a.produto ?? "") || (a.descricao ?? "—"),
      mapeado: mapAbrev.has(a.produto ?? "") ? "Mapeado" : "Sem de-para",
      cliente: a.razaoSocial ?? "—",
      armazem: NOME_ARM[a.armazem ?? ""] ?? (a.armazem ?? "—"),
      saldo: Math.round((a._sum.saldo ?? 0) * 10) / 10,
    }))

  return NextResponse.json({ dados, mapeados: depara.length })
}
