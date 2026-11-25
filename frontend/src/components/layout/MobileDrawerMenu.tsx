"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRolePermissions } from "@/lib/permissions"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Home,
  MessageSquare,
  Users,
  Target,
  Receipt,
  Truck,
  Boxes,
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Settings,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface MobileDrawerMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NavSubItem {
  title: string
  url: string
}

interface NavItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  url?: string
  items?: NavSubItem[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Menús idénticos a app-sidebar.tsx (versión web)
const fullNavGroups: NavGroup[] = [
  {
    label: "PRINCIPAL",
    items: [
      {
        title: "Dashboard",
        icon: Home,
        items: [
          { title: "Analítica", url: "/dashboard/analytics" },
          { title: "Métricas", url: "/dashboard/eCommerce" },
        ],
      },
    ],
  },
  {
    label: "COMERCIAL",
    items: [
      {
        title: "WhatsApp",
        icon: MessageSquare,
        items: [{ title: "Chat", url: "/applications/chatbox" }],
      },
      {
        title: "Contactos",
        icon: Users,
        items: [
          { title: "Contactos", url: "/contactos" },
          { title: "Crear Contacto", url: "/contactos/create" },
          { title: "Asignación de Cartera", url: "/contactos/asignacion" },
        ],
      },
      {
        title: "Oportunidades",
        icon: Target,
        items: [
          { title: "Oportunidades", url: "/opportunities/view" },
          { title: "Crear Oportunidad", url: "/opportunities/create" },
          { title: "Reportes", url: "/opportunities/reports" },
          { title: "Configuración", url: "/opportunities/configuracion" },
        ],
      },
      {
        title: "Ventas",
        icon: Receipt,
        items: [
          { title: "Ventas", url: "/ventas/view" },
          { title: "Crear Venta", url: "/ventas/create" },
          { title: "Reportes", url: "/ventas/reports" },
        ],
      },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      {
        title: "Pedidos",
        icon: Truck,
        items: [
          { title: "Pedidos", url: "/pedidos/view" },
          { title: "Crear Pedido", url: "/pedidos/create" },
          { title: "Reportes", url: "/pedidos/reports" },
        ],
      },
      {
        title: "Productos",
        icon: Boxes,
        items: [
          { title: "Catálogo", url: "/productos/view" },
          { title: "Categorías", url: "/productos/categorias" },
        ],
      },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      {
        title: "Finanzas",
        icon: DollarSign,
        items: [
          { title: "Caja", url: "/finanzas/cash-flow" },
          { title: "Gastos", url: "/finanzas/expenses" },
          { title: "Compras", url: "/finanzas/purchases" },
          { title: "Deudas", url: "/finanzas/debts" },
          { title: "Proveedores", url: "/finanzas/suppliers" },
        ],
      },
      {
        title: "Rentabilidad y Comisiones",
        icon: TrendingUp,
        items: [
          { title: "Rentabilidad Actual", url: "/rentabilidad/actual" },
          { title: "Simulador de Ingresos", url: "/rentabilidad/simulador" },
          { title: "Liquidaciones y Pagos", url: "/rentabilidad/liquidaciones" },
          { title: "Configuración y Escalas", url: "/rentabilidad/configuracion" },
        ],
      },
      {
        title: "Personal",
        icon: CalendarCheck,
        items: [
          { title: "Empleados", url: "/payroll/staff" },
          { title: "Asistencia Diaria", url: "/payroll/attendance-daily" },
          { title: "Asistencia Mensual", url: "/payroll/attendance-monthly" },
          { title: "Comisiones", url: "/payroll/commissions" },
        ],
      },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      {
        title: "Ajustes",
        icon: Settings,
        items: [
          { title: "Usuarios", url: "/admin/users" },
          { title: "Roles", url: "/admin/roles" },
          { title: "WhatsApp & IA", url: "/admin/integraciones" },
          { title: "Parámetros", url: "/admin/config" },
          { title: "Flota", url: "/admin/fleet" },
          { title: "Zonas", url: "/admin/zones" },
          { title: "Modelo de Negocio", url: "/admin/negocio" },
          { title: "General", url: "/admin/general-settings" },
        ],
      },
    ],
  },
]

const navSecondary = [
  { title: "Soporte", url: "/soporte", icon: HelpCircle },
  { title: "Documentación", url: "/docs", icon: BookOpen },
]

export function MobileDrawerMenu({ open, onOpenChange }: MobileDrawerMenuProps) {
  const pathname = usePathname()
  const { can, hasModule, isAdmin, role } = useRolePermissions()

  const filteredNavGroups = useMemo(() => {
    return fullNavGroups
      .map((group) => {
        if (group.label === "PRINCIPAL") {
          if (!hasModule("dashboard")) return null
          const items = group.items
            .map((item) => {
              if (item.title === "Dashboard") {
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Analítica") return can("dashboard", "ver_analitica")
                  if (sub.title === "Métricas") return can("dashboard", "ver_metricas")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              return item
            })
            .filter(Boolean) as NavItem[]
          if (items.length === 0) return null
          return { ...group, items }
        }

        if (group.label === "COMERCIAL") {
          const items = group.items
            .map((item) => {
              if (item.title === "WhatsApp") {
                if (!hasModule("whatsapp") || !can("whatsapp", "chat")) return null
                return item
              }
              if (item.title === "Contactos") {
                if (!hasModule("clientes")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Contactos") return isAdmin || can("clientes", "ver_todos") || role === "VENDEDOR" || role === "SUPERVISOR"
                  if (sub.title === "Crear Contacto") return can("clientes", "crear")
                  if (sub.title === "Asignación de Cartera") return isAdmin || can("clientes", "asignar_cartera")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              if (item.title === "Oportunidades") {
                if (!hasModule("oportunidades") || (!can("oportunidades", "ver") && !can("oportunidades", "crear"))) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Oportunidades") return can("oportunidades", "ver")
                  if (sub.title === "Crear Oportunidad") return can("oportunidades", "crear")
                  if (sub.title === "Reportes") return can("oportunidades", "exportar") && role !== "VENDEDOR"
                  if (sub.title === "Configuración") return isAdmin || can("oportunidades", "configurar")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              if (item.title === "Ventas") {
                if (!hasModule("ventas") || (!can("ventas", "ver") && !can("ventas", "crear"))) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Ventas") return can("ventas", "ver")
                  if (sub.title === "Crear Venta") return can("ventas", "crear")
                  if (sub.title === "Reportes") return can("ventas", "exportar") && role !== "VENDEDOR"
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              return item
            })
            .filter(Boolean) as NavItem[]
          if (items.length === 0) return null
          return { ...group, items }
        }

        if (group.label === "OPERACIONES") {
          const items = group.items
            .map((item) => {
              if (item.title === "Pedidos") {
                if (!hasModule("pedidos") || (!can("pedidos", "ver") && !can("pedidos", "crear"))) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Pedidos") return can("pedidos", "ver")
                  if (sub.title === "Crear Pedido") return can("pedidos", "crear")
                  if (sub.title === "Reportes") return can("pedidos", "ver") && role !== "VENDEDOR"
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              if (item.title === "Productos") {
                if (!hasModule("productos")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Catálogo") return can("productos", "ver_catalogo")
                  if (sub.title === "Categorías") return isAdmin || can("productos", "gestionar_categorias")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              return item
            })
            .filter(Boolean) as NavItem[]
          if (items.length === 0) return null
          return { ...group, items }
        }

        if (group.label === "GESTIÓN") {
          const items = group.items
            .map((item) => {
              if (item.title === "Finanzas") {
                if (!hasModule("finanzas")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Caja") return can("finanzas", "ver_flujo")
                  if (sub.title === "Gastos") return can("finanzas", "gastos")
                  if (sub.title === "Compras") return can("finanzas", "compras")
                  if (sub.title === "Deudas") return can("finanzas", "deudas")
                  if (sub.title === "Proveedores") return can("finanzas", "compras") || can("finanzas", "gastos")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              if (item.title === "Rentabilidad y Comisiones") {
                if (!hasModule("rentabilidad")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Rentabilidad Actual") return can("rentabilidad", "ver_margenes")
                  if (sub.title === "Simulador de Ingresos") return can("rentabilidad", "simulador")
                  if (sub.title === "Liquidaciones y Pagos") return can("rentabilidad", "ver_costos")
                  if (sub.title === "Configuración y Escalas") return isAdmin || can("rentabilidad", "configurar_perfiles")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              if (item.title === "Personal") {
                if (!hasModule("payroll")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Empleados") return can("payroll", "ver_personal")
                  if (sub.title === "Asistencia Diaria") return can("payroll", "asistencia")
                  if (sub.title === "Asistencia Mensual") return can("payroll", "asistencia")
                  if (sub.title === "Comisiones") return can("payroll", "pagar_comisiones") || can("payroll", "ver_liquidaciones")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              return item
            })
            .filter(Boolean) as NavItem[]
          if (items.length === 0) return null
          return { ...group, items }
        }

        if (group.label === "SISTEMA") {
          if (!isAdmin && !hasModule("admin")) return null
          const items = group.items
            .map((item) => {
              if (item.title === "Ajustes") {
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Usuarios") return isAdmin || can("admin", "gestionar_usuarios")
                  if (sub.title === "Roles") return isAdmin || can("admin", "gestionar_roles")
                  if (sub.title === "WhatsApp & IA" || sub.title === "Parámetros" || sub.title === "Flota" || sub.title === "Zonas" || sub.title === "Modelo de Negocio" || sub.title === "General") {
                    return isAdmin || can("admin", "ajustes_sistema")
                  }
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }
              return item
            })
            .filter(Boolean) as NavItem[]
          if (items.length === 0) return null
          return { ...group, items }
        }

        return group
      })
      .filter(Boolean) as NavGroup[]
  }, [can, hasModule, isAdmin, role])

  // Track expanded state of sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    fullNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.items?.some((sub) => pathname.startsWith(sub.url))) {
          initial[item.title] = true
        }
      })
    })
    return initial
  })

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const handleNavigate = () => {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[88vw] sm:w-[380px] p-0 flex flex-col bg-background/98 border-r shadow-2xl focus:outline-none"
      >
        <SheetHeader className="px-5 py-3.5 border-b shrink-0 text-left bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs text-xs">
                NL
              </div>
              <div>
                <SheetTitle className="text-sm font-bold leading-tight">NextLead CRM</SheetTitle>
                <SheetDescription className="text-[10px] text-muted-foreground">
                  Menú Completo de Módulos
                </SheetDescription>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </SheetHeader>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 smooth-scroll">
          {filteredNavGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider px-2 py-1">
                {group.label}
              </h4>

              <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden divide-y divide-border/30 shadow-2xs">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const hasSub = Array.isArray(item.items) && item.items.length > 0
                  const isItemActive = item.items?.some((sub) =>
                    pathname === sub.url || pathname.startsWith(sub.url + "/")
                  )
                  const isOpen = !!expandedSections[item.title]

                  if (hasSub) {
                    return (
                      <Collapsible
                        key={item.title}
                        open={isOpen}
                        onOpenChange={() => toggleSection(item.title)}
                        className="w-full"
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px]",
                              isItemActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "p-1.5 rounded-md shrink-0",
                                  isItemActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <Icon className="size-4" />
                              </div>
                              <span className="truncate">{item.title}</span>
                            </div>

                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="bg-muted/30 border-t border-border/30 px-3 py-1 space-y-0.5">
                          {item.items!.map((sub) => {
                            const isSubActive =
                              pathname === sub.url || pathname.startsWith(sub.url + "/")

                            return (
                              <Link
                                key={sub.url}
                                href={sub.url}
                                onClick={handleNavigate}
                                className={cn(
                                  "flex items-center justify-between py-2 px-3 pl-8 text-xs rounded-md transition-colors min-h-[38px]",
                                  isSubActive
                                    ? "bg-primary/15 text-primary font-bold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
                                )}
                              >
                                <span>{sub.title}</span>
                                {isSubActive && (
                                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                                )}
                              </Link>
                            )
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  }

                  // Non-collapsible item
                  return (
                    <Link
                      key={item.title}
                      href={item.url || "#"}
                      onClick={handleNavigate}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px]",
                        pathname === item.url
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* SOPORTE Y DOCUMENTACIÓN */}
          <div className="space-y-1 pt-1">
            <h4 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider px-2 py-1">
              AYUDA & SOPORTE
            </h4>
            <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden divide-y divide-border/30 shadow-2xs">
              {navSecondary.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.url
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={handleNavigate}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]",
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <span className="truncate">{item.title}</span>
                    </div>
                    <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Bottom spacing for safety */}
          <div className="h-8" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
