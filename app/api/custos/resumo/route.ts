import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7)

  const [custos, volumeMes] = await Promise.all([
    prisma.custoOperacional.findMany({
      where: { mes },
      select: { tipo: true, valor: true, armazemId: true },
    }),
    // volume recebido no mês via DescargaRegistro
    prisma.descargaRegistro.aggregate({
      where: {
        dtPortaria: {
          gte: new Date(`${mes}-01`),
          lt:  new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1)),
        },
        pesoEntrada: { not: null },
      },
      _sum: { pesoEntrada: true },
    }),
  ])

  const totalCusto = custos.reduce((s, c) => s + c.valor, 0)
  const volumeTon  = (volumeMes._sum.pesoEntrada ?? 0) / 1000  // kg → ton
  const custoPorTon = volumeTon > 0 ? totalCusto / volumeTon : null

  // Breakdown por tipo
  const porTipo = custos.reduce<Record<string, number>>((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] ?? 0) + c.valor; return acc
  }, {})

  return NextResponse.json({ mes, totalCusto, volumeTon, custoPorTon, porTipo })
}
