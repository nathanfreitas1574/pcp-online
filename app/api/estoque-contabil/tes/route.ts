import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — gerenciador de TES: cada código TES dos relatórios + natureza cadastrada + volumes
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [porTes, naturezas] = await Promise.all([
    prisma.estoqueContabil.groupBy({
      by: ["tes", "sentido"],
      _count: { id: true },
      _sum: { quantidade: true },
    }),
    prisma.tesNatureza.findMany(),
  ])
  const natMap = new Map(naturezas.map((n) => [n.tes, n]))

  // agrega entradas/saídas por TES
  const mapa = new Map<string, { tes: string; natureza: string | null; descricao: string | null; registros: number; entradas: number; saidas: number }>()
  for (const g of porTes) {
    const tes = g.tes?.trim() || "(sem TES)"
    const item = mapa.get(tes) ?? { tes, natureza: natMap.get(tes)?.natureza ?? null, descricao: natMap.get(tes)?.descricao ?? null, registros: 0, entradas: 0, saidas: 0 }
    item.registros += g._count.id
    if (g.sentido === "SAIDA") item.saidas += g._sum.quantidade ?? 0
    else item.entradas += g._sum.quantidade ?? 0
    mapa.set(tes, item)
  }
  const itens = [...mapa.values()]
    .map((i) => ({ ...i, entradas: Math.round(i.entradas * 10) / 10, saidas: Math.round(i.saidas * 10) / 10 }))
    .sort((a, b) => b.registros - a.registros)

  return NextResponse.json({ itens, naturezas: [...new Set(naturezas.map((n) => n.natureza))].sort() })
}

// PATCH — define a natureza de um TES ({ tes, natureza, descricao? }); natureza vazia remove
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const tes = String(b.tes ?? "").trim()
  if (!tes) return NextResponse.json({ error: "Informe o TES." }, { status: 400 })
  const natureza = String(b.natureza ?? "").trim().toUpperCase()

  if (!natureza) {
    await prisma.tesNatureza.deleteMany({ where: { tes } })
    return NextResponse.json({ ok: true, removido: true })
  }
  const r = await prisma.tesNatureza.upsert({
    where: { tes },
    update: { natureza, descricao: b.descricao?.trim() || null },
    create: { tes, natureza, descricao: b.descricao?.trim() || null },
  })
  return NextResponse.json({ ok: true, id: r.id })
}
