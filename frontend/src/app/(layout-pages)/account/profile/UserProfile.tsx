"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Shield,
  ShieldCheck,
  KeyRound,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  CheckCircle2,
  Calendar,
  Lock,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Check,
  X,
  CreditCard,
  MessageCircle,
} from "lucide-react"

export interface UserProfileData {
  id?: number
  username: string
  role: string
  firstName?: string
  lastName?: string
  phone?: string
  location?: string
  bio?: string
  website?: string
  avatar?: string | null
  modules?: string
}

export default function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Campos de formulario
  const [formFirstName, setFormFirstName] = useState("")
  const [formLastName, setFormLastName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formBio, setFormBio] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formAvatar, setFormAvatar] = useState("")

  // Seguridad / Cambio de Contraseña
  const [formPassword, setFormPassword] = useState("")
  const [formConfirmPassword, setFormConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Cargar perfil del usuario activo
  const loadProfile = async () => {
    try {
      setLoading(true)
      let activeUsername = "admin"

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_active_user")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed.username) activeUsername = parsed.username
          } catch {}
        }
      }

      // Consultar datos actualizados a la API de usuarios
      const res = await api.get("/api/admin/users")
      const list: UserProfileData[] = Array.isArray(res.data) ? res.data : []
      const current = list.find((u) => u.username === activeUsername) || list[0]

      if (current) {
        setUser(current)
        setFormFirstName(current.firstName || "")
        setFormLastName(current.lastName || "")
        setFormPhone(current.phone || "")
        setFormLocation(current.location || "")
        setFormBio(current.bio || "")
        setFormWebsite(current.website || "")
        setFormAvatar(current.avatar || "")

        // Actualizar almacenamiento local para sincronía
        if (typeof window !== "undefined") {
          localStorage.setItem("crm_active_user", JSON.stringify(current))
        }
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err)
      toast.error("Error al cargar la información del perfil.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()

    const handleSwitch = (e: any) => {
      if (e.detail) {
        setUser(e.detail)
        setFormFirstName(e.detail.firstName || "")
        setFormLastName(e.detail.lastName || "")
        setFormPhone(e.detail.phone || "")
        setFormLocation(e.detail.location || "")
        setFormBio(e.detail.bio || "")
        setFormWebsite(e.detail.website || "")
        setFormAvatar(e.detail.avatar || "")
      }
    }

    window.addEventListener("crm_user_switched", handleSwitch)
    return () => window.removeEventListener("crm_user_switched", handleSwitch)
  }, [])

  // Guardar cambios en el perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (formPassword && formPassword !== formConfirmPassword) {
      toast.warning("Las contraseñas no coinciden.")
      return
    }

    try {
      setSaving(true)

      const payload: any = {
        username: user.username,
        role: user.role,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        phone: formPhone.trim(),
        location: formLocation.trim(),
        bio: formBio.trim(),
        website: formWebsite.trim(),
        avatar: formAvatar.trim() || null,
        modules: user.modules || "",
      }

      if (formPassword.trim()) {
        payload.password = formPassword.trim()
      }

      await api.put(`/api/admin/users/${encodeURIComponent(user.username)}`, payload)

      const updatedUser: UserProfileData = {
        ...user,
        ...payload,
      }

      setUser(updatedUser)
      setIsEditing(false)
      setFormPassword("")
      setFormConfirmPassword("")

      // Sincronizar de inmediato con localStorage y el Header superior derecho
      if (typeof window !== "undefined") {
        localStorage.setItem("crm_active_user", JSON.stringify(updatedUser))
        window.dispatchEvent(new CustomEvent("crm_user_switched", { detail: updatedUser }))
        window.dispatchEvent(new CustomEvent("crm_user_updated", { detail: updatedUser }))
      }

      toast.success("¡Perfil actualizado con éxito! El encabezado superior se ha sincronizado.")
    } catch (err: any) {
      console.error("Error al guardar perfil:", err)
      const msg = err.response?.data?.message || err.response?.data || "No se pudo actualizar el perfil."
      toast.error(typeof msg === "string" ? msg : "Error al actualizar perfil.")
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (first?: string, last?: string, username?: string) => {
    if (first || last) {
      return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U"
    }
    return (username?.slice(0, 2) || "AD").toUpperCase()
  }

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : "Usuario"

  // Parsear permisos
  let permissionsData: any = null
  if (user?.modules) {
    try {
      permissionsData = typeof user.modules === "string" ? JSON.parse(user.modules) : user.modules
    } catch {}
  }

  const getRoleBadge = (role?: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-2.5 py-0.5">Administrador Total</Badge>
      case "SUPERVISOR":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-0.5">Supervisor de Ventas</Badge>
      case "VENDEDOR":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-0.5">Vendedor / Asesor</Badge>
      case "FINANZAS":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-0.5">Finanzas & Caja</Badge>
      case "OPERACIONES":
        return <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-2.5 py-0.5">Operaciones</Badge>
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{role || "Usuario"}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3 text-muted-foreground w-full">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Cargando perfil de usuario...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 1. Header Hero con Banner Superior y Avatar sin sobreposiciones */}
      <Card className="overflow-hidden border shadow-sm bg-card w-full">
        {/* Banner de Fondo: Gradiente estilizado con botones de acción superiores */}
        <div className="h-32 sm:h-44 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 relative p-4 flex items-start justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2 bg-background/90 hover:bg-background text-foreground shadow-sm text-xs font-semibold backdrop-blur"
            >
              <Edit className="size-3.5" />
              {isEditing ? "Cancelar Edición" : "Editar Perfil"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadProfile}
              className="size-8 p-0 bg-background/90 hover:bg-background text-foreground shadow-sm backdrop-blur"
              title="Refrescar datos"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Contenedor del Perfil: El avatar sobresale ordenadamente sin tapar el texto */}
        <CardContent className="px-6 pb-6 pt-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Avatar & Nombre */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar Flotante con Z-Index seguro */}
              <div className="relative -mt-12 sm:-mt-16 z-10 shrink-0">
                <Avatar className="size-24 sm:size-28 ring-4 ring-background shadow-xl rounded-full bg-card">
                  {user?.avatar ? <AvatarImage src={user.avatar} alt={fullName} /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl">
                    {getInitials(user?.firstName, user?.lastName, user?.username)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute bottom-1 right-1 size-4 bg-emerald-500 rounded-full ring-2 ring-background shadow-sm"
                  title="Sesión en línea"
                />
              </div>

              {/* Información Personal y Badges */}
              <div className="space-y-1.5 pt-1 sm:pt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {fullName}
                  </h1>
                  {getRoleBadge(user?.role)}
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                    ID #{user?.id || 1}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">@{user?.username}</span>
                  {user?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {user.location}
                    </span>
                  )}
                  {user?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {user.phone}
                    </span>
                  )}
                  {user?.website && (
                    <span className="flex items-center gap-1 text-primary">
                      <Globe className="size-3.5" />
                      {user.website}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Accesos Rápidos de Navegación */}
            <div className="flex items-center gap-2 pt-2 md:pt-0 w-full md:w-auto justify-end">
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
                <Link href="/ventas/view">
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  Ver CRM Ventas
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
                <Link href="/admin/users">
                  <Users className="size-3.5 text-blue-600" />
                  Usuarios
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
                <Link href="/admin/roles">
                  <ShieldCheck className="size-3.5 text-purple-600" />
                  Roles
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Cuerpo en Dos Columnas Fluidas (w-full) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* Columna Principal: Formulario / Vista de Datos Personales */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="border-b p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="size-5 text-primary" />
                  {isEditing ? "Editar Datos del Perfil" : "Datos Personales & Cuenta"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {isEditing
                    ? "Actualiza tu información pública y credenciales de acceso."
                    : "Información operativa y de contacto registrada en NextLead."}
                </CardDescription>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 text-xs"
                >
                  <Edit className="size-3.5" />
                  Editar
                </Button>
              )}
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="p-6 space-y-6">
                {/* MODO EDICIÓN */}
                {isEditing ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nombre de Usuario (Login)</Label>
                        <Input
                          value={user?.username || ""}
                          disabled
                          className="h-9 bg-muted/40 font-mono text-xs cursor-not-allowed"
                        />
                        <p className="text-[10px] text-muted-foreground">El nombre de usuario es único y no se edita.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Rol Asignado</Label>
                        <Input
                          value={user?.role || "USER"}
                          disabled
                          className="h-9 bg-muted/40 font-bold text-xs cursor-not-allowed"
                        />
                        <p className="text-[10px] text-muted-foreground">Configurado desde el módulo de Roles.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit_fname" className="text-xs font-semibold">
                          Nombres <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="edit_fname"
                          value={formFirstName}
                          onChange={(e) => setFormFirstName(e.target.value)}
                          placeholder="ej: Juan Carlos"
                          className="h-9"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit_lname" className="text-xs font-semibold">
                          Apellidos <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="edit_lname"
                          value={formLastName}
                          onChange={(e) => setFormLastName(e.target.value)}
                          placeholder="ej: Razuri"
                          className="h-9"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit_phone" className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                        <Input
                          id="edit_phone"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="ej: 987654321"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit_loc" className="text-xs font-semibold">Ubicación / Sede</Label>
                        <Input
                          id="edit_loc"
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder="ej: Lima, Perú"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="edit_avatar" className="text-xs font-semibold">URL de Foto de Avatar (Opcional)</Label>
                        <Input
                          id="edit_avatar"
                          value={formAvatar}
                          onChange={(e) => setFormAvatar(e.target.value)}
                          placeholder="https://ejemplo.com/foto.jpg"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="edit_bio" className="text-xs font-semibold">Biografía / Responsabilidades</Label>
                        <Textarea
                          id="edit_bio"
                          value={formBio}
                          onChange={(e) => setFormBio(e.target.value)}
                          placeholder="Descripción breve de tus funciones..."
                          rows={3}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Sección de Cambio de Contraseña */}
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <KeyRound className="size-4 text-primary" />
                          Actualizar Contraseña de Acceso (Opcional)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          {showPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="new_pass" className="text-xs font-semibold">Nueva Contraseña</Label>
                          <Input
                            id="new_pass"
                            type={showPassword ? "text" : "password"}
                            value={formPassword}
                            onChange={(e) => setFormPassword(e.target.value)}
                            placeholder="Dejar en blanco para conservar actual"
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="conf_pass" className="text-xs font-semibold">Confirmar Nueva Contraseña</Label>
                          <Input
                            id="conf_pass"
                            type={showPassword ? "text" : "password"}
                            value={formConfirmPassword}
                            onChange={(e) => setFormConfirmPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODO LECTURA ELEGANTE */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" /> Nombre Completo
                      </span>
                      <p className="text-sm font-bold text-foreground">{fullName}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="size-3.5 text-primary" /> Usuario / Login
                      </span>
                      <p className="text-sm font-bold text-foreground font-mono">@{user?.username}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="size-3.5 text-primary" /> Teléfono / WhatsApp
                      </span>
                      <p className="text-sm font-semibold text-foreground">{user?.phone || "No registrado"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" /> Sede / Ubicación
                      </span>
                      <p className="text-sm font-semibold text-foreground">{user?.location || "Lima, Perú"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-primary" /> Biografía & Cargo
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">
                        {user?.bio || "Sin biografía registrada. Pulsa en 'Editar Perfil' para agregar una descripción de tus responsabilidades."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              {isEditing && (
                <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setFormFirstName(user?.firstName || "")
                      setFormLastName(user?.lastName || "")
                      setFormPhone(user?.phone || "")
                      setFormLocation(user?.location || "")
                      setFormBio(user?.bio || "")
                      setFormAvatar(user?.avatar || "")
                      setFormPassword("")
                      setFormConfirmPassword("")
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  >
                    {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Guardar Cambios
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>

          {/* Tarjeta de Módulos y Funcionalidades Disponibles */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-600" />
                Módulos Habilitados para tu Cuenta
              </CardTitle>
              <CardDescription className="text-xs">
                Resumen de accesos configurados según tu rol oficial ({user?.role}).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-200 dark:border-emerald-950 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <TrendingUp className="size-4" /> Ventas CRM
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {permissionsData?.sales_scope === "own" ? "Solo sus ventas" : "Ventas del equipo"}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
                  permissionsData?.can_view_finance || user?.role === "ADMIN"
                    ? "bg-amber-500/5 border-amber-200 dark:border-amber-950 text-amber-700"
                    : "bg-muted/20 border-border opacity-50"
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <DollarSign className="size-4" /> Flujo de Caja
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {permissionsData?.can_view_finance || user?.role === "ADMIN" ? "Acceso autorizado" : "Restringido"}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
                  permissionsData?.can_view_profitability || user?.role === "ADMIN"
                    ? "bg-purple-500/5 border-purple-200 dark:border-purple-950 text-purple-700"
                    : "bg-muted/20 border-border opacity-50"
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CreditCard className="size-4" /> Rentabilidad
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {permissionsData?.can_view_profitability || user?.role === "ADMIN" ? "Márgenes sin IGV" : "Restringido"}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
                  permissionsData?.can_view_liquidations || user?.role === "ADMIN"
                    ? "bg-blue-500/5 border-blue-200 dark:border-blue-950 text-blue-700"
                    : "bg-muted/20 border-border opacity-50"
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Briefcase className="size-4" /> Liquidaciones
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {permissionsData?.can_view_liquidations || user?.role === "ADMIN" ? "Comisiones" : "Restringido"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral: Resumen de Rol, Colaborador y Seguridad */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Tarjeta de Nivel de Autorización */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Políticas de Seguridad & Ámbito
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Rol Asignado</span>
                <span className="font-bold">{user?.role}</span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Alcance de Ventas</span>
                <Badge variant="outline" className="font-bold text-[11px] bg-primary/10 text-primary border-primary/30">
                  {permissionsData?.sales_scope === "own" && "Solo sus ventas"}
                  {permissionsData?.sales_scope === "team" && "Ventas de su equipo"}
                  {(!permissionsData?.sales_scope || permissionsData?.sales_scope === "all") && "Todas las ventas"}
                </Badge>
              </div>

              {permissionsData?.trabajador_nombre && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Personal Vinculado</span>
                  <span className="font-medium text-foreground">{permissionsData.trabajador_nombre}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado de Cuenta</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> Activo
                </span>
              </div>
            </CardContent>
            <CardFooter className="p-3 bg-muted/30 border-t">
              <Button asChild variant="link" size="sm" className="text-xs p-0 h-auto text-primary">
                <Link href="/admin/roles">Ver configuración de Roles y Permisos &rarr;</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Tarjeta de Atajos Rápidos */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ExternalLink className="size-4 text-primary" />
                Atajos Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5 text-xs">
              <Link
                href="/ventas/view"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors font-medium text-foreground"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-600" />
                  <span>Embudo de Ventas & Leads</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/finanzas/cash-flow"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors font-medium text-foreground"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-amber-600" />
                  <span>Flujo de Caja & Movimientos</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/admin/users"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors font-medium text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-teal-600" />
                  <span>Directorio de Usuarios</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          {/* Tarjeta de Seguridad */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lock className="size-4 text-emerald-600" />
                Protección de Credenciales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <span>Contraseñas encriptadas mediante hash BCrypt.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <span>Protección contra accesos cruzados y control de sesión JWT.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
