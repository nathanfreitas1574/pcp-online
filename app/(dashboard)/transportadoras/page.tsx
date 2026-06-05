import { prisma } from "@/lib/prisma"
import TransportadorasClient from "./TransportadorasClient"

export default async function TransportadorasPage() {
  const transportadoras = await prisma.transportadora.findMany({ orderBy: { nome: "asc" } })
  return <TransportadorasClient transportadoras={transportadoras} />
}
