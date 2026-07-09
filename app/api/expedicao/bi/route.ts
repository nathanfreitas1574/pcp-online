import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, produtoMatch, normCliente } from "@/lib/texto"
import { ehCheckout, ehCarga, ymd, diasDaSemana, semanasDoAno, DIA } from "@/lib/programacao"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const PROG_DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const
const r1 = (n: number) => Math.round(n * 10) / 10

// feriados nacionais (p/ dias úteis do ritmo) — mesma lógica da Capacidade
function feriadosDoAno(ano: number): Set<string> {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mesP = Math.floor((h + l - 7 * m + 114) / 31)
  const diaP = ((h + l - 7 * m + 114) % 31) + 1
  const pascoa = Date.UTC(ano, mesP - 1, diaP)
  const key = (t: number) => { const dt = new Date(t); return `${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}` }
  const s = new Set(["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"])
  s.add(key(pascoa - 47 * DIA)); s.add(key(pascoa - 2 * DIA)); s.add(key(pascoa + 60 * DIA))
  return s
}

// Dashboard Expedição (BI) — cruza orçado, forecast, marcação, capacidade e programação semanal
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const now = new Date()
  const ano = Number(sp.get("ano")) || now.getUTCFullYear()
  const mes = Number(sp.get("mes")) || 0 // 0 = ano todo

  const anoIni = new Date(Date.UTC(ano, 0, 1))
  const anoFim = new Date(Date.UTC(ano + 1, 0, 1) - 1)
  const perIni = mes > 0 ? new Date(Date.UTC(ano, mes - 1, 1)) : anoIni
  const perFim = mes > 0 ? new Date(Date.UTC(ano, mes, 1) - 1) : anoFim
  const emPeriodo = (d: Date) => d >= perIni && d <= perFim

  const [orcados, forecasts, marcAno, capacidades, progs, diadias, contratos] = await Promise.all([
    prisma.expedicaoOrcado.findMany({ where: { ano, clienteNome: "GERAL" } }),
    prisma.expedicaoForecast.findMany({ where: { data: { gte: anoIni, lte: anoFim } } }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: anoIni, lte: anoFim } },
      select: { clienteDestino: true, cliente: true, produto: true, operacao: true, status: true, pesoLiquido: true, dataCarregamento: true, local: true },
    }),
    prisma.expedicaoCapacidade.findMany({ where: { ano } }),
    prisma.programacaoSemanal.findMany({ where: { ano, tipo: "EXPEDICAO" }, select: { semana: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true } }),
    prisma.expedicaoDiaDia.findMany(),
    prisma.contratoExpedicao.findMany({ orderBy: { numero: "asc" }, select: { produtoSistema: true, produtoAbreviado: true, operacao: true, cliente: { select: { nome: true } } } }),
  ])

  const cargas = marcAno.filter((m) => m.dataCarregamento && ehCheckout(m.status) && ehCarga(m.operacao) === true)
  const cargasPer = cargas.filter((m) => emPeriodo(m.dataCarregamento!))
  const somaCargas = (arr: typeof cargas) => arr.reduce((s, m) => s + (m.pesoLiquido || 0), 0)

  // ── mensal (12 meses): orçado / forecast / realizado / ritmo ──
  const orcadoMes = new Map(orcados.map((o) => [o.mes, o.orcado]))
  const mensal = MESES.map((nome, i) => {
    const m = i + 1
    const mi = new Date(Date.UTC(ano, m - 1, 1)), mf = new Date(Date.UTC(ano, m, 1) - 1)
    const orcado = orcadoMes.get(m) ?? 0
    const forecast = forecasts.filter((f) => f.data >= mi && f.data <= mf).reduce((s, f) => s + f.forecast, 0)
    const realizado = somaCargas(cargas.filter((c) => c.dataCarregamento! >= mi && c.dataCarregamento! <= mf))
    return { mes: nome, orcado: r1(orcado), forecast: r1(forecast), realizado: r1(realizado), ritmo: orcado > 0 ? Math.round((realizado / orcado) * 100) : null }
  })

  // ── semanal: programado (Prog.Semanal) x realizado (Marcação) ──
  const progPorSemana = new Map<number, number>()
  for (const p of progs) {
    const soma = PROG_DIAS.reduce((s, k) => s + (p[k] ?? 0), 0)
    progPorSemana.set(p.semana, (progPorSemana.get(p.semana) ?? 0) + soma)
  }
  const semanal: { semana: number; programado: number; realizado: number; aderencia: number | null }[] = []
  for (let s = 1; s <= semanasDoAno(ano); s++) {
    const dias = diasDaSemana(ano, s)
    const wi = dias[0], wf = new Date(dias[6].getTime() + DIA - 1)
    const programado = progPorSemana.get(s) ?? 0
    const realizado = somaCargas(cargas.filter((c) => c.dataCarregamento! >= wi && c.dataCarregamento! <= wf))
    if (programado > 0 || realizado > 0) semanal.push({ semana: s, programado: r1(programado), realizado: r1(realizado), aderencia: programado > 0 ? Math.round((realizado / programado) * 100) : null })
  }

  // ── diário (mês selecionado, ou o corrente) ──
  const mesDiario = mes > 0 ? mes : (ano === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 1)
  const nDias = new Date(Date.UTC(ano, mesDiario, 0)).getUTCDate()
  const diario = Array.from({ length: nDias }, (_, i) => {
    const d = i + 1
    const di = new Date(Date.UTC(ano, mesDiario - 1, d)), df = new Date(Date.UTC(ano, mesDiario - 1, d + 1) - 1)
    const realizado = somaCargas(cargas.filter((c) => c.dataCarregamento! >= di && c.dataCarregamento! <= df))
    const forecast = forecasts.filter((f) => f.data.getUTCMonth() + 1 === mesDiario && f.data.getUTCFullYear() === ano && f.data.getUTCDate() === d).reduce((s, f) => s + f.forecast, 0)
    return { dia: d, realizado: r1(realizado), forecast: r1(forecast) }
  })

  // ── Ritmo / projeção do mês (run-rate por dias úteis) ──────────────────────
  // média diária = realizado ÷ dias úteis decorridos; projeção = realizado + média × dias úteis restantes
  const feriados = feriadosDoAno(ano)
  const ehDiaUtil = (d: number) => {
    const dow = new Date(Date.UTC(ano, mesDiario - 1, d)).getUTCDay()
    const mmdd = `${String(mesDiario).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    return dow !== 0 && !feriados.has(mmdd) // sábado conta; domingo e feriado não
  }
  const isMesCorrente = ano === now.getUTCFullYear() && mesDiario === now.getUTCMonth() + 1
  const isMesPassado = ano < now.getUTCFullYear() || (ano === now.getUTCFullYear() && mesDiario < now.getUTCMonth() + 1)
  const cutoff = isMesCorrente ? now.getUTCDate() : (isMesPassado ? nDias : 0)
  let duTotais = 0, duDecorridos = 0
  for (let d = 1; d <= nDias; d++) { if (ehDiaUtil(d)) { duTotais++; if (d <= cutoff) duDecorridos++ } }
  const realizadoMes = r1(diario.reduce((s, x) => s + x.realizado, 0))
  const forecastMes = r1(diario.reduce((s, x) => s + x.forecast, 0))
  const mediaDiaria = duDecorridos > 0 ? realizadoMes / duDecorridos : 0
  const duRestantes = Math.max(0, duTotais - duDecorridos)
  const projecao = r1(realizadoMes + mediaDiaria * duRestantes)
  const ritmo = {
    mes: MESES[mesDiario - 1],
    realizado: realizadoMes, forecast: forecastMes,
    diasUteisTotais: duTotais, diasUteisDecorridos: duDecorridos, diasUteisRestantes: duRestantes,
    mediaDiaria: r1(mediaDiaria), projecao, gap: r1(projecao - forecastMes),
    atingeForecast: forecastMes > 0 ? Math.round((projecao / forecastMes) * 100) : null,
  }

  // ── agrupamentos do período (cliente / produto / linha / operação / turno) ──
  const agrupa = (keyFn: (m: typeof cargas[number]) => string | null) => {
    const map = new Map<string, number>()
    for (const m of cargasPer) { const k = keyFn(m); if (!k) continue; map.set(k, (map.get(k) ?? 0) + (m.pesoLiquido || 0)) }
    return [...map.entries()].map(([nome, valor]) => ({ nome, valor: r1(valor) })).sort((a, b) => b.valor - a.valor)
  }
  const porCliente = agrupa((m) => m.clienteDestino || m.cliente || "—").slice(0, 15)
  const porProduto = agrupa((m) => m.produto || "—").slice(0, 15)
  const porLinha = agrupa((m) => (m.local || "—").toUpperCase())
  const porOperacao = agrupa((m) => {
    const c = contratos.find((ct) => clienteMatch(m.clienteDestino || m.cliente, ct.cliente.nome) && produtoMatch(m.produto, ct.produtoAbreviado || ct.produtoSistema))
    return (c?.operacao || "—").toUpperCase()
  })

  // turnos vêm da aba Dia a Dia (a Marcação não separa turno)
  let tA = 0, tB = 0, tC = 0
  for (const dd of diadias) {
    const dia = dd.chave.split("|")[0]
    const [y, mo, da] = dia.split("-").map(Number)
    if (!y || !mo || !da) continue
    const d = new Date(Date.UTC(y, mo - 1, da, 12))
    if (!emPeriodo(d)) continue
    tA += dd.turnoA; tB += dd.turnoB; tC += dd.turnoC
  }
  const porTurno = [{ nome: "A", valor: r1(tA) }, { nome: "B", valor: r1(tB) }, { nome: "C", valor: r1(tC) }]

  // ── KPIs do período ──
  const orcado = orcados.filter((o) => mes === 0 || o.mes === mes).reduce((s, o) => s + o.orcado, 0)
  const forecast = forecasts.filter((f) => emPeriodo(f.data)).reduce((s, f) => s + f.forecast, 0)
  const realizado = somaCargas(cargasPer)
  const capacidade = capacidades.filter((c) => mes === 0 || c.mes === mes).reduce((s, c) => s + c.capacidade, 0)
  const kpis = {
    orcado: r1(orcado), forecast: r1(forecast), realizado: r1(realizado), capacidade: r1(capacidade),
    gap: r1(realizado - forecast),
    aderenciaForecast: forecast > 0 ? Math.round((realizado / forecast) * 1000) / 10 : 0,
    aderenciaOrcado: orcado > 0 ? Math.round((realizado / orcado) * 1000) / 10 : 0,
    performance: capacidade > 0 ? Math.round((realizado / capacidade) * 1000) / 10 : 0,
  }

  // aderência por cliente (realizado vs forecast do cliente no período)
  const fcCliente = new Map<string, number>()
  for (const f of forecasts) { if (!emPeriodo(f.data)) continue; const k = normCliente(f.clienteNome); if (k) fcCliente.set(k, (fcCliente.get(k) ?? 0) + f.forecast) }
  // cada forecast conta p/ no máx. 1 cliente (maior volume primeiro) → não infla a aderência
  const fcConsumidos = new Set<string>()
  const aderenciaCliente = porCliente.map((c) => {
    let fc = 0
    for (const [k, v] of fcCliente) {
      if (fcConsumidos.has(k)) continue
      if (clienteMatch(k, c.nome)) { fc += v; fcConsumidos.add(k) }
    }
    return { nome: c.nome, realizado: c.valor, forecast: r1(fc), aderencia: fc > 0 ? Math.round((c.valor / fc) * 100) : null }
  })

  return NextResponse.json({
    ano, mes, mesDiario: MESES[mesDiario - 1],
    kpis, ritmo, mensal, semanal, diario, porCliente, porProduto, porLinha, porOperacao, porTurno, aderenciaCliente,
  })
}
