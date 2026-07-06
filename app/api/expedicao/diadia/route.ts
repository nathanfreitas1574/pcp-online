import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { clienteMatch, produtoMatch } from "@/lib/texto"
import { ehCheckout, ehCarga, ymd } from "@/lib/programacao"

const pad = (n: number) => String(n).padStart(2, "0")
const chaveDia = (dia: string, cliente: string, produto: string) =>
  `${dia}|${(cliente || "").trim().toUpperCase()}|${(produto || "").trim().toUpperCase()}`

// tipo de operação a partir do tipoServico da marcação (fallback quando não há contrato)
function tipoDoServico(ts: string | null | undefined): string | null {
  const u = (ts ?? "").toUpperCase()
  if (u.includes("BIG BAG")) return "ENVASE"
  if (u.includes("GRANEL")) return "GRANEL"
  if (u.includes("COMPACT")) return "COMPACTADOR"
  return null
}

// GET — Dia a Dia do mês, direto da Marcação de Veículos (CHECKOUT · CARGA)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const mesParam = req.nextUrl.searchParams.get("mes") // YYYY-MM
  const [ano, mes] =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? (mesParam.split("-").map(Number) as [number, number])
      : [now.getUTCFullYear(), now.getUTCMonth() + 1]
  const ini = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1) - 1)

  const [marcRaw, contratos, overlays] = await Promise.all([
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, dataCarregamento: { gte: ini, lte: fim } },
      select: { clienteDestino: true, cliente: true, produto: true, operacao: true, status: true, pesoLiquido: true, dataCarregamento: true, local: true, tipoServico: true },
    }),
    prisma.contratoExpedicao.findMany({
      orderBy: { numero: "asc" },
      select: { produtoSistema: true, produtoAbreviado: true, tipoProduto: true, operacao: true, cliente: { select: { nome: true } } },
    }),
    prisma.expedicaoDiaDia.findMany(),
  ])
  const overlayMap = new Map(overlays.map((o) => [o.chave, o]))

  // agrupa marcações CHECKOUT · CARGA por dia|cliente|produto
  type Grupo = { chave: string; data: string; cliente: string; produto: string; realizado: number; local: string | null; tipoServico: string | null }
  const grupos = new Map<string, Grupo>()
  for (const m of marcRaw) {
    if (!m.dataCarregamento || !ehCheckout(m.status) || ehCarga(m.operacao) !== true) continue
    const dia = ymd(new Date(m.dataCarregamento))
    const cliente = m.clienteDestino || m.cliente || "—"
    const produto = m.produto || "—"
    const chave = chaveDia(dia, cliente, produto)
    const g = grupos.get(chave) ?? { chave, data: dia, cliente, produto, realizado: 0, local: m.local, tipoServico: m.tipoServico }
    g.realizado += m.pesoLiquido || 0
    if (!g.local && m.local) g.local = m.local
    if (!g.tipoServico && m.tipoServico) g.tipoServico = m.tipoServico
    grupos.set(chave, g)
  }

  const rows = [...grupos.values()]
    .sort((a, b) => (a.data === b.data ? a.cliente.localeCompare(b.cliente) : a.data.localeCompare(b.data)))
    .map((g) => {
      const ov = overlayMap.get(g.chave)
      // casa com o Contrato de Expedição p/ tipo/operação (default; editável por cima)
      const contrato = contratos.find(
        (c) => clienteMatch(g.cliente, c.cliente.nome) && produtoMatch(g.produto, c.produtoAbreviado || c.produtoSistema)
      )
      return {
        chave: g.chave,
        data: g.data,
        cliente: g.cliente,
        produto: g.produto,
        tipoOperacao: ov?.tipoOperacao ?? contrato?.tipoProduto ?? tipoDoServico(g.tipoServico),
        operacao: ov?.operacao ?? contrato?.operacao ?? null,
        linhaProducao: ov?.linhaProducao ?? g.local ?? null,
        forecast: ov?.forecast ?? 0,
        turnoA: ov?.turnoA ?? 0,
        turnoB: ov?.turnoB ?? 0,
        turnoC: ov?.turnoC ?? 0,
        obs: ov?.obs ?? "",
        realizado: Math.round(g.realizado * 10) / 10,
      }
    })

  return NextResponse.json({ ano, mes: pad(mes), rows })
}

// PATCH — grava a camada editável de uma linha (chave = dia|cliente|produto)
const TXT = ["tipoOperacao", "operacao", "linhaProducao", "obs"] as const
const NUM = ["forecast", "turnoA", "turnoB", "turnoC"] as const
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const b = await req.json()
  const chave = String(b.chave ?? "").trim()
  if (!chave) return NextResponse.json({ error: "chave obrigatória" }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  for (const c of TXT) if (b[c] !== undefined) data[c] = b[c] === "" ? null : b[c]
  for (const c of NUM) if (b[c] !== undefined) data[c] = Number(b[c]) || 0
  try {
    await prisma.expedicaoDiaDia.upsert({ where: { chave }, update: data, create: { chave, ...data } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao salvar", detail: String(err) }, { status: 500 })
  }
}
