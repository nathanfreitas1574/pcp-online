import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { ehCheckout, ehCarga, ymd, dedupePorRomaneio } from "@/lib/programacao"

const pad = (n: number) => String(n).padStart(2, "0")

// GET — realizado de expedição (CARGA · CHECKOUT) vindo da Marcação de Veículos, no mês
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const mesParam = req.nextUrl.searchParams.get("mes") // YYYY-MM
  const now = new Date()
  const [ano, mes] =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? (mesParam.split("-").map(Number) as [number, number])
      : [now.getUTCFullYear(), now.getUTCMonth() + 1]

  const ini = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1) - 1)

  const [marcRaw, contratos, obsList] = await Promise.all([
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: {
        numero: true, clienteDestino: true, cliente: true, produto: true,
        operacao: true, status: true, pesoLiquido: true, dataCarregamento: true,
        local: true, turno: true, romaneio: true,
      },
    }),
    prisma.contratoExpedicao.findMany({
      // ordem fixa → se houver +1 contrato p/ mesmo cliente+produto, o match é determinístico
      orderBy: { numero: "asc" },
      select: {
        numero: true, produtoSistema: true, produtoAbreviado: true,
        tipoProduto: true, operacao: true, cliente: { select: { nome: true } },
      },
    }),
    prisma.expedicaoObs.findMany(),
  ])

  const obsMap = new Map(obsList.map((o) => [o.marcacaoNumero, o.observacao]))

  // só carregamentos finalizados (CHECKOUT) de CARGA (expedição)
  const cargas = dedupePorRomaneio(marcRaw.filter(
    (m) => m.dataCarregamento && ehCheckout(m.status) && ehCarga(m.operacao) === true
  ))

  const rows = cargas.map((m) => {
    const clienteNome = m.clienteDestino || m.cliente || ""
    // casa com o Contrato de Expedição para trazer tipo de operação + operação
    const contrato = contratos.find(
      (c) =>
        clienteMatch(clienteNome, c.cliente.nome) &&
        produtoMatch(m.produto, c.produtoAbreviado || c.produtoSistema)
    )
    const d = m.dataCarregamento!
    return {
      numero: m.numero,
      data: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`,
      ymd: ymd(d),
      contrato: contrato?.numero ?? null,
      cliente: clienteNome || "—",
      produto: m.produto ?? "—",
      tipoProduto: contrato?.tipoProduto ?? null,
      operacao: contrato?.operacao ?? null,
      linha: m.local ?? null,
      turno: m.turno ?? null,
      realizado: m.pesoLiquido || 0,
      observacao: obsMap.get(m.numero) ?? "",
    }
  })

  rows.sort((a, b) => (a.ymd < b.ymd ? 1 : a.ymd > b.ymd ? -1 : 0)) // mais recente primeiro

  const totalRealizado = rows.reduce((s, r) => s + r.realizado, 0)
  return NextResponse.json({ rows, totalRealizado, count: rows.length, mes: `${ano}-${pad(mes)}` })
}

// PATCH — salva a observação editável de um carregamento (chave = nº da marcação)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const marcacaoNumero = String(b.marcacaoNumero ?? "").trim()
  if (!marcacaoNumero) return NextResponse.json({ error: "marcacaoNumero obrigatório" }, { status: 400 })
  const observacao = String(b.observacao ?? "")
  try {
    await prisma.expedicaoObs.upsert({
      where: { marcacaoNumero },
      update: { observacao },
      create: { marcacaoNumero, observacao },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar observação", detail: String(err) }, { status: 500 })
  }
}
