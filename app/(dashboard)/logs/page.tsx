import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default async function LogsPage() {
  const session = await auth()
  if (!session || !["ADMIN", "PCP"].includes(session.user.role)) redirect("/")

  const logs = await prisma.logAtividade.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const modulos = [...new Set(logs.map((l) => l.modulo))]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Log de Atividades</h2>
        <p className="text-gray-500 text-sm mt-0.5">Registro completo de quem fez o quê e quando</p>
      </div>

      {/* Resumo por módulo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {modulos.slice(0, 8).map((m) => {
          const count = logs.filter((l) => l.modulo === m).length
          return (
            <div key={m} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500">{m}</p>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <p className="text-xs text-gray-400">ações</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Data/Hora", "Usuário", "Módulo", "Ação", "Descrição", "Referência"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{log.usuarioNome ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{log.modulo}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{log.acao}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{log.descricao}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{log.referencia ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Nenhuma atividade registrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
