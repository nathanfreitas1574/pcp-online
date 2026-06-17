import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil, dataInputUTC, dadosVeiculoPorPlaca, mesRange } from "@/lib/cobertura"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros + totais (cobertura pendente)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const cliente = searchParams.get("cliente") || undefined
  const busca = searchParams.get("busca") || undefined
  const mes = searchParams.get("mes") || undefined   // "YYYY-MM" → filtra por data de descarga

  // Escopo do mês (aplica a KPIs + tabela). Sem mês = acumulado.
  const range = mesRange(mes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mesWhere: any = range ? { dataDescarga: { gte: range.gte, lt: range.lt } } : {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ...mesWhere }
  if (status) where.status = status
  if (cliente) where.cliente = { contains: cliente, mode: "insensitive" }
  if (busca) where.OR = [
    { codigoRomaneio: { contains: busca, mode: "insensitive" } },
    { produto: { contains: busca, mode: "insensitive" } },
    { cliente: { contains: busca, mode: "insensitive" } },
    { numeroNota: { contains: busca, mode: "insensitive" } },
    { placa: { contains: busca, mode: "insensitive" } },
    { transportadora: { contains: busca, mode: "insensitive" } },
    { motorista: { contains: busca, mode: "insensitive" } },
  ]

  const TAKE = 2000
  const [itens, pendente, coberto, todasDatas, tabelaTotal] = await Promise.all([
    prisma.coberturaPendente.findMany({ where, orderBy: { createdAt: "desc" }, take: TAKE }),
    prisma.coberturaPendente.aggregate({ where: { ...mesWhere, status: "PENDENTE" }, _count: { id: true }, _sum: { volume: true } }),
    prisma.coberturaPendente.aggregate({ where: { ...mesWhere, status: "COBERTO" }, _count: { id: true }, _sum: { volume: true } }),
    prisma.coberturaPendente.findMany({ select: { dataDescarga: true } }),
    prisma.coberturaPendente.count({ where }),
  ])

  // Meses disponíveis (a partir da data de descarga) com contagem — para o seletor
  const mesesMap = new Map<string, number>()
  let semData = 0
  for (const t of todasDatas) {
    if (!t.dataDescarga) { semData++; continue }
    const d = t.dataDescarga
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    mesesMap.set(k, (mesesMap.get(k) ?? 0) + 1)
  }
  const meses = [...mesesMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, count]) => ({ mes: m, count }))

  return NextResponse.json({
    itens,
    pendente: { count: pendente._count.id, volume: pendente._sum.volume ?? 0 },
    coberto: { count: coberto._count.id, volume: coberto._sum.volume ?? 0 },
    meses,
    semData,
    tabelaTotal,
    truncado: itens.length < tabelaTotal,
  })
}

// POST — cria uma cobertura pendente
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.codigoRomaneio?.trim()) return NextResponse.json({ error: "Informe o código do romaneio." }, { status: 400 })
  if (!b.produto?.trim()) return NextResponse.json({ error: "Informe o produto." }, { status: 400 })

  // Se já informou a NF e ela está no contábil, já entra como COBERTO
  const numeroNota = b.numeroNota?.trim() || null
  const coberto = numeroNota ? await notaNoContabil(numeroNota) : false

  // transportadora/motorista: usa o informado ou puxa da Marcação pela placa
  const placa = b.placa?.trim() || null
  let transportadora = b.transportadora?.trim() || null
  let motorista = b.motorista?.trim() || null
  if (placa && (!transportadora || !motorista)) {
    const v = await dadosVeiculoPorPlaca(placa)
    if (v) { transportadora = transportadora || v.transportadora; motorista = motorista || v.motorista }
  }

  const c = await prisma.coberturaPendente.create({
    data: {
      codigoRomaneio: String(b.codigoRomaneio).trim(),
      numeroDocumento: b.numeroDocumento?.trim() || null,
      placa,
      transportadora,
      motorista,
      produto: String(b.produto).trim(),
      cliente: String(b.cliente ?? "").trim(),
      volume: Number(b.volume) || 0,
      dataDescarga:    dataInputUTC(b.dataDescarga),
      numeroNota,
      dataSolicitacao: dataInputUTC(b.dataSolicitacao),
      observacao: b.observacao?.trim() || null,
      boxCodigo: b.boxCodigo?.trim() || null,
      status: coberto ? "COBERTO" : "PENDENTE",
      resolvidoEm: coberto ? new Date() : null,
      criadoPorNome: session.user.name ?? null,
    },
  })
  return NextResponse.json({ ...c, autoCoberto: coberto }, { status: 201 })
}
