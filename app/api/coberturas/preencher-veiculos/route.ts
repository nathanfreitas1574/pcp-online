import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { mapaVeiculosPorPlaca, normalizaPlaca } from "@/lib/cobertura"
import { NextResponse } from "next/server"

// POST — preenche transportadora/motorista das coberturas (que têm placa e estão
// sem esses dados) a partir da Marcação de Veículos, casando pela placa.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const pendentesDados = await prisma.coberturaPendente.findMany({
    where: {
      placa: { not: null },
      OR: [{ transportadora: null }, { motorista: null }],
    },
    select: { id: true, placa: true, transportadora: true, motorista: true },
  })
  if (pendentesDados.length === 0)
    return NextResponse.json({ ok: true, atualizados: 0, semMarcacao: 0 })

  const mapa = await mapaVeiculosPorPlaca()
  let atualizados = 0, semMarcacao = 0
  for (const c of pendentesDados) {
    const v = mapa.get(normalizaPlaca(c.placa))
    if (!v) { semMarcacao++; continue }
    const transportadora = c.transportadora || v.transportadora
    const motorista = c.motorista || v.motorista
    if (transportadora === c.transportadora && motorista === c.motorista) continue
    await prisma.coberturaPendente.update({ where: { id: c.id }, data: { transportadora, motorista } })
    atualizados++
  }

  return NextResponse.json({ ok: true, atualizados, semMarcacao })
}
