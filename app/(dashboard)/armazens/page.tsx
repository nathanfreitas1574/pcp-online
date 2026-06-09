import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ArmazensClient from "./ArmazensClient"

export const dynamic = "force-dynamic"

export default async function ArmazensPage() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role)) redirect("/")

  const [armazens, boxesSemArmazem] = await Promise.all([
    prisma.armazem.findMany({
      orderBy: { ordem: "asc" },
      include: {
        boxes: {
          where: { ativo: true },
          orderBy: { codigo: "asc" },
          select: { id: true, codigo: true, descricao: true, capacidade: true, localizacao: true, armazemId: true },
        },
      },
    }),
    prisma.box.findMany({
      where: { ativo: true, armazemId: null },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, descricao: true, capacidade: true, localizacao: true, armazemId: true },
    }),
  ])

  return <ArmazensClient armazens={armazens} boxesSemArmazem={boxesSemArmazem} />
}
