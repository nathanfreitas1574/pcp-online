import { prisma } from "@/lib/prisma"
import AlertasClient from "./AlertasClient"

export default async function AlertasPage() {
  const [alertas, resumo] = await Promise.all([
    prisma.alerta.findMany({
      orderBy: [{ status: "asc" }, { severidade: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        box: { select: { codigo: true } },
        usuario: { select: { name: true } },
      },
    }),
    prisma.alerta.groupBy({
      by: ["status", "severidade"],
      _count: { id: true },
    }),
  ])

  const abertos = alertas.filter((a) => a.status === "ABERTO").length
  const criticos = alertas.filter((a) => a.status === "ABERTO" && a.severidade === "CRITICO").length
  const avisos = alertas.filter((a) => a.status === "ABERTO" && a.severidade === "AVISO").length

  return <AlertasClient alertas={alertas} abertos={abertos} criticos={criticos} avisos={avisos} />
}
