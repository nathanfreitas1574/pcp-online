// Migração (Áudio 2): inverte tipo dos boxes (AZ→Estruturado, B→Alvenaria) e
// cria os boxes "entre AZ" (1e2, 3e4, 5e6, 7e8). Idempotente.
// Uso: DATABASE_URL=... npx tsx scripts/migra_boxes_tipo.ts
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) })

async function main() {
  const boxes = await prisma.box.findMany({ select: { id: true, codigo: true, armazemId: true } })

  let azAtualizados = 0, bAtualizados = 0
  for (const b of boxes) {
    if (/^AZ\d{2}[AB]$/.test(b.codigo)) {
      await prisma.box.update({ where: { id: b.id }, data: { descricao: `Box Estruturado ${b.codigo}`, localizacao: "Estruturado" } })
      azAtualizados++
    } else if (/^B\d+$/.test(b.codigo)) {
      await prisma.box.update({ where: { id: b.id }, data: { descricao: `Box Alvenaria ${b.codigo}`, localizacao: "Alvenaria" } })
      bAtualizados++
    }
  }

  // armazém dos AZ (para herdar nos "entre AZ")
  const azRef = boxes.find(b => /^AZ\d{2}[AB]$/.test(b.codigo))
  const armazemId = azRef?.armazemId ?? null

  const entreAZ = [
    { codigo: "AZ1-2", descricao: "Box entre AZ 1 e 2" },
    { codigo: "AZ3-4", descricao: "Box entre AZ 3 e 4" },
    { codigo: "AZ5-6", descricao: "Box entre AZ 5 e 6" },
    { codigo: "AZ7-8", descricao: "Box entre AZ 7 e 8" },
  ]
  let criados = 0
  for (const e of entreAZ) {
    const existe = await prisma.box.findUnique({ where: { codigo: e.codigo } })
    if (existe) {
      await prisma.box.update({ where: { codigo: e.codigo }, data: { descricao: e.descricao, localizacao: "Estruturado", ativo: true } })
    } else {
      await prisma.box.create({ data: { codigo: e.codigo, descricao: e.descricao, localizacao: "Estruturado", capacidade: 0, armazemId, ativo: true } })
      criados++
    }
  }

  console.log(`AZ→Estruturado: ${azAtualizados} | B→Alvenaria: ${bAtualizados} | entre-AZ criados: ${criados}`)
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
