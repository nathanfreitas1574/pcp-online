import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/contratos/lookup?numero=000123
// Retorna os contratos com aquele número (pode haver 1 por filial),
// para auto-preencher cliente e produto na programação.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const numero = (new URL(req.url).searchParams.get("numero") || "").trim()
  if (!numero) return NextResponse.json({ matches: [] })

  // tenta exato e, se não achar, com zeros à esquerda (TOTVS usa 6 dígitos)
  let matches = await prisma.contratoArmazenagem.findMany({
    where: { ativo: true, numero },
    select: { numero: true, filial: true, clienteNome: true, desProduto: true, codProduto: true, descTabela: true, safra: true },
  })
  if (!matches.length) {
    const pad = numero.padStart(6, "0")
    matches = await prisma.contratoArmazenagem.findMany({
      where: { ativo: true, numero: pad },
      select: { numero: true, filial: true, clienteNome: true, desProduto: true, codProduto: true, descTabela: true, safra: true },
    })
  }

  return NextResponse.json({ matches })
}
