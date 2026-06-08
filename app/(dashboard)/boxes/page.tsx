import { prisma } from "@/lib/prisma"
import BoxesVisualClient from "./BoxesVisualClient"

export default async function BoxesPage() {
  const [boxes, alertasAbertos] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: {
        estoques: {
          include: { produto: true },
          orderBy: { quantidade: "desc" },
          take: 1,
        },
        lacres: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { codigo: "asc" },
    }),
    prisma.alerta.groupBy({
      by: ["boxId"],
      where: { status: "ABERTO", boxId: { not: null } },
      _count: { id: true },
    }),
  ])

  // Mapa boxId → contagem de alertas abertos
  const alertasPorBox = new Map(
    alertasAbertos.map((a) => [a.boxId as string, a._count.id])
  )

  const boxesData = boxes.map((b) => ({
    id: b.id,
    codigo: b.codigo,
    descricao: b.descricao,
    localizacao: b.localizacao,
    capacidade: b.capacidade,
    volumeAtual: b.estoques[0]?.quantidade ?? 0,
    produto: b.estoques[0]?.produto?.descricao ?? null,
    cliente: b.estoques[0]?.clienteNome ?? null,
    navio: b.estoques[0]?.navio ?? null,
    dataRecebimento: b.estoques[0]?.dataRecebimento ?? null,
    ultimoLacre: b.lacres[0]?.status ?? null,
    codigoLacre: b.lacres[0]?.codigoLacre ?? null,
    movimentadoHoje: b.estoques[0]
      ? new Date(b.estoques[0].updatedAt).toDateString() === new Date().toDateString()
      : false,
    alertasAbertos: alertasPorBox.get(b.id) ?? 0,
  }))

  const totalCapacidade = boxesData.reduce((s, b) => s + b.capacidade, 0)
  const totalVolume = boxesData.reduce((s, b) => s + b.volumeAtual, 0)
  const boxesCheios = boxesData.filter(
    (b) => b.capacidade > 0 && b.volumeAtual / b.capacidade >= 0.9
  ).length
  const boxesLivres = boxesData.filter((b) => b.volumeAtual === 0).length

  return (
    <BoxesVisualClient
      boxes={boxesData}
      totalCapacidade={totalCapacidade}
      totalVolume={totalVolume}
      boxesCheios={boxesCheios}
      boxesLivres={boxesLivres}
    />
  )
}
