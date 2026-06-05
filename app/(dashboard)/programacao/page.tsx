import { prisma } from "@/lib/prisma"
import ProgramacaoClient from "./ProgramacaoClient"

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

  // Calcula datas da semana
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })

  return (
    <ProgramacaoClient
      programacoes={programacoes}
      boxes={boxes}
      clientes={clientes}
      produtos={produtos}
      semana={semana}
      ano={ano}
      diasSemana={diasSemana.map((d) => d.toISOString())}
    />
  )
}
