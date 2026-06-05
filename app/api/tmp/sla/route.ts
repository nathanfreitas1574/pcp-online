import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Verifica caminhões que ultrapassaram o SLA e gera alertas
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const SLA_MINUTOS = 120 // SLA padrão: 2 horas

  const ativos = await prisma.tmpRegistro.findMany({
    where: { status: "EM_ANDAMENTO" },
  })

  let alertasGerados = 0
  for (const t of ativos) {
    const mins = Math.floor((Date.now() - new Date(t.dtEntrada).getTime()) / 60000)
    if (mins >= SLA_MINUTOS) {
      const existe = await prisma.alerta.findFirst({
        where: { referencia: t.placa, tipo: "NAO_CONFORMIDADE", status: "ABERTO", titulo: { contains: "SLA" } },
      })
      if (!existe) {
        await prisma.alerta.create({
          data: {
            tipo: "NAO_CONFORMIDADE",
            severidade: "CRITICO",
            titulo: `SLA Ultrapassado — ${t.placa} (${mins}min)`,
            descricao: `Caminhão ${t.placa} do cliente ${t.clienteNome} está há ${mins} minutos no pátio, ultrapassando o SLA de ${SLA_MINUTOS} minutos.`,
            referencia: t.placa,
          },
        })
        alertasGerados++
      }
    }
  }

  return NextResponse.json({ verificados: ativos.length, alertasGerados })
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ativos = await prisma.tmpRegistro.findMany({ where: { status: "EM_ANDAMENTO" } })
  const SLA = 120
  const violacoes = ativos
    .map((t) => ({
      ...t,
      mins: Math.floor((Date.now() - new Date(t.dtEntrada).getTime()) / 60000),
    }))
    .filter((t) => t.mins >= SLA)

  return NextResponse.json({ sla: SLA, violacoes })
}
