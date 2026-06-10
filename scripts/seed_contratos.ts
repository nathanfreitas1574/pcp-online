import * as fs from "fs"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const raw = fs.readFileSync("./contratos_import.json", "utf8")
  const { contratos } = JSON.parse(raw) as { contratos: Record<string, unknown>[] }

  let criados = 0
  let atualizados = 0

  for (const item of contratos) {
    const numero = item.numero as string
    const data = {
      ultAlt:        (item.ultAlt as string|null) || null,
      descricao:     (item.descricao as string) || "",
      tipoMercado:   (item.tipoMercado as string|null) || null,
      dataCtr:       item.dataCtr ? new Date(item.dataCtr as string) : null,
      ctrExterno:    (item.ctrExterno as string|null) || null,
      codEntidade:   (item.codEntidade as string|null) || null,
      lojEntidade:   (item.lojEntidade as string|null) || null,
      clienteNome:   (item.clienteNome as string) || "",
      safra:         (item.safra as string|null) || null,
      codProduto:    (item.codProduto as string|null) || null,
      desProduto:    (item.desProduto as string) || "",
      descTabela:    (item.descTabela as string|null) || null,
      qtdContratada: (item.qtdContratada as number) || 0,
      stsAssinatura: (item.stsAssinatura as string) || "Aberto",
      stsFiscal:     (item.stsFiscal as string) || "Aberto",
      stsFinanceiro: (item.stsFinanceiro as string) || "Aberto",
      stsEstoque:    (item.stsEstoque as string) || "Aberto",
      modalidade:    (item.modalidade as string|null) || null,
      centroCusto:   (item.centroCusto as string|null) || null,
      ativo: true,
    }

    const exists = await prisma.contratoArmazenagem.findUnique({ where: { numero } })
    if (exists) {
      await prisma.contratoArmazenagem.update({ where: { numero }, data })
      atualizados++
    } else {
      await prisma.contratoArmazenagem.create({ data: { numero, ...data } })
      criados++
    }
  }

  console.log(`✅ Importação concluída: ${criados} criados, ${atualizados} atualizados (total ${criados + atualizados})`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
