import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { snapshotBoxesHoje } from "@/lib/box-snapshot"
import { logReq } from "@/lib/log"
import { registrarHistoricoBox } from "@/lib/actions"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { volumeAtual, produto: produtoDesc, cliente, capacidade, navio, dataRecebimento, statusUso, obsBox } = body

  // Verifica se box existe
  let box = await prisma.box.findUnique({ where: { id } })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  // Atualiza campos do box (capacidade, semáforo e observação)
  const boxUpdates: Record<string, unknown> = {}
  if (capacidade !== undefined && capacidade !== null && Number(capacidade) > 0 && Number(capacidade) !== box.capacidade)
    boxUpdates.capacidade = Number(capacidade)
  if (statusUso !== undefined && statusUso !== null)
    boxUpdates.statusUso = statusUso
  if (obsBox !== undefined)
    boxUpdates.obsBox = obsBox || null

  if (Object.keys(boxUpdates).length > 0)
    box = await prisma.box.update({ where: { id }, data: boxUpdates })

  // Encontra ou cria produto (match exato primeiro; contains como fallback)
  let produtoId: string | null = null
  if (produtoDesc) {
    let prod = await prisma.produto.findFirst({ where: { descricao: { equals: produtoDesc, mode: "insensitive" } } })
    if (!prod) prod = await prisma.produto.findFirst({ where: { descricao: { contains: produtoDesc, mode: "insensitive" } } })
    if (!prod) {
      prod = await prisma.produto.create({
        data: {
          codigo: produtoDesc.substring(0, 20).replace(/\s+/g, "_").toUpperCase(),
          descricao: produtoDesc,
          unidade: "TON",
        },
      })
    }
    produtoId = prod.id
  }

  if (produtoId) {
    const alvo = Number(volumeAtual) || 0
    // fixarTotal (Vistoria do Dia): o valor digitado é o TOTAL do box — a linha do
    // produto informado fecha a conta com os demais produtos (espelho da fábrica).
    // Sem fixarTotal (recebimentos etc.): o valor é a quantidade DAQUELE produto.
    const fixarTotal = body.fixarTotal === true
    const outros = fixarTotal ? await prisma.estoque.findMany({ where: { boxId: id, produtoId: { not: produtoId } } }) : []
    const somaOutros = outros.reduce((s, e) => s + e.quantidade, 0)
    const qtdProduto = fixarTotal ? Math.max(0, alvo - somaOutros) : alvo

    const dadosEstoque = {
      quantidade: qtdProduto,
      clienteNome: cliente || null,
      navio: navio || null,
      dataRecebimento: dataRecebimento ? new Date(dataRecebimento) : null,
    }
    // Upsert do estoque (um box pode ter VÁRIOS produtos — não apaga os demais)
    await prisma.estoque.upsert({
      where: { produtoId_boxId: { produtoId, boxId: id } },
      update: dadosEstoque,
      create: { produtoId, boxId: id, ...dadosEstoque },
    })
    // total lançado MENOR que a soma dos outros produtos → reduz os outros
    // proporcionalmente p/ o box fechar exatamente no total da vistoria
    if (fixarTotal && somaOutros > alvo) {
      const fator = somaOutros > 0 ? alvo / somaOutros : 0
      for (const e of outros) {
        await prisma.estoque.update({ where: { id: e.id }, data: { quantidade: Math.round(e.quantidade * fator * 100) / 100 } })
      }
    }
  } else if (volumeAtual === 0 && body.esvaziarTudo) {
    // Esvaziar box
    await prisma.estoque.deleteMany({ where: { boxId: id } })
  }

  // Gerar alerta automático se capacidade crítica
  const pct = box.capacidade > 0 ? (volumeAtual / box.capacidade) * 100 : 0

  if (pct >= 90) {
    const existeAlerta = await prisma.alerta.findFirst({
      where: { boxId: id, tipo: "BOX_CAPACIDADE_CRITICA", status: "ABERTO" },
    })
    if (!existeAlerta) {
      await prisma.alerta.create({
        data: {
          tipo: "BOX_CAPACIDADE_CRITICA",
          severidade: "CRITICO",
          titulo: `Box ${box.codigo} em capacidade crítica`,
          descricao: `Box ${box.codigo} está em ${pct.toFixed(1)}% da capacidade (${volumeAtual.toLocaleString("pt-BR")} / ${box.capacidade.toLocaleString("pt-BR")} ton).`,
          referencia: box.codigo,
          boxId: id,
          usuarioId: session.user.id,
        },
      })
    }
  } else {
    // Resolver alerta se capacidade voltou ao normal
    await prisma.alerta.updateMany({
      where: { boxId: id, tipo: "BOX_CAPACIDADE_CRITICA", status: "ABERTO" },
      data: { status: "RESOLVIDO", resolvidoEm: new Date() },
    })
  }

  // Histórico e log
  await registrarHistoricoBox(id, box.codigo, volumeAtual > 0 ? "ATUALIZAR" : "ESVAZIAR", {
    produto: produtoDesc, clienteNome: cliente, volume: volumeAtual, pctOcupacao: pct,
  })
  await logReq(req, "BOXES", "ATUALIZAR_ESTOQUE", `Box ${box.codigo}: ${volumeAtual} ton (${pct.toFixed(1)}%) — ${produtoDesc ?? "sem produto"}`, box.codigo)

  snapshotBoxesHoje().catch((e) => console.error("snapshot boxes:", e)) // histórico por dia
  return NextResponse.json({ ok: true, pct: pct.toFixed(1) })
}
