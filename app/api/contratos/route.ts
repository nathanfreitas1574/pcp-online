import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — lista com filtros
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cliente    = searchParams.get("cliente")    || undefined
  const produto    = searchParams.get("produto")    || undefined
  const safra      = searchParams.get("safra")      || undefined
  const tabela     = searchParams.get("tabela")     || undefined
  const busca      = searchParams.get("busca")      || undefined
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim    = searchParams.get("dataFim")    || undefined
  const ativo      = searchParams.get("ativo")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ativo: ativo === "false" ? false : true }
  if (cliente) where.clienteNome = { contains: cliente, mode: "insensitive" }
  if (produto) where.desProduto  = { contains: produto,  mode: "insensitive" }
  if (safra)   where.safra       = safra
  if (tabela)  where.descTabela  = tabela
  if (dataInicio || dataFim) {
    where.dataCtr = {}
    if (dataInicio) where.dataCtr.gte = new Date(dataInicio)
    if (dataFim)    { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.dataCtr.lte = d }
  }
  if (busca)   where.OR = [
    { numero:      { contains: busca, mode: "insensitive" } },
    { descricao:   { contains: busca, mode: "insensitive" } },
    { clienteNome: { contains: busca, mode: "insensitive" } },
    { desProduto:  { contains: busca, mode: "insensitive" } },
  ]

  const [contratos, totais] = await Promise.all([
    prisma.contratoArmazenagem.findMany({
      where,
      orderBy: [{ clienteNome: "asc" }, { numero: "asc" }],
      take: 500,
    }),
    prisma.contratoArmazenagem.groupBy({
      by: ["descTabela"],
      where: { ativo: true },
      _count: { id: true },
      _sum:   { qtdContratada: true },
    }),
  ])

  return NextResponse.json({ contratos, totais })
}

// POST — criar único ou importar em lote
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()

  // Importação em lote: body = { contratos: [...] }
  if (Array.isArray(body.contratos)) {
    const items = body.contratos as Array<{
      filial?: string; numero: string; ultAlt?: string; descricao: string; tipoMercado?: string
      dataCtr?: string; ctrExterno?: string; codEntidade?: string; lojEntidade?: string
      clienteNome: string; codProduto?: string; desProduto: string; descTabela?: string
      qtdContratada?: number; safra?: string; stsAssinatura?: string; stsFiscal?: string
      stsFinanceiro?: string; stsEstoque?: string; modalidade?: string; centroCusto?: string
    }>

    let criados = 0; let atualizados = 0
    for (const item of items) {
      const filial = item.filial || ""
      const data = {
        ultAlt:        item.ultAlt        || null,
        descricao:     item.descricao,
        tipoMercado:   item.tipoMercado   || null,
        dataCtr:       item.dataCtr ? new Date(item.dataCtr) : null,
        ctrExterno:    item.ctrExterno    || null,
        codEntidade:   item.codEntidade   || null,
        lojEntidade:   item.lojEntidade   || null,
        clienteNome:   item.clienteNome,
        codProduto:    item.codProduto    || null,
        desProduto:    item.desProduto,
        descTabela:    item.descTabela    || null,
        qtdContratada: item.qtdContratada ?? 0,
        safra:         item.safra         || null,
        stsAssinatura: item.stsAssinatura || "Aberto",
        stsFiscal:     item.stsFiscal     || "Aberto",
        stsFinanceiro: item.stsFinanceiro || "Aberto",
        stsEstoque:    item.stsEstoque    || "Aberto",
        modalidade:    item.modalidade    || null,
        centroCusto:   item.centroCusto   || null,
        ativo:         true,
      }
      const existing = await prisma.contratoArmazenagem.findUnique({ where: { filial_numero: { filial, numero: item.numero } } })
      if (existing) {
        await prisma.contratoArmazenagem.update({ where: { filial_numero: { filial, numero: item.numero } }, data })
        atualizados++
      } else {
        await prisma.contratoArmazenagem.create({ data: { filial, numero: item.numero, ...data } })
        criados++
      }
    }
    return NextResponse.json({ ok: true, criados, atualizados, total: items.length })
  }

  // Criação única (manual)
  if (!body.numero || !String(body.numero).trim())
    return NextResponse.json({ error: "Número do contrato é obrigatório." }, { status: 400 })

  const filial = (body.filial || "").toString().trim()
  const numero = String(body.numero).trim()
  const existe = await prisma.contratoArmazenagem.findUnique({ where: { filial_numero: { filial, numero } } })
  if (existe)
    return NextResponse.json({ error: `Já existe contrato ${numero} na filial "${filial || "(sem filial)"}".` }, { status: 409 })

  const c = await prisma.contratoArmazenagem.create({
    data: {
      filial,
      numero,
      descricao:     (body.descricao || "").toString(),
      clienteNome:   (body.clienteNome || "").toString(),
      desProduto:    (body.desProduto || "").toString(),
      codProduto:    body.codProduto    || null,
      descTabela:    body.descTabela    || null,
      tipoMercado:   body.tipoMercado   || null,
      qtdContratada: Number(body.qtdContratada) || 0,
      safra:         body.safra         || null,
      dataCtr:       body.dataCtr ? new Date(body.dataCtr) : null,
      stsAssinatura: body.stsAssinatura || "Aberto",
      stsFiscal:     body.stsFiscal     || "Aberto",
      stsFinanceiro: body.stsFinanceiro || "Aberto",
      stsEstoque:    body.stsEstoque    || "Aberto",
      modalidade:    body.modalidade    || null,
      centroCusto:   body.centroCusto   || null,
      ativo: true,
    },
  })
  return NextResponse.json(c)
}
