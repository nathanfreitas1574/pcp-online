import { prisma } from "@/lib/prisma"
import MarcacoesClient from "./MarcacoesClient"

export const dynamic = "force-dynamic"

export default async function MarcacoesPage() {
  const [safras, clientes, produtos, transportadoras, agregadoOperacao] = await Promise.all([
    prisma.contratoArmazenagem.findMany({
      where: { ativo: true, safra: { not: null } },
      distinct: ["safra"],
      select: { safra: true },
      orderBy: { safra: "desc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, clienteDestino: { not: null } },
      distinct: ["clienteDestino"],
      select: { clienteDestino: true },
      orderBy: { clienteDestino: "asc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, produto: { not: null } },
      distinct: ["produto"],
      select: { produto: true },
      orderBy: { produto: "asc" },
    }),
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true, transportadora: { not: null } },
      distinct: ["transportadora"],
      select: { transportadora: true },
      orderBy: { transportadora: "asc" },
    }),
    // linhas cruas p/ os cards — dedup por romaneio é feito em JS (groupBy contaria duplicados)
    prisma.marcacaoVeiculo.findMany({
      where: { ativo: true },
      select: { operacao: true, pesoLiquido: true, romaneio: true, status: true },
    }),
  ])

  // A origem às vezes traz a MESMA entrega em 2+ linhas (mesmo romaneio, nº diferente).
  // Mantém 1 linha por romaneio: prefere a CHECKOUT; empate → maior peso líquido.
  const ehCheckout = (s: string | null) => (s ?? "").toUpperCase().replace(/[^A-Z]/g, "").includes("CHECKOUT")
  const porRomaneio = new Map<string, typeof agregadoOperacao[number]>()
  const semRomaneio: typeof agregadoOperacao = []
  for (const m of agregadoOperacao) {
    const rom = String(m.romaneio ?? "").trim()
    if (!rom) { semRomaneio.push(m); continue }
    const atual = porRomaneio.get(rom)
    if (!atual) { porRomaneio.set(rom, m); continue }
    const melhor =
      ehCheckout(m.status) !== ehCheckout(atual.status) ? (ehCheckout(m.status) ? m : atual)
      : (m.pesoLiquido || 0) > (atual.pesoLiquido || 0) ? m : atual
    porRomaneio.set(rom, melhor)
  }
  const unicas = [...porRomaneio.values(), ...semRomaneio]
  const agregadoMap = new Map<string, { operacao: string; count: number; pesoLiquido: number }>()
  for (const m of unicas) {
    const op = m.operacao ?? "—"
    const g = agregadoMap.get(op) ?? { operacao: op, count: 0, pesoLiquido: 0 }
    g.count++; g.pesoLiquido += m.pesoLiquido || 0
    agregadoMap.set(op, g)
  }

  return (
    <MarcacoesClient
      safras={safras.map(s => s.safra!).filter(Boolean)}
      clientes={clientes.map(c => c.clienteDestino!).filter(Boolean)}
      produtos={produtos.map(p => p.produto!).filter(Boolean)}
      transportadoras={transportadoras.map(t => t.transportadora!).filter(Boolean)}
      agregadoOperacao={[...agregadoMap.values()]}
    />
  )
}
