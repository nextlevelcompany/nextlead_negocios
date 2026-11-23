"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import {
  TrendingUp,
  Target,
  Users,
  MessageSquare,
  Award,
  RefreshCw,
  PlusCircle,
  Clock,
  Briefcase,
  AlertCircle,
  Filter,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Building2,
  X,
  Layers,
  Sparkles
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SupervisorOption {
  id: number
  nombre: string
  equipo: string
  miembros_a_cargo: number
}

interface EjecutivoOption {
  id: number
  usuario_id: number | null
  nombre: string
  cargo: string
  equipo: string
  supervisor_id: number | null
  supervisor_nombre: string | null
}

interface CommercialData {
  activeFilter?: {
    type: string
    id?: number
    label: string
    equipo?: string | null
  }
  filterOptions?: {
    supervisores: SupervisorOption[]
    ejecutivos: EjecutivoOption[]
  }
  kpis: {
    totalOportunidades: number
    valorPipeline: number
    oportunidadesGanadas: number
    oportunidadesPerdidas: number
    totalContactos: number
    leadsWhatsapp: number
    tasaConversion: number
  }
  funnel: Array<{
    id: number
    nombre: string
    orden: number
    es_ganada: boolean
    es_perdida: boolean
    cantidad: number
    valor_total: number
  }>
  porPrioridad: Array<{
    prioridad: string
    cantidad: number
    monto: number
  }>
  asesores: Array<{
    vendedor: string
    total_opps: number
    ganadas: number
    monto_ganado: number
    monto_total: number
  }>
  ultimasOportunidades: Array<{
    id: number
    titulo: string
    valor: number
    prioridad: string
    created_at: string
    etapa_nombre: string
    es_ganada: boolean
    es_perdida: boolean
    cliente: string
    asesor: string
  }>
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<CommercialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filterType, setFilterType] = useState<"all" | "supervisor" | "ejecutivo" | "unassigned">("all")
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("")
  const [selectedEjecutivoId, setSelectedEjecutivoId] = useState<string>("")

  const loadData = async (
    type: "all" | "supervisor" | "ejecutivo" | "unassigned" = filterType,
    supId: string = selectedSupervisorId,
    ejeId: string = selectedEjecutivoId
  ) => {
    try {
      setLoading(true)
      setError(null)

      let url = "/api/dashboard/commercial"
      const params: string[] = []

      if (type === "supervisor" && supId) {
        params.push(`supervisorId=${supId}`)
      } else if (type === "ejecutivo" && ejeId) {
        params.push(`ejecutivoId=${ejeId}`)
      } else if (type === "unassigned") {
        params.push("unassigned=true")
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`
      }

      const res = await api.get(url)
      setData(res.data)

      // Auto-select first supervisor/executive if none selected yet
      if (type === "supervisor" && !supId && res.data?.filterOptions?.supervisores?.length > 0) {
        setSelectedSupervisorId(String(res.data.filterOptions.supervisores[0].id))
      }
      if (type === "ejecutivo" && !ejeId && res.data?.filterOptions?.ejecutivos?.length > 0) {
        setSelectedEjecutivoId(String(res.data.filterOptions.ejecutivos[0].id))
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo conectar con el servidor para obtener analíticas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData("all", "", "")
  }, [])

  const handleFilterTypeChange = (newType: "all" | "supervisor" | "ejecutivo" | "unassigned") => {
    setFilterType(newType)
    if (newType === "all" || newType === "unassigned") {
      setSelectedSupervisorId("")
      setSelectedEjecutivoId("")
      loadData(newType, "", "")
    } else if (newType === "supervisor") {
      const defaultId = selectedSupervisorId || (data?.filterOptions?.supervisores?.[0]?.id ? String(data.filterOptions.supervisores[0].id) : "")
      setSelectedSupervisorId(defaultId)
      setSelectedEjecutivoId("")
      loadData("supervisor", defaultId, "")
    } else if (newType === "ejecutivo") {
      const defaultId = selectedEjecutivoId || (data?.filterOptions?.ejecutivos?.[0]?.id ? String(data.filterOptions.ejecutivos[0].id) : "")
      setSelectedEjecutivoId(defaultId)
      setSelectedSupervisorId("")
      loadData("ejecutivo", "", defaultId)
    }
  }

  const handleSupervisorChange = (supId: string) => {
    setSelectedSupervisorId(supId)
    loadData("supervisor", supId, "")
  }

  const handleEjecutivoChange = (ejeId: string) => {
    setSelectedEjecutivoId(ejeId)
    loadData("ejecutivo", "", ejeId)
  }

  const handleResetFilter = () => {
    setFilterType("all")
    setSelectedSupervisorId("")
    setSelectedEjecutivoId("")
    loadData("all", "", "")
  }

  const formatMoney = (val: number | undefined | null) => {
    const num = Number(val) || 0
    return `S/ ${num.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    } catch {
      return dateStr
    }
  }

  const getEtapaBadgeClass = (etapa: string, ganada?: boolean, perdida?: boolean) => {
    if (ganada) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    if (perdida) return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
    const lower = (etapa || "").toLowerCase()
    if (lower.includes("prospec")) return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
    if (lower.includes("negocia")) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    if (lower.includes("téc") || lower.includes("tec")) return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
    return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
  }

  const getPrioridadBadge = (p: string) => {
    const lower = (p || "").toLowerCase()
    if (lower === "alta") return <Badge variant="outline" className="border-rose-400 text-rose-600 bg-rose-50 dark:bg-rose-950/40 text-xs">Alta</Badge>
    if (lower === "urgente") return <Badge variant="destructive" className="text-xs">Urgente</Badge>
    if (lower === "baja") return <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs">Baja</Badge>
    return <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/40 text-xs">Media</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
              Analítica Comercial CRM
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> En tiempo real
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Dashboard de Prospección & Embudo de Ventas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de conversión, leads generados por WhatsApp y efectividad del pipeline comercial B2B.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs">
            <Link href="/opportunities/create">
              <PlusCircle className="w-4 h-4" />
              Nueva Oportunidad
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS: POR SUPERVISOR Y SU GRUPO O POR EJECUTIVO INDIVIDUAL */}
      {/* ========================================================================= */}
      <Card className="border bg-card/90 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Izquierda: Selector de Tipo de Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-primary" /> Filtrar por:
              </span>

              <button
                type="button"
                onClick={() => handleFilterTypeChange("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Toda la Empresa
              </button>

              <button
                type="button"
                onClick={() => handleFilterTypeChange("supervisor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "supervisor"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Supervisor y su Grupo
              </button>

              <button
                type="button"
                onClick={() => handleFilterTypeChange("ejecutivo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "ejecutivo"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Por Ejecutivo / Asesor
              </button>

              <button
                type="button"
                onClick={() => handleFilterTypeChange("unassigned")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "unassigned"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Sin Asignar / WhatsApp
              </button>
            </div>

            {/* Derecha: Desplegable contextual según el tipo seleccionado */}
            <div className="flex items-center gap-3">
              {filterType === "supervisor" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Supervisor:</span>
                  <select
                    value={selectedSupervisorId}
                    onChange={(e) => handleSupervisorChange(e.target.value)}
                    className="h-8.5 px-3 rounded-lg border bg-background text-xs font-semibold text-foreground shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                  >
                    {data?.filterOptions?.supervisores?.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nombre} • {sup.equipo || "Equipo"} ({sup.miembros_a_cargo} a cargo)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filterType === "ejecutivo" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Ejecutivo:</span>
                  <select
                    value={selectedEjecutivoId}
                    onChange={(e) => handleEjecutivoChange(e.target.value)}
                    className="h-8.5 px-3 rounded-lg border bg-background text-xs font-semibold text-foreground shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  >
                    {data?.filterOptions?.ejecutivos?.map((ej) => (
                      <option key={ej.id} value={ej.id}>
                        {ej.nombre} • {ej.cargo || "Asesor"} {ej.supervisor_nombre ? `(Sup: ${ej.supervisor_nombre})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botón Reset si hay filtro activo */}
              {filterType !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilter}
                  className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Badge informativo del filtro activo */}
          {data?.activeFilter && data.activeFilter.type !== "all" && (
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Vista activa:</span>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold gap-1.5 ${
                    data.activeFilter.type === "supervisor"
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                      : data.activeFilter.type === "ejecutivo"
                      ? "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40"
                      : "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {data.activeFilter.label}
                </Badge>
                {data.activeFilter.equipo && (
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    {data.activeFilter.equipo}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground italic">
                Mostrando {data.kpis.totalOportunidades} {data.kpis.totalOportunidades === 1 ? "oportunidad" : "oportunidades"} para este criterio
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pipeline Activo */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Valor Pipeline Activo
            </CardDescription>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : formatMoney(data?.kpis.valorPipeline)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {data?.kpis.totalOportunidades ? (data.kpis.totalOportunidades - (data.kpis.oportunidadesPerdidas || 0)) : 0} activas
              </span>{" "}
              en proceso comercial
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Tasa de Conversión */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tasa de Conversión
            </CardDescription>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Target className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : `${data?.kpis.tasaConversion || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {data?.kpis.oportunidadesGanadas || 0} ganadas
              </span>{" "}
              de {data?.kpis.totalOportunidades || 0} totales
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Leads de WhatsApp */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Leads WhatsApp
            </CardDescription>
            <div className="p-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : data?.kpis.leadsWhatsapp || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-green-600 font-medium">Captados</span> desde chat y campañas
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Contactos B2B */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Directorio B2B
            </CardDescription>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : data?.kpis.totalContactos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Empresas y clientes registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sección Media: Embudo de Conversión (Funnel) & Desempeño de Asesores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Embudo de Conversión / Etapas Kanban */}
        <Card className="lg:col-span-7 border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                Embudo Comercial (Etapas del Pipeline)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Volumen y valor económico acumulado en cada etapa del embudo
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/opportunities/view">
                Ver Kanban <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !data?.funnel || data.funnel.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay etapas con oportunidades para el filtro actual.</p>
            ) : (
              <div className="space-y-3">
                {data.funnel.map((col) => {
                  const maxValor = Math.max(...data.funnel.map((f) => f.valor_total), 1)
                  const percent = Math.min(Math.round((col.valor_total / maxValor) * 100), 100)
                  return (
                    <div key={col.id} className="p-3 rounded-xl border bg-card/60 space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getEtapaBadgeClass(col.nombre, col.es_ganada, col.es_perdida)}`}>
                            {col.nombre}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {col.cantidad} {col.cantidad === 1 ? "oportunidad" : "oportunidades"}
                          </span>
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                          {formatMoney(col.valor_total)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            col.es_ganada
                              ? "bg-emerald-500"
                              : col.es_perdida
                              ? "bg-rose-400"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${percent > 0 ? percent : 4}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desempeño por Asesor Comercial */}
        <Card className="lg:col-span-5 border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Ranking de Asesores Comerciales
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Oportunidades asignadas, cierres ganados y monto total
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !data?.asesores || data.asesores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay actividad de asesores para este criterio.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.asesores.map((as, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {as.vendedor || "Asesor General"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {as.total_opps} gestiones • <span className="text-emerald-600 font-medium">{as.ganadas} ganadas</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatMoney(as.monto_ganado > 0 ? as.monto_ganado : as.monto_total)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {as.monto_ganado > 0 ? "Cerrado Ganado" : "En Cartera"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla Inferior: Últimas Oportunidades y Cotizaciones */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Últimas Oportunidades & Cotizaciones
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Registro reciente de propuestas comerciales y contactos ingresados
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/opportunities/view">
              Ver Todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Título / Negocio</th>
                  <th className="py-2.5 px-3">Cliente / Razón Social</th>
                  <th className="py-2.5 px-3">Asesor Asignado</th>
                  <th className="py-2.5 px-3">Etapa Actual</th>
                  <th className="py-2.5 px-3">Prioridad</th>
                  <th className="py-2.5 px-3 text-right">Valor Estimado</th>
                  <th className="py-2.5 px-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando oportunidades...
                    </td>
                  </tr>
                ) : !data?.ultimasOportunidades || data.ultimasOportunidades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay oportunidades registradas para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  data.ultimasOportunidades.map((opp) => (
                    <tr key={opp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <Link href="/opportunities/view" className="hover:underline flex items-center gap-1.5 text-primary">
                          {opp.titulo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {opp.cliente || "Prospecto sin registrar"}
                      </td>
                      <td className="py-2.5 px-3 text-foreground font-medium text-xs">
                        {opp.asesor ? (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                            {opp.asesor}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={`text-xs ${getEtapaBadgeClass(opp.etapa_nombre, opp.es_ganada, opp.es_perdida)}`}>
                          {opp.etapa_nombre || "Sin Etapa"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {getPrioridadBadge(opp.prioridad)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {formatMoney(opp.valor)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(opp.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
