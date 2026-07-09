import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PERDA_TIPOS, TIPOS_VALIDOS, METAS_EXTRAS, perdaMes, resultadoMes, ytdPonderado } from "@/lib/indicadores-perda"
import { NextRequest, NextResponse } from "next/server"

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

// GET — indicadores do ano: perdas (% vs meta, YTD ponderado) + tolerância + vira + balanço
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
  const linha = (tipo: string, mes: number) => rowByKey.get(`${tipo}|${mes}`)

  // ── perdas (% mensal vs meta) ─────────────────────────────────────────────
  const indicadores = PERDA_TIPOS.map((cfg) => {
    const meta = metaByTipo.get(cfg.tipo) ?? cfg.metaPadrao
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const r = linha(cfg.tipo, mes)
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

  // ── TOLERÂNCIA DE CARREGAMENTO — meta = veículos × kg ÷ 1000; maior é melhor ─
  const metaKg = metaByTipo.get("TOLERANCIA") ?? METAS_EXTRAS.TOLERANCIA
  const tolMeses = Array.from({ length: 12 }, (_, i) => {
    const r = linha("TOLERANCIA", i + 1)
    const veiculos = r?.base ?? 0
    const retorno = r?.perda ?? 0
    const metaMensal = r2((veiculos * metaKg) / 1000)
    return {
      mes: i + 1, veiculos, retorno: r2(retorno), metaMensal,
      kpi: metaMensal > 0 ? Math.round((retorno / metaMensal) * 10000) / 100 : null,
      obs: r?.obs ?? null,
    }
  })
  const tolMetaAcum = r2(tolMeses.reduce((s, m) => s + m.metaMensal, 0))
  const tolRetAcum = r2(tolMeses.reduce((s, m) => s + m.retorno, 0))
  const tolerancia = {
    metaKg, meses: tolMeses,
    ytd: { meta: tolMetaAcum, retorno: tolRetAcum, kpi: tolMetaAcum > 0 ? Math.round((tolRetAcum / tolMetaAcum) * 10000) / 100 : null },
  }

  // ── CUSTO DO VIRA INTERNO — saldo líquido = gasto − retorno; dentro se ≤ meta ─
  const metaVira = metaByTipo.get("VIRA") ?? METAS_EXTRAS.VIRA
  const viraMeses = Array.from({ length: 12 }, (_, i) => {
    const r = linha("VIRA", i + 1)
    const gasto = r?.base ?? 0
    const retorno = r?.perda ?? 0
    const saldo = r2(gasto - retorno)
    return {
      mes: i + 1, gasto: r2(gasto), retorno: r2(retorno), saldo,
      atingimento: metaVira > 0 && (gasto > 0 || retorno > 0) ? Math.round((saldo / metaVira) * 10000) / 100 : null,
      dentro: gasto > 0 || retorno > 0 ? saldo <= metaVira : null,
      economia: gasto > 0 || retorno > 0 ? r2(metaVira - saldo) : null,
      obs: r?.obs ?? null,
    }
  })
  const vira = {
    meta: metaVira, meses: viraMeses,
    ytd: {
      gasto: r2(viraMeses.reduce((s, m) => s + m.gasto, 0)),
      retorno: r2(viraMeses.reduce((s, m) => s + m.retorno, 0)),
      saldo: r2(viraMeses.reduce((s, m) => s + m.saldo, 0)),
    },
  }

  // ── BALANÇO OPERACIONAL — quebra gerada × varredura × saldo de segurança ────
  const pctQT = metaByTipo.get("BALANCO") ?? METAS_EXTRAS.BALANCO
  const varrPorMes = new Map<number, number>()
  for (let m = 1; m <= 12; m++) {
    const rv = linha("VARREDURA", m)
    varrPorMes.set(m, rv ? r2(rv.s1 + rv.s2 + rv.s3 + rv.s4 + rv.s5) : 0) // varredura vem do indicador de varredura
  }
  const balMeses = Array.from({ length: 12 }, (_, i) => {
    const r = linha("BALANCO", i + 1)
    const recebido = r?.base ?? 0
    const bigbag = r?.s1 ?? 0, granel = r?.s2 ?? 0, acabado = r?.s3 ?? 0
    const expedido = r2(bigbag + granel + acabado)
    const quebraGerada = r2((recebido * pctQT) / 100)
    const varredura = varrPorMes.get(i + 1) ?? 0
    return {
      mes: i + 1, recebido: r2(recebido), bigbag: r2(bigbag), granel: r2(granel), acabado: r2(acabado), expedido,
      quebraGerada, varredura,
      saldoSeguranca: r2(quebraGerada - varredura),
      consumo: quebraGerada > 0 ? Math.round((varredura / quebraGerada) * 10000) / 100 : null,
      obs: r?.obs ?? null,
    }
  })
  const balanco = {
    pctQuebraTecnica: pctQT, meses: balMeses,
    ytd: {
      recebido: r1(balMeses.reduce((s, m) => s + m.recebido, 0)),
      expedido: r1(balMeses.reduce((s, m) => s + m.expedido, 0)),
      quebraGerada: r1(balMeses.reduce((s, m) => s + m.quebraGerada, 0)),
      varredura: r1(balMeses.reduce((s, m) => s + m.varredura, 0)),
      saldoSeguranca: r1(balMeses.reduce((s, m) => s + (m.quebraGerada - m.varredura), 0)),
    },
  }

  return NextResponse.json({ ano, indicadores, tolerancia, vira, balanco })
}

// PATCH — upsert de uma célula (ano,tipo,mes,campo,valor) ou da meta (ano,tipo,meta)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const ano = Number(b.ano)
  const tipo = String(b.tipo || "")
  if (!ano || !TIPOS_VALIDOS.includes(tipo)) return NextResponse.json({ error: "ano/tipo inválidos" }, { status: 400 })

  // meta parametrizável (perdas: %, tolerância: kg/veículo, vira: R$, balanço: % quebra técnica)
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
