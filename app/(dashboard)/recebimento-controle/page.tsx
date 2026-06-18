import { prisma } from "@/lib/prisma"
import RecebimentoControleClient from "./RecebimentoControleClient"
import { getSemanaAtual } from "@/lib/programacao"

export const dynamic = "force-dynamic"

export default async function RecebimentoControlePage() {
  const anoAtual = getSemanaAtual().ano
  const mesAtual = new Date().getUTCMonth() + 1
  const [clientes, produtos] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { nome: true, abreviado: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" }, select: { descricao: true, abreviado: true } }),
  ])
  return <RecebimentoControleClient anoAtual={anoAtual} mesAtual={mesAtual} clientesCad={clientes} produtosCad={produtos} />
}
