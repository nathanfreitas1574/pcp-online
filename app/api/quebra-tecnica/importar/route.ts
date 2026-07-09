import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseQuebraRows } from "@/lib/quebra-import"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

// POST — importa a aba "QUEBRAS" do Excel. modo=substituir (padrão) limpa e recarrega; modo=adicionar acrescenta.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Sem permissão (apenas ADMIN/PCP)" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const modo = (formData.get("modo") as string) || "substituir"
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const nomeAba = wb.SheetNames.find((n) => n.toUpperCase().includes("QUEBRA")) ?? wb.SheetNames[0]
  const ws = wb.Sheets[nomeAba]
  if (!ws) return NextResponse.json({ error: "Planilha sem aba de dados" }, { status: 400 })
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]

  const parsed = parseQuebraRows(rows)
  if (!parsed.length)
    return NextResponse.json({ error: `Nenhuma linha de quebra reconhecida na aba "${nomeAba}". Verifique os cabeçalhos (DATA, CLIENTE, PRODUTO, VOLUME RECEBIDO, QUEBRA TECNICA...).` }, { status: 400 })

  if (modo === "substituir") await prisma.quebraTecnica.deleteMany({})
  const r = await prisma.quebraTecnica.createMany({ data: parsed })

  return NextResponse.json({ ok: true, importados: r.count, aba: nomeAba, modo })
}
