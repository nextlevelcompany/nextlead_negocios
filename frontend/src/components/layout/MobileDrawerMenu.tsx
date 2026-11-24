"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Users,
  Target,
  Receipt,
  Truck,
  ShoppingBag,
  UserCheck,
  PlusCircle,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface MobileDrawerMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MenuItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isAction?: boolean
}

interface MenuGroup {
  group: string
  items: MenuItem[]
}

export function MobileDrawerMenu({ open, onOpenChange }: MobileDrawerMenuProps) {
  const pathname = usePathname()

  const menuGroups: MenuGroup[] = [
    {
      group: "Comercial & Clientes",
      items: [
        { title: "Directorio de Contactos", href: "/contactos", icon: Users },
        { title: "Nuevo Contacto", href: "/contactos/create", icon: PlusCircle, isAction: true },
        { title: "Oportunidades & Pipeline", href: "/opportunities/view", icon: Target },
        { title: "Nueva Oportunidad", href: "/opportunities/create", icon: PlusCircle, isAction: true },
        { title: "Historial de Ventas", href: "/ventas/view", icon: Receipt },
        { title: "Registrar Venta", href: "/ventas/create", icon: PlusCircle, isAction: true },
      ],
    },
    {
      group: "Operaciones & Logística",
      items: [
        { title: "Gestión de Pedidos", href: "/pedidos/view", icon: Truck },
        { title: "Crear Pedido", href: "/pedidos/create", icon: PlusCircle, isAction: true },
        { title: "Catálogo de Productos", href: "/eCommerce/product-list", icon: ShoppingBag },
        { title: "Personal & Comisiones", href: "/payroll/staff", icon: UserCheck },
      ],
    },
    {
      group: "Comunicaciones & Reportes",
      items: [
        { title: "WhatsApp Web Chat", href: "/applications/chatbox", icon: MessageSquare },
        { title: "Reportes de Ventas", href: "/ventas/reports", icon: BarChart3 },
        { title: "Reportes de Oportunidades", href: "/opportunities/reports", icon: FileText },
      ],
    },
  ]

  const handleNavigate = () => {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] p-0 flex flex-col bg-background/98 border-t shadow-2xl focus:outline-none"
      >
        {/* Drag Handle Indicator */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-6 py-2 border-b shrink-0 text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold">Menú Principal</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Acceso rápido a todos los módulos
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Items Container */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 smooth-scroll">
          {menuGroups.map((group) => (
            <div key={group.group} className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                {group.group}
              </h4>
              <div className="rounded-xl border border-border/60 bg-card/60 divide-y divide-border/40 overflow-hidden shadow-xs">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavigate}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-3 transition-colors active:bg-muted min-h-[48px]",
                        isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground",
                        item.isAction && "text-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            item.isAction
                              ? "bg-primary/10 text-primary"
                              : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Bottom spacing for home indicator */}
          <div className="h-6" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
