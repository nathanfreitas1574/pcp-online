import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST { manterId, removerId } — mescla o cliente "remover" no "manter":
// reponteia consignações, contratos (descarga/expedição) e quebras, e exclui o duplicado.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Sem permissão (apenas ADMIN/PCP)" }, { status: 403 })

  const { manterId, removerId } = await req.json()
  if (!manterId || !removerId) return NextResponse.json({ error: "Informe manterId e removerId" }, { status: 400 })
  if (manterId === removerId) return NextResponse.json({ error: "Escolha dois clientes diferentes" }, { status: 400 })

  const [manter, remover] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: manterId } }),
    prisma.cliente.findUnique({ where: { id: removerId } }),
  ])
  if (!manter || !remover) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  try {
    const movido = await prisma.$transaction(async (tx) => {
      const cons = await tx.consignacao.updateMany({ where: { clienteId: removerId }, data: { clienteId: manterId } })
      const cd = await tx.contratoDescarga.updateMany({ where: { clienteId: removerId }, data: { clienteId: manterId } })
      const ce = await tx.contratoExpedicao.updateMany({ where: { clienteId: removerId }, data: { clienteId: manterId } })
      const qb = await tx.quebra.updateMany({ where: { clienteId: removerId }, data: { clienteId: manterId } })
      // preserva o apelido do removido como abreviado, se o mantido não tiver
      if (!manter.abreviado && (remover.abreviado || remover.nome)) {
        await tx.cliente.update({ where: { id: manterId }, data: { abreviado: remover.abreviado || remover.nome } })
      }
      await tx.cliente.delete({ where: { id: removerId } })
      return { consignacoes: cons.count, contratosDescarga: cd.count, contratosExpedicao: ce.count, quebras: qb.count }
    })
    const total = movido.consignacoes + movido.contratosDescarga + movido.contratosExpedicao + movido.quebras
    return NextResponse.json({ ok: true, movido, total })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao mesclar", detail: String(err) }, { status: 500 })
  }
}
