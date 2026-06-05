import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PCP ONLINE — Fertalvo",
  description: "Planejamento e Controle da Produção — Fertalvo",
  manifest: "/manifest.json",
  themeColor: "#1B6B2E",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PCP ONLINE",
  },
  icons: {
    apple: "/icon-192.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B6B2E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PCP ONLINE" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50`}>{children}</body>
    </html>
  )
}
