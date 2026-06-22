import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const box = await prisma.box.findUnique({
    where: { id },
    include: {
      estoques: { include: { produto: true }, orderBy: { quantidade: "desc" } },
    },
  })
  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const url = `${baseUrl}/box-info/${id}`

  const qr = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#1B6B2E", light: "#FFFFFF" },
  })

  return NextResponse.json({
    box: { id: box.id, codigo: box.codigo, descricao: box.descricao, capacidade: box.capacidade },
    estoque: box.estoques.reduce((s, e) => s + e.quantidade, 0),
    produto: box.estoques[0]?.produto?.descricao ?? null,
    qrCode: qr,
    url,
  })
}
