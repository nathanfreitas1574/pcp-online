import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ehCheckout, ymd, DIA, dedupePorRomaneio } from "@/lib/programacao"
import { NextRequest, NextResponse } from "next/server"

// GET — descargas FINALIZADAS (CHECKOUT) dos últimos N dias.
// Serve de REFERÊNCIA na Vistoria do box: o cliente decide se soma ao volume.
// (A marcação não vincula box; o casamento cliente+produto é feito no cliente.)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias")) || 10, 1), 60)
  const hoje = new Date()
  const corte = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()) - (dias - 1) * DIA)

  const raw = await prisma.marcacaoVeiculo.findMany({
    where: { ativo: true, operacao: { contains: "DESCARGA" }, dataCarregamento: { gte: corte } },
    select: { clienteDestino: true, cliente: true, produto: true, pesoLiquido: true, dataCarregamento: true, status: true, romaneio: true },
    orderBy: { dataCarregamento: "desc" },
  })

  const descargas = dedupePorRomaneio(raw.filter(m => ehCheckout(m.status) && m.dataCarregamento))
    .map(m => ({
      data: ymd(new Date(m.dataCarregamento!)),
      cliente: m.cliente ?? "",
      clienteDestino: m.clienteDestino ?? "",
      produto: m.produto ?? "",
      peso: m.pesoLiquido || 0,
    }))

  return NextResponse.json({ dias, hoje: ymd(hoje), descargas })
}
