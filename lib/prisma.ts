import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  // Durante o build do Docker, DATABASE_URL pode ser inválida
  // O PrismaPg só conecta quando uma query é feita (lazy)
  const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder"
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  })
}

// Lazy singleton — cria apenas quando necessário
let _prisma: PrismaClient | undefined

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma ?? createPrismaClient()
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma
    }
    const value = (_prisma as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === "function") return value.bind(_prisma)
    return value
  },
})
