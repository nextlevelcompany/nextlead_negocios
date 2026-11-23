"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock, User, ShieldCheck, Loader2, AlertCircle, KeyRound, UserCheck } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin123")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Al cargar la vista de login, limpiar tokens caducados o residuales
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("jwt_token")
      document.cookie = "crm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  }, [])

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanUser = username.trim()
    const cleanPass = password

    if (!cleanUser || !cleanPass) {
      setErrorMessage("Por favor ingresa usuario y contraseña.")
      return
    }

    try {
      setLoading(true)
      const res = await api.post("/api/auth/login", {
        username: cleanUser,
        password: cleanPass,
      })

      if (res.data && res.data.token) {
        const { token, username: userLogin, role, id, firstName, lastName, avatar, modules } = res.data

        // 1. Guardar token en localStorage
        localStorage.setItem("token", token)
        localStorage.setItem("jwt_token", token)

        // 2. Guardar cookie para SSR y middleware
        document.cookie = `crm_token=${token}; path=/; max-age=86400; SameSite=Lax`

        // 3. Guardar objeto de sesión de usuario
        const activeUser = {
          id: id || 1,
          username: userLogin,
          firstName: firstName || userLogin,
          lastName: lastName || "",
          role: role || "ADMIN",
          avatar: avatar || null,
          modules: modules || "",
        }
        localStorage.setItem("crm_active_user", JSON.stringify(activeUser))

        // 4. Notificar a otros componentes
        window.dispatchEvent(new CustomEvent("crm_user_switched", { detail: activeUser }))

        toast.success(`¡Bienvenido, ${activeUser.firstName}! Sesión autorizada.`)

        // 5. Redireccionar al destino previsto o al dashboard
        const redirectUrl = sessionStorage.getItem("redirect_after_login") || "/dashboard/analytics"
        sessionStorage.removeItem("redirect_after_login")

        setTimeout(() => {
          window.location.href = redirectUrl
        }, 150)
      } else {
        setErrorMessage("Respuesta de autenticación incompleta del servidor.")
      }
    } catch (err: any) {
      console.error("Error en login:", err)
      if (err.response) {
        if (err.response.status === 401) {
          setErrorMessage("Credenciales incorrectas. Verifica que el usuario y la contraseña sean válidos.")
        } else {
          setErrorMessage(
            typeof err.response.data === "string"
              ? err.response.data
              : err.response.data?.message || "Error al procesar la autenticación."
          )
        }
      } else {
        setErrorMessage("No se pudo conectar con el servidor de autenticación (puerto 8081).")
      }
      toast.error("Acceso denegado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-md", className)} {...props}>
      <Card className="border border-border/80 shadow-2xl bg-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Iniciar Sesión</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Ingresa tus credenciales autorizadas para acceder a NextLead CRM
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Usuario
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 font-semibold shadow transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Acceder al Sistema"
              )}
            </Button>

            {/* Accesos rápidos para el equipo */}
            <div className="pt-3 border-t mt-3">
              <p className="text-xs text-muted-foreground font-medium mb-2 text-center">
                Usuarios de Acceso Rápido:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "admin123")}
                  className="text-xs p-2 rounded border bg-muted/50 hover:bg-muted text-left flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="size-3 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">admin</div>
                    <div className="text-[10px] text-muted-foreground">Admin General</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("mariana.supervisor", "admin123")}
                  className="text-xs p-2 rounded border bg-muted/50 hover:bg-muted text-left flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="size-3 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">mariana</div>
                    <div className="text-[10px] text-muted-foreground">Supervisor</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 border-t mt-2">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Autenticación encriptada con JWT & BCrypt</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
