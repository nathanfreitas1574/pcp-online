import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Capacidade DIÁRIA por equipamento × turno (grade estilo Excel)
const EQUIPAMENTOS = ["NAVE", "BAG MÓVEL", "PRODUTO ACABADO", "GRANEL", "COMPACTADOR"]
const TURNOS = ["A", "B", "C"]
const DIA_MS = 86400000

// feriados nacionais: fixos + móveis via Páscoa (algoritmo de Butcher)
function feriadosDoAno(ano: number): Map<string, string> {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mesP = Math.floor((h + l - 7 * m + 114) / 31)
  const diaP = ((h + l - 7 * m + 114) % 31) + 1
  const pascoa = Date.UTC(ano, mesP - 1, diaP)
  const key = (t: number) => { const dt = new Date(t); return `${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}` }
  const map = new Map<string, string>([
    ["01-01", "Confraternização"], ["04-21", "Tiradentes"], ["05-01", "Dia do Trabalho"],
    ["09-07", "Independência"], ["10-12", "N. Sra. Aparecida"], ["11-02", "Finados"],
    ["11-15", "Proclamação da República"], ["11-20", "Consciência Negra"], ["12-25", "Natal"],
  ])
  map.set(key(pascoa - 47 * DIA_MS), "Carnaval")
  map.set(key(pascoa - 2 * DIA_MS), "Sexta-feira Santa")
  map.set(key(pascoa + 60 * DIA_MS), "Corpus Christi")
  return map
}

function validaPeriodo(ano: number, mes: number): string | null {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) return "ano inválido"
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return "mês inválido"
  return null
}

// GET — grade do mês: uma linha por dia, colunas equipamento × turno
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const ano = Number(req.nextUrl.searchParams.get("ano")) || now.getUTCFullYear()
  const mes = Number(req.nextUrl.searchParams.get("mes")) || now.getUTCMonth() + 1
  const errPer = validaPeriodo(ano, mes)
  if (errPer) return NextResponse.json({ error: errPer }, { status: 400 })

  const linhas = await prisma.expedicaoCapacidade.findMany({ where: { ano, mes, dia: { gte: 1 } } })
  const mapa = new Map(linhas.map((c) => [`${c.dia}|${c.linha}|${c.turno}`, c.capacidade]))

  const feriados = feriadosDoAno(ano)
  const nDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const dias = Array.from({ length: nDias }, (_, i) => {
    const dia = i + 1
    const dt = new Date(Date.UTC(ano, mes - 1, dia))
    const cels: Record<string, number> = {}
    for (const eq of EQUIPAMENTOS) for (const t of TURNOS) {
      const v = mapa.get(`${dia}|${eq}|${t}`) ?? 0
      if (v) cels[`${eq}|${t}`] = v
    }
    return {
      dia, dow: dt.getUTCDay(),
      feriado: feriados.get(`${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`) ?? null,
      cels,
    }
  })

  return NextResponse.json({ ano, mes, equipamentos: EQUIPAMENTOS, turnos: TURNOS, dias })
}

// PATCH — grava uma célula (dia × equipamento × turno)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano), mes = Number(b.mes), dia = Number(b.dia)
  const linha = String(b.linha ?? "").trim().toUpperCase()
  const turno = String(b.turno ?? "").trim().toUpperCase()
  const capacidade = Number(b.capacidade) || 0
  const errPer = validaPeriodo(ano, mes)
  const nDias = errPer ? 0 : new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  if (errPer || !Number.isInteger(dia) || dia < 1 || dia > nDias || !EQUIPAMENTOS.includes(linha) || !TURNOS.includes(turno) || capacidade < 0)
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    await prisma.expedicaoCapacidade.upsert({
      where: { ano_mes_dia_linha_turno: { ano, mes, dia, linha, turno } },
      update: { capacidade },
      create: { ano, mes, dia, linha, turno, capacidade },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar capacidade", detail: String(err) }, { status: 500 })
  }
}

// POST — preenche a coluna (equipamento × turno) em todos os dias úteis do mês (seg–sáb, sem feriado)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano), mes = Number(b.mes)
  const linha = String(b.linha ?? "").trim().toUpperCase()
  const turno = String(b.turno ?? "").trim().toUpperCase()
  const capacidade = Number(b.capacidade) || 0
  const errPer = validaPeriodo(ano, mes)
  if (errPer || !EQUIPAMENTOS.includes(linha) || !TURNOS.includes(turno) || capacidade < 0)
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 })
  try {
    const feriados = feriadosDoAno(ano)
    const nDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    const ops = []
    for (let dia = 1; dia <= nDias; dia++) {
      const dt = new Date(Date.UTC(ano, mes - 1, dia))
      const ehDomingo = dt.getUTCDay() === 0
      const ehFeriado = feriados.has(`${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`)
      if (ehDomingo || ehFeriado) continue
      ops.push(prisma.expedicaoCapacidade.upsert({
        where: { ano_mes_dia_linha_turno: { ano, mes, dia, linha, turno } },
        update: { capacidade },
        create: { ano, mes, dia, linha, turno, capacidade },
      }))
    }
    await prisma.$transaction(ops)
    return NextResponse.json({ ok: true, dias: ops.length })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao preencher", detail: String(err) }, { status: 500 })
  }
}
