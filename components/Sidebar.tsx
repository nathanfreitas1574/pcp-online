"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Box, Lock, ClipboardList, Truck,
  FileText, Users, LogOut, Download, Upload, BarChart2,
  Warehouse, Bell, Database, Calendar, Clock, Activity,
  FlaskConical, TrendingUp, Tv, ListOrdered, DollarSign, QrCode,
} from "lucide-react"

type NavItem =
  | { section: string }
  | { href: string; label: string; icon: React.ElementType; badge?: boolean; external?: boolean }

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { section: "Recebimento" },
  { href: "/recebimento", label: "Dashboard Recebimento", icon: Download },
  { href: "/boxes", label: "Gestão de Box", icon: Box },
  { href: "/lacres", label: "Lacres", icon: Lock },
  { href: "/tmp", label: "TMP Caminhões", icon: Clock },
  { href: "/fila", label: "Fila de Caminhões", icon: ListOrdered },
  { href: "/transportadoras", label: "Transportadoras", icon: Truck },
  { section: "Expedição" },
  { href: "/expedicao", label: "Dashboard Expedição", icon: Upload },
  { href: "/consignacao", label: "Consignação NF", icon: FileText },
  { section: "Planejamento" },
  { href: "/programacao", label: "Programação Semanal", icon: Calendar },
  { section: "Estoque & BI" },
  { href: "/bi-estoques", label: "BI Estoques", icon: BarChart2 },
  { href: "/vistoria", label: "Vistoria Estoque", icon: Warehouse },
  { href: "/qualidade", label: "Controle de Qualidade", icon: FlaskConical },
  { href: "/analytics", label: "Analytics & Ranking", icon: TrendingUp },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { section: "Operação" },
  { href: "/inventario", label: "Inventário", icon: ClipboardList },
  { href: "/movimentacao", label: "Movimentação", icon: Truck },
  { section: "Sistema" },
  { href: "/alertas", label: "Alertas", icon: Bell, badge: true },
  { href: "/logs", label: "Log Atividades", icon: Activity },
  { href: "/cadastros", label: "Cadastros", icon: Database },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/tv", label: "Painel TV", icon: Tv, external: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const fetchCount = () =>
      fetch("/api/alertas?count=1").then((r) => r.json()).then((d) => setAlertCount(d.count ?? 0)).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-60 bg-blue-900 text-white flex flex-col h-full">
      <div className="px-5 py-4 border-b border-blue-800 shrink-0">
        <h1 className="text-base font-bold">PCP ONLINE</h1>
        <p className="text-blue-300 text-xs mt-0.5">Fertalvo — Controle Logístico</p>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {nav.map((item, i) => {
          if ("section" in item) {
            return (
              <p key={i} className="px-3 pt-3 pb-0.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {item.section}
              </p>
            )
          }
          const { href, label, icon: Icon, badge, external: isExternal } = item as { href: string; label: string; icon: React.ElementType; badge?: boolean; external?: boolean }
          const active = pathname === href
          if (isExternal) {
            return (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition text-blue-200 hover:bg-blue-800 hover:text-white">
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-blue-400 text-xs">↗</span>
              </a>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                active ? "bg-blue-700 text-white" : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t border-blue-800 shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-200 hover:bg-blue-800 hover:text-white w-full transition"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
