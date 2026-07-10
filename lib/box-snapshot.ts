import { prisma } from "@/lib/prisma"

// Grava/atualiza o snapshot de HOJE de todos os boxes ativos (upsert por dia+box).
// Chamado após vistoria/alteração de estoque — fire-and-forget (não bloqueia a ação).
export async function snapshotBoxesHoje(): Promise<void> {
  const agora = new Date()
  const dia = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
  const boxes = await prisma.box.findMany({
    where: { ativo: true },
    include: { estoques: { include: { produto: { select: { descricao: true } } }, orderBy: { quantidade: "desc" } } },
  })
  for (const b of boxes) {
    const volume = b.estoques.reduce((s, e) => s + e.quantidade, 0)
    const principal = b.estoques[0]
    await prisma.boxSnapshot.upsert({
      where: { data_boxId: { data: dia, boxId: b.id } },
      update: { volume, capacidade: b.capacidade, produto: principal?.produto?.descricao ?? null, cliente: principal?.clienteNome ?? null, statusUso: b.statusUso, boxCodigo: b.codigo },
      create: { data: dia, boxId: b.id, boxCodigo: b.codigo, volume, capacidade: b.capacidade, produto: principal?.produto?.descricao ?? null, cliente: principal?.clienteNome ?? null, statusUso: b.statusUso },
    })
  }
}
