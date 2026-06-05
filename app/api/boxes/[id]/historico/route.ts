import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const historico = await prisma.historicoBox.findMany({
    where: { boxId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json(historico)
}
