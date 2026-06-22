import { prisma } from "@/lib/prisma"
import ControleNotasClient from "./ControleNotasClient"

export const dynamic = "force-dynamic"

export default async function ControleNotasPage() {
  const [clientesCad, usuarios, motivosCad] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { nome: true } }),
    prisma.controleNota.findMany({ where: { usuario: { not: null } }, distinct: ["usuario"], select: { usuario: true }, orderBy: { usuario: "asc" }, take: 200 }),
    prisma.motivoCancelamento.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { descricao: "asc" }], select: { descricao: true } }),
  ])
  return (
    <ControleNotasClient
      clientes={clientesCad.map(c => c.nome).filter(Boolean)}
      usuarios={usuarios.map(u => u.usuario!).filter(Boolean)}
      motivos={motivosCad.map(m => m.descricao)}
    />
  )
}
