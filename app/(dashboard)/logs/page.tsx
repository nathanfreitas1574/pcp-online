import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import LogsClient from "./LogsClient"

export const dynamic = "force-dynamic"

export default async function LogsPage() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role)) redirect("/")

  // Estatísticas globais para os cards do topo
  const [total, porModulo, porDispositivo, porUsuario] = await Promise.all([
    prisma.logAtividade.count(),
    prisma.logAtividade.groupBy({ by: ["modulo"],      _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.logAtividade.groupBy({ by: ["dispositivo"], _count: { id: true }, where: { dispositivo: { not: null } } }),
    prisma.logAtividade.groupBy({ by: ["usuarioNome"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
  ])

  const stats = {
    total,
    modulos:     Object.fromEntries(porModulo.map(r => [r.modulo,                r._count.id])),
    dispositivos:Object.fromEntries(porDispositivo.map(r => [r.dispositivo ?? "Desconhecido", r._count.id])),
    usuarios:    Object.fromEntries(porUsuario.map(r => [r.usuarioNome ?? "—",   r._count.id])),
  }

  return <LogsClient initialStats={stats} />
}
