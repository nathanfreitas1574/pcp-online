import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST { armazemId, balcaoFechado } → alterna o estado do balcão
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const b = await req.json()
  if (!b.armazemId) return NextResponse.json({ error: "armazemId obrigatório" }, { status: 400 })

  const cfg = await prisma.plantaConfig.upsert({
    where: { armazemId: b.armazemId },
    update: { balcaoFechado: !!b.balcaoFechado },
    create: { armazemId: b.armazemId, balcaoFechado: !!b.balcaoFechado },
  })
  return NextResponse.json({ balcaoFechado: cfg.balcaoFechado })
}
