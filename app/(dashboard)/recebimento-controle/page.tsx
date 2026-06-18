import RecebimentoControleClient from "./RecebimentoControleClient"
import { getSemanaAtual } from "@/lib/programacao"

export const dynamic = "force-dynamic"

export default function RecebimentoControlePage() {
  const anoAtual = getSemanaAtual().ano
  const mesAtual = new Date().getUTCMonth() + 1
  return <RecebimentoControleClient anoAtual={anoAtual} mesAtual={mesAtual} />
}
