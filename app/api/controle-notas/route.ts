import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil, dataInputUTC, mesRange } from "@/lib/cobertura"
import { CODIGO, DESC, normalizaTipo } from "@/lib/controle-notas"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros + totais por tipo/status + alertas + meses/filiais
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") || undefined
  const status = searchParams.get("status") || undefined
  const filial = searchParams.get("filial") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined
  const mes = searchParams.get("mes") || undefined

  const range = mesRange(mes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (tipo) where.tipo = tipo
  if (status) where.statusAprovacao = status
  if (filial) where.filial = filial
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (range) where.data = { gte: range.gte, lt: range.lt }
  if (busca) where.OR = [
    { numero: { contains: busca, mode: "insensitive" } },
    { numeroNF: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
    { usuario: { contains: busca, mode: "insensitive" } },
    { filial: { contains: busca, mode: "insensitive" } },
  ]

  const [itens, porTipo, porStatus, alertas, todas] = await Promise.all([
    prisma.controleNota.findMany({ where, orderBy: { data: "desc" }, take: 2000 }),
    prisma.controleNota.groupBy({ by: ["tipo"], where, _count: { id: true } }),
    prisma.controleNota.groupBy({ by: ["statusAprovacao"], where, _count: { id: true } }),
    prisma.controleNota.count({ where: { ...where, alertaContabil: true } }),
    prisma.controleNota.findMany({ select: { data: true, filial: true } }),
  ])

  // meses (a partir da data) e filiais — para filtros e gráficos
  const mesesMap = new Map<string, number>()
  const filiaisSet = new Set<string>()
  for (const t of todas) {
    if (t.filial) filiaisSet.add(t.filial)
    if (!t.data) continue
    const d = t.data
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    mesesMap.set(k, (mesesMap.get(k) ?? 0) + 1)
  }
  const meses = [...mesesMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, count]) => ({ mes: m, count }))
  const filiais = [...filiaisSet].sort()

  const st = (s: string) => porStatus.find(x => x.statusAprovacao === s)?._count.id ?? 0

  return NextResponse.json({
    itens,
    porTipo: porTipo.map(t => ({ tipo: t.tipo, count: t._count.id })),
    porStatus: { AGUARDANDO: st("AGUARDANDO"), VALIDADO: st("VALIDADO"), CANCELADO: st("CANCELADO") },
    alertas,
    meses,
    filiais,
  })
}

// POST — registra (Validação PCP começa em AGUARDANDO). Valida NF no contábil.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.numero?.trim()) return NextResponse.json({ error: "Informe o número." }, { status: 400 })
  const tipo = normalizaTipo(b.tipo)

  const nf = (b.numeroNF || (tipo !== "INUTILIZACAO" ? b.numero : "") || "").trim()
  const alertaContabil = tipo !== "INUTILIZACAO" && nf ? await notaNoContabil(nf) : false

  const c = await prisma.controleNota.create({
    data: {
      data: dataInputUTC(b.data),
      usuario: b.usuario?.trim() || null,
      numero: String(b.numero).trim(),
      cliente: b.cliente?.trim() || null,
      filial: b.filial?.trim() || null,
      tipo,
      codigoOperacao: b.codigoOperacao?.trim() || CODIGO[tipo],
      descricao: b.descricao?.trim() || DESC[tipo],
      numeroNF: b.numeroNF?.trim() || null,
      motivoErro: b.motivoErro?.trim() || null,
      observacao: b.observacao?.trim() || null,
      alertaContabil,
      statusAprovacao: "AGUARDANDO",
      criadoPorNome: session.user.name ?? null,
    },
  })
  return NextResponse.json({ ...c, alertaContabil }, { status: 201 })
}
