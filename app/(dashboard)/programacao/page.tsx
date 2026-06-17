import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"
import { normCliente, produtoMatch } from "@/lib/texto"

export const dynamic = "force-dynamic"

// Semana no padrão do sistema: semana 1 contém 1º de janeiro, começa no domingo.
function getSemanaAtual() {
  const hoje = new Date()
  const start = new Date(hoje.getFullYear(), 0, 1)
  const semana = Math.ceil(((hoje.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { ano: hoje.getFullYear(), semana }
}

// Domingo (início) de uma semana específica do ano — inverso de getSemanaAtual.
function domingoDaSemana(ano: number, semana: number): Date {
  const jan1 = new Date(ano, 0, 1)
  const base = new Date(ano, 0, 1 - jan1.getDay())          // domingo da semana 1
  const d = new Date(base)
  d.setDate(base.getDate() + (semana - 1) * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

// Quantas semanas o ano tem (semana que contém 31/12).
function semanasDoAno(ano: number): number {
  const jan1 = new Date(ano, 0, 1)
  const dez31 = new Date(ano, 11, 31)
  const dias = Math.round((dez31.getTime() - jan1.getTime()) / 86400000)
  return Math.ceil((dias + jan1.getDay() + 1) / 7)
}

export default async function ProgramacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; semana?: string }>
}) {
  const sp = await searchParams
  const atual = getSemanaAtual()
  const ano = Number(sp.ano) || atual.ano
  const maxSemana = semanasDoAno(ano)
  const semana = Math.min(Math.max(Number(sp.semana) || atual.semana, 1), maxSemana)

  const [programacoes, boxes, clientes, produtos] = await Promise.all([
    prisma.programacaoSemanal.findMany({
      where: { ano, semana },
      orderBy: [{ clienteNome: "asc" }, { produto: "asc" }],
      include: { box: { select: { codigo: true } } },
    }),
    prisma.box.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, codigo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" }, select: { id: true, descricao: true, codigo: true } }),
  ])

  // Datas da semana SELECIONADA (Dom → Sáb)
  const domingo = domingoDaSemana(ano, semana)
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo)
    d.setDate(domingo.getDate() + i)
    return d
  })

  // ── Realizado por dia: marcações FINALIZADAS (status CHECKOUT) ─────────────
  // Casa cada linha (cliente + produto + operação) com as marcações da semana e
  // soma o peso líquido por dia. RECEBIMENTO=DESCARGA, EXPEDICAO=CARGA.
  const semanaIni = diasSemana[0]
  const semanaFim = new Date(diasSemana[6]); semanaFim.setHours(23, 59, 59, 999)
  const marcacoesRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: semanaIni, lte: semanaFim } },
    select: { clienteDestino: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true },
  })
  // só veículos finalizados (CHECKOUT) — robusto a "CHECK-OUT"/"Check Out"
  const ehCheckout = (s: string | null) => (s ?? "").toUpperCase().replace(/[^A-Z]/g, "").includes("CHECKOUT")
  const marcacoes = marcacoesRaw.filter(m => ehCheckout(m.status))

  const idxPorData = new Map<string, number>()
  diasSemana.forEach((d, i) => idxPorData.set(d.toDateString(), i))

  const realizadoPorDia: Record<string, number[]> = {}
  for (const prog of programacoes) {
    const arr = [0, 0, 0, 0, 0, 0, 0]
    const querCarga = prog.tipo === "EXPEDICAO"
    const cliProg = normCliente(prog.clienteNome)
    for (const m of marcacoes) {
      if (!m.dataCarregamento) continue
      const op = (m.operacao || "").toUpperCase()
      const ehDescarga = op.includes("DESCARGA")
      const ehCarga = op.includes("CARGA") && !ehDescarga
      if (querCarga ? !ehCarga : !ehDescarga) continue
      if (normCliente(m.clienteDestino) !== cliProg) continue
      if (!produtoMatch(m.produto, prog.produto)) continue
      const idx = idxPorData.get(new Date(m.dataCarregamento).toDateString())
      if (idx === undefined) continue
      arr[idx] += m.pesoLiquido || 0
    }
    realizadoPorDia[prog.id] = arr
  }

  return (
    <ProgramacaoClient
      key={`${ano}-${semana}`}
      programacoes={programacoes}
      boxes={boxes}
      clientes={clientes}
      produtos={produtos}
      semana={semana}
      ano={ano}
      maxSemana={maxSemana}
      diasSemana={diasSemana.map((d) => d.toISOString())}
      realizadoPorDia={realizadoPorDia}
    />
  )
}
