import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Capacidade fixa por equipamento × turno (por mês)
const EQUIPAMENTOS = ["NAVE", "BAG MÓVEL", "PRODUTO ACABADO", "GRANEL", "COMPACTADOR"]
const TURNOS = ["A", "B", "C"]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const ano = Number(req.nextUrl.searchParams.get("ano")) || now.getUTCFullYear()
  const mes = Number(req.nextUrl.searchParams.get("mes")) || now.getUTCMonth() + 1
  if (mes < 1 || mes > 12) return NextResponse.json({ error: "mês inválido" }, { status: 400 })
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) return NextResponse.json({ error: "ano inválido" }, { status: 400 })

  const linhas = await prisma.expedicaoCapacidade.findMany({ where: { ano, mes } })
  const mapa = new Map(linhas.map((c) => [`${c.linha}|${c.turno}`, c.capacidade]))

  const rows = EQUIPAMENTOS.map((eq) => {
    const turnos = Object.fromEntries(TURNOS.map((t) => [t, mapa.get(`${eq}|${t}`) ?? 0]))
    const total = TURNOS.reduce((s, t) => s + (turnos[t] as number), 0)
    return { linha: eq, turnos, total }
  })
  const totalGeral = rows.reduce((s, r) => s + r.total, 0)
  const totaisTurno = Object.fromEntries(
    TURNOS.map((t) => [t, rows.reduce((s, r) => s + (r.turnos[t] as number), 0)])
  )
  return NextResponse.json({ ano, mes, turnos: TURNOS, rows, totalGeral, totaisTurno })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const mes = Number(b.mes)
  const linha = String(b.linha ?? "").trim().toUpperCase()
  const turno = String(b.turno ?? "").trim().toUpperCase()
  const capacidade = Number(b.capacidade) || 0
  if (
    !Number.isInteger(ano) || ano < 2000 || ano > 2099 ||
    !Number.isInteger(mes) || mes < 1 || mes > 12 ||
    !EQUIPAMENTOS.includes(linha) || !TURNOS.includes(turno) || capacidade < 0
  )
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    await prisma.expedicaoCapacidade.upsert({
      where: { ano_mes_linha_turno: { ano, mes, linha, turno } },
      update: { capacidade },
      create: { ano, mes, linha, turno, capacidade },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar capacidade", detail: String(err) }, { status: 500 })
  }
}
