import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

// GET — indicadores do ano/área (com anos e áreas disponíveis)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = Number(searchParams.get("ano")) || new Date().getFullYear()
  const area = searchParams.get("area") || "PCP"

  const [itens, anos, areas] = await Promise.all([
    prisma.indicadorPcp.findMany({ where: { ano, area }, orderBy: [{ ordem: "asc" }, { indicador: "asc" }, { recursoMedido: "asc" }] }),
    prisma.indicadorPcp.findMany({ distinct: ["ano"], select: { ano: true }, orderBy: { ano: "desc" } }),
    prisma.indicadorPcp.findMany({ distinct: ["area"], select: { area: true }, orderBy: { area: "asc" } }),
  ])

  return NextResponse.json({ itens, anos: anos.map(a => a.ano), areas: areas.map(a => a.area) })
}

// POST — cria/atualiza uma linha de indicador (upsert)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.indicador?.trim() || !b.recursoMedido?.trim())
    return NextResponse.json({ error: "Informe indicador e recurso medido." }, { status: 400 })

  const ano = Number(b.ano) || new Date().getFullYear()
  const area = String(b.area ?? "PCP").trim()
  const indicador = String(b.indicador).trim()
  const recursoMedido = String(b.recursoMedido).trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    ordem: Number(b.ordem) || 0,
    meta: b.meta != null && b.meta !== "" ? Number(b.meta) : null,
    unidade: b.unidade?.trim() || null,
    sentidoIdeal: b.sentidoIdeal || null,
    desdobramento: b.desdobramento?.trim() || null,
    obs: b.obs?.trim() || null,
  }
  for (const m of MESES) if (b[m] !== undefined) data[m] = Number(b[m]) || 0

  const c = await prisma.indicadorPcp.upsert({
    where: { ano_area_indicador_recursoMedido: { ano, area, indicador, recursoMedido } },
    update: data,
    create: { ano, area, indicador, recursoMedido, ...data },
  })
  return NextResponse.json(c, { status: 201 })
}
