"use client"

import { useState, useEffect } from "react"
import { Menu, X, Moon, Sun, Download, FileText } from "lucide-react"
import BuscaGlobal from "./BuscaGlobal"
import Sidebar from "./Sidebar"

export default function Topbar({ userName, userRole }: { userName: string; userRole: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true"
    setDarkMode(saved)
    document.documentElement.classList.toggle("dark", saved)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem("darkMode", String(next))
    document.documentElement.classList.toggle("dark", next)
  }

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3 shrink-0 z-30">
        {/* Menu mobile */}
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>

        {/* Busca global */}
        <div className="flex-1 max-w-xs">
          <BuscaGlobal />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Exportações rápidas */}
          <div className="hidden sm:flex gap-1">
            <a
              href="/api/exportar/inventario"
              target="_blank"
              title="Exportar Inventário"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
            >
              <Download size={16} />
            </a>
            <a
              href={`/api/exportar/pdf-mensal?ano=${new Date().getFullYear()}&mes=${new Date().getMonth() + 1}`}
              target="_blank"
              title="Relatório PDF mensal"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
            >
              <FileText size={16} />
            </a>
          </div>

          {/* Dark mode */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={darkMode ? "Modo claro" : "Modo escuro"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{userName}</p>
              <p className="text-xs text-gray-400">{userRole}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Menu mobile overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-blue-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-800">
              <span className="text-white font-bold">PCP ONLINE</span>
              <button onClick={() => setMenuOpen(false)} className="text-blue-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </>
  )
}
