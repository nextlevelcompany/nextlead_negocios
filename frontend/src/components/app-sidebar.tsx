"use client"

import * as React from "react"
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
  const [currentUser, setCurrentUser] = React.useState<any>(null)

  React.useEffect(() => {
    const updateFromSettings = () => {
      // 1. Cargar desde localStorage si ya está cacheado
      if (typeof window !== "undefined") {
        const cachedModel = localStorage.getItem("negocio.tipo_modelo")
        const cachedStock = localStorage.getItem("negocio.gestiona_stock")
        const cachedUser = localStorage.getItem("crm_active_user")
        if (cachedModel) setTipoModelo(cachedModel)
        if (cachedStock !== null) setGestionaStock(cachedStock === "true")
        if (cachedUser) {
          try {
            setCurrentUser(JSON.parse(cachedUser))
          } catch {}
        }
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

  // Filtrar modularmente los menús según el modelo de negocio y roles del usuario
  const filteredNavGroups = React.useMemo(() => {
    const role = (currentUser?.role || "ADMIN").toUpperCase()
    const modulesStr = currentUser?.modules
    let permissions: any = {}
    if (modulesStr) {
      try {
        permissions = typeof modulesStr === "string" ? JSON.parse(modulesStr) : modulesStr
      } catch {}
    }
    const isAdmin = role === "ADMIN"
    const isSupervisor = role === "SUPERVISOR"
    const isVendedor = role === "VENDEDOR"

    return data.navGroups
      .map((group) => {
        // 1. Grupo SISTEMA: Solo visible para administradores
        if (group.label === "SISTEMA") {
          if (!isAdmin && !permissions.can_manage_users) {
            return null
          }
        }

        // 2. Grupo GESTIÓN: Finanzas, Rentabilidad, Personal
        if (group.label === "GESTIÓN") {
          if (isVendedor && !permissions.can_view_finance && !permissions.can_view_profitability) {
            return null
          }
          return {
            ...group,
            items: group.items
              .filter((item) => {
                if (item.title === "Finanzas") {
                  return isAdmin || isSupervisor || permissions.can_view_finance
                }
                if (item.title === "Rentabilidad y Comisiones") {
                  return isAdmin || isSupervisor || permissions.can_view_profitability
                }
                if (item.title === "Personal") {
                  return isAdmin || isSupervisor
                }
                return true
              })
              .map((item) => {
                if (item.title === "Finanzas") {
                  return {
                    ...item,
                    items: item.items.filter((sub) => {
                      if (sub.title === "Compras" && tipoModelo === "TELECOM" && !gestionaStock) {
                        return false
                      }
                      return true
                    }),
                  }
                }
                return item
              }),
          }
        }

        // 3. Grupo COMERCIAL: Ocultar "Asignación de Cartera" a Vendedores
        if (group.label === "COMERCIAL") {
          return {
            ...group,
            items: group.items.map((item) => {
              if (item.title === "Contactos") {
                return {
                  ...item,
                  items: item.items.filter((sub) => {
                    if (sub.title === "Asignación de Cartera" && !isAdmin && !isSupervisor) {
                      return false
                    }
                    return true
                  }),
                }
              }
              return item
            }),
          }
        }

        return group
      })
      .filter(Boolean) as typeof data.navGroups
  }, [tipoModelo, gestionaStock, currentUser])

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
