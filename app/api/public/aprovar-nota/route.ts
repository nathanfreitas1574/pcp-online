import { prisma } from "@/lib/prisma"
import { TAXA_EXTEMP_FIXA } from "@/lib/controle-notas"
import { NextRequest, NextResponse } from "next/server"

// GET ?token= → detalhes do cancelamento extemporâneo (público via token)
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || ""
  if (!token) return NextResponse.json({ error: "Token ausente." }, { status: 400 })

  const n = await prisma.controleNota.findUnique({ where: { aprovacaoToken: token } })
  if (!n) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 })

  return NextResponse.json({
    numero: n.numero,
    cliente: n.cliente,
    data: n.data,
    numeroNF: n.numeroNF,
    motivoErro: n.motivoErro,
    observacao: n.observacao,
    usuario: n.usuario,
    statusAprovacao: n.statusAprovacao,
    aprovadoFiscal: n.aprovadoFiscal,
    aprovadoFiscalPor: n.aprovadoFiscalPor,
    aprovadoFiscalEm: n.aprovadoFiscalEm,
    aprovadoFinanceiro: n.aprovadoFinanceiro,
    aprovadoFinanceiroPor: n.aprovadoFinanceiroPor,
    aprovadoFinanceiroEm: n.aprovadoFinanceiroEm,
    taxaCancelamento: n.taxaCancelamento,
  })
}

// POST { token, papel: "fiscal"|"financeiro", nome } → registra a validação
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const token = (b.token || "").toString()
    const papel = (b.papel || "").toString().toLowerCase()
    const nome = (b.nome || "").toString().trim()

    if (!token) return NextResponse.json({ error: "Token ausente." }, { status: 400 })
    if (papel !== "fiscal" && papel !== "financeiro")
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 })
    if (!nome) return NextResponse.json({ error: "Informe seu nome." }, { status: 400 })

    const n = await prisma.controleNota.findUnique({ where: { aprovacaoToken: token } })
    if (!n) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 })
    if (n.statusAprovacao === "APROVADO")
      return NextResponse.json({ error: "Este cancelamento já está totalmente aprovado." }, { status: 409 })

    const now = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (papel === "fiscal") {
      if (n.aprovadoFiscal) return NextResponse.json({ error: "O Fiscal Interno já validou este registro." }, { status: 409 })
      data.aprovadoFiscal = true; data.aprovadoFiscalPor = nome; data.aprovadoFiscalEm = now
    } else {
      if (n.aprovadoFinanceiro) return NextResponse.json({ error: "O Financeiro já validou este registro." }, { status: 409 })
      data.aprovadoFinanceiro = true; data.aprovadoFinanceiroPor = nome; data.aprovadoFinanceiroEm = now
    }

    // os dois validaram → aprova e gera a taxa (valor fixo)
    const fiscalOk = papel === "fiscal" ? true : n.aprovadoFiscal
    const finOk = papel === "financeiro" ? true : n.aprovadoFinanceiro
    if (fiscalOk && finOk) {
      data.statusAprovacao = "APROVADO"
      data.taxaCancelamento = TAXA_EXTEMP_FIXA
      data.procedimentos = "Taxa de cancelamento gerada após validação do Fiscal Interno e do Financeiro."
    }

    const upd = await prisma.controleNota.update({ where: { id: n.id }, data })
    return NextResponse.json({
      ok: true,
      statusAprovacao: upd.statusAprovacao,
      aprovadoFiscal: upd.aprovadoFiscal,
      aprovadoFiscalPor: upd.aprovadoFiscalPor,
      aprovadoFinanceiro: upd.aprovadoFinanceiro,
      aprovadoFinanceiroPor: upd.aprovadoFinanceiroPor,
      taxaCancelamento: upd.taxaCancelamento,
    })
  } catch (e) {
    console.error("Erro ao aprovar nota:", e)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
