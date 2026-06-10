"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

// Ícone oficial da Microsoft (SVG inline)
function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  )
}

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const errorParam   = searchParams.get("error")

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState(
    errorParam === "ContaInativa" ? "Sua conta está inativa. Fale com o administrador." : ""
  )
  const [loading,    setLoading]    = useState(false)
  const [loadingMS,  setLoadingMS]  = useState(false)

  // ── Login email/senha ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError("Email ou senha inválidos")
    } else {
      router.push("/"); router.refresh()
    }
  }

  // ── Login Microsoft ────────────────────────────────────────────────────────
  async function handleMicrosoft() {
    setLoadingMS(true); setError("")
    await signIn("microsoft-entra-id", { callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-8 text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PCP ONLINE</h1>
          <p className="text-blue-200 text-sm mt-1">Fertalvo — Controle Logístico</p>
        </div>

        <div className="px-8 py-7 space-y-5">

          {/* Botão Microsoft — destaque principal */}
          <div>
            <button
              onClick={handleMicrosoft}
              disabled={loadingMS || loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 group"
            >
              {loadingMS ? (
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <MicrosoftIcon />
              )}
              <span className="group-hover:text-blue-700 transition-colors">
                {loadingMS ? "Redirecionando…" : "Entrar com Microsoft (Office 365)"}
              </span>
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              Use sua conta corporativa @fertalvo.com.br
            </p>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou acesse com email e senha</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Formulário email/senha */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="seu@fertalvo.com.br"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || loadingMS}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-3 text-center">
          <p className="text-xs text-gray-400">Acesso restrito a colaboradores Fertalvo</p>
        </div>
      </div>
    </div>
  )
}
