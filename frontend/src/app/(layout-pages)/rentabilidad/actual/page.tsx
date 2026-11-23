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
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Users,
  Award,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Building2,
  PieChart,
  Filter,
  Calculator,
  Settings,
} from "lucide-react";

export default function RentabilidadActualPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(now.getFullYear());
  const [filterPerfil, setFilterPerfil] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/rentabilidad/actual?mes=${selectedMes}&anio=${selectedAnio}`);
      setData(res.data);
    } catch (err: any) {
      console.error("Error al cargar rentabilidad actual:", err);
      toast.error("Error al cargar datos económicos reales del negocio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMes, selectedAnio]);

  const kpis = data?.indicadores || {
    total_altas: 0,
    ingresos_brutos_dealer: 0,
    comision_base_dealer: 0,
    bonos_obtenidos_dealer: 0,
    bono_supervisor_matriz: 0,
    total_ingresos: 0,
    total_remuneraciones: 0,
    total_comisiones_personal: 0,
    total_bonos_personal: 0,
    total_gastos_personal: 0,
    otros_gastos_operativos: 0,
    total_egresos: 0,
    ganancia_neta: 0,
    margen_rentabilidad: 0,
  };

  const detalleIngresos = data?.detalleIngresos || {};
  const detalleEgresos = data?.detalleEgresos || {};
  const personalList: any[] = data?.personalDetalle || [];

  const filteredPersonal = useMemo(() => {
    return personalList.filter((p) => {
      const matchPerfil = filterPerfil === "all" || p.perfil_nombre === filterPerfil;
      const matchSearch =
        searchTerm === "" ||
        p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.documento_identidad && p.documento_identidad.includes(searchTerm));
      return matchPerfil && matchSearch;
    });
  }, [personalList, filterPerfil, searchTerm]);

  // Unique profiles
  const perfilesList = useMemo(() => {
    const set = new Set<string>();
    personalList.forEach((p) => {
      if (p.perfil_nombre) set.add(p.perfil_nombre);
    });
    return Array.from(set);
  }, [personalList]);

  // Totals for personnel
  const totalsPersonal = useMemo(() => {
    return filteredPersonal.reduce(
      (acc, p) => ({
        sueldo_base: acc.sueldo_base + Number(p.sueldo_base || 0),
        comision_generada: acc.comision_generada + Number(p.comision_generada || 0),
        bono_individual: acc.bono_individual + Number(p.bono_individual || 0),
        total_a_pagar: acc.total_a_pagar + Number(p.total_a_pagar || 0),
        gastos_adicionales: acc.gastos_adicionales + Number(p.gastos_adicionales || 0),
      }),
      { sueldo_base: 0, comision_generada: 0, bono_individual: 0, total_a_pagar: 0, gastos_adicionales: 0 }
    );
  }, [filteredPersonal]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!data) return;

    // Sheet 1: General Indicators
    const kpiRows = [
      { Concepto: "Altas Totales Realizadas", Valor: kpis.total_altas },
      { Concepto: "Comisión Base Dealer (S/)", Valor: kpis.comision_base_dealer },
      { Concepto: "Bonos Dealer Obtenidos (S/)", Valor: kpis.bonos_obtenidos_dealer },
      { Concepto: "Bono Supervisor Matriz (S/)", Valor: kpis.bono_supervisor_matriz },
      { Concepto: "INGRESOS BRUTOS TOTALES DEALER (S/)", Valor: kpis.total_ingresos },
      { Concepto: "Sueldos Base Personal (S/)", Valor: kpis.total_remuneraciones },
      { Concepto: "Comisiones Pagadas al Personal (S/)", Valor: kpis.total_comisiones_personal },
      { Concepto: "Bonos Individuales Personal (S/)", Valor: kpis.total_bonos_personal },
      { Concepto: "Gastos Adicionales Personal (S/)", Valor: kpis.total_gastos_personal },
      { Concepto: "Otros Gastos Fijos Operativos (S/)", Valor: kpis.otros_gastos_operativos },
      { Concepto: "EGRESOS TOTALES (S/)", Valor: kpis.total_egresos },
      { Concepto: "GANANCIA NETA (S/)", Valor: kpis.ganancia_neta },
      { Concepto: "Margen de Rentabilidad (%)", Valor: `${kpis.margen_rentabilidad}%` },
    ];

    // Sheet 2: Personnel Payouts
    const personalRows = filteredPersonal.map((p) => ({
      Trabajador: p.nombre_completo,
      DNI: p.documento_identidad || "",
      Perfil: p.perfil_nombre,
      "Altas Realizadas": p.altas,
      "Factor CFM": p.factor_comision,
      "Sueldo Base (S/)": p.sueldo_base,
      "Comisión Generada (S/)": p.comision_generada,
      "Bono Individual (S/)": p.bono_individual,
      "Total a Pagar (S/)": p.total_a_pagar,
      "Gastos Adicionales (S/)": p.gastos_adicionales,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen_Rentabilidad");

    const ws2 = XLSX.utils.json_to_sheet(personalRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle_Personal");

    XLSX.writeFile(wb, `Rentabilidad_Dealer_${selectedAnio}_${selectedMes}.xlsx`);
    toast.success("Reporte de rentabilidad exportado a Excel.");
  };

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Shared Module Sub-navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 border rounded-xl w-fit flex-wrap">
        <Link
          href="/rentabilidad/actual"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-background text-foreground shadow-xs transition-all border border-border/60"
        >
          <TrendingUp className="size-3.5 text-emerald-600" />
          <span>Rentabilidad Real</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Real
          </Badge>
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
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
        >
          <FileCheck className="size-3.5 text-indigo-600" />
          <span>Liquidaciones de Pagos</span>
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
            <TrendingUp className="size-6 text-emerald-600" />
            Rentabilidad Actual del Negocio
          </h1>
          <p className="text-sm text-muted-foreground">
            Auditoría económica en tiempo real del Dealer ON Negocios con base en altas instaladas reales, nómina del CRM y gastos operativos.
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
            onClick={handleExportExcel}
            className="gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="size-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Installation Audit Banner */}
      <div className="p-3.5 bg-muted/40 border border-border/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
          <span>
            <strong>Criterio Contable de Altas:</strong> Los ingresos del Dealer y comisiones del personal se calculan estrictamente sobre las <strong>ventas con instalación completada</strong> (<span className="text-emerald-600 font-bold">{kpis.ventas_instaladas ?? kpis.total_altas} altas instaladas</span>). Las ventas en trámite técnico (<span className="text-amber-600 font-bold">{kpis.ventas_pendientes_instalacion ?? 0} pendientes</span>) se liquidan al confirmarse su instalación.
          </span>
        </div>
        <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1.5 shrink-0 bg-background hover:bg-muted">
          <Link href="/ventas/instalacion">
            Ver Instalaciones
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <Card className="bg-card shadow-xs border-border/80 hover:border-emerald-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos Brutos Dealer</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              S/ {Number(kpis.total_ingresos).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span>{kpis.ventas_instaladas ?? kpis.total_altas} altas instaladas</span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
                Matriz ON
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Egresos */}
        <Card className="bg-card shadow-xs border-border/80 hover:border-rose-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Egresos Totales</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600">
              <ArrowDownRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              S/ {Number(kpis.total_egresos).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span>Nómina + Operativos</span>
              <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600">
                {Number(kpis.otros_gastos_operativos || 0) === 0 ? "Sin gastos fijos" : "Con gastos fijos"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ganancia Neta */}
        <Card className="bg-card shadow-xs border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ganancia Neta</CardTitle>
            <div className={`p-2 rounded-lg ${kpis.ganancia_neta >= 0 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>
              <Award className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono tracking-tight ${kpis.ganancia_neta >= 0 ? "text-primary" : "text-amber-600 dark:text-amber-400"}`}>
              S/ {Number(kpis.ganancia_neta).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span>Utilidad neta mensual</span>
              <Badge className={`text-[10px] py-0 px-1.5 ${kpis.ganancia_neta >= 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                {kpis.ganancia_neta >= 0 ? "Superávit" : "Déficit"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Margen de Rentabilidad */}
        <Card className="bg-card shadow-xs border-border/80 hover:border-sky-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margen Comercial</CardTitle>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-600">
              <PieChart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono tracking-tight ${kpis.margen_rentabilidad >= 20 ? "text-emerald-600" : kpis.margen_rentabilidad >= 0 ? "text-sky-600" : "text-rose-600"}`}>
              {Number(kpis.margen_rentabilidad).toFixed(2)}%
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span>Retorno s/ facturación</span>
              <Badge variant="outline" className={`text-[10px] ${kpis.margen_rentabilidad >= 20 ? "border-emerald-500/40 text-emerald-600" : "border-sky-500/40 text-sky-600"}`}>
                {kpis.margen_rentabilidad >= 20 ? "Excelente" : kpis.margen_rentabilidad > 0 ? "Normal" : "Riesgo"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Cards: Detalle de Ingresos vs Detalle de Egresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Desglose Ingresos Dealer */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <ArrowUpRight className="size-4 text-emerald-600" />
                Desglose de Ingresos del Dealer (ON Negocios)
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                ARPU: S/ {data?.arpu_aplicado || "168.64"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Altas Instaladas (Comisionables):</span>
              <span className="font-bold text-emerald-600">{detalleIngresos.ventas_instaladas ?? detalleIngresos.altas_totales ?? 0} contratos</span>
            </div>
            {Number(detalleIngresos.ventas_pendientes_instalacion || 0) > 0 && (
              <div className="flex justify-between items-center py-1 border-b text-amber-600 dark:text-amber-400">
                <span>Ventas en Trámite de Instalación:</span>
                <span className="font-semibold">{detalleIngresos.ventas_pendientes_instalacion} contratos (pendientes)</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Factor Comisional Alcanzado:</span>
              <span className="font-semibold text-primary">{detalleIngresos.factor_dealer || 0}x</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Comisión Base Dealer (Altas × Factor × ARPU):</span>
              <span className="font-bold font-mono text-foreground">
                S/ {Number(detalleIngresos.comision_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Bonos Dealer Desbloqueados (1 cada 4 altas):</span>
              <span className="font-semibold">
                {detalleIngresos.bonos_desbloqueados || 0} bonos &bull; S/ {Number(detalleIngresos.bono_unitario || 0).toLocaleString("es-PE")} c/u
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Total Ingreso por Bonos Dealer:</span>
              <span className="font-bold font-mono text-emerald-600">
                S/ {Number(detalleIngresos.total_bonos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{"Bono Supervisor Matriz (>=15: S/ 1,500, >=20: S/ 3,000):"}</span>
              <span className="font-bold font-mono text-emerald-600">
                S/ {Number(detalleIngresos.bono_supervisor_matriz || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 text-base font-bold text-foreground">
              <span>Ingresos Totales Brutos:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                S/ {Number(detalleIngresos.ingresos_totales_brutos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Desglose Egresos del Negocio */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <ArrowDownRight className="size-4 text-rose-600" />
              Desglose de Egresos y Costos Operativos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Sueldos Base del Personal:</span>
              <span className="font-semibold font-mono text-foreground">
                S/ {Number(detalleEgresos.sueldos_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Comisiones Variables al Personal:</span>
              <span className="font-semibold font-mono text-foreground">
                S/ {Number(detalleEgresos.comisiones_personal || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Bonos Individuales por Escala:</span>
              <span className="font-semibold font-mono text-foreground">
                S/ {Number(detalleEgresos.bonos_individuales || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Gastos Adicionales Asignados al Personal:</span>
              <span className="font-semibold font-mono text-foreground">
                S/ {Number(detalleEgresos.gastos_adicionales_personal || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="py-1 border-b space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span>Gastos Operativos Reales:</span>
                    <Link href="/gastos" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5">
                      (Ver módulo Gastos <ArrowRight className="size-2.5" />)
                    </Link>
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {Number(detalleEgresos.otros_gastos_fijos || 0) > 0
                      ? `${(detalleEgresos.lista_gastos_reales || []).length} gasto(s) registrado(s) en Finanzas/Gastos:`
                      : `Sin gastos registrados en el CRM para ${mesesNombres[selectedMes - 1]} ${selectedAnio} (S/ 0.00)`}
                  </span>
                </div>
                <span className="font-semibold font-mono text-foreground">
                  S/ {Number(detalleEgresos.otros_gastos_fijos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {Array.isArray(detalleEgresos.lista_gastos_reales) && detalleEgresos.lista_gastos_reales.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-[11px] border border-border/50">
                  {detalleEgresos.lista_gastos_reales.map((g: any) => (
                    <div key={g.id} className="flex justify-between items-center text-muted-foreground">
                      <span>• {g.descripcion || "Gasto operativo"} {g.numero_comprobante ? `(${g.tipo_comprobante || "Doc"}: ${g.numero_comprobante})` : ""}</span>
                      <span className="font-mono font-medium text-foreground">S/ {Number(g.monto_total || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 text-base font-bold text-foreground">
              <span>Egresos Totales:</span>
              <span className="text-rose-600 dark:text-rose-400 font-mono">
                S/ {Number(detalleEgresos.total_egresos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground mt-2">
              💡 <b>Nota Contable:</b> Los gastos adicionales (movilidad, refrigerios) no constituyen remuneración directa al trabajador y se controlan de forma independiente.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table: Desglose Individual por Trabajador */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Desempeño y Pagos al Personal ({mesesNombres[selectedMes - 1]} {selectedAnio})
              </CardTitle>
              <CardDescription className="text-xs">
                Cálculo comisional automático por perfil, escala alcanzada, sueldo base y bonos correspondientes.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Buscar asesor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                <span>Perfil:</span>
              </div>
              <select
                value={filterPerfil}
                onChange={(e) => setFilterPerfil(e.target.value)}
                className="h-9 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todos los perfiles</option>
                {perfilesList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-xs">Trabajador</TableHead>
                  <TableHead className="font-semibold text-xs">Perfil Laboral</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Altas Realizadas</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Escala / Rango</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Sueldo Base</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Comisión</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Bono Fijo</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Total a Pagar</TableHead>
                  <TableHead className="font-semibold text-xs text-right pr-4">Gastos Adic.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                      Calculando comisiones y rentabilidad...
                    </TableCell>
                  </TableRow>
                ) : filteredPersonal.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 px-4">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                          <Users className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-foreground">Sin colaboradores reales registrados</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            No se encontraron empleados activos en el módulo de Personal para este periodo, por lo que el gasto de nómina actual es <strong>S/ 0.00</strong>.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                          <Button size="sm" variant="outline" asChild className="text-xs h-8">
                            <Link href="/personal">
                              <Users className="size-3.5 mr-1.5" />
                              Registrar Personal en CRM
                            </Link>
                          </Button>
                          <Button size="sm" asChild className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white">
                            <Link href="/rentabilidad/simulador">
                              <Calculator className="size-3.5 mr-1.5" />
                              Simular con Personal Hipotético
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPersonal.map((p) => {
                    const isSupervisor = p.perfil_nombre === "Supervisor";

                    return (
                      <TableRow key={p.id} className={`hover:bg-muted/20 ${isSupervisor ? "bg-primary/5 font-medium" : ""}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${isSupervisor ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              <Users className="size-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-xs">{p.nombre_completo}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                DNI: {p.documento_identidad || "S.N."}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.perfil_nombre}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {p.altas} {isSupervisor ? "(Equipo)" : "altas"}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="font-semibold text-primary">{p.factor_comision} CFM</span>
                          <span className="text-[11px] text-muted-foreground block">{p.rango_nombre}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          S/ {Number(p.sueldo_base).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          S/ {Number(p.comision_generada).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-primary font-mono">
                          S/ {Number(p.bono_individual).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-foreground font-mono">
                          S/ {Number(p.total_a_pagar).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground pr-4 font-mono">
                          S/ {Number(p.gastos_adicionales).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {filteredPersonal.length > 0 && (
                <TableFooter className="bg-muted/60 font-semibold text-xs border-t">
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold text-foreground">
                      TOTALES NÓMINA ({filteredPersonal.length} colaboradores):
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      S/ {totalsPersonal.sueldo_base.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      S/ {totalsPersonal.comision_generada.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      S/ {totalsPersonal.bono_individual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground text-sm">
                      S/ {totalsPersonal.total_a_pagar.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground pr-4">
                      S/ {totalsPersonal.gastos_adicionales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
