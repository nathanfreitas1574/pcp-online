import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil } from "@/lib/cobertura"
import { dataInputUTC } from "@/lib/cobertura"
import { CODIGO, DESC, normalizaTipo, gerarToken } from "@/lib/controle-notas"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros + totais por tipo + alertas
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim = searchParams.get("dataFim") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (tipo) where.tipo = tipo
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (busca) where.OR = [
    { numero: { contains: busca, mode: "insensitive" } },
    { numeroNF: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
    { usuario: { contains: busca, mode: "insensitive" } },
  ]
  if (dataInicio || dataFim) {
    where.data = {}
    if (dataInicio) where.data.gte = new Date(dataInicio)
    if (dataFim) { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.data.lte = d }
  }

  const [itens, porTipo, alertas, extempPendentes] = await Promise.all([
    prisma.controleNota.findMany({ where, orderBy: { data: "desc" }, take: 2000 }),
    prisma.controleNota.groupBy({ by: ["tipo"], _count: { id: true } }),
    prisma.controleNota.count({ where: { alertaContabil: true } }),
    prisma.controleNota.count({ where: { tipo: "EXTEMPORANEO", statusAprovacao: "PENDENTE" } }),
  ])

  return NextResponse.json({
    itens,
    porTipo: porTipo.map(t => ({ tipo: t.tipo, count: t._count.id })),
    alertas,
    extempPendentes,
  })
}

// POST — registra uma nota cancelada / numeração inutilizada (valida no contábil)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.numero?.trim()) return NextResponse.json({ error: "Informe o número." }, { status: 400 })
  const tipo = normalizaTipo(b.tipo)
  const extemp = tipo === "EXTEMPORANEO"

  // valida: NF cancelada que AINDA está no contábil = não foi cancelada
  const nf = (b.numeroNF || (tipo !== "INUTILIZACAO" ? b.numero : "") || "").trim()
  const alertaContabil = (tipo === "CANCELAMENTO" || extemp) && nf ? await notaNoContabil(nf) : false

  const c = await prisma.controleNota.create({
    data: {
      data: dataInputUTC(b.data),
      usuario: b.usuario?.trim() || null,
      numero: String(b.numero).trim(),
      cliente: b.cliente?.trim() || null,
      tipo,
      codigoOperacao: b.codigoOperacao?.trim() || CODIGO[tipo],
      descricao: b.descricao?.trim() || DESC[tipo],
      numeroNF: b.numeroNF?.trim() || null,
      motivoErro: b.motivoErro?.trim() || null,
      observacao: b.observacao?.trim() || null,
      alertaContabil,
      criadoPorNome: session.user.name ?? null,
      aprovacaoToken: extemp ? gerarToken() : null,
      statusAprovacao: extemp ? "PENDENTE" : null,
    },
  })
  return NextResponse.json({ ...c, alertaContabil }, { status: 201 })
}
