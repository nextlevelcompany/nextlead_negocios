import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"

import UIThemeProvider from "@/providers/ui-theme-provider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "NextLead B2B Soluciones | CRM WhatsApp & Ventas",

  description:
    "Plataforma integral de gestión comercial, CRM WhatsApp, prospección y propuestas corporativas B2B.",

  keywords: [
    "NextLead",
    "CRM WhatsApp",
    "Gestión Comercial",
    "Propuestas Comerciales",
    "Cotizaciones B2B",
  ],

  authors: [
    {
      name: "NextLead B2B Soluciones",
    },
  ],

  creator: "NextLead",

  openGraph: {
    title: "NextLead B2B Soluciones | CRM WhatsApp & Ventas",

    description:
      "Plataforma integral de gestión comercial, CRM WhatsApp, prospección y propuestas corporativas B2B.",

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "NextLead B2B Soluciones | CRM WhatsApp & Ventas",

    description:
      "Plataforma integral de gestión comercial, CRM WhatsApp, prospección y propuestas corporativas B2B.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UIThemeProvider>
            {children}
            <Toaster position="top-right" richColors />
          </UIThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}