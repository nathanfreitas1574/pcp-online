import { prisma } from "@/lib/prisma"
import { mesRange, mesLabel } from "@/lib/cobertura"
import BiEstoquesClient from "./BiEstoquesClient"

export const dynamic = "force-dynamic"

export default async function BiEstoquesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
  const mes = mesRange(sp.mes) ? sp.mes! : mesAtual
  const range = mesRange(mes)!
  const inicio = range.gte
  const fim = range.lt

  // Lista de meses recentes para o seletor (mês atual + 11 anteriores)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  if (!meses.includes(mes)) meses.unshift(mes)

  const [snapshots, quebras, insumos, movimentos] = await Promise.all([
    prisma.estoqueSnapshot.findMany({
      where: { data: { gte: inicio, lt: fim } },
      orderBy: [{ clienteNome: "asc" }, { produto: "asc" }],
    }),
    prisma.quebra.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nome: true } } },
    }),
    prisma.insumo.findMany({
      where: { ativo: true },
      include: {
        movimentos: {
          where: { data: { gte: inicio, lt: fim } },
          orderBy: { data: "desc" },
        },
      },
    }),
    prisma.insumoMovimento.findMany({
      where: { data: { gte: inicio, lt: fim } },
      orderBy: { data: "desc" },
      take: 100,
      include: { insumo: { select: { descricao: true } } },
    }),
  ])

  // Calcular KPIs
  const saldoInicial = snapshots.reduce((s, x) => s + x.saldoInicial, 0)
  const entradas = snapshots.reduce((s, x) => s + x.entradas, 0)
  const saidas = snapshots.reduce((s, x) => s + x.saidas, 0)
  const saldoFinal = snapshots.reduce((s, x) => s + x.saldoFinal, 0)
  const totalQuebras = quebras.reduce((s, q) => s + q.quebraTotal, 0)

  // Saldo por cliente
  const porCliente = Object.entries(
    snapshots.reduce((acc, s) => {
      acc[s.clienteNome] = (acc[s.clienteNome] ?? 0) + s.saldoFinal
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])

  // Saldo por produto
  const porProduto = Object.entries(
    snapshots.reduce((acc, s) => {
      acc[s.produto] = (acc[s.produto] ?? 0) + s.saldoFinal
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])

  return (
    <BiEstoquesClient
      mes={mes}
      mesLabel={mesLabel(mes)}
      meses={meses}
      saldoInicial={saldoInicial}
      entradas={entradas}
      saidas={saidas}
      saldoFinal={saldoFinal}
      totalQuebras={totalQuebras}
      porCliente={porCliente}
      porProduto={porProduto}
      quebras={quebras}
      insumos={insumos}
      movimentos={movimentos}
    />
  )
}
