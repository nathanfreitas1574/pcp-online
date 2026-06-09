import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const navios = await prisma.naveAgendada.findMany({ orderBy: { eta: "asc" } })
  return NextResponse.json({ navios })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { nome, eta, produto, volumePrev, clienteNome, origem, berco, observacao } = await req.json()
  if (!nome || !eta) return NextResponse.json({ error: "Nome e ETA obrigatórios" }, { status: 400 })
  const navio = await prisma.naveAgendada.create({
    data: { nome, eta: new Date(eta), produto: produto || null, volumePrev: volumePrev ? Number(volumePrev) : null, clienteNome: clienteNome || null, origem: origem || null, berco: berco || null, observacao: observacao || null },
  })
  return NextResponse.json({ navio }, { status: 201 })
}
