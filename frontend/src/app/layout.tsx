import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"

import UIThemeProvider from "@/providers/ui-theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export const metadata: Metadata = {
  title: "NextLead B2B Soluciones | CRM WhatsApp & Ventas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NextLead CRM",
  },

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
      <body className="font-sans antialiased" suppressHydrationWarning>
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