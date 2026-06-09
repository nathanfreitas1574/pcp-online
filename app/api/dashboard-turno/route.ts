import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agora = new Date()
  const h8atras = new Date(agora.getTime() - 8 * 60 * 60 * 1000)
  const inicioDia = new Date(agora)
  inicioDia.setHours(0, 0, 0, 0)

  const [
    tmpEncerrados,
    tmpAtivos,
    registrosRecebimento,
    lacresCriados,
    alertasAbertos,
    alertasGerados,
    vistorias,
    ocorrencias,
  ] = await Promise.all([
    prisma.tmpRegistro.findMany({
      where: { dtSaida: { gte: h8atras } },
      select: { id: true, placa: true, clienteNome: true, produto: true, dtEntrada: true, dtSaida: true },
    }),
    prisma.tmpRegistro.findMany({
      where: { status: "EM_ANDAMENTO" },
      select: { id: true, placa: true, clienteNome: true, dtEntrada: true },
    }),
    prisma.descargaRegistro.findMany({
      where: { createdAt: { gte: h8atras } },
      select: { id: true, clienteNome: true, produto: true, pesoSaida: true, createdAt: true },
    }),
    prisma.lacre.findMany({
      where: { createdAt: { gte: h8atras } },
      select: { id: true, status: true, codigoLacre: true, box: { select: { codigo: true } }, createdAt: true },
    }),
    prisma.alerta.count({ where: { status: "ABERTO" } }),
    prisma.alerta.findMany({
      where: { createdAt: { gte: h8atras } },
      select: { id: true, tipo: true, descricao: true, severidade: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.auditoriaBox.findMany({
      where: { createdAt: { gte: h8atras } },
      select: { id: true, conforme: true, box: { select: { codigo: true } }, createdAt: true },
    }),
    prisma.ocorrencia.findMany({
      where: { createdAt: { gte: h8atras } },
      select: { id: true, tipo: true, gravidade: true, descricao: true, status: true, createdAt: true },
    }).catch(() => []),
  ])

  // TMP médio das últimas 8h
  const tmpsComSaida = tmpEncerrados.filter(t => t.dtSaida)
  const tmpMedio = tmpsComSaida.length > 0
    ? Math.round(tmpsComSaida.reduce((s, t) => {
        return s + (new Date(t.dtSaida!).getTime() - new Date(t.dtEntrada).getTime()) / 60000
      }, 0) / tmpsComSaida.length)
    : null

  // Volume total recebido no turno
  const volumeTurno = registrosRecebimento.reduce((s, r) => s + (r.pesoSaida ?? 0), 0)

  return NextResponse.json({
    geradoEm: agora.toISOString(),
    periodo: { inicio: h8atras.toISOString(), fim: agora.toISOString() },
    resumo: {
      caminhoesTurno: tmpEncerrados.length,
      caminhoesPatio: tmpAtivos.length,
      tmpMedioMin: tmpMedio,
      volumeRecebidoTon: volumeTurno,
      lacresCriados: lacresCriados.length,
      lacresNaoConformes: lacresCriados.filter(l => l.status === "NAO_CONFORME").length,
      vistoriasTurno: vistorias.length,
      vistoriasNaoConformes: vistorias.filter(v => !v.conforme).length,
      alertasAbertos,
      alertasGeradosTurno: alertasGerados.length,
      ocorrenciasTurno: ocorrencias.length,
    },
    detalhes: {
      tmpAtivos,
      tmpEncerrados: tmpEncerrados.slice(0, 20),
      registrosRecebimento: registrosRecebimento.slice(0, 20),
      lacresCriados,
      alertasGerados,
      vistorias,
      ocorrencias,
    },
  })
}
