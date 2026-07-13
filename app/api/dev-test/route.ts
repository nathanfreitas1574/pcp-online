/**
 * Endpoint de auto-teste interno (apenas development)
 * Roda os testes DENTRO do servidor, onde o banco é estável
 * GET /api/dev-test?secret=<NEXTAUTH_SECRET>
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type TestResult = { nome: string; ok: boolean; detalhe?: string }

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Não disponível em produção" }, { status: 403 })
  }

  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Secret inválido" }, { status: 401 })
  }

  const resultados: TestResult[] = []
  const ok = (nome: string, detalhe?: string) => resultados.push({ nome, ok: true, detalhe })
  const fail = (nome: string, detalhe?: string) => resultados.push({ nome, ok: false, detalhe })

  // ── Banco de dados (com retry) ──────────────────────────────────────────────
  // Tenta reconectar se o banco local deu connection reset
  async function queryComRetry<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
    for (let i = 0; i < tentativas; i++) {
      try { return await fn() }
      catch (e) {
        const msg = String(e)
        if (i < tentativas - 1 && (msg.includes("Connection") || msg.includes("ECONNRESET") || msg.includes("P1017"))) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)))
          continue
        }
        throw e
      }
    }
    throw new Error("Todas as tentativas falharam")
  }

  try {
    const [users, boxes, produtos, clientes, alertas, inventarios, movs, consignacoes,
      lacres, estoques, programacoes, historico, logs, tmp, queueContratos] = await queryComRetry(() => Promise.all([
      prisma.user.count(),
      prisma.box.count(),
      prisma.produto.count(),
      prisma.cliente.count(),
      prisma.alerta.count(),
      prisma.inventario.count(),
      prisma.movimentacao.count(),
      prisma.consignacao.count(),
      prisma.lacre.count(),
      prisma.estoque.count(),
      prisma.programacaoSemanal.count(),
      prisma.historicoBox.count(),
      prisma.logAtividade.count(),
      prisma.tmpRegistro.count(),
      prisma.contratoDescarga.count(),
    ]))

    ok("Tabela User", `${users} registros`)
    ok("Tabela Box", `${boxes} boxes`)
    ok("Tabela Produto", `${produtos} produtos`)
    ok("Tabela Cliente", `${clientes} clientes`)
    ok("Tabela Alerta", `${alertas} alertas`)
    ok("Tabela Inventario", `${inventarios} inventários`)
    ok("Tabela Movimentacao", `${movs} movimentações`)
    ok("Tabela Consignacao", `${consignacoes} consignações`)
    ok("Tabela Lacre", `${lacres} lacres`)
    ok("Tabela Estoque", `${estoques} estoques`)
    ok("Tabela ProgramacaoSemanal", `${programacoes} programações`)
    ok("Tabela HistoricoBox", `${historico} históricos`)
    ok("Tabela LogAtividade", `${logs} logs`)
    ok("Tabela TmpRegistro", `${tmp} TMPs`)
    ok("Tabela ContratoDescarga", `${queueContratos} contratos`)

    // Verificações de negócio
    boxes >= 26 ? ok("Boxes pré-cadastrados (seed)", `${boxes}/26 mínimo`) : fail("Boxes insuficientes", `${boxes}/26`)
    clientes >= 10 ? ok("Clientes cadastrados (seed)", `${clientes}`) : fail("Clientes insuficientes")
    produtos >= 10 ? ok("Produtos cadastrados (seed)", `${produtos}`) : fail("Produtos insuficientes")

    // Admin existe?
    const admin = await prisma.user.findUnique({ where: { email: "admin@pcp.com" } })
    admin ? ok("Usuário admin existe", admin.email) : fail("Admin não encontrado — rode db:seed")

    // Box com estoque?
    const comEstoque = await prisma.estoque.count({ where: { quantidade: { gt: 0 } } })
    comEstoque > 0 ? ok("Boxes com estoque registrado", `${comEstoque}`) : ok("Sem estoque ainda (normal para início)")

    // Alerta de não conformidade (teste anterior pode ter criado)
    const alertasAbertos = await prisma.alerta.count({ where: { status: "ABERTO" } })
    ok("Alertas abertos", `${alertasAbertos}`)

  } catch (e: unknown) {
    fail("Banco de dados", String(e).substring(0, 100))
  }

  // ── CRUD rápido ─────────────────────────────────────────────────────────────
  let boxTesteId = ""
  let prodTesteId = ""
  let cliTesteId = ""

  try {
    // Criar box de teste
    const boxTeste = await prisma.box.create({
      data: { codigo: `TEST_${Date.now()}`, descricao: "Box criado pelo auto-teste", localizacao: "Teste", capacidade: 500 },
    })
    boxTesteId = boxTeste.id
    ok("CRUD — Criar Box", boxTeste.codigo)

    // Criar produto
    const prodTeste = await prisma.produto.create({
      data: { codigo: `PT_${Date.now()}`, descricao: "Produto Teste Auto", unidade: "TON" },
    })
    prodTesteId = prodTeste.id
    ok("CRUD — Criar Produto", prodTeste.codigo)

    // Criar cliente
    const cliTeste = await prisma.cliente.create({
      data: { codigo: `CT_${Date.now()}`.substring(0, 10), nome: "Cliente Teste Automático" },
    })
    cliTesteId = cliTeste.id
    ok("CRUD — Criar Cliente", cliTeste.nome)

    // Atualizar estoque do box
    await prisma.estoque.upsert({
      where: { produtoId_boxId: { produtoId: prodTesteId, boxId: boxTesteId } },
      update: { quantidade: 250 },
      create: { produtoId: prodTesteId, boxId: boxTesteId, quantidade: 250 },
    })
    ok("CRUD — Atualizar Estoque Box", "250 ton → AZ test")

    // Histórico do box
    await prisma.historicoBox.create({
      data: { boxId: boxTesteId, boxCodigo: boxTeste.codigo, acao: "TESTE", produto: prodTeste.descricao, clienteNome: cliTeste.nome, volume: 250, pctOcupacao: 50, usuarioNome: "Auto-Teste" },
    })
    ok("CRUD — Registrar Histórico Box")

    // Criar inventário
    const inv = await prisma.inventario.create({ data: { tipo: "DIARIO", data: new Date(), status: "ABERTO" } })
    const admin = await prisma.user.findFirst()
    if (admin) {
      const invItem = await prisma.inventarioItem.create({
        data: { inventarioId: inv.id, produtoId: prodTesteId, usuarioId: admin.id, qtdSistema: 500, qtdContada: 480, diferenca: -20 },
      })
      ok("CRUD — Lançar Item Inventário", `divergência: ${invItem.diferenca}`)
    }

    // Criar alerta
    const alerta = await prisma.alerta.create({
      data: { tipo: "NAO_CONFORMIDADE", severidade: "AVISO", titulo: "Teste auto", descricao: "Alerta criado pelo auto-teste", referencia: "TEST" },
    })
    ok("CRUD — Criar Alerta", alerta.titulo)

    // Resolver alerta
    await prisma.alerta.update({ where: { id: alerta.id }, data: { status: "RESOLVIDO", resolvidoPor: "Auto-Teste", resolvidoEm: new Date() } })
    ok("CRUD — Resolver Alerta")

    // TMP — Registrar entrada e saída
    const entradaTmp = new Date(Date.now() - 95 * 60000) // 95 min atrás
    const saidaTmp = new Date()
    const tmpReg = await prisma.tmpRegistro.create({
      data: { placa: "TEST-AUTO", clienteNome: "EUROCHEM", produto: "UREIA", localDescarga: "Tombador", dtEntrada: entradaTmp, dtSaida: saidaTmp, tmpMinutos: 95, status: "CONCLUIDO" },
    })
    ok("CRUD — TMP Caminhão", `${tmpReg.tmpMinutos}min`)

    // Criar movimentação
    const admin2 = await prisma.user.findFirst()
    if (admin2) {
      const mov = await prisma.movimentacao.create({
        data: { usuarioId: admin2.id, tipo: "TRANSFERENCIA", status: "PROGRAMADA", dataPrevista: new Date(), origem: "Setor A", destino: "Setor B", viagens: 2 },
      })
      await prisma.movimentacao.update({ where: { id: mov.id }, data: { status: "EM_ANDAMENTO" } })
      await prisma.movimentacao.update({ where: { id: mov.id }, data: { status: "CONCLUIDA", dataRealizada: new Date() } })
      ok("CRUD — Movimentação (PROGRAMADA → EM_ANDAMENTO → CONCLUIDA)")
    }

    // Programação semanal
    // sem unique por cliente+produto (contrato pode duplicar) → find-or-create
    const progTeste = await prisma.programacaoSemanal.findFirst({ where: { ano: 2026, semana: 99, clienteNome: "TESTE", produto: "TESTE", tipo: "RECEBIMENTO" } })
    if (progTeste) await prisma.programacaoSemanal.update({ where: { id: progTeste.id }, data: { seg: 1000, ter: 800 } })
    else await prisma.programacaoSemanal.create({ data: { ano: 2026, semana: 99, dataInicio: new Date(), dataFim: new Date(), clienteNome: "TESTE", produto: "TESTE", tipo: "RECEBIMENTO", seg: 1000, ter: 800 } })
    ok("CRUD — Programação Semanal")

    // Log de atividade
    await prisma.logAtividade.create({
      data: { acao: "TESTE", modulo: "AUTO-TESTE", descricao: "Log criado pelo auto-teste funcional", usuarioNome: "Auto-Teste" },
    })
    ok("CRUD — Log de Atividade")

  } catch (e: unknown) {
    fail("CRUD Operations", String(e).substring(0, 100))
  } finally {
    // Limpeza dos dados de teste
    try {
      if (boxTesteId) await prisma.box.delete({ where: { id: boxTesteId } }).catch(() => {})
      if (prodTesteId) await prisma.produto.delete({ where: { id: prodTesteId } }).catch(() => {})
      if (cliTesteId) await prisma.cliente.delete({ where: { id: cliTesteId } }).catch(() => {})
    } catch { /* ignora erros de limpeza */ }
  }

  // ── Relatório ───────────────────────────────────────────────────────────────
  const total = resultados.length
  const passou = resultados.filter((r) => r.ok).length
  const falhou = total - passou

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
    servidor: "http://localhost:3000",
    resumo: { total, passou, falhou, pct: `${((passou / total) * 100).toFixed(1)}%` },
    resultados,
    status: falhou === 0 ? "✅ TUDO OK" : `⚠️ ${falhou} falha(s)`,
  })
}
