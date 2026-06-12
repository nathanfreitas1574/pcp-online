import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil } from "@/lib/cobertura"
import { NextResponse } from "next/server"

// POST — confere todas as coberturas PENDENTES que têm número de nota:
// se a NF já está lançada no estoque contábil, finaliza (status COBERTO).
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const pendentes = await prisma.coberturaPendente.findMany({
    where: { status: "PENDENTE", numeroNota: { not: null } },
    select: { id: true, numeroNota: true },
  })

  let finalizadas = 0
  for (const p of pendentes) {
    if (await notaNoContabil(p.numeroNota)) {
      await prisma.coberturaPendente.update({ where: { id: p.id }, data: { status: "COBERTO", resolvidoEm: new Date() } })
      finalizadas++
    }
  }

  return NextResponse.json({ ok: true, conferidas: pendentes.length, finalizadas })
}
