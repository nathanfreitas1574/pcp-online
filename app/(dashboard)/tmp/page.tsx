import { prisma } from "@/lib/prisma"
import TmpClient from "./TmpClient"

export default async function TmpPage() {
  const [ativos, boxes, clientes, produtos] = await Promise.all([
    prisma.tmpRegistro.findMany({
      where: { status: "EM_ANDAMENTO" },
      orderBy: { dtEntrada: "asc" },
    }),
    prisma.box.findMany({ where: { ativo: true }, select: { id: true, codigo: true } }),
    prisma.cliente.findMany({ where: { ativo: true }, select: { id: true, nome: true, codigo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, descricao: true, codigo: true } }),
  ])

  const historico = await prisma.tmpRegistro.findMany({
    where: { status: "CONCLUIDO" },
    orderBy: { dtSaida: "desc" },
    take: 20,
  })

  // KPIs "Hoje": somente registros concluídos com saída a partir do início do dia atual
  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)

  const concluidosHojeRegs = await prisma.tmpRegistro.findMany({
    where: { status: "CONCLUIDO", dtSaida: { gte: inicioHoje } },
    select: { tmpMinutos: true },
  })

  const concluidosHoje = concluidosHojeRegs.length
  const comTmp = concluidosHojeRegs.filter((r) => r.tmpMinutos != null)
  const tmpMedioHoje = comTmp.length
    ? Math.round(comTmp.reduce((s, r) => s + (r.tmpMinutos ?? 0), 0) / comTmp.length)
    : 0

  return (
    <TmpClient
      ativos={ativos}
      historico={historico}
      boxes={boxes}
      clientes={clientes}
      produtos={produtos}
      tmpMedioHoje={tmpMedioHoje}
      concluidosHoje={concluidosHoje}
    />
  )
}
