import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Box, AlertTriangle, TrendingUp, Truck, ClipboardList, Lock } from "lucide-react"
import DashboardCharts from "./DashboardCharts"

async function getStats() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    totalBoxes, lacresNaoConformes, movProgramadas, inventarioAberto,
    alertasAbertos, totalClientes, totalProdutos,
    estoques, lacresUltimos30,
    movUltimas,
  ] = await Promise.all([
    prisma.box.count({ where: { ativo: true } }),
    prisma.lacre.count({ where: { status: "NAO_CONFORME" } }),
    prisma.movimentacao.count({ where: { status: "PROGRAMADA" } }),
    prisma.inventario.findFirst({ where: { status: "ABERTO" }, orderBy: { createdAt: "desc" } }),
    prisma.alerta.count({ where: { status: "ABERTO" } }),
    prisma.cliente.count({ where: { ativo: true } }),
    prisma.produto.count({ where: { ativo: true } }),
    // Estoque por box (com armazém e produto, para o gráfico drill-down)
    prisma.estoque.findMany({
      where: { quantidade: { gt: 0 } },
      include: {
        box: { select: { codigo: true, capacidade: true, armazem: { select: { nome: true } } } },
        produto: { select: { descricao: true } },
      },
      orderBy: { quantidade: "desc" },
    }),
    // Lacres dos últimos 30 dias (com box, para o gráfico drill-down)
    prisma.lacre.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { status: true, box: { select: { codigo: true } } },
    }),
    // Movimentações recentes
    prisma.movimentacao.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { usuario: { select: { name: true } }, itens: true },
    }),
  ])

  // Detalhe do estoque para o gráfico drill-down (Armazém → Box → Produto)
  const estoqueDetalhe = estoques.map((e) => ({
    armazem: e.box.armazem?.nome ?? "Sem armazém",
    box: e.box.codigo,
    produto: e.produto.descricao,
    cliente: e.clienteNome ?? "—",
    quantidade: Math.round(e.quantidade),
  }))

  // Detalhe de lacres para o gráfico drill-down (Status → Box)
  const LACRE_LABEL: Record<string, string> = { FECHADO: "Fechado", ABERTO: "Aberto", NAO_CONFORME: "Não conforme" }
  const lacreDetalhe = lacresUltimos30.map((l) => ({
    status: LACRE_LABEL[l.status] ?? l.status,
    box: l.box?.codigo ?? "—",
  }))

  return {
    totalBoxes, lacresNaoConformes, movProgramadas, inventarioAberto,
    alertasAbertos, totalClientes, totalProdutos,
    estoqueDetalhe, lacreDetalhe, movUltimas,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getStats()

  const cards = [
    { label: "Boxes Ativos", value: stats.totalBoxes, icon: Box, color: "blue", href: "/boxes" },
    { label: "Alertas Abertos", value: stats.alertasAbertos, icon: AlertTriangle, color: "red", href: "/alertas" },
    { label: "Mov. Programadas", value: stats.movProgramadas, icon: Truck, color: "yellow", href: "/movimentacao" },
    { label: "Inventário Aberto", value: stats.inventarioAberto ? "Sim" : "Não", icon: ClipboardList, color: "green", href: "/inventario" },
    { label: "Lacres Não Conf.", value: stats.lacresNaoConformes, icon: Lock, color: "orange", href: "/lacres" },
    { label: "Clientes", value: stats.totalClientes, icon: TrendingUp, color: "purple", href: "/cadastros" },
  ]

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Bem-vindo, <strong>{session?.user?.name}</strong></p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <a key={label} href={href} className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-start gap-2 border border-gray-100 hover:border-blue-200 hover:shadow-md transition">
            <div className={`p-2 rounded-lg ${colorMap[color]}`}><Icon size={18} /></div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Gráficos */}
      <DashboardCharts estoqueDetalhe={stats.estoqueDetalhe} lacreDetalhe={stats.lacreDetalhe} />

      {/* Movimentações recentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4">
        <h3 className="font-semibold text-gray-700 mb-4">Movimentações Recentes</h3>
        {stats.movUltimas.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  {["Tipo", "Origem → Destino", "Status", "Responsável"].map((h) => (
                    <th key={h} className="pb-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.movUltimas.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-medium">{m.tipo}</td>
                    <td className="py-2 text-gray-600">{m.origem ?? "—"} → {m.destino ?? "—"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.status === "CONCLUIDA" ? "bg-green-100 text-green-700" :
                        m.status === "PROGRAMADA" ? "bg-yellow-100 text-yellow-700" :
                        m.status === "EM_ANDAMENTO" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{m.usuario.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
