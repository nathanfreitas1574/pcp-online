import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const modulo      = searchParams.get("modulo")      || undefined
  const acao        = searchParams.get("acao")        || undefined
  const dispositivo = searchParams.get("dispositivo") || undefined
  const usuario     = searchParams.get("usuario")     || undefined
  const busca       = searchParams.get("busca")       || undefined
  const dataInicio  = searchParams.get("dataInicio")  || undefined
  const dataFim     = searchParams.get("dataFim")     || undefined
  const page        = parseInt(searchParams.get("page") || "1", 10)
  const limit       = 100

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (modulo)      where.modulo      = modulo
  if (acao)        where.acao        = acao
  if (dispositivo) where.dispositivo = dispositivo
  if (usuario)     where.usuarioNome = { contains: usuario, mode: "insensitive" }
  if (busca)       where.OR = [
    { descricao:   { contains: busca, mode: "insensitive" } },
    { referencia:  { contains: busca, mode: "insensitive" } },
    { ip:          { contains: busca, mode: "insensitive" } },
    { navegador:   { contains: busca, mode: "insensitive" } },
    { usuarioNome: { contains: busca, mode: "insensitive" } },
  ]
  if (dataInicio || dataFim) {
    where.createdAt = {}
    if (dataInicio) where.createdAt.gte = new Date(dataInicio + "T00:00:00")
    if (dataFim)    where.createdAt.lte = new Date(dataFim + "T23:59:59")
  }

  const [total, logs] = await Promise.all([
    prisma.logAtividade.count({ where }),
    prisma.logAtividade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}
