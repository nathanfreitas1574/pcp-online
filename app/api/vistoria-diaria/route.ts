import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logReq } from "@/lib/log"
import { alertarLacreNaoConforme } from "@/lib/actions"
import { snapshotBoxesHoje } from "@/lib/box-snapshot"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { boxId, lacreConforme, codigoLacre, observacao, foto } = body as {
      boxId: string
      lacreConforme: boolean
      codigoLacre?: string
      observacao?: string
      foto?: string
    }

    const box = await prisma.box.findUnique({ where: { id: boxId } })
    if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

    // Resolve um usuário VÁLIDO. O JWT pode carregar um id antigo (ex.: após reseed
    // do banco) que não existe mais → FK falha. Revalida pelo id e, se preciso, pelo e-mail.
    let usuarioId: string | null = session.user.id ?? null
    if (usuarioId) {
      const ok = await prisma.user.findUnique({ where: { id: usuarioId }, select: { id: true } })
      if (!ok) usuarioId = null
    }
    if (!usuarioId && session.user.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
      usuarioId = byEmail?.id ?? null
    }
    if (!usuarioId) {
      return NextResponse.json({ error: "Sessão desatualizada. Saia e entre novamente para registrar." }, { status: 401 })
    }

    const status = lacreConforme ? "FECHADO" : "NAO_CONFORME"

    const [auditoria, lacre] = await prisma.$transaction([
      prisma.auditoriaBox.create({
        data: {
          boxId,
          usuarioId,
          observacao: observacao || null,
          fotos: foto ? [foto] : [],
          conforme: lacreConforme,
        },
      }),
      prisma.lacre.create({
        data: {
          boxId,
          usuarioId,
          status,
          codigoLacre: codigoLacre || null,
          observacao: observacao || null,
          foto: foto || null,
        },
        include: { box: { select: { codigo: true } } },
      }),
    ])

    await logReq(req, "VISTORIA", "REGISTRAR",
      `Vistoria do dia registrada — Box ${box.codigo}: lacre ${lacreConforme ? "conforme" : "não conforme"}`,
      box.codigo
    )

    // Alerta não pode bloquear o registro da vistoria
    if (!lacreConforme) {
      try { await alertarLacreNaoConforme(boxId, box.codigo, usuarioId) } catch (e) { console.error("alerta lacre:", e) }
    }

    // snapshot diário dos boxes (histórico por dia) — não bloqueia a vistoria
    snapshotBoxesHoje().catch((e) => console.error("snapshot boxes:", e))

    return NextResponse.json({ auditoria, lacre }, { status: 201 })
  } catch (e) {
    console.error("Erro ao registrar vistoria-diaria:", e)
    const msg = e instanceof Error ? e.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
