import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes") ? Number(searchParams.get("mes")) : new Date().getMonth() + 1
  const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : new Date().getFullYear()

  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 0, 23, 59, 59)

  const [boxes, tmpMes, registrosMes, vistoriasMes] = await Promise.all([
    prisma.box.findMany({
      where: { ativo: true },
      include: { estoques: { select: { quantidade: true } } },
    }),
    prisma.tmpRegistro.findMany({
      where: { dtEntrada: { gte: inicio, lte: fim }, dtSaida: { not: null } },
      select: { dtEntrada: true, dtSaida: true },
    }),
    prisma.descargaRegistro.findMany({
      where: { createdAt: { gte: inicio, lte: fim } },
      select: { pesoSaida: true },
    }),
    prisma.auditoriaBox.findMany({
      where: { createdAt: { gte: inicio, lte: fim } },
      select: { createdAt: true },
    }),
  ])

  // Ocupação atual
  const totalCap = boxes.reduce((s, b) => s + b.capacidade, 0)
  const totalVol = boxes.reduce((s, b) => s + b.estoques.reduce((a, e) => a + e.quantidade, 0), 0)
  const ocupacao = totalCap > 0 ? (totalVol / totalCap) * 100 : 0

  // Volume recebido no mês
  const volumeRecebido = registrosMes.reduce((s, r) => s + (r.pesoSaida ?? 0), 0)

  // TMP médio no mês
  const tmpsValidos = tmpMes.filter(t => t.dtSaida)
  const tmpMedio = tmpsValidos.length > 0
    ? tmpsValidos.reduce((s, t) => s + (new Date(t.dtSaida!).getTime() - new Date(t.dtEntrada).getTime()) / 60000, 0) / tmpsValidos.length
    : 0

  // Vistorias por dia (média no mês)
  const diasComVistoria = new Set(vistoriasMes.map(v => new Date(v.createdAt).toDateString())).size
  const diasMes = fim.getDate()
  const vistoriasDia = diasComVistoria > 0 ? vistoriasMes.length / diasMes : 0

  // Caminhões atendidos no mês
  const caminhoesDia = diasMes > 0 ? tmpMes.length / diasMes : 0

  return NextResponse.json({
    realizados: {
      OCUPACAO_BOXES: Math.round(ocupacao * 10) / 10,
      VOLUME_RECEBIDO: Math.round(volumeRecebido),
      TMP_MEDIO: Math.round(tmpMedio),
      VISTORIAS_DIA: Math.round(vistoriasDia * 10) / 10,
      CAMINHOES_DIA: Math.round(caminhoesDia * 10) / 10,
    },
  })
}
