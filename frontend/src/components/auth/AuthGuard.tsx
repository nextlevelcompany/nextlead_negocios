"use client"

import React, { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ShieldCheck, Loader2, MessageSquare } from "lucide-react"
import api from "@/lib/api"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === "undefined") return

      const token = localStorage.getItem("token") || localStorage.getItem("jwt_token")

      if (!token) {
        // Guardar la página que intentó abrir para redirigirlo luego del login
        if (pathname && pathname !== "/login" && !pathname.includes("/auth/")) {
          sessionStorage.setItem("redirect_after_login", pathname)
        }
        setIsAuthenticated(false)
        router.replace("/login")
        return
      }

      // Validar que el token sea aceptado por el backend
      try {
        const res = await api.get("/api/auth/me")
        if (res.data && res.data.username) {
          // Token válido y usuario activo verificado
          setIsAuthenticated(true)
        } else {
          throw new Error("Usuario inválido")
        }
      } catch (err: any) {
        console.warn("Sesión inválida o expirada:", err?.message)
        // Limpiar credenciales caducadas
        localStorage.removeItem("token")
        localStorage.removeItem("jwt_token")
        localStorage.removeItem("crm_active_user")
        document.cookie = "crm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

        if (pathname && pathname !== "/login" && !pathname.includes("/auth/")) {
          sessionStorage.setItem("redirect_after_login", pathname)
        }
        setIsAuthenticated(false)
        router.replace("/login")
      }
    }

    checkAuth()
  }, [pathname, router])

  // Mientras verifica el token, mostramos un loader de seguridad
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-card border shadow-xl max-w-sm w-full mx-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="size-7 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold">NextLead CRM</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Verificando credenciales autorizadas...
            </p>
          </div>
          <Loader2 className="size-5 animate-spin text-primary mt-1" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
