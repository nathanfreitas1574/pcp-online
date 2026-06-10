import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages:   { signIn: "/login" },

  providers: [
    // ── Login Office 365 / Microsoft Entra ID ──────────────────────────────
    MicrosoftEntraId({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // Tenant específico da organização; use "common" para multi-tenant
      issuer: process.env.AZURE_AD_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`
        : "https://login.microsoftonline.com/common/v2.0",
    }),

    // ── Login email/senha (mantido como fallback) ──────────────────────────
    Credentials({
      credentials: {
        email:    { label: "Email",  type: "email" },
        password: { label: "Senha",  type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.ativo) return null
        // Usuários O365 não possuem senha no sistema
        if (!user.password) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],

  callbacks: {
    // Controla quem pode entrar via O365
    async signIn({ account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = profile?.email ?? (profile as { preferred_username?: string })?.preferred_username
        if (!email) return false

        const dbUser = await prisma.user.findUnique({ where: { email } })

        if (!dbUser) {
          // Cria usuário automaticamente com role VIEWER na primeira entrada
          await prisma.user.create({
            data: {
              email,
              name: (profile?.name as string) ?? email.split("@")[0],
              password: null,       // usuário O365 não usa senha
              role: "VIEWER",
            },
          })
          return true
        }

        // Bloqueia usuário inativo
        if (!dbUser.ativo) return "/login?error=ContaInativa"
        return true
      }
      return true
    },

    // Adiciona id e role ao JWT
    async jwt({ token, user, account, profile }) {
      // Login por credenciais — user vem preenchido
      if (user) {
        token.id   = user.id
        token.role = (user as { role?: string }).role
      }

      // Login O365 — busca role atual do banco (sempre na primeira emissão do token)
      if (account?.provider === "microsoft-entra-id" && token.email) {
        const email = token.email as string
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        })
        if (dbUser) {
          token.id   = dbUser.id
          token.role = dbUser.role
        }
      }
      return token
    },

    // Expõe id e role na session
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
