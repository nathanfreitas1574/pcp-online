import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { parseMarcacaoRows } from "@/lib/marcacao-columns"
import { parseRomaneioRows } from "@/lib/romaneio-columns"
import { parseEstoqueRows } from "@/lib/estoque-columns"
import { conciliar } from "@/lib/conciliador"

export const maxDuration = 120

function sheetRows(buf: Buffer): unknown[][] {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][]
}

// GET — lista de lotes (histórico)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lotes = await prisma.conciliacaoLote.findMany({
    orderBy: { data: "desc" },
    take: 100,
  })
  return NextResponse.json({ lotes })
}

// POST — recebe 3 planilhas (multipart), concilia e grava o lote + itens
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PCP")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const fd = await req.formData()
  const fMarc = fd.get("marcacao") as File | null
  const fRom  = fd.get("romaneio") as File | null
  const fEst  = fd.get("estoque")  as File | null
  const tolerancia = parseFloat(String(fd.get("tolerancia") ?? "0")) || 0

  if (!fMarc || !fRom || !fEst)
    return NextResponse.json({ error: "Envie as 3 planilhas: marcação, romaneio e estoque." }, { status: 400 })

  let marc, rom, est
  try {
    marc = parseMarcacaoRows(sheetRows(Buffer.from(await fMarc.arrayBuffer())))
    rom  = parseRomaneioRows(sheetRows(Buffer.from(await fRom.arrayBuffer())))
    est  = parseEstoqueRows(sheetRows(Buffer.from(await fEst.arrayBuffer())))
  } catch (e) {
    return NextResponse.json({ error: "Falha ao ler as planilhas: " + (e as Error).message }, { status: 400 })
  }

  if (!marc.length)
    return NextResponse.json({ error: "Planilha de marcação vazia ou sem a coluna '#'." }, { status: 400 })
  if (!rom.romaneios.length)
    return NextResponse.json({ error: "Planilha de romaneio vazia ou sem 'Cod.Romaneio'." }, { status: 400 })

  const { itens, resumo } = conciliar(marc, rom.romaneios, est.estoque, { tolerancia })

  const lote = await prisma.conciliacaoLote.create({
    data: {
      tolerancia,
      arquivoMarcacao: fMarc.name,
      arquivoRomaneio: fRom.name,
      arquivoEstoque:  fEst.name,
      usuarioNome:     session.user.name ?? session.user.email ?? null,
      total:       resumo.total,
      conciliados: resumo.conciliados,
      divergentes: resumo.divergentes,
      descarga:    resumo.descarga,
      carga:       resumo.carga,
      itens: {
        create: itens.map(it => ({
          origem:           it.origem,
          operacao:         it.operacao,
          ordem:            it.ordem,
          numeroNF:         it.numeroNF,
          placa:            it.placa,
          cliente:          it.cliente,
          produto:          it.produto,
          produtoRomaneio:  it.produtoRomaneio,
          produtoEstoque:   it.produtoEstoque,
          pesoMarcacao:     it.pesoMarcacao,
          pesoRomaneio:     it.pesoRomaneio,
          pesoEstoque:      it.pesoEstoque,
          difPeso:          it.difPeso,
          presencaMarcacao: it.presencaMarcacao,
          presencaRomaneio: it.presencaRomaneio,
          presencaEstoque:  it.presencaEstoque,
          stsRomaneio:      it.stsRomaneio,
          armazem:          it.armazem,
          status:           it.status,
          divergencias:     it.divergencias.join(","),
        })),
      },
    },
  })

  return NextResponse.json({
    ok: true,
    loteId: lote.id,
    resumo,
    fontes: {
      marcacoes: marc.length,
      romaneios: rom.romaneios.length,
      estoque:   est.estoque.length,
      camposRomaneio: rom.camposReconhecidos.length,
      camposEstoque:  est.camposReconhecidos.length,
    },
  })
}
