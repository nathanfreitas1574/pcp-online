import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import UsuariosClient from "./UsuariosClient"

export default async function UsuariosPage() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role)) redirect("/")

  const usuarios = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, ativo: true, createdAt: true },
  })

  return <UsuariosClient usuarios={usuarios} />
}
