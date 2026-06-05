import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — oculta em mobile, visível em lg+ */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar com busca global e menu mobile */}
        <Topbar userName={session.user.name} userRole={session.user.role} />

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
