import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ resultados: [] })

  const [boxes, produtos, clientes, alertas, movs] = await Promise.all([
    prisma.box.findMany({ where: { OR: [{ codigo: { contains: q, mode: "insensitive" } }, { descricao: { contains: q, mode: "insensitive" } }] }, take: 5 }),
    prisma.produto.findMany({ where: { OR: [{ codigo: { contains: q, mode: "insensitive" } }, { descricao: { contains: q, mode: "insensitive" } }] }, take: 5 }),
    prisma.cliente.findMany({ where: { OR: [{ codigo: { contains: q, mode: "insensitive" } }, { nome: { contains: q, mode: "insensitive" } }] }, take: 5 }),
    prisma.alerta.findMany({ where: { OR: [{ titulo: { contains: q, mode: "insensitive" } }, { referencia: { contains: q, mode: "insensitive" } }] }, take: 3 }),
    prisma.movimentacao.findMany({ where: { OR: [{ origem: { contains: q, mode: "insensitive" } }, { destino: { contains: q, mode: "insensitive" } }] }, take: 3 }),
  ])

  const resultados = [
    ...boxes.map((b) => ({ tipo: "Box", titulo: b.codigo, subtitulo: b.descricao, href: "/boxes" })),
    ...produtos.map((p) => ({ tipo: "Produto", titulo: p.codigo, subtitulo: p.descricao, href: "/cadastros" })),
    ...clientes.map((c) => ({ tipo: "Cliente", titulo: c.codigo, subtitulo: c.nome, href: "/cadastros" })),
    ...alertas.map((a) => ({ tipo: "Alerta", titulo: a.titulo, subtitulo: a.severidade, href: "/alertas" })),
    ...movs.map((m) => ({ tipo: "Movimentação", titulo: m.tipo, subtitulo: `${m.origem ?? "?"} → ${m.destino ?? "?"}`, href: "/movimentacao" })),
  ]

  return NextResponse.json({ resultados })
}
