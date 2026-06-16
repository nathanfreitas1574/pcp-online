import { auth } from "@/auth"
import { dadosVeiculoPorPlaca } from "@/lib/cobertura"
import { NextRequest, NextResponse } from "next/server"

// GET ?placa= → transportadora/motorista a partir da Marcação (para auto-preencher no modal)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const placa = new URL(req.url).searchParams.get("placa") || ""
  if (!placa.trim()) return NextResponse.json({ transportadora: null, motorista: null })

  const v = await dadosVeiculoPorPlaca(placa)
  return NextResponse.json(v ?? { transportadora: null, motorista: null })
}
