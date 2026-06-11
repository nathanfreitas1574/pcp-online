import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"
import { normCliente, produtoMatch } from "@/lib/texto"

export const dynamic = "force-dynamic"

function getSemanaAtual() {
  const hoje = new Date()
  const start = new Date(hoje.getFullYear(), 0, 1)
  const semana = Math.ceil(((hoje.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { ano: hoje.getFullYear(), semana }
}

export default async function ProgramacaoPage() {
  const { ano, semana } = getSemanaAtual()

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

  // Calcula datas da semana (Dom → Sáb, alinhado aos rótulos da tabela)
  const hoje = new Date()
  const domingo = new Date(hoje)
  domingo.setDate(hoje.getDate() - hoje.getDay())
  domingo.setHours(0, 0, 0, 0)
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo)
    d.setDate(domingo.getDate() + i)
    return d
  })

  // ── Realizado por dia: vem da marcação do Connect ─────────────────────────
  // Casa cada linha de programação (cliente + produto) com as marcações da
  // semana e soma o peso líquido por dia. RECEBIMENTO=DESCARGA, EXPEDICAO=CARGA.
  const semanaIni = diasSemana[0]
  const semanaFim = new Date(diasSemana[6]); semanaFim.setHours(23, 59, 59, 999)
  const marcacoes = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, dataCarregamento: { gte: semanaIni, lte: semanaFim } },
    select: { clienteDestino: true, produto: true, operacao: true, pesoLiquido: true, dataCarregamento: true },
  })
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
      programacoes={programacoes}
      boxes={boxes}
      clientes={clientes}
      produtos={produtos}
      semana={semana}
      ano={ano}
      diasSemana={diasSemana.map((d) => d.toISOString())}
      realizadoPorDia={realizadoPorDia}
    />
  )
}
