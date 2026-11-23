"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileCheck,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  CreditCard,
  Briefcase,
  Layers,
  ArrowRight,
  Eye,
  Check,
  TrendingUp,
  Calculator,
  Settings,
  Info,
  ShieldCheck,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function LiquidacionesPage() {
  const [loading, setLoading] = useState(true);

  // Period filters
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(now.getFullYear());

  // Data states
  const [actualData, setActualData] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);

  // Generate Liquidacion Modal
  const [generateLiqModalOpen, setGenerateLiqModalOpen] = useState(false);
  const [liqNotas, setLiqNotas] = useState("");
  const [generatingLiq, setGeneratingLiq] = useState(false);

  // View Liquidacion Details Modal
  const [viewLiqModalOpen, setViewLiqModalOpen] = useState(false);
  const [selectedLiq, setSelectedLiq] = useState<any>(null);
  const [liqDetalles, setLiqDetalles] = useState<any[]>([]);
  const [loadingLiqDetalle, setLoadingLiqDetalle] = useState(false);

  // Pay Liquidacion Modal
  const [payLiqModalOpen, setPayLiqModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState("Transferencia");
  const [payingLiq, setPayingLiq] = useState(false);

  // Delete Liquidacion Modal / Confirmation
  const [deletingLiqId, setDeletingLiqId] = useState<number | null>(null);

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Fetch all module data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [actRes, liqRes] = await Promise.all([
        api.get(`/api/rentabilidad/actual?mes=${selectedMes}&anio=${selectedAnio}`).catch(() => ({ data: null })),
        api.get("/api/rentabilidad/liquidaciones").catch(() => ({ data: [] })),
      ]);

      setActualData(actRes.data);
      setLiquidaciones(Array.isArray(liqRes.data) ? liqRes.data : []);
    } catch (err: any) {
      console.error("Error al cargar liquidaciones:", err);
      toast.error("Error al cargar datos de liquidaciones y pagos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMes, selectedAnio]);

  // KPIs of current month ready to be settled
  const kpisActual = actualData?.indicadores || {
    total_altas: 0,
    ingresos_brutos_dealer: 0,
    total_remuneraciones: 0,
    total_comisiones_personal: 0,
    total_bonos_personal: 0,
    otros_gastos_operativos: 0,
    ganancia_neta: 0,
    margen_rentabilidad: 0,
  };

  const personalCalculado: any[] = actualData?.personalDetalle || [];

  // Generate Liquidacion
  const handleGenerateLiquidacion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGeneratingLiq(true);
      const res = await api.post("/api/rentabilidad/liquidaciones/generar", {
        mes: selectedMes,
        anio: selectedAnio,
        notas: liqNotas,
      });

      toast.success(res.data?.message || "Liquidación mensual generada con éxito.");
      setGenerateLiqModalOpen(false);
      setLiqNotas("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al generar liquidación.");
    } finally {
      setGeneratingLiq(false);
    }
  };

  // View Liquidacion Details
  const handleOpenViewLiq = async (liq: any) => {
    setSelectedLiq(liq);
    setViewLiqModalOpen(true);
    setLoadingLiqDetalle(true);
    try {
      const res = await api.get(`/api/rentabilidad/liquidaciones/${liq.id}`);
      setLiqDetalles(res.data?.detalles || []);
    } catch (err) {
      toast.error("Error al cargar detalles de la liquidación.");
    } finally {
      setLoadingLiqDetalle(false);
    }
  };

  // Approve Liquidacion
  const handleApproveLiq = async (id: number) => {
    if (!confirm("¿Aprobar formalmente esta liquidación? Los valores quedarán congelados para auditoría.")) return;
    try {
      await api.post(`/api/rentabilidad/liquidaciones/aprobar/${id}`, { aprobado_por: "Gerencia" });
      toast.success("Liquidación aprobada formalmente.");
      fetchData();
      if (selectedLiq && selectedLiq.id === id) {
        handleOpenViewLiq({ ...selectedLiq, estado: "Aprobado" });
      }
    } catch (err: any) {
      toast.error("Error al aprobar liquidación.");
    }
  };

  // Confirm Pay Liquidacion
  const handleConfirmPayLiq = async () => {
    if (!selectedLiq) return;
    try {
      setPayingLiq(true);
      await api.post(`/api/rentabilidad/liquidaciones/pagar/${selectedLiq.id}`, { metodo_pago: payMethod });
      toast.success("Liquidación pagada con éxito. Se registró el egreso en Tesorería.");
      setPayLiqModalOpen(false);
      fetchData();
      setViewLiqModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al pagar liquidación.");
    } finally {
      setPayingLiq(false);
    }
  };

  // Delete Liquidacion (if wrong, invalid or outdated)
  const handleDeleteLiq = async (id: number, codigo: string) => {
    if (!confirm(`¿Está seguro de ELIMINAR la liquidación ${codigo}? Si está mal o fue generada con datos erróneos, quedará descartada del historial.`)) return;

    try {
      setDeletingLiqId(id);
      const res = await api.delete(`/api/rentabilidad/liquidaciones/${id}`);
      toast.success(res.data?.message || `Liquidación ${codigo} eliminada correctamente.`);
      if (selectedLiq && selectedLiq.id === id) {
        setViewLiqModalOpen(false);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar liquidación.");
    } finally {
      setDeletingLiqId(null);
    }
  };

  // Export Liquidaciones List to Excel
  const handleExportLiquidacionesExcel = () => {
    if (liquidaciones.length === 0) {
      toast.warning("No hay liquidaciones registradas para exportar.");
      return;
    }

    const rows = liquidaciones.map((l) => ({
      Código: l.codigo_liquidacion,
      Periodo: `${mesesNombres[l.periodo_mes - 1]} ${l.periodo_anio}`,
      "Altas Totales": l.total_altas_periodo,
      "Ingresos Brutos Dealer (S/)": Number(l.total_ingresos_dealer),
      "Total Pagos Personal (S/)": Number(l.total_pagos_personal),
      "Gastos Operativos (S/)": Number(l.total_gastos_operativos),
      "Ganancia Neta (S/)": Number(l.ganancia_neta_dealer),
      "Margen (%)": `${Number(l.margen_rentabilidad).toFixed(2)}%`,
      Estado: l.estado,
      "Aprobado Por": l.aprobado_por || "Pendiente",
      "Fecha Creación": l.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liquidaciones_Oficiales");
    XLSX.writeFile(wb, `Liquidaciones_Dealer_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Historial de liquidaciones exportado a Excel.");
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Shared Module Sub-navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 border rounded-xl w-fit flex-wrap">
        <Link
          href="/rentabilidad/actual"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
        >
          <TrendingUp className="size-3.5 text-emerald-600" />
          <span>Rentabilidad Real</span>
        </Link>
        <Link
          href="/rentabilidad/simulador"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
        >
          <Calculator className="size-3.5 text-blue-600" />
          <span>Simulador de Escenarios</span>
        </Link>
        <Link
          href="/rentabilidad/liquidaciones"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-background text-foreground shadow-xs transition-all border border-border/60"
        >
          <FileCheck className="size-3.5 text-indigo-600" />
          <span>Liquidaciones de Pagos</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
            Oficial
          </Badge>
        </Link>
        <Link
          href="/rentabilidad/configuracion"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
        >
          <Settings className="size-3.5 text-slate-600" />
          <span>Escalas & Parámetros</span>
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCheck className="size-6 text-indigo-600" />
            Liquidaciones & Cierre Mensual de Pagos
          </h1>
          <p className="text-sm text-muted-foreground">
            Módulo independiente para el cierre mensual formal del Dealer, congelamiento contable de comisiones, aprobación y desembolso en Tesorería.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 shadow-2xs">
            <Calendar className="size-4 text-muted-foreground ml-2" />
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="h-8 text-xs bg-transparent border-0 focus:ring-0 font-medium cursor-pointer"
            >
              {mesesNombres.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              className="h-8 text-xs bg-transparent border-0 focus:ring-0 font-medium cursor-pointer"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLiquidacionesExcel}
            className="gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="size-4" />
            Exportar Historial
          </Button>

          <Button
            size="sm"
            onClick={() => setGenerateLiqModalOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            <Plus className="size-4" />
            Generar Liquidación Oficial
          </Button>
        </div>
      </div>

      {/* Guide & Separation Banner */}
      <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600 mt-0.5">
            <Info className="size-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">
              Separación de Funciones: ¿Dónde se administra el personal vs. liquidaciones?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              • <strong>Personal y Empleados:</strong> Se gestiona de forma centralizada en el módulo de <strong>Personal &gt; Empleados</strong> (altas, sueldos base, perfil comisional ON Negocios y datos laborales).
              <br />
              • <strong>Esta página de Liquidaciones:</strong> Es estrictamente para el <strong>cierre mensual contable</strong>, congelamiento de valores para auditoría y autorización formal de pagos a Tesorería.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 text-xs h-8">
          <Link href="/payroll/staff" className="gap-1.5">
            <Users className="size-3.5 text-emerald-600" />
            <span>Gestionar Empleados en CRM</span>
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {/* Pre-settlement Overview Card for Selected Month */}
      <Card className="bg-card shadow-xs border-indigo-500/20">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-indigo-600" />
                Pre-Cierre Comercial del Periodo: {mesesNombres[selectedMes - 1]} {selectedAnio}
              </CardTitle>
              <CardDescription className="text-xs">
                Cálculo en vivo basado en ventas con instalación confirmada y asesores reales activos en Personal.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                ARPU: S/ {actualData?.arpu_aplicado || "168.64"}
              </Badge>
              <Button
                size="sm"
                onClick={() => setGenerateLiqModalOpen(true)}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
              >
                <FileCheck className="size-3.5" />
                Cerrar Periodo &amp; Liquidar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Altas Instaladas</span>
              <span className="text-base font-bold text-foreground">
                {kpisActual.ventas_instaladas ?? kpisActual.total_altas}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Ingresos Dealer</span>
              <span className="text-base font-bold font-mono text-emerald-600">
                S/ {Number(kpisActual.ingresos_brutos_dealer || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Planilla &amp; Comisiones</span>
              <span className="text-base font-bold font-mono text-foreground">
                S/ {Number((kpisActual.total_remuneraciones || 0) + (kpisActual.total_comisiones_personal || 0) + (kpisActual.total_bonos_personal || 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Gastos Operativos</span>
              <span className="text-base font-bold font-mono text-rose-600">
                S/ {Number(kpisActual.otros_gastos_operativos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Ganancia Neta</span>
              <span className={`text-base font-bold font-mono ${kpisActual.ganancia_neta >= 0 ? "text-primary" : "text-rose-600"}`}>
                S/ {Number(kpisActual.ganancia_neta || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-muted-foreground block text-[11px]">Margen Estimado</span>
              <span className={`text-base font-bold font-mono ${kpisActual.margen_rentabilidad >= 20 ? "text-emerald-600" : "text-primary"}`}>
                {Number(kpisActual.margen_rentabilidad || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Historical Liquidaciones Table */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileCheck className="size-5 text-indigo-600" />
                Historial de Liquidaciones Mensuales Oficiales
              </CardTitle>
              <CardDescription className="text-xs">
                Valores congelados para auditoría. Si alguna liquidación fue generada por error o ya no compete, puede eliminarla.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {liquidaciones.length} liquidaciones registradas
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Periodo</TableHead>
                  <TableHead className="font-semibold text-center">Altas Dealer</TableHead>
                  <TableHead className="font-semibold text-right">Ingresos Dealer</TableHead>
                  <TableHead className="font-semibold text-right">Planilla &amp; Comis.</TableHead>
                  <TableHead className="font-semibold text-right">Gastos Operativos</TableHead>
                  <TableHead className="font-semibold text-right">Ganancia Neta</TableHead>
                  <TableHead className="font-semibold text-center">Margen</TableHead>
                  <TableHead className="font-semibold text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      Cargando historial de liquidaciones...
                    </TableCell>
                  </TableRow>
                ) : liquidaciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <div className="max-w-md mx-auto space-y-2">
                        <FileCheck className="size-8 mx-auto text-muted-foreground/60" />
                        <h4 className="text-sm font-semibold text-foreground">No hay liquidaciones emitidas</h4>
                        <p className="text-xs text-muted-foreground">
                          Haga clic en <strong>"Generar Liquidación Oficial"</strong> para congelar y formalizar el cierre contable del mes seleccionado.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  liquidaciones.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-bold text-foreground">
                        {l.codigo_liquidacion}
                      </TableCell>
                      <TableCell className="font-medium">
                        {mesesNombres[l.periodo_mes - 1]} {l.periodo_anio}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {l.total_altas_periodo}
                      </TableCell>
                      <TableCell className="text-right font-medium font-mono text-emerald-600">
                        S/ {Number(l.total_ingresos_dealer).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium font-mono text-foreground">
                        S/ {Number(l.total_pagos_personal).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium font-mono text-rose-600">
                        S/ {Number(l.total_gastos_operativos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-foreground">
                        S/ {Number(l.ganancia_neta_dealer).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        {Number(l.margen_rentabilidad).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            l.estado === "Pagado"
                              ? "bg-emerald-600 text-white font-semibold"
                              : l.estado === "Aprobado"
                              ? "bg-blue-600 text-white font-semibold"
                              : "bg-amber-500 text-white font-semibold"
                          }
                        >
                          {l.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => handleOpenViewLiq(l)}
                          >
                            <Eye className="size-3.5" />
                            Detalle
                          </Button>

                          {l.estado === "Pendiente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={() => handleApproveLiq(l.id)}
                            >
                              Aprobar
                            </Button>
                          )}

                          {l.estado === "Aprobado" && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={() => {
                                setSelectedLiq(l);
                                setPayLiqModalOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}

                          {/* Delete Button (Allowed for wrong, outdated or invalid liquidations) */}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deletingLiqId === l.id}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Eliminar liquidación (si está mal o no compete)"
                            onClick={() => handleDeleteLiq(l.id, l.codigo_liquidacion)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Generar Liquidación Oficial */}
      <Dialog open={generateLiqModalOpen} onOpenChange={setGenerateLiqModalOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-5 text-indigo-600" />
              Generar Liquidación Oficial ({mesesNombres[selectedMes - 1]} {selectedAnio})
            </DialogTitle>
            <DialogDescription>
              Este proceso tomará la rentabilidad calculada, congelará las comisiones de los asesores activos y generará el registro oficial de liquidación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateLiquidacion} className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs border">
              <div className="font-semibold text-foreground">Resumen de Cierre:</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Altas Instaladas:</span>
                <span className="font-bold">{kpisActual.ventas_instaladas ?? kpisActual.total_altas} contratos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facturación Dealer:</span>
                <span className="font-bold font-mono text-emerald-600">
                  S/ {Number(kpisActual.ingresos_brutos_dealer || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planilla y Comisiones:</span>
                <span className="font-bold font-mono text-foreground">
                  S/ {Number((kpisActual.total_remuneraciones || 0) + (kpisActual.total_comisiones_personal || 0) + (kpisActual.total_bonos_personal || 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gastos Operativos:</span>
                <span className="font-bold font-mono text-rose-600">
                  S/ {Number(kpisActual.otros_gastos_operativos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t text-sm font-bold">
                <span>Ganancia Neta Dealer:</span>
                <span className={`font-mono ${kpisActual.ganancia_neta >= 0 ? "text-primary" : "text-rose-600"}`}>
                  S/ {Number(kpisActual.ganancia_neta || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas u Observaciones del Cierre (Opcional)</Label>
              <Input
                placeholder="Ej: Cierre de mes regular, liquidación de incentivos..."
                value={liqNotas}
                onChange={(e) => setLiqNotas(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="mt-4 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setGenerateLiqModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={generatingLiq}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {generatingLiq ? "Generando..." : "Confirmar & Generar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Detalle de Liquidación Congelada */}
      <Dialog open={viewLiqModalOpen} onOpenChange={setViewLiqModalOpen}>
        <DialogContent className="sm:max-w-3xl max-w-3xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="size-5 text-indigo-600" />
                Detalle Oficial: {selectedLiq?.codigo_liquidacion}
              </DialogTitle>
              <Badge
                className={
                  selectedLiq?.estado === "Pagado"
                    ? "bg-emerald-600 text-white font-semibold"
                    : selectedLiq?.estado === "Aprobado"
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-amber-500 text-white font-semibold"
                }
              >
                {selectedLiq?.estado}
              </Badge>
            </div>
            <DialogDescription>
              Valores auditables congelados al momento del cierre de periodo ({selectedLiq ? `${mesesNombres[selectedLiq.periodo_mes - 1]} ${selectedLiq.periodo_anio}` : ""}).
            </DialogDescription>
          </DialogHeader>

          {selectedLiq && (
            <div className="space-y-4 py-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-muted/40 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Altas Totales</span>
                  <span className="text-base font-bold text-foreground">{selectedLiq.total_altas_periodo}</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Ingresos Dealer</span>
                  <span className="text-base font-bold font-mono text-emerald-600">
                    S/ {Number(selectedLiq.total_ingresos_dealer).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Total Planilla</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    S/ {Number(selectedLiq.total_pagos_personal).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Ganancia Neta</span>
                  <span className="text-base font-bold font-mono text-primary">
                    S/ {Number(selectedLiq.ganancia_neta_dealer).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Workers Detail Table */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-[11px]">
                      <TableHead className="font-semibold">Trabajador</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold text-center">Altas</TableHead>
                      <TableHead className="font-semibold text-right">Sueldo Base</TableHead>
                      <TableHead className="font-semibold text-right">Comisión</TableHead>
                      <TableHead className="font-semibold text-right">Bono</TableHead>
                      <TableHead className="font-semibold text-right font-bold">Total a Pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {loadingLiqDetalle ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          <RefreshCw className="size-4 animate-spin mx-auto mb-1 text-primary" />
                          Cargando detalle...
                        </TableCell>
                      </TableRow>
                    ) : liqDetalles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No se registraron pagos individuales en esta liquidación.
                        </TableCell>
                      </TableRow>
                    ) : (
                      liqDetalles.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-semibold">{d.trabajador_nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {d.perfil_nombre}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">{d.altas_individuales}</TableCell>
                          <TableCell className="text-right font-mono">
                            S/ {Number(d.sueldo_base).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                            S/ {Number(d.comision_generada).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary font-semibold">
                            S/ {Number(d.bono_individual).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            S/ {Number(d.total_a_pagar).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {selectedLiq.notas && (
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                  <strong>Notas:</strong> {selectedLiq.notas}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
            <div>
              {selectedLiq && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                  onClick={() => handleDeleteLiq(selectedLiq.id, selectedLiq.codigo_liquidacion)}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Eliminar Liquidación
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewLiqModalOpen(false)}>
                Cerrar
              </Button>
              {selectedLiq?.estado === "Pendiente" && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                  onClick={() => handleApproveLiq(selectedLiq.id)}
                >
                  Aprobar Liquidación
                </Button>
              )}
              {selectedLiq?.estado === "Aprobado" && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                  onClick={() => {
                    setViewLiqModalOpen(false);
                    setPayLiqModalOpen(true);
                  }}
                >
                  Pagar Liquidación
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Pagar Liquidación */}
      <Dialog open={payLiqModalOpen} onOpenChange={setPayLiqModalOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-emerald-600" />
              Confirmar Desembolso en Tesorería
            </DialogTitle>
            <DialogDescription>
              Se registrará un egreso oficial en Caja / Tesorería por el monto total de planilla aprobado.
            </DialogDescription>
          </DialogHeader>

          {selectedLiq && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidación:</span>
                  <span className="font-mono font-bold">{selectedLiq.codigo_liquidacion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodo:</span>
                  <span className="font-semibold">{mesesNombres[selectedLiq.periodo_mes - 1]} {selectedLiq.periodo_anio}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t">
                  <span>Monto a Desembolsar:</span>
                  <span className="font-mono text-emerald-600">
                    S/ {Number(selectedLiq.total_pagos_personal).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Método de Pago *</Label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo / Caja Chica</option>
                  <option value="Yape/Plin">Billetera Digital (Yape / Plin)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setPayLiqModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={payingLiq}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleConfirmPayLiq}
            >
              {payingLiq ? "Procesando..." : "Confirmar Pago & Registrar Egreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
