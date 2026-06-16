import { prisma } from "@/lib/prisma"
import ControleNotasClient from "./ControleNotasClient"

export const dynamic = "force-dynamic"

export default async function ControleNotasPage() {
  const [clientes, usuarios] = await Promise.all([
    prisma.controleNota.findMany({ where: { cliente: { not: null } }, distinct: ["cliente"], select: { cliente: true }, orderBy: { cliente: "asc" }, take: 200 }),
    prisma.controleNota.findMany({ where: { usuario: { not: null } }, distinct: ["usuario"], select: { usuario: true }, orderBy: { usuario: "asc" }, take: 200 }),
  ])
  return (
    <ControleNotasClient
      clientes={clientes.map(c => c.cliente!).filter(Boolean)}
      usuarios={usuarios.map(u => u.usuario!).filter(Boolean)}
    />
  )
}
