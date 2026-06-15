import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST { ids: string[] } — exclui várias coberturas de uma vez.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : []
  if (!ids.length) return NextResponse.json({ error: "Nenhum registro selecionado." }, { status: 400 })

  const r = await prisma.coberturaPendente.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ ok: true, excluidos: r.count })
}
