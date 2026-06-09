/**
 * POST /api/armazens/seed
 * Cria os 4 armazéns padrão e atribui automaticamente os boxes existentes
 * baseando-se no código do box. Idempotente — pode rodar várias vezes.
 */
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const DEFAULTS = [
  { codigo: "NAVE",        nome: "Nave",                 descricao: "Armazém principal coberto — Boxes B01 a B12",          ordem: 1, match: (c: string) => /^B\d+/.test(c) },
  { codigo: "AZ1",         nome: "AZ1 — Baias",          descricao: "32 baias de armazenagem lateral",                       ordem: 2, match: (c: string) => /^(BAIA|AZ01)/i.test(c) },
  { codigo: "AZ2",         nome: "AZ2 — Compactador",    descricao: "Área exclusiva de compactação — sem boxes",              ordem: 3, match: () => false },
  { codigo: "ESTRUTURADO", nome: "Estruturado",          descricao: "Módulos AZ03A/B a AZ08A/B — armazenagem estruturada",   ordem: 4, match: (c: string) => /^AZ0[3-9]/i.test(c) },
]

export async function POST() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const results: Record<string, unknown> = {}

  for (const def of DEFAULTS) {
    // Cria ou recupera o armazém
    const armazem = await prisma.armazem.upsert({
      where:  { codigo: def.codigo },
      update: { nome: def.nome, descricao: def.descricao, ordem: def.ordem },
      create: { codigo: def.codigo, nome: def.nome, descricao: def.descricao, ordem: def.ordem },
    })

    // Atribui boxes que ainda não têm armazém e cujo código bate com o padrão
    const boxes = await prisma.box.findMany({ where: { armazemId: null, ativo: true } })
    const paraAtribuir = boxes.filter(b => def.match(b.codigo)).map(b => b.id)

    if (paraAtribuir.length > 0) {
      await prisma.box.updateMany({
        where: { id: { in: paraAtribuir } },
        data:  { armazemId: armazem.id },
      })
    }

    results[def.codigo] = { id: armazem.id, atribuidos: paraAtribuir.length }
  }

  return NextResponse.json({ ok: true, results })
}
