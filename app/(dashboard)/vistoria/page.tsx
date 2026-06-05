import { prisma } from "@/lib/prisma"
import VistoriaClient from "./VistoriaClient"

export default async function VistoriaPage() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const registros = await prisma.vistoriaBox.findMany({
    where: { data: { gte: hoje } },
    orderBy: { boxCodigo: "asc" },
  })

  // Se não houver vistoria hoje, pega a última disponível
  const dadosVistoria = registros.length > 0
    ? registros
    : await prisma.vistoriaBox.findMany({
        orderBy: { data: "desc" },
        take: 200,
        distinct: ["boxCodigo"],
      })

  // Separar por tipo
  const alvenaria = dadosVistoria.filter((v) => v.boxTipo === "ALVENARIA")
  const estruturado = dadosVistoria.filter((v) => v.boxTipo === "ESTRUTURADO")
  const varredura = dadosVistoria.filter((v) => v.boxTipo === "VARREDURA")

  const estoqueTotal = dadosVistoria.reduce((s, v) => s + v.estoque, 0)
  const estoqueAlv = alvenaria.reduce((s, v) => s + v.estoque, 0)
  const estoqueEst = estruturado.reduce((s, v) => s + v.estoque, 0)
  const capTotal = dadosVistoria.reduce((s, v) => s + v.capacidade, 0)
  const capAlv = alvenaria.reduce((s, v) => s + v.capacidade, 0)
  const capEst = estruturado.reduce((s, v) => s + v.capacidade, 0)

  const tmpMedio = dadosVistoria.filter((v) => v.diasEstocado).reduce((s, v, _, a) =>
    s + (v.diasEstocado ?? 0) / a.length, 0)

  return (
    <VistoriaClient
      registros={dadosVistoria}
      alvenaria={alvenaria}
      estruturado={estruturado}
      varredura={varredura}
      estoqueTotal={estoqueTotal}
      estoqueAlv={estoqueAlv}
      estoqueEst={estoqueEst}
      capTotal={capTotal}
      capAlv={capAlv}
      capEst={capEst}
      tmpMedio={Math.round(tmpMedio)}
    />
  )
}
