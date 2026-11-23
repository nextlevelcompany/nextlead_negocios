"use client"

import React, { useState } from "react"
import Link from "next/link"
import { GridCirclePlus } from "@boxicons/react"
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  CreditCard,
  Briefcase,
  Users,
  ShieldCheck,
  MessageCircle,
  Calendar,
  UserCheck,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type AppItem = {
  icon: LucideIcon
  label: string
  href: string
  color: string
  bgHover: string
}

const appItems: AppItem[] = [
  {
    icon: TrendingUp,
    label: "Ventas & CRM",
    href: "/ventas/view",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    bgHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
  },
  {
    icon: DollarSign,
    label: "Flujo de Caja",
    href: "/finanzas/cash-flow",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    bgHover: "hover:bg-amber-50 dark:hover:bg-amber-950/40",
  },
  {
    icon: BarChart3,
    label: "Rentabilidad",
    href: "/rentabilidad/simulador",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    bgHover: "hover:bg-purple-50 dark:hover:bg-purple-950/40",
  },
  {
    icon: CreditCard,
    label: "Liquidaciones",
    href: "/rentabilidad/liquidaciones",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    bgHover: "hover:bg-blue-50 dark:hover:bg-blue-950/40",
  },
  {
    icon: Briefcase,
    label: "Colaboradores",
    href: "/payroll/staff",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    bgHover: "hover:bg-cyan-50 dark:hover:bg-cyan-950/40",
  },
  {
    icon: Users,
    label: "Usuarios",
    href: "/admin/users",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    bgHover: "hover:bg-teal-50 dark:hover:bg-teal-950/40",
  },
  {
    icon: ShieldCheck,
    label: "Roles & Accesos",
    href: "/admin/roles",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    bgHover: "hover:bg-indigo-50 dark:hover:bg-indigo-950/40",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp CRM",
    href: "/contactos",
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    bgHover: "hover:bg-green-50 dark:hover:bg-green-950/40",
  },
  {
    icon: Calendar,
    label: "Agenda",
    href: "/applications/calendar",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    bgHover: "hover:bg-sky-50 dark:hover:bg-sky-950/40",
  },
  {
    icon: UserCheck,
    label: "Asistencia",
    href: "/payroll/attendance-daily",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    bgHover: "hover:bg-rose-50 dark:hover:bg-rose-950/40",
  },
  {
    icon: Settings,
    label: "Configuración",
    href: "/admin/negocio",
    color: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    bgHover: "hover:bg-slate-100 dark:hover:bg-slate-800/50",
  },
  {
    icon: User,
    label: "Mi Perfil",
    href: "/account/profile",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    bgHover: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
  },
]

export function AppLauncherDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 hover:bg-muted/60 transition-colors"
          title="Lanzador de Módulos & Aplicaciones"
        >
          <GridCirclePlus className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-32px)] sm:w-[340px] p-0 rounded-2xl overflow-hidden shadow-2xl border bg-popover"
      >
        <DropdownMenuLabel className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
          <span className="font-bold text-sm text-foreground">Módulos del Sistema</span>
          <span className="text-[11px] text-muted-foreground">Acceso Rápido</span>
        </DropdownMenuLabel>

        <ScrollArea className="max-h-[420px]">
          <div className="grid grid-cols-3 gap-2 p-3">
            {appItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-transparent transition-all duration-200 cursor-pointer group text-center",
                    item.bgHover,
                    "hover:border-border hover:shadow-xs"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center size-10 rounded-full transition-transform group-hover:scale-110",
                      item.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
