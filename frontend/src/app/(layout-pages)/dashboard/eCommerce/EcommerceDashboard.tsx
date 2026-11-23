"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import {
  DollarSign,
  ShoppingCart,
  Truck,
  Boxes,
  TrendingUp,
  Receipt,
  Clock,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  ChevronRight,
  PackageCheck,
  CreditCard,
  Building,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Award
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface OperationsData {
  kpis: {
    totalVentas: number
    montoTotal: number
    montoPagado: number
    montoPendiente: number
    ticketPromedio: number
    totalPedidos: number
    pedidosEntregados: number
    pedidosPendientes: number
    totalGastos: number
    flujoNeto: number
  }
  tendenciaVentas: Array<{
    periodo: string
    cantidad_ventas: number
    monto_total: number
  }>
  topProductos: Array<{
    id: number
    nombre: string
    cantidad_vendida: number
    monto_generado: number
  }>
  estadosPedido: Array<{
    id: number
    nombre: string
    cantidad: number
  }>
  topVendedores: Array<{
    vendedor: string
    ventas_cerradas: number
    total_facturado: number
  }>
  ultimasVentas: Array<{
    id: number
    numero_venta: string
    total: number
    estado: string
    estado_pago: string
    fecha_venta: string
    cliente: string
    vendedor: string
  }>
}

export default function EcommerceDashboard() {
  const [data, setData] = useState<OperationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get("/api/dashboard/operations")
      setData(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo conectar con el servidor para obtener métricas operativas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatMoney = (val: number | undefined | null) => {
    const num = Number(val) || 0
    return `S/ ${num.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  const getEstadoBadge = (estado: string) => {
    const lower = (estado || "").toLowerCase()
    if (lower === "completada" || lower === "instalada") {
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">Completada</Badge>
    }
    if (lower === "cancelada" || lower === "anulada") {
      return <Badge variant="destructive" className="text-xs">Cancelada</Badge>
    }
    return <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs">Pendiente</Badge>
  }

  const getPagoBadge = (estadoPago: string) => {
    const lower = (estadoPago || "").toLowerCase()
    if (lower === "pagado" || lower === "cobrado") {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Pagado</span>
    }
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock className="w-3.5 h-3.5" /> Pendiente</span>
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40">
              Métricas Operativas & Facturación
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Datos Reales de Ventas
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Dashboard de Ventas, Operaciones & Catálogo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control de ingresos facturados, productos y planes más vendidos, pedidos en ruta e instalaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-xs">
            <Link href="/ventas/create">
              <PlusCircle className="w-4 h-4" />
              Nueva Venta
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Facturación Total */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Facturación Acumulada
            </CardDescription>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : formatMoney(data?.kpis.montoTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">
                {formatMoney(data?.kpis.montoPagado)}
              </span>{" "}
              cobrado en efectivo/banco
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Ventas Realizadas */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ventas Realizadas
            </CardDescription>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : data?.kpis.totalVentas || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ticket promedio: <span className="font-semibold text-foreground">{formatMoney(data?.kpis.ticketPromedio)}</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Pedidos e Instalaciones */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Despachos / Instalaciones
            </CardDescription>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : data?.kpis.totalPedidos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-emerald-600">{data?.kpis.pedidosEntregados || 0} instalados</span> • {data?.kpis.pedidosPendientes || 0} en curso
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Flujo Neto de Caja */}
        <Card className="relative overflow-hidden border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Flujo Neto Operativo
            </CardDescription>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data?.kpis.flujoNeto || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {loading ? "..." : formatMoney(data?.kpis.flujoNeto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gastos registrados: <span className="font-medium text-rose-500">{formatMoney(data?.kpis.totalGastos)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sección Media: Top Productos & Estado de Despacho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Planes y Productos Vendidos */}
        <Card className="lg:col-span-7 border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                Top Planes & Productos Vendidos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Planes de internet, fibra óptica y equipamiento con mayor demanda
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/productos/view">
                Catálogo <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !data?.topProductos || data.topProductos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay productos con ventas registradas aún.</p>
            ) : (
              <div className="space-y-3">
                {data.topProductos.map((p, idx) => (
                  <div key={p.id || idx} className="p-3 rounded-xl border bg-card/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.cantidad_vendida} {p.cantidad_vendida === 1 ? "unidad / contrato" : "unidades / contratos"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatMoney(p.monto_generado)}</p>
                      <span className="text-[11px] text-muted-foreground">Facturado</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado Operativo de Despacho & Instalaciones */}
        <Card className="lg:col-span-5 border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                Estado de Instalaciones & Pedidos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Seguimiento de rutas técnicas y logística
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/pedidos/view">
                Ver Órdenes <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !data?.estadosPedido || data.estadosPedido.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay registros de pedidos disponibles.</p>
            ) : (
              <div className="space-y-2.5">
                {data.estadosPedido.map((ep) => (
                  <div key={ep.id} className="p-3 rounded-xl border bg-card/60 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{ep.nombre}</span>
                    <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5">
                      {ep.cantidad} {ep.cantidad === 1 ? "orden" : "órdenes"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Vendedores por Facturación */}
      {data?.topVendedores && data.topVendedores.length > 0 && (
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Ranking de Vendedores por Facturación
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personal con mayor volumen de ventas cerradas y monto total cobrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topVendedores.map((v, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-600">Top #{idx + 1}</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">{v.vendedor}</p>
                    <p className="text-xs text-muted-foreground">{v.ventas_cerradas} ventas concretadas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground">{formatMoney(v.total_facturado)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla Inferior: Últimas Ventas Realizadas */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Últimas Ventas Registradas
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Transacciones comerciales recientes registradas en el sistema
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/ventas/view">
              Ver Historial <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">N° Venta</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Vendedor</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Pago</th>
                  <th className="py-2.5 px-3 text-right">Monto Total</th>
                  <th className="py-2.5 px-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando ventas...
                    </td>
                  </tr>
                ) : !data?.ultimasVentas || data.ultimasVentas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay ventas registradas aún.
                    </td>
                  </tr>
                ) : (
                  data.ultimasVentas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        <Link href="/ventas/view" className="hover:underline">
                          {venta.numero_venta}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-foreground font-medium">
                        {venta.cliente || "Cliente Particular"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {venta.vendedor || "No asignado"}
                      </td>
                      <td className="py-2.5 px-3">
                        {getEstadoBadge(venta.estado)}
                      </td>
                      <td className="py-2.5 px-3">
                        {getPagoBadge(venta.estado_pago)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {formatMoney(venta.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(venta.fecha_venta)}
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
