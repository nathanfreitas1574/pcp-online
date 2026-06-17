import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notaNoContabil } from "@/lib/cobertura"
import { NextResponse } from "next/server"

// POST — confere as NFs das notas VALIDADAS no estoque contábil.
// Saiu do contábil = cancelamento confirmado → CANCELADO. Ainda lançada → alerta.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const validadas = await prisma.controleNota.findMany({
    where: { statusAprovacao: "VALIDADO", tipo: { not: "INUTILIZACAO" } },
    select: { id: true, numero: true, numeroNF: true },
  })

  let canceladas = 0, aindaLancadas = 0
  for (const n of validadas) {
    const nf = (n.numeroNF || n.numero || "").trim()
    const aindaNoContabil = nf ? await notaNoContabil(nf) : false
    if (aindaNoContabil) {
      await prisma.controleNota.update({ where: { id: n.id }, data: { alertaContabil: true } })
      aindaLancadas++
    } else {
      await prisma.controleNota.update({
        where: { id: n.id },
        data: { statusAprovacao: "CANCELADO", concluidoEm: new Date(), alertaContabil: false },
      })
      canceladas++
    }
  }

  return NextResponse.json({ ok: true, conferidas: validadas.length, canceladas, aindaLancadas })
}
