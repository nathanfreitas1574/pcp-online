import { prisma } from "@/lib/prisma"
import PlantaClient from "./PlantaClient"

export const dynamic = "force-dynamic"

export default async function PlantaPage() {
  const armazens = await prisma.armazem.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: "asc" }, { codigo: "asc" }],
    select: { id: true, codigo: true, nome: true },
  })
  return <PlantaClient armazens={armazens} />
}
