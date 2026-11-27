"use client"

import * as React from "react"
import { useRolePermissions } from "@/lib/permissions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BookOpen,
  ChartSine,
  UserCircle,
  File,
  Tachometer,
  Grid,
  BuildingHouse,
  Cog,
  HomeAlt,
  ShoppingBag,
  CircleThreeQuarter,
  Lock,
} from "@boxicons/react"
import {
  MessageSquare,
  ShoppingCart,
  Truck,
  DollarSign,
  Users,
  Boxes,
  Target,
  CalendarCheck,
  CalendarClock,
  ShieldCheck,
  Palette,
  Receipt,
  TrendingUp,
  Calculator,
} from "lucide-react"

// nav menues organizados por módulos empresariales estándar de CRM
const data = {
  user: {
    name: "Administrador",
    email: "admin@nextlead.com",
    avatar: "https://untitledui.com/images/avatars/madeleine-pitts",
  },
  navGroups: [
    {
      label: "PRINCIPAL",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard/analytics",
          icon: <HomeAlt />,
          items: [
            {
              title: "Analítica",
              url: "/dashboard/analytics",
            },
            {
              title: "Métricas",
              url: "/dashboard/eCommerce",
            },
          ],
        },
      ],
    },
    {
      label: "COMERCIAL",
      items: [
        {
          title: "WhatsApp",
          url: "#",
          icon: <MessageSquare className="size-4" />,
          items: [
            {
              title: "Chat",
              url: "/applications/chatbox",
            },
          ],
        },
        {
          title: "Contactos",
          url: "#",
          icon: <Users className="size-4" />,
          items: [
            {
              title: "Contactos",
              url: "/contactos",
            },
            {
              title: "Crear Contacto",
              url: "/contactos/create",
            },
            {
              title: "Asignación de Cartera",
              url: "/contactos/asignacion",
            },
          ],
        },
        {
          title: "Oportunidades",
          url: "#",
          icon: <Target className="size-4" />,
          items: [
            {
              title: "Oportunidades",
              url: "/opportunities/view",
            },
            {
              title: "Crear Oportunidad",
              url: "/opportunities/create",
            },
            {
              title: "Reportes",
              url: "/opportunities/reports",
            },
            {
              title: "Configuración",
              url: "/opportunities/configuracion",
            },
          ],
        },
        {
          title: "Ventas",
          url: "#",
          icon: <Receipt className="size-4" />,
          items: [
            {
              title: "Ventas",
              url: "/ventas/view",
            },
            {
              title: "Crear Venta",
              url: "/ventas/create",
            },
            {
              title: "Reportes",
              url: "/ventas/reports",
            },
          ],
        },
        {
          title: "Actividades",
          url: "#",
          icon: <CalendarClock className="size-4" />,
          items: [
            {
              title: "Planificador & Agenda",
              url: "/actividades",
            },
          ],
        },
      ],
    },
    {
      label: "OPERACIONES",
      items: [
        {
          title: "Pedidos",
          url: "#",
          icon: <Truck className="size-4" />,
          items: [
            {
              title: "Pedidos",
              url: "/pedidos/view",
            },
            {
              title: "Crear Pedido",
              url: "/pedidos/create",
            },
            {
              title: "Reportes",
              url: "/pedidos/reports",
            },
          ],
        },
        {
          title: "Productos",
          url: "#",
          icon: <Boxes className="size-4" />,
          items: [
            {
              title: "Catálogo",
              url: "/productos/view",
            },
            {
              title: "Categorías",
              url: "/productos/categorias",
            },
          ],
        },
      ],
    },
    {
      label: "GESTIÓN",
      items: [
        {
          title: "Finanzas",
          url: "#",
          icon: <DollarSign className="size-4" />,
          items: [
            {
              title: "Caja",
              url: "/finanzas/cash-flow",
            },
            {
              title: "Gastos",
              url: "/finanzas/expenses",
            },
            {
              title: "Compras",
              url: "/finanzas/purchases",
            },
            {
              title: "Deudas",
              url: "/finanzas/debts",
            },
            {
              title: "Proveedores",
              url: "/finanzas/suppliers",
            },
          ],
        },
        {
          title: "Rentabilidad y Comisiones",
          url: "#",
          icon: <TrendingUp className="size-4" />,
          items: [
            {
              title: "Rentabilidad Actual",
              url: "/rentabilidad/actual",
            },
            {
              title: "Simulador de Ingresos",
              url: "/rentabilidad/simulador",
            },
            {
              title: "Liquidaciones y Pagos",
              url: "/rentabilidad/liquidaciones",
            },
            {
              title: "Configuración y Escalas",
              url: "/rentabilidad/configuracion",
            },
          ],
        },
        {
          title: "Personal",
          url: "#",
          icon: <CalendarCheck className="size-4" />,
          items: [
            {
              title: "Empleados",
              url: "/payroll/staff",
            },
            {
              title: "Asistencia Diaria",
              url: "/payroll/attendance-daily",
            },
            {
              title: "Asistencia Mensual",
              url: "/payroll/attendance-monthly",
            },
            {
              title: "Comisiones",
              url: "/payroll/commissions",
            },
          ],
        },
      ],
    },
    {
      label: "SISTEMA",
      items: [
        {
          title: "Ajustes",
          url: "#",
          icon: <Cog />,
          items: [
            {
              title: "Usuarios",
              url: "/admin/users",
            },
            {
              title: "Roles",
              url: "/admin/roles",
            },
            {
              title: "WhatsApp & IA",
              url: "/admin/integraciones",
            },
            {
              title: "Parámetros",
              url: "/admin/config",
            },
            {
              title: "Flota",
              url: "/admin/fleet",
            },
            {
              title: "Zonas",
              url: "/admin/zones",
            },
            {
              title: "Modelo de Negocio",
              url: "/admin/negocio",
            },
            {
              title: "General",
              url: "/admin/general-settings",
            },
          ],
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Soporte",
      url: "/soporte",
      icon: <UserCircle />,
    },
    {
      title: "Documentación",
      url: "/docs",
      icon: <BookOpen />,
    },
  ],
}

// This is the sidebar component used in the app layout.
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onHoverChange?: (value: boolean) => void
}

// The sidebar component used in the app layout. It receives an `onHoverChange` prop to notify the parent layout when the sidebar is hovered or not.
export function AppSidebar({ onHoverChange, ...props }: AppSidebarProps) {
  const [gestionaStock, setGestionaStock] = React.useState<boolean>(false)
  const [tipoModelo, setTipoModelo] = React.useState<string>("TELECOM")
  const { can, hasModule, isAdmin, role } = useRolePermissions()

  React.useEffect(() => {
    const updateFromSettings = () => {
      // 1. Cargar desde localStorage si ya está cacheado
      if (typeof window !== "undefined") {
        const cachedModel = localStorage.getItem("negocio.tipo_modelo")
        const cachedStock = localStorage.getItem("negocio.gestiona_stock")
        if (cachedModel) setTipoModelo(cachedModel)
        if (cachedStock !== null) setGestionaStock(cachedStock === "true")
      }

      // 2. Consultar API para sincronizar
      import("@/lib/api")
        .then(({ default: api }) => {
          api
            .get("/api/settings")
            .then((res) => {
              if (res.data) {
                const m = res.data["negocio.tipo_modelo"] || "TELECOM"
                const s = res.data["negocio.gestiona_stock"]
                  ? res.data["negocio.gestiona_stock"] === "true"
                  : m === "REGULAR"
                setTipoModelo(m)
                setGestionaStock(s)
                if (typeof window !== "undefined") {
                  localStorage.setItem("negocio.tipo_modelo", m)
                  localStorage.setItem("negocio.gestiona_stock", s ? "true" : "false")
                }
              }
            })
            .catch(() => {})
        })
        .catch(() => {})
    }

    updateFromSettings()
    if (typeof window !== "undefined") {
      window.addEventListener("business-settings-changed", updateFromSettings)
      window.addEventListener("storage", updateFromSettings)
      return () => {
        window.removeEventListener("business-settings-changed", updateFromSettings)
        window.removeEventListener("storage", updateFromSettings)
      }
    }
  }, [])

  // Filtrar modularmente los menús según el modelo de negocio y permisos del rol del usuario
  const filteredNavGroups = React.useMemo(() => {
    return data.navGroups
      .map((group) => {
        // 1. Grupo PRINCIPAL: Dashboard
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
            .filter(Boolean) as typeof group.items
          if (items.length === 0) return null
          return { ...group, items }
        }

        // 2. Grupo COMERCIAL: WhatsApp, Contactos, Oportunidades, Ventas
        if (group.label === "COMERCIAL") {
          const items = group.items
            .map((item) => {
              // WhatsApp
              if (item.title === "WhatsApp") {
                if (!hasModule("whatsapp") || !can("whatsapp", "chat")) return null
                return item
              }

              // Contactos
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

              // Oportunidades
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

              // Ventas
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
            .filter(Boolean) as typeof group.items

          if (items.length === 0) return null
          return { ...group, items }
        }

        // 3. Grupo OPERACIONES: Pedidos, Productos
        if (group.label === "OPERACIONES") {
          const items = group.items
            .map((item) => {
              // Pedidos: Si no tiene permiso de módulo o ver/crear están apagados, desaparece
              if (item.title === "Pedidos") {
                if (!hasModule("pedidos") || (!can("pedidos", "ver") && !can("pedidos", "crear"))) {
                  return null
                }
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Pedidos") return can("pedidos", "ver")
                  if (sub.title === "Crear Pedido") return can("pedidos", "crear")
                  if (sub.title === "Reportes") return can("pedidos", "ver") && role !== "VENDEDOR"
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }

              // Productos
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
            .filter(Boolean) as typeof group.items

          if (items.length === 0) return null
          return { ...group, items }
        }

        // 4. Grupo GESTIÓN: Finanzas, Rentabilidad, Personal
        if (group.label === "GESTIÓN") {
          const items = group.items
            .map((item) => {
              // Finanzas
              if (item.title === "Finanzas") {
                if (!hasModule("finanzas")) return null
                const subs = item.items?.filter((sub) => {
                  if (sub.title === "Caja") return can("finanzas", "ver_flujo")
                  if (sub.title === "Gastos") return can("finanzas", "gastos")
                  if (sub.title === "Compras") return can("finanzas", "compras") && (tipoModelo !== "TELECOM" || gestionaStock)
                  if (sub.title === "Deudas") return can("finanzas", "deudas")
                  if (sub.title === "Proveedores") return can("finanzas", "compras") || can("finanzas", "gastos")
                  return true
                }) || []
                if (subs.length === 0) return null
                return { ...item, items: subs }
              }

              // Rentabilidad y Comisiones
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

              // Personal
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
            .filter(Boolean) as typeof group.items

          if (items.length === 0) return null
          return { ...group, items }
        }

        // 5. Grupo SISTEMA: Ajustes
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
            .filter(Boolean) as typeof group.items

          if (items.length === 0) return null
          return { ...group, items }
        }

        return group
      })
      .filter(Boolean) as typeof data.navGroups
  }, [tipoModelo, gestionaStock, can, hasModule, isAdmin, role])

  return (
     <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
    <Sidebar collapsible="icon" {...props} className="shadow-lg z-50 overflow-hidden">
      <SidebarHeader className="h-16 justify-center px-3 border-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="p-2">
              <a href="/dashboard/analytics">
                <div className="flex aspect-square size-8 items-center justify-center mx-auto rounded-lg bg-emerald-600 text-white font-bold shadow-sm">
                  NL
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">NextLead CRM</span>
                  <span className="truncate text-xs text-muted-foreground">WhatsApp & Ventas</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex min-h-full flex-col">
              <NavMain groups={filteredNavGroups} />

              <NavSecondary
                items={data.navSecondary}
                className="mt-auto px-3 pb-3"
              />
            </div>
          </ScrollArea>
        </SidebarContent>
    </Sidebar>
    </div>
  )
}
