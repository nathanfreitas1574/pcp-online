import { prisma } from "@/lib/prisma"
import ConciliadorClient from "./ConciliadorClient"

export const dynamic = "force-dynamic"

export default async function ConciliadorPage() {
  const lotes = await prisma.conciliacaoLote.findMany({
    orderBy: { data: "desc" },
    take: 100,
  })
  return <ConciliadorClient lotesIniciais={JSON.parse(JSON.stringify(lotes))} />
}
