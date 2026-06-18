import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

// GET — exporta os contratos (com os mesmos filtros do GET de /api/contratos) em Excel
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

  const contratos = await prisma.contratoArmazenagem.findMany({
    where,
    orderBy: [{ clienteNome: "asc" }, { numero: "asc" }],
  })
  const fmtD = (d: Date | null) => d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""

  const linhas = contratos.map(c => ({
    "Filial": c.filial,
    "Número": c.numero,
    "Cliente": c.clienteNome,
    "Descrição": c.descricao,
    "Produto": c.desProduto,
    "Tipo": c.descTabela ?? "",
    "Qtd. Contratada": c.qtdContratada,
    "Safra": c.safra ?? "",
    "Data do Contrato": fmtD(c.dataCtr),
    "Sts. Assinatura": c.stsAssinatura,
    "Sts. Estoque": c.stsEstoque,
    "Sts. Fiscal": c.stsFiscal,
    "Sts. Financeiro": c.stsFinanceiro,
  }))

  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Contratos")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const sufixo = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="contratos_${sufixo}.xlsx"`,
    },
  })
}
