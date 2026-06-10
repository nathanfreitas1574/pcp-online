import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros + comparativo realizado vs contratado
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const operacao       = searchParams.get("operacao")       || undefined
  const cliente        = searchParams.get("cliente")        || undefined
  const produto        = searchParams.get("produto")        || undefined
  const transportadora = searchParams.get("transportadora") || undefined
  const dataInicio     = searchParams.get("dataInicio")     || undefined
  const dataFim        = searchParams.get("dataFim")        || undefined
  const busca          = searchParams.get("busca")          || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ativo: true }
  if (operacao)       where.operacao       = operacao
  if (cliente)        where.OR = [
    { clienteDestino: { contains: cliente, mode: "insensitive" } },
    { cliente:        { contains: cliente, mode: "insensitive" } },
  ]
  if (produto)        where.produto        = { contains: produto, mode: "insensitive" }
  if (transportadora) where.transportadora = { contains: transportadora, mode: "insensitive" }
  if (dataInicio || dataFim) {
    where.dataCarregamento = {}
    if (dataInicio) where.dataCarregamento.gte = new Date(dataInicio)
    if (dataFim)    { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.dataCarregamento.lte = d }
  }
  if (busca) where.OR = [
    { numero:         { contains: busca, mode: "insensitive" } },
    { placa:          { contains: busca, mode: "insensitive" } },
    { motorista:      { contains: busca, mode: "insensitive" } },
    { romaneio:       { contains: busca, mode: "insensitive" } },
    { clienteDestino: { contains: busca, mode: "insensitive" } },
    { produto:        { contains: busca, mode: "insensitive" } },
  ]

  const [marcacoes, agregadoOperacao] = await Promise.all([
    prisma.marcacaoVeiculo.findMany({
      where,
      orderBy: { dataCarregamento: "desc" },
      take: 1000,
    }),
    prisma.marcacaoVeiculo.groupBy({
      by: ["operacao"],
      where: { ativo: true },
      _count: { id: true },
      _sum:   { pesoLiquido: true },
    }),
  ])

  return NextResponse.json({ marcacoes, agregadoOperacao })
}

// POST — importação em lote via JSON { marcacoes: [...] }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  if (!Array.isArray(body.marcacoes))
    return NextResponse.json({ error: "Esperado { marcacoes: [...] }" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = body.marcacoes as any[]
  let criados = 0; let atualizados = 0
  for (const item of items) {
    if (!item.numero) continue
    const data = {
      operacao:         item.operacao         ?? null,
      check:            item.check             ?? null,
      ordem:            item.ordem             ?? null,
      status:           item.status            ?? null,
      dataCheckin:      item.dataCheckin       ? new Date(item.dataCheckin)       : null,
      dataMarcacao:     item.dataMarcacao      ? new Date(item.dataMarcacao)      : null,
      dataCarregamento: item.dataCarregamento  ? new Date(item.dataCarregamento)  : null,
      produto:          item.produto           ?? null,
      motorista:        item.motorista         ?? null,
      tipoServico:      item.tipoServico       ?? null,
      obsMarcacao:      item.obsMarcacao       ?? null,
      pedidoCliente:    item.pedidoCliente     ?? null,
      clienteDestino:   item.clienteDestino    ?? null,
      placa:            item.placa             ?? null,
      transportadora:   item.transportadora    ?? null,
      tipoVeiculo:      item.tipoVeiculo       ?? null,
      cliente:          item.cliente           ?? null,
      local:            item.local             ?? null,
      pesoPrevisto:     Number(item.pesoPrevisto) || 0,
      pesoFinal:        Number(item.pesoFinal)    || 0,
      pesoInicial:      Number(item.pesoInicial)  || 0,
      pesoLiquido:      Number(item.pesoLiquido)  || 0,
      turno:            item.turno              ?? null,
      romaneio:         item.romaneio           ?? null,
      lote:             item.lote               ?? null,
      ativo:            true,
    }
    const existing = await prisma.marcacaoVeiculo.findUnique({ where: { numero: String(item.numero) } })
    if (existing) {
      await prisma.marcacaoVeiculo.update({ where: { numero: String(item.numero) }, data })
      atualizados++
    } else {
      await prisma.marcacaoVeiculo.create({ data: { numero: String(item.numero), ...data } })
      criados++
    }
  }
  return NextResponse.json({ ok: true, criados, atualizados, total: items.length })
}
