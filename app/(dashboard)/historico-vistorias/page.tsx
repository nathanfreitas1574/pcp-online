import { prisma } from "@/lib/prisma"
import HistoricoVistoriasClient from "./HistoricoVistoriasClient"

export const dynamic = "force-dynamic"

export default async function HistoricoVistoriasPage() {
  const reg = await prisma.auditoriaBox.findMany({
    select: { box: { select: { codigo: true } }, usuario: { select: { name: true } } },
    take: 3000,
  })
  const boxes = [...new Set(reg.map(r => r.box?.codigo).filter(Boolean) as string[])].sort()
  const usuarios = [...new Set(reg.map(r => r.usuario?.name).filter(Boolean) as string[])].sort()
  return <HistoricoVistoriasClient boxes={boxes} usuarios={usuarios} />
}
