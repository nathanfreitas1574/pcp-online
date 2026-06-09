import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Rota pública — sem autenticação — usada pelo formulário de lacre externo
export async function GET() {
  const boxes = await prisma.box.findMany({
    where: { ativo: true },
    select: { id: true, codigo: true, descricao: true },
    orderBy: { codigo: "asc" },
  })
  return NextResponse.json({ boxes })
}
