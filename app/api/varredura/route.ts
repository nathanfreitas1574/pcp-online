import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseMes } from "@/lib/varredura"
import { NextRequest, NextResponse } from "next/server"

// GET — semanas + resumo mensal (geração × expedição × saldo)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const itens = await prisma.varreduraSemanal.findMany({ orderBy: [{ ano: "asc" }, { mesNum: "asc" }, { semana: "asc" }] })

  // resumo mensal
  const mapa = new Map<string, { ano: number; mesNum: number; mesLabel: string; geracao: number; expedicao: number; saldoFinal: number }>()
  for (const w of itens) {
    const k = `${w.ano}-${w.mesNum}`
    const cur = mapa.get(k) ?? { ano: w.ano, mesNum: w.mesNum, mesLabel: w.mesLabel, geracao: 0, expedicao: 0, saldoFinal: 0 }
    cur.geracao += w.geracaoIntervalo
    cur.expedicao += w.expedicaoSemana
    cur.saldoFinal = w.saldoAcumulado // último da ordem = saldo final do mês
    mapa.set(k, cur)
  }
  const resumoMensal = [...mapa.values()].sort((a, b) => a.ano - b.ano || a.mesNum - b.mesNum)

  const totais = resumoMensal.reduce((acc, m) => {
    acc.geracao += m.geracao; acc.expedicao += m.expedicao; return acc
  }, { geracao: 0, expedicao: 0, saldoAtual: itens.length ? itens[itens.length - 1].saldoAcumulado : 0 })

  return NextResponse.json({ itens, resumoMensal, totais })
}

// POST — cria/atualiza uma semana (upsert por ano+semana)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const b = await req.json()
  if (!b.semana?.trim()) return NextResponse.json({ error: "Informe a semana (ex: S2)." }, { status: 400 })
  const { ano, mesNum } = parseMes(b.mesLabel)
  const num = (k: string) => Number(b[k]) || 0
  const data = {
    mesNum, mesLabel: String(b.mesLabel ?? "").trim(),
    dataSegunda: b.dataSegunda ? new Date(b.dataSegunda) : null,
    medSegundaVarredura: num("medSegundaVarredura"), medSegundaCalcario: num("medSegundaCalcario"),
    dataSexta: b.dataSexta ? new Date(b.dataSexta) : null,
    medSextaVarredura: num("medSextaVarredura"), medSextaCalcario: num("medSextaCalcario"),
    expedicaoSemana: num("expedicaoSemana"), geracaoIntervalo: num("geracaoIntervalo"),
    geracaoCalcario: num("geracaoCalcario"), geracaoMP: num("geracaoMP"),
    houveExpedicao: !!b.houveExpedicao, calcarioFisico: num("calcarioFisico"),
    compraCalcario: num("compraCalcario"), saldoAcumulado: num("saldoAcumulado"),
    observacao: b.observacao?.trim() || null,
  }
  const c = await prisma.varreduraSemanal.upsert({
    where: { ano_semana: { ano, semana: String(b.semana).trim() } },
    update: data,
    create: { ano, semana: String(b.semana).trim(), ...data },
  })
  return NextResponse.json(c, { status: 201 })
}
