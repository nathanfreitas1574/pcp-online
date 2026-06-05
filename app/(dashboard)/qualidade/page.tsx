import { prisma } from "@/lib/prisma"
import QualidadeClient from "./QualidadeClient"

export default async function QualidadePage() {
  const [registros, boxes, produtos, clientes] = await Promise.all([
    prisma.qualidadeRegistro.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        box: { select: { codigo: true } },
        produto: { select: { descricao: true } },
      },
    }),
    prisma.box.findMany({ where: { ativo: true }, select: { id: true, codigo: true }, orderBy: { codigo: "asc" } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, codigo: true, descricao: true }, orderBy: { descricao: "asc" } }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { id: true, nome: true, codigo: true }, orderBy: { nome: "asc" } }),
  ])

  const aprovados = registros.filter((r) => r.resultado === "APROVADO").length
  const reprovados = registros.filter((r) => r.resultado === "REPROVADO").length
  const pendentes = registros.filter((r) => r.resultado === "PENDENTE").length

  return (
    <QualidadeClient
      registros={registros}
      boxes={boxes}
      produtos={produtos}
      clientes={clientes}
      aprovados={aprovados}
      reprovados={reprovados}
      pendentes={pendentes}
    />
  )
}
