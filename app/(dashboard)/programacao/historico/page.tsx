import { getSemanaAtual } from "@/lib/programacao"
import HistoricoClient from "./HistoricoClient"

export const dynamic = "force-dynamic"

export default function HistoricoProgramacaoPage() {
  const anoAtual = getSemanaAtual().ano
  return <HistoricoClient anoAtual={anoAtual} />
}
