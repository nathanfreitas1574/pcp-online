import { prisma } from "@/lib/prisma"
import ExpedicaoClient from "./ExpedicaoClient"

export default async function ExpedicaoPage() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1

  const [contratos, registros, orcados, capacidades] = await Promise.all([
    prisma.contratoExpedicao.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nome: true } } },
    }),
    prisma.expedicaoRegistro.findMany({
      take: 200,
      orderBy: { data: "desc" },
    }),
    prisma.expedicaoOrcado.findMany({ where: { ano } }),
    prisma.expedicaoCapacidade.findMany({ where: { ano } }),
  ])

  const totalForecast = contratos.reduce((s, c) => s + c.volProgramado, 0)
  const totalRealizado = contratos.reduce((s, c) => s + c.realizado, 0)
  const totalOrcado = orcados.reduce((s, o) => s + o.orcado, 0)
  const totalCapacidade = capacidades
    .filter((c) => c.mes === mes)
    .reduce((s, c) => s + c.capacidade, 0)

  const aderencia = totalForecast > 0 ? (totalRealizado / totalForecast) * 100 : 0

  return (
    <ExpedicaoClient
      contratos={contratos}
      registros={registros}
      totalForecast={totalForecast}
      totalRealizado={totalRealizado}
      totalOrcado={totalOrcado}
      totalCapacidade={totalCapacidade}
      aderencia={aderencia}
    />
  )
}
