import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { snapshotBoxesHoje } from "@/lib/box-snapshot"
import { logReq } from "@/lib/log"
import { registrarHistoricoBox } from "@/lib/actions"

// Itens de um box — um box pode guardar VÁRIOS produtos (cliente · produto · quantidade)

async function recalcAlerta(boxId: string, codigo: string, capacidade: number, usuarioId: string) {
  const agg = await prisma.estoque.aggregate({ where: { boxId }, _sum: { quantidade: true } })
  const total = agg._sum.quantidade ?? 0
  const pct = capacidade > 0 ? (total / capacidade) * 100 : 0
  if (pct >= 90) {
    const existe = await prisma.alerta.findFirst({
      where: { boxId, tipo: "BOX_CAPACIDADE_CRITICA", status: "ABERTO" },
    })
    if (!existe) {
      await prisma.alerta.create({
        data: {
          tipo: "BOX_CAPACIDADE_CRITICA", severidade: "CRITICO",
          titulo: `Box ${codigo} em capacidade crítica`,
          descricao: `Box ${codigo} está em ${pct.toFixed(1)}% da capacidade (${total.toLocaleString("pt-BR")} / ${capacidade.toLocaleString("pt-BR")} ton).`,
          referencia: codigo, boxId, usuarioId,
        },
      })
    }
  } else {
    await prisma.alerta.updateMany({
      where: { boxId, tipo: "BOX_CAPACIDADE_CRITICA", status: "ABERTO" },
      data: { status: "RESOLVIDO", resolvidoEm: new Date() },
    })
  }
  return { total, pct }
}

// GET — lista os itens do box
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const itens = await prisma.estoque.findMany({
    where: { boxId: id },
    include: { produto: { select: { descricao: true } } },
    orderBy: { quantidade: "desc" },
  })
  return NextResponse.json(
    itens.map((e) => ({
      produtoId: e.produtoId,
      produto: e.produto?.descricao ?? "",
      cliente: e.clienteNome ?? "",
      quantidade: e.quantidade,
      navio: e.navio ?? "",
      dataRecebimento: e.dataRecebimento ? e.dataRecebimento.toISOString().slice(0, 10) : "",
    }))
  )
}

// POST — adiciona/atualiza um item (cliente · produto · quantidade)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const b = await req.json()

  const produtoDesc = String(b.produto ?? "").trim()
  const cliente = String(b.cliente ?? "").trim()
  const quantidade = Number(b.quantidade) || 0
  if (!produtoDesc) return NextResponse.json({ error: "Informe o produto." }, { status: 400 })

  const box = await prisma.box.findUnique({ where: { id } })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  // encontra ou cria o produto (match exato por descrição, senão cria)
  let prod = await prisma.produto.findFirst({ where: { descricao: { equals: produtoDesc, mode: "insensitive" } } })
  if (!prod) {
    const baseCod = produtoDesc.substring(0, 20).replace(/\s+/g, "_").toUpperCase() || "PROD"
    let codigo = baseCod
    if (await prisma.produto.findUnique({ where: { codigo } })) codigo = `${baseCod}_${String(Date.now()).slice(-4)}`
    prod = await prisma.produto.create({ data: { codigo, descricao: produtoDesc, unidade: "TON" } })
  }

  const dados = {
    quantidade,
    clienteNome: cliente || null,
    navio: (b.navio && String(b.navio).trim()) || null,
    dataRecebimento: b.dataRecebimento ? new Date(b.dataRecebimento) : null,
  }
  await prisma.estoque.upsert({
    where: { produtoId_boxId: { produtoId: prod.id, boxId: id } },
    update: dados,
    create: { produtoId: prod.id, boxId: id, ...dados },
  })

  const { total, pct } = await recalcAlerta(id, box.codigo, box.capacidade, session.user.id)
  await registrarHistoricoBox(id, box.codigo, "ATUALIZAR", { produto: produtoDesc, clienteNome: cliente, volume: quantidade, pctOcupacao: pct })
  await logReq(req, "BOXES", "ITEM_ADD", `Box ${box.codigo}: +${produtoDesc} (${cliente || "—"}) ${quantidade} t`, box.codigo)
  snapshotBoxesHoje().catch(() => {}) // histórico por dia
  return NextResponse.json({ ok: true, produtoId: prod.id, total, pct: pct.toFixed(1) }, { status: 201 })
}

// DELETE — remove um item do box (?produtoId=...)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const produtoId = req.nextUrl.searchParams.get("produtoId")
  if (!produtoId) return NextResponse.json({ error: "produtoId obrigatório" }, { status: 400 })

  const box = await prisma.box.findUnique({ where: { id } })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  await prisma.estoque.deleteMany({ where: { boxId: id, produtoId } })
  const { total, pct } = await recalcAlerta(id, box.codigo, box.capacidade, session.user.id)
  await logReq(req, "BOXES", "ITEM_DEL", `Box ${box.codigo}: removeu item`, box.codigo)
  snapshotBoxesHoje().catch(() => {}) // histórico por dia
  return NextResponse.json({ ok: true, total, pct: pct.toFixed(1) })
}
