import { prisma } from "@/lib/prisma"
import PlanoAcaoClient from "./PlanoAcaoClient"

export const dynamic = "force-dynamic"

export default async function PlanoAcaoPage() {
  const planos = await prisma.planoAcao.findMany({
    include: { criadoPor: { select: { id: true, name: true } } },
    orderBy: [{ prioridade: "asc" }, { quando: "asc" }],
  })

  return <PlanoAcaoClient initialPlanos={planos as never} />
}
