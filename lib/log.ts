/**
 * Helper de log para API routes (captura IP, User-Agent, dispositivo, navegador).
 * Use `logReq(req, ...)` dentro de route handlers.
 * Use `logAtividade(...)` em Server Actions (sem acesso ao req).
 */

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

// ── Detecta tipo de dispositivo ───────────────────────────────────────────────
export function parseDispositivo(ua: string): string {
  if (!ua) return "Desconhecido"
  if (/iPhone|iPod|(Android.*Mobile)|Windows Phone|BlackBerry/.test(ua)) return "Celular"
  if (/iPad|Android(?!.*Mobile)|Tablet|PlayBook/.test(ua)) return "Tablet"
  return "Computador"
}

// ── Detecta nome e versão do navegador ────────────────────────────────────────
export function parseNavegador(ua: string): string {
  if (!ua) return "Desconhecido"
  // Ordem importa: Edge antes de Chrome, Opera antes de Chrome
  const rules: [RegExp, string][] = [
    [/Edg\/([\d]+)/,     "Edge"],
    [/OPR\/([\d]+)/,     "Opera"],
    [/SamsungBrowser\/([\d]+)/, "Samsung Browser"],
    [/CriOS\/([\d]+)/,   "Chrome iOS"],
    [/FxiOS\/([\d]+)/,   "Firefox iOS"],
    [/Chrome\/([\d]+)/,  "Chrome"],
    [/Firefox\/([\d]+)/, "Firefox"],
    [/Safari\/([\d]+)/,  "Safari"],
    [/MSIE ([\d]+)/,     "IE"],
    [/Trident.*rv:([\d]+)/, "IE"],
  ]
  for (const [regex, name] of rules) {
    const m = ua.match(regex)
    if (m) return `${name} ${m[1]}`
  }
  return "Outro"
}

// ── Extrai IP real da requisição ──────────────────────────────────────────────
export function getClientIP(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    null
  )
}

// ── Log a partir de um API Route Handler (tem acesso ao NextRequest) ──────────
export async function logReq(
  req: NextRequest,
  modulo: string,
  acao: string,
  descricao: string,
  referencia?: string,
  usuarioIdOverride?: string | null,
  usuarioNomeOverride?: string | null,
) {
  try {
    const session = await auth()
    const ua = req.headers.get("user-agent") ?? ""
    const ip = getClientIP(req)

    await prisma.logAtividade.create({
      data: {
        usuarioId:   usuarioIdOverride   !== undefined ? usuarioIdOverride   : (session?.user?.id   ?? null),
        usuarioNome: usuarioNomeOverride !== undefined ? usuarioNomeOverride : (session?.user?.name ?? "Público"),
        acao, modulo, descricao,
        referencia:  referencia ?? null,
        ip,
        userAgent:   ua || null,
        dispositivo: ua ? parseDispositivo(ua) : null,
        navegador:   ua ? parseNavegador(ua)   : null,
      },
    })
  } catch { /* não bloqueia a operação principal */ }
}

// ── Log a partir de Server Action (sem req, sem IP/UA) ────────────────────────
export async function logAtividade(
  modulo: string,
  acao: string,
  descricao: string,
  referencia?: string,
) {
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
