import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Orçado anual (meta da diretoria) — um valor por mês do ano. Guardado com clienteNome = "GERAL".
const GERAL = "GERAL"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const anoParam = Number(req.nextUrl.searchParams.get("ano"))
  const ano = Number.isInteger(anoParam) && anoParam > 2000 ? anoParam : new Date().getUTCFullYear()

  const linhas = await prisma.expedicaoOrcado.findMany({ where: { ano, clienteNome: GERAL } })
  const mapa = new Map(linhas.map((o) => [o.mes, o.orcado]))
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, orcado: mapa.get(i + 1) ?? 0 }))
  const total = meses.reduce((s, m) => s + m.orcado, 0)
  return NextResponse.json({ ano, meses, total })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const mes = Number(b.mes)
  const orcado = Number(b.orcado) || 0
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099 || !Number.isInteger(mes) || mes < 1 || mes > 12 || orcado < 0)
    return NextResponse.json({ error: "ano/mês/valor inválidos" }, { status: 400 })
  try {
    await prisma.expedicaoOrcado.upsert({
      where: { ano_mes_clienteNome: { ano, mes, clienteNome: GERAL } },
      update: { orcado },
      create: { ano, mes, clienteNome: GERAL, orcado },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar orçado", detail: String(err) }, { status: 500 })
  }
}
