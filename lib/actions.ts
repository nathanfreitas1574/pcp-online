"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/** Registra log de atividade (Server Actions — sem req, sem IP/UA) */
export async function logAtividade(modulo: string, acao: string, descricao: string, referencia?: string) {
  try {
    const session = await auth()
    await prisma.logAtividade.create({
      data: {
        usuarioId:   session?.user?.id   ?? null,
        usuarioNome: session?.user?.name ?? "Sistema",
        acao, modulo, descricao,
        referencia: referencia ?? null,
        ip: null, userAgent: null, dispositivo: null, navegador: null,
      },
    })
  } catch { /* não bloqueia */ }
}

/** Registra histórico de um box */
export async function registrarHistoricoBox(boxId: string, boxCodigo: string, acao: string, dados: {
  produto?: string; clienteNome?: string; volume?: number; pctOcupacao?: number; observacao?: string
}) {
  try {
    const session = await auth()
    await prisma.historicoBox.create({
      data: {
        boxId, boxCodigo, acao,
        produto: dados.produto ?? null,
        clienteNome: dados.clienteNome ?? null,
        volume: dados.volume ?? null,
        pctOcupacao: dados.pctOcupacao ?? null,
        usuarioNome: session?.user?.name ?? "Sistema",
        observacao: dados.observacao ?? null,
      },
    })
  } catch { /* não bloqueia */ }
}

/** Gera alerta automático se lacre não conforme */
export async function alertarLacreNaoConforme(boxId: string, boxCodigo: string, usuarioId: string) {
  const existe = await prisma.alerta.findFirst({
    where: { boxId, tipo: "LACRE_NAO_CONFORME", status: "ABERTO" },
  })
  if (!existe) {
    await prisma.alerta.create({
      data: {
        tipo: "LACRE_NAO_CONFORME",
        severidade: "CRITICO",
        titulo: `Lacre não conforme — Box ${boxCodigo}`,
        descricao: `O lacre do box ${boxCodigo} foi registrado como NÃO CONFORME. Verificação imediata necessária.`,
        referencia: boxCodigo,
        boxId,
        usuarioId,
      },
    })
  }
}
