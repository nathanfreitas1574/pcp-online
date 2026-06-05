import { prisma } from "@/lib/prisma"
import LacresClient from "./LacresClient"

export default async function LacresPage() {
  const [lacres, boxes] = await Promise.all([
    prisma.lacre.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        box: { select: { codigo: true, descricao: true } },
        usuario: { select: { name: true } },
      },
    }),
    prisma.box.findMany({ where: { ativo: true }, select: { id: true, codigo: true, descricao: true } }),
  ])

  return <LacresClient lacres={lacres} boxes={boxes} />
}
