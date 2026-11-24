"use client"

import React, { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlobalSearch } from "@/components/global-search"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { UserDropdown } from "@/components/UserDropdown"

interface MobileHeaderProps {
  onOpenDrawer?: () => void
}

export function MobileHeader({ onOpenDrawer }: MobileHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isRootView = useMemo(() => {
    return (
      pathname === "/dashboard/analytics" ||
      pathname === "/dashboard" ||
      pathname === "/"
    )
  }, [pathname])

  const title = useMemo(() => {
    if (pathname.startsWith("/opportunities/create")) return "Nueva Oportunidad"
    if (pathname.startsWith("/opportunities/reports")) return "Reportes Oportunidades"
    if (pathname.startsWith("/opportunities")) return "Oportunidades"
    if (pathname.startsWith("/contactos/create")) return "Nuevo Contacto"
    if (pathname.startsWith("/contactos/view")) return "Ficha de Contacto"
    if (pathname.startsWith("/contactos")) return "Contactos"
    if (pathname.startsWith("/ventas/create")) return "Nueva Venta"
    if (pathname.startsWith("/ventas/reports")) return "Reportes de Ventas"
    if (pathname.startsWith("/ventas")) return "Ventas"
    if (pathname.startsWith("/pedidos/create")) return "Nuevo Pedido"
    if (pathname.startsWith("/pedidos")) return "Pedidos"
    if (pathname.startsWith("/applications/chatbox")) return "WhatsApp Chat"
    if (pathname.startsWith("/productos/categorias")) return "Categorías"
    if (pathname.startsWith("/productos")) return "Catálogo de Productos"
    if (pathname.startsWith("/finanzas")) return "Finanzas"
    if (pathname.startsWith("/rentabilidad")) return "Rentabilidad & Comisiones"
    if (pathname.startsWith("/payroll")) return "Personal"
    if (pathname.startsWith("/admin")) return "Ajustes del Sistema"
    if (pathname.startsWith("/soporte")) return "Soporte"
    if (pathname.startsWith("/docs")) return "Documentación"
    if (pathname.startsWith("/dashboard")) return "Dashboard"
    
    // Fallback: capitalize last segment
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "NextLead"
    const last = segments[segments.length - 1]
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 flex md:hidden h-14 w-full shrink-0 items-center justify-between border-b bg-background px-3 shadow-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        {onOpenDrawer && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenDrawer}
            aria-label="Menú principal"
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 -ml-1"
            title="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
        )}
        {!isRootView && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Volver"
            className="h-9 w-9 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <h1 className="text-sm sm:text-base font-bold tracking-tight truncate text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <GlobalSearch />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}
