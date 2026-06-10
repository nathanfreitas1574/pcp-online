import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boxId    = searchParams.get("boxId")    || undefined
  const produto  = searchParams.get("produto")  || undefined
  const cliente  = searchParams.get("cliente")  || undefined
  const dataInicio = searchParams.get("dataInicio")
  const dataFim    = searchParams.get("dataFim")

  const where: Record<string, unknown> = {}
  if (boxId)   where.boxId = boxId
  if (produto) where.produto = { contains: produto, mode: "insensitive" }
  if (cliente) where.clienteNome = { contains: cliente, mode: "insensitive" }
  if (dataInicio || dataFim) {
    where.createdAt = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim    ? { lte: new Date(dataFim + "T23:59:59") } : {}),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historico = await prisma.historicoBox.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  // Calcular médias por box/produto no período
  const mediasMap: Record<string, { boxCodigo: string; produto: string; clienteNome: string; volumes: number[]; count: number }> = {}
  for (const h of historico) {
    if (!h.volume || !h.produto) continue
    const key = `${h.boxCodigo}||${h.produto}`
    if (!mediasMap[key]) mediasMap[key] = { boxCodigo: h.boxCodigo, produto: h.produto, clienteNome: h.clienteNome ?? "", volumes: [], count: 0 }
    mediasMap[key].volumes.push(h.volume)
    mediasMap[key].count++
  }
  const medias = Object.values(mediasMap).map(m => ({
    ...m,
    mediaVolume: m.volumes.reduce((a, b) => a + b, 0) / m.volumes.length,
    maxVolume:   Math.max(...m.volumes),
    minVolume:   Math.min(...m.volumes),
  })).sort((a, b) => b.mediaVolume - a.mediaVolume)

  return NextResponse.json({ historico, medias })
}
