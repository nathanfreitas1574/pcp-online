import { prisma } from "@/lib/prisma"
import { notaNoContabil, dataInputUTC } from "@/lib/cobertura"
import { CODIGO, DESC, normalizaTipo, gerarToken } from "@/lib/controle-notas"
import { NextRequest, NextResponse } from "next/server"

// Rota PÚBLICA — sem autenticação — registro pela Balança via link externo
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.numero?.toString().trim())
      return NextResponse.json({ error: "Informe o número." }, { status: 400 })

    const tipo = normalizaTipo(b.tipo)
    const extemp = tipo === "EXTEMPORANEO"

    // valida no contábil: NF cancelada que ainda está lançada = não foi cancelada
    const nf = (b.numeroNF || (tipo !== "INUTILIZACAO" ? b.numero : "") || "").toString().trim()
    const alertaContabil = (tipo === "CANCELAMENTO" || extemp) && nf ? await notaNoContabil(nf) : false

    const token = extemp ? gerarToken() : null

    const c = await prisma.controleNota.create({
      data: {
        data: dataInputUTC(b.data),
        usuario: b.usuario?.trim() || null,
        numero: String(b.numero).trim(),
        cliente: b.cliente?.trim() || null,
        tipo,
        codigoOperacao: b.codigoOperacao?.trim() || CODIGO[tipo],
        descricao: b.descricao?.trim() || DESC[tipo],
        numeroNF: b.numeroNF?.trim() || null,
        motivoErro: b.motivoErro?.trim() || null,
        observacao: b.observacao?.trim() || null,
        alertaContabil,
        criadoPorNome: b.usuario?.trim() || "Balança",
        aprovacaoToken: token,
        statusAprovacao: extemp ? "PENDENTE" : null,
      },
    })

    return NextResponse.json(
      { ok: true, id: c.id, tipo, alertaContabil, aprovacaoToken: token },
      { status: 201 }
    )
  } catch (e) {
    console.error("Erro no registro público de controle-nota:", e)
    return NextResponse.json({ error: "Erro interno ao salvar." }, { status: 500 })
  }
}
