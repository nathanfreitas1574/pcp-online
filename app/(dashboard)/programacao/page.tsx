import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"
import { normCliente, produtoMatch } from "@/lib/texto"

export const dynamic = "force-dynamic"

const DIA = 86400000
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const ddMM = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`

// Semana do sistema: semana 1 contém 1º/jan, começa no DOMINGO. Tudo em UTC
// (imune a fuso/horário de verão e consistente com o navegador via strings YYYY-MM-DD).
function getSemanaAtual() {
  const h = new Date()
  const ano = h.getUTCFullYear()
  const jan1 = Date.UTC(ano, 0, 1)
  const hojeUTC = Date.UTC(ano, h.getUTCMonth(), h.getUTCDate())
  const dias = Math.round((hojeUTC - jan1) / DIA)
  const semana = Math.ceil((dias + new Date(jan1).getUTCDay() + 1) / 7)
  return { ano, semana }
}
function domingoDaSemana(ano: number, semana: number): Date {
  const jan1Dow = new Date(Date.UTC(ano, 0, 1)).getUTCDay()
  return new Date(Date.UTC(ano, 0, 1 - jan1Dow) + (semana - 1) * 7 * DIA)
}
function semanasDoAno(ano: number): number {
  const jan1 = Date.UTC(ano, 0, 1)
  const dias = Math.round((Date.UTC(ano, 11, 31) - jan1) / DIA)
  return Math.ceil((dias + new Date(jan1).getUTCDay() + 1) / 7)
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

  // Datas da semana SELECIONADA (Dom → Sáb), em UTC
  const domingo = domingoDaSemana(ano, semana)
  const diasSemana = Array.from({ length: 7 }, (_, i) => new Date(domingo.getTime() + i * DIA))
  // payload neutro para o cliente (sem reinterpretação de fuso)
  const dias = diasSemana.map(d => ({ ymd: ymd(d), label: ddMM(d) }))

  // ── Realizado por dia: marcações FINALIZADAS (status CHECKOUT) ─────────────
  const semanaIni = diasSemana[0]
  const semanaFim = new Date(diasSemana[6].getTime() + DIA - 1)
  const marcacoesRaw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: semanaIni, lte: semanaFim } },
    select: { clienteDestino: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true, status: true },
  })
  const ehCheckout = (s: string | null) => (s ?? "").toUpperCase().replace(/[^A-Z]/g, "").includes("CHECKOUT")
  const marcacoes = marcacoesRaw.filter(m => ehCheckout(m.status))

  const idxPorData = new Map<string, number>()
  diasSemana.forEach((d, i) => idxPorData.set(ymd(d), i))

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
      const idx = idxPorData.get(ymd(new Date(m.dataCarregamento)))
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
      dias={dias}
      realizadoPorDia={realizadoPorDia}
    />
  )
}
