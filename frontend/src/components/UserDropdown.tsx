"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  LogOut,
  Users,
  ChevronDown,
  RefreshCw,
} from "lucide-react"

export interface ActiveUser {
  id: number
  username: string
  firstName?: string
  lastName?: string
  role: string
  phone?: string
  location?: string
  avatar?: string | null
  modules?: string
}

export function UserDropdown() {
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null)
  const [allUsers, setAllUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(false)

  // Cargar usuario activo de localStorage o backend
  const loadUserSession = async () => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_active_user")
        if (stored) {
          try {
            setCurrentUser(JSON.parse(stored))
          } catch {
            // Ignorar parse error
          }
        }
      }

      // Consultar usuarios al backend para tener la lista de perfiles disponibles
      const res = await api.get("/api/admin/users")
      const list = Array.isArray(res.data) ? res.data : []
      setAllUsers(list)

      if (list.length > 0) {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("crm_active_user")
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              // Actualizar datos frescos desde la base de datos para reflejar cambios de nombre de inmediato
              const fresh = list.find((u: ActiveUser) => u.username === parsed.username || u.id === parsed.id)
              if (fresh) {
                setCurrentUser(fresh)
                localStorage.setItem("crm_active_user", JSON.stringify(fresh))
              }
            } catch {
              // ignore
            }
          } else {
            // Por defecto seleccionar el primer admin o primer usuario
            const defaultUser = list.find((u: ActiveUser) => u.role === "ADMIN") || list[0]
            setCurrentUser(defaultUser)
            localStorage.setItem("crm_active_user", JSON.stringify(defaultUser))
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar sesión de usuario:", err)
      // Fallback local seguro si la red falla
      if (!currentUser) {
        const fallback: ActiveUser = {
          id: 462,
          username: "admin",
          firstName: "Kate",
          lastName: "Jones",
          role: "ADMIN",
        }
        setCurrentUser(fallback)
      }
    }
  }

  useEffect(() => {
    loadUserSession()

    // Escuchar cambios de usuario desde otras pestañas o componentes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "crm_active_user" && e.newValue) {
        try {
          setCurrentUser(JSON.parse(e.newValue))
        } catch {
          // ignore
        }
      }
    }

    const handleCustomUserSwitch = (e: CustomEvent) => {
      if (e.detail) {
        setCurrentUser(e.detail)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("crm_user_switched" as any, handleCustomUserSwitch)
    window.addEventListener("crm_user_updated" as any, handleCustomUserSwitch)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("crm_user_switched" as any, handleCustomUserSwitch)
      window.removeEventListener("crm_user_updated" as any, handleCustomUserSwitch)
    }
  }, [])

  // Cambiar usuario activo rápidamente (útil para verificar permisos de Vendedor / Supervisor / Admin)
  const handleSwitchUser = (user: ActiveUser) => {
    setCurrentUser(user)
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_active_user", JSON.stringify(user))
      window.dispatchEvent(new CustomEvent("crm_user_switched", { detail: user }))
    }
    toast.success(`Sesión cambiada a ${user.firstName || user.username} (${user.role})`)
  }

  // Cerrar sesión
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("jwt_token")
      localStorage.removeItem("crm_active_user")
      sessionStorage.removeItem("redirect_after_login")
      document.cookie = "crm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
    toast.info("Sesión finalizada. Redirigiendo al login...")
    setTimeout(() => {
      window.location.href = "/login"
    }, 400)
  }

  const getInitials = (name?: string, fallback = "US") => {
    if (!name) return fallback
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const fullName = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username
    : "Administrador"

  const roleLabel = (role?: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return { label: "Administrador", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300" }
      case "SUPERVISOR":
        return { label: "Supervisor", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300" }
      case "VENDEDOR":
        return { label: "Vendedor / Asesor", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300" }
      case "FINANZAS":
        return { label: "Finanzas & Caja", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300" }
      case "OPERACIONES":
        return { label: "Operaciones", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300" }
      default:
        return { label: role || "Usuario", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300" }
    }
  }

  const currentRoleInfo = roleLabel(currentUser?.role)

  return (
    <DropdownMenu>
      {/* Trigger en la barra superior */}
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer px-3 border-r border-l h-16 ml-2 outline-none hover:bg-muted/60 transition-colors select-none group"
          title={`Conectado como ${fullName} (${currentUser?.role || "ADMIN"})`}
        >
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-emerald-500/30 ring-offset-1 transition-transform group-hover:scale-105">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={fullName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {getInitials(fullName, "AD")}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 rounded-full ring-2 ring-background" />
          </div>

          <div className="hidden md:flex flex-col text-left max-w-[140px]">
            <p className="text-sm font-semibold truncate leading-tight text-foreground">
              {fullName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                {currentRoleInfo.label}
              </span>
            </div>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>

      {/* Menú desplegable */}
      <DropdownMenuContent align="end" className="w-72 p-2 rounded-xl shadow-xl border bg-popover">
        {/* Tarjeta de Encabezado */}
        <DropdownMenuLabel className="p-3 mb-2 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={fullName} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                {getInitials(fullName, "AD")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">@{currentUser?.username || "admin"}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${currentRoleInfo.color}`}>
                  {currentRoleInfo.label}
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Acceso Rápido y Navegación */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="gap-2.5 h-9 cursor-pointer">
            <Link href="/admin/users">
              <Users className="size-4 text-primary" />
              <span className="flex-1 font-medium text-sm">Administrar Usuarios & Accesos</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="gap-2.5 h-9 cursor-pointer">
            <Link href="/ventas/view">
              <LayoutDashboard className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Ver Ventas & CRM</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="gap-2.5 h-9 cursor-pointer">
            <Link href="/account/profile">
              <User className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Mi Perfil</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />

        {/* Switcher rápido de roles / usuarios (Ideal para probar vistas de vendedor vs admin) */}
        {allUsers.length > 1 && (
          <>
            <div className="px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Cambiar Usuario Activo
                </span>
                <span className="text-[10px] text-muted-foreground">({allUsers.length} disponibles)</span>
              </div>
              <div className="mt-1.5 max-h-36 overflow-y-auto space-y-1 pr-1">
                {allUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id || currentUser?.username === u.username
                  const rInfo = roleLabel(u.role)
                  const uName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username

                  return (
                    <button
                      key={u.id || u.username}
                      type="button"
                      onClick={() => handleSwitchUser(u)}
                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(uName, "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{uName}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ml-1.5 shrink-0 ${rInfo.color}`}>
                        {u.role}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>
            <DropdownMenuSeparator className="my-2" />
          </>
        )}

        {/* Botón de Logout */}
        <div className="p-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full h-8 justify-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200"
          >
            <LogOut className="size-3.5" />
            Cerrar Sesión
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
