import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PERDA_TIPOS, perdaMes, resultadoMes, ytdPonderado } from "@/lib/indicadores-perda"
import { NextRequest, NextResponse } from "next/server"

// GET — indicadores de perda do ano: 12 meses por tipo + resultado % + YTD ponderado + meta
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ano = Number(req.nextUrl.searchParams.get("ano")) || new Date().getFullYear()

  const [rows, metas] = await Promise.all([
    prisma.indicadorPerda.findMany({ where: { ano } }),
    prisma.indicadorPerdaMeta.findMany({ where: { ano } }),
  ])
  const rowByKey = new Map(rows.map((r) => [`${r.tipo}|${r.mes}`, r]))
  const metaByTipo = new Map(metas.map((m) => [m.tipo, m.meta]))

  const indicadores = PERDA_TIPOS.map((cfg) => {
    const meta = metaByTipo.get(cfg.tipo) ?? cfg.metaPadrao
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const r = rowByKey.get(`${cfg.tipo}|${mes}`)
      const base = r?.base ?? 0
      const perdaEfetiva = perdaMes(cfg.tipo, r ?? { perda: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 })
      return {
        mes, base,
        perda: r?.perda ?? 0,
        s1: r?.s1 ?? 0, s2: r?.s2 ?? 0, s3: r?.s3 ?? 0, s4: r?.s4 ?? 0, s5: r?.s5 ?? 0,
        perdaEfetiva,
        resultado: resultadoMes(base, perdaEfetiva),
        obs: r?.obs ?? null,
      }
    })
    return { ...cfg, meta, meses, ytd: ytdPonderado(meses) }
  })

  return NextResponse.json({ ano, indicadores })
}

// PATCH — upsert de uma célula (ano,tipo,mes,campo,valor) ou da meta (ano,tipo,meta)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const tipo = String(b.tipo || "")
  if (!ano || !PERDA_TIPOS.some((t) => t.tipo === tipo)) return NextResponse.json({ error: "ano/tipo inválidos" }, { status: 400 })

  // meta parametrizável
  if (b.meta !== undefined) {
    const meta = Math.max(0, Number(b.meta) || 0)
    await prisma.indicadorPerdaMeta.upsert({ where: { ano_tipo: { ano, tipo } }, update: { meta }, create: { ano, tipo, meta } })
    return NextResponse.json({ ok: true, meta })
  }

  const mes = Number(b.mes)
  if (!mes || mes < 1 || mes > 12) return NextResponse.json({ error: "mês inválido" }, { status: 400 })
  const campo = String(b.campo || "")
  const numericos = ["base", "perda", "s1", "s2", "s3", "s4", "s5"]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (numericos.includes(campo)) data[campo] = Math.max(0, Number(b.valor) || 0)
  else if (campo === "obs") data.obs = b.valor === "" ? null : String(b.valor)
  else return NextResponse.json({ error: "campo inválido" }, { status: 400 })

  const r = await prisma.indicadorPerda.upsert({
    where: { ano_tipo_mes: { ano, tipo, mes } },
    update: data,
    create: { ano, tipo, mes, ...data },
  })
  return NextResponse.json({ ok: true, id: r.id })
}
