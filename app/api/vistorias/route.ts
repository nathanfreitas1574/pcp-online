import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET — histórico de vistorias (AuditoriaBox) com filtros + totais
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boxCodigo = searchParams.get("box") || undefined
  const usuario = searchParams.get("usuario") || undefined
  const conforme = searchParams.get("conforme") // "true" | "false"
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim = searchParams.get("dataFim") || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (boxCodigo) where.box = { codigo: { contains: boxCodigo, mode: "insensitive" } }
  if (usuario) where.usuario = { name: { contains: usuario, mode: "insensitive" } }
  if (conforme === "true") where.conforme = true
  if (conforme === "false") where.conforme = false
  if (dataInicio || dataFim) {
    where.data = {}
    if (dataInicio) where.data.gte = new Date(dataInicio)
    if (dataFim) { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); where.data.lte = d }
  }

  const [registros, total, naoConformes] = await Promise.all([
    prisma.auditoriaBox.findMany({
      where,
      orderBy: { data: "desc" },
      take: 1000,
      include: { box: { select: { codigo: true, descricao: true } }, usuario: { select: { name: true } } },
    }),
    prisma.auditoriaBox.count({ where }),
    prisma.auditoriaBox.count({ where: { ...where, conforme: false } }),
  ])

  const itens = registros.map(r => ({
    id: r.id,
    data: r.data.toISOString(),
    boxCodigo: r.box?.codigo ?? "—",
    boxDescricao: r.box?.descricao ?? "",
    usuario: r.usuario?.name ?? "—",
    conforme: r.conforme,
    observacao: r.observacao,
    fotos: r.fotos?.length ?? 0,
  }))

  return NextResponse.json({ itens, total, conformes: total - naoConformes, naoConformes })
}
