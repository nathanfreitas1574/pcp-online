import { config } from "dotenv"
config()

import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const BOXES_ALVENARIA = [
  "AZ01A", "AZ01B", "AZ02A", "AZ02B", "AZ03A", "AZ03B",
  "AZ04A", "AZ04B", "AZ05A", "AZ05B", "AZ06A", "AZ06B",
  "AZ07A", "AZ07B", "AZ08A", "AZ08B",
]
const BOXES_ESTRUTURADO = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10"]

async function main() {
  // Admin user
  const password = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@pcp.com" },
    update: {},
    create: { name: "Administrador", email: "admin@pcp.com", password, role: "ADMIN" },
  })

  // PCP user
  const pcpPass = await bcrypt.hash("pcp123", 10)
  await prisma.user.upsert({
    where: { email: "pcp@fertalvo.com" },
    update: {},
    create: { name: "PCP Fertalvo", email: "pcp@fertalvo.com", password: pcpPass, role: "PCP" },
  })

  // Boxes Alvenaria
  for (const cod of BOXES_ALVENARIA) {
    await prisma.box.upsert({
      where: { codigo: cod },
      update: {},
      create: { codigo: cod, descricao: `Box Alvenaria ${cod}`, localizacao: "Alvenaria", capacidade: 6000 },
    })
  }

  // Boxes Estruturado
  for (const cod of BOXES_ESTRUTURADO) {
    await prisma.box.upsert({
      where: { codigo: cod },
      update: {},
      create: { codigo: cod, descricao: `Box Estruturado ${cod}`, localizacao: "Estruturado", capacidade: 25000 },
    })
  }

  // Clientes principais
  const clientes = [
    { codigo: "FTO", nome: "FTO" },
    { codigo: "CIBRA", nome: "CIBRAFERTIL" },
    { codigo: "LDC", nome: "LDC" },
    { codigo: "3TENTOS", nome: "TRES TENTOS" },
    { codigo: "QUIMIVITA", nome: "QUIMIVITA" },
    { codigo: "DREYMOOR", nome: "DREYMOOR" },
    { codigo: "ALVORADA", nome: "AGRICOLA ALVORADA" },
    { codigo: "OCP", nome: "OCP" },
    { codigo: "BUNGE", nome: "BUNGE" },
    { codigo: "AMAGGI", nome: "AMAGGI" },
    { codigo: "EUROCHEM", nome: "EUROCHEM" },
    { codigo: "YARA", nome: "YARA" },
    { codigo: "ORIGEO", nome: "ORIGEO" },
    { codigo: "LDC2", nome: "LOUIS DREYFUS" },
  ]

  for (const c of clientes) {
    await prisma.cliente.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: c,
    })
  }

  // Produtos principais
  const produtos = [
    { codigo: "UREIA", descricao: "UREIA 46%", unidade: "TON" },
    { codigo: "SSP18", descricao: "SSP 18 GR", unidade: "TON" },
    { codigo: "SSP19", descricao: "SSP 19 GR", unidade: "TON" },
    { codigo: "SSP20", descricao: "SSP 20", unidade: "TON" },
    { codigo: "SSP21", descricao: "SSP 21 BB", unidade: "TON" },
    { codigo: "SSP23", descricao: "SSP 23 GR", unidade: "TON" },
    { codigo: "KCL", descricao: "KCL", unidade: "TON" },
    { codigo: "SAM205", descricao: "SAM 20,5 / 23%S", unidade: "TON" },
    { codigo: "SAM21", descricao: "SAM 21 BB", unidade: "TON" },
    { codigo: "NP0134", descricao: "NP 01 34 GR", unidade: "TON" },
    { codigo: "TSP45", descricao: "TSP 45 BB", unidade: "TON" },
    { codigo: "TSP46", descricao: "TSP 46", unidade: "TON" },
    { codigo: "MAP", descricao: "MAP 12 52 00", unidade: "TON" },
    { codigo: "HIPHOS25", descricao: "HIPHOS 25", unidade: "TON" },
  ]

  for (const p of produtos) {
    await prisma.produto.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: p,
    })
  }

  console.log("✅ Seed concluído!")
  console.log("   Login admin: admin@pcp.com / admin123")
  console.log("   Login PCP:   pcp@fertalvo.com / pcp123")
  console.log(`   ${BOXES_ALVENARIA.length + BOXES_ESTRUTURADO.length} boxes criados`)
  console.log(`   ${clientes.length} clientes e ${produtos.length} produtos`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
