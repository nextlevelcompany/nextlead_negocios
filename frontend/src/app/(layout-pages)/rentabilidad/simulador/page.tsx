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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Calculator,
  RefreshCw,
  Save,
  Download,
  Copy,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Users,
  Building2,
  Trash2,
  CheckCircle2,
  FolderOpen,
  Settings,
  FileCheck,
  Plus,
  Info,
  HelpCircle,
} from "lucide-react";

export default function SimuladorRentabilidadPage() {
  const [loading, setLoading] = useState(false);
  const [actualData, setActualData] = useState<any>(null);
  const [savedSims, setSavedSims] = useState<any[]>([]);
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [saveNameModalOpen, setSaveNameModalOpen] = useState(false);
  const [simNameInput, setSimNameInput] = useState("");
  const [savingSim, setSavingSim] = useState(false);

  // Available commission profiles for dropdown
  const [perfilesList, setPerfilesList] = useState<any[]>([]);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    perfil_id: 1,
    tipo_personal: "Full Time",
    cantidad: 1,
    sueldo_base: 1500,
    gastos_adicionales: 50,
    altas_por_persona: 6,
  });

  // Simulation Parameters Form
  const [arpu, setArpu] = useState<number>(168.64);
  const [gastosFijos, setGastosFijos] = useState<number>(500);

  // Group sellers state
  const [grupos, setGrupos] = useState<any[]>([
    {
      perfil_id: 1,
      tipo_personal: "Full Time",
      cantidad: 1,
      sueldo_base: 1500,
      gastos_adicionales: 50,
      altas_por_persona: 6,
    },
    {
      perfil_id: 2,
      tipo_personal: "Medio Tiempo",
      cantidad: 1,
      sueldo_base: 800,
      gastos_adicionales: 50,
      altas_por_persona: 6,
    },
    {
      perfil_id: 3,
      tipo_personal: "Freelance",
      cantidad: 1,
      sueldo_base: 0,
      gastos_adicionales: 0,
      altas_por_persona: 8,
    },
    {
      perfil_id: 4,
      tipo_personal: "Supervisor",
      cantidad: 1,
      sueldo_base: 2000,
      gastos_adicionales: 50,
      altas_por_persona: 0, // Auto-computed as sum of sellers
    },
  ]);

  // Simulation Results state
  const [simResult, setSimResult] = useState<any>(null);

  // Fetch initial actual data & saved simulations
  const loadInitial = async () => {
    try {
      setLoading(true);
      const [actRes, simRes, confRes] = await Promise.all([
        api.get("/api/rentabilidad/actual"),
        api.get("/api/rentabilidad/simulaciones").catch(() => ({ data: [] })),
        api.get("/api/rentabilidad/config").catch(() => ({ data: {} })),
      ]);

      setActualData(actRes.data?.indicadores || null);
      setSavedSims(Array.isArray(simRes.data) ? simRes.data : []);
      setPerfilesList(Array.isArray(confRes.data?.perfiles) ? confRes.data.perfiles : []);

      if (confRes.data?.configGlobal?.arpu_promedio) {
        setArpu(Number(confRes.data.configGlobal.arpu_promedio));
      }
      if (confRes.data?.configGlobal?.gastos_fijos_oficina) {
        setGastosFijos(Number(confRes.data.configGlobal.gastos_fijos_oficina));
      }
    } catch (err: any) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  // Run simulation whenever parameters change
  const executeSimulation = async () => {
    try {
      const payload = {
        arpu_promedio: Number(arpu),
        gastos_fijos_oficina: Number(gastosFijos),
        grupos: grupos,
      };

      const res = await api.post("/api/rentabilidad/simular", payload);
      setSimResult(res.data);
    } catch (err: any) {
      console.error("Error al ejecutar simulación:", err);
    }
  };

  useEffect(() => {
    executeSimulation();
  }, [arpu, gastosFijos, grupos]);

  // Pre-configured Scenarios
  const handleApplyScenario = (type: "CONSERVADOR" | "NORMAL" | "OPTIMISTA") => {
    if (type === "CONSERVADOR") {
      setGrupos([
        { perfil_id: 1, tipo_personal: "Full Time", cantidad: 1, sueldo_base: 1500, gastos_adicionales: 50, altas_por_persona: 3 },
        { perfil_id: 2, tipo_personal: "Medio Tiempo", cantidad: 1, sueldo_base: 800, gastos_adicionales: 50, altas_por_persona: 2 },
        { perfil_id: 3, tipo_personal: "Freelance", cantidad: 1, sueldo_base: 0, gastos_adicionales: 0, altas_por_persona: 3 },
        { perfil_id: 4, tipo_personal: "Supervisor", cantidad: 1, sueldo_base: 2000, gastos_adicionales: 50, altas_por_persona: 0 },
      ]);
      toast.info("Escenario Conservador cargado (8 altas estimadas).");
    } else if (type === "NORMAL") {
      setGrupos([
        { perfil_id: 1, tipo_personal: "Full Time", cantidad: 1, sueldo_base: 1500, gastos_adicionales: 50, altas_por_persona: 6 },
        { perfil_id: 2, tipo_personal: "Medio Tiempo", cantidad: 1, sueldo_base: 800, gastos_adicionales: 50, altas_por_persona: 6 },
        { perfil_id: 3, tipo_personal: "Freelance", cantidad: 1, sueldo_base: 0, gastos_adicionales: 0, altas_por_persona: 8 },
        { perfil_id: 4, tipo_personal: "Supervisor", cantidad: 1, sueldo_base: 2000, gastos_adicionales: 50, altas_por_persona: 0 },
      ]);
      toast.info("Escenario Normal cargado (20 altas - Modelo Excel V10).");
    } else if (type === "OPTIMISTA") {
      setGrupos([
        { perfil_id: 1, tipo_personal: "Full Time", cantidad: 2, sueldo_base: 1500, gastos_adicionales: 50, altas_por_persona: 10 },
        { perfil_id: 2, tipo_personal: "Medio Tiempo", cantidad: 2, sueldo_base: 800, gastos_adicionales: 50, altas_por_persona: 8 },
        { perfil_id: 3, tipo_personal: "Freelance", cantidad: 2, sueldo_base: 0, gastos_adicionales: 0, altas_por_persona: 12 },
        { perfil_id: 4, tipo_personal: "Supervisor", cantidad: 1, sueldo_base: 2000, gastos_adicionales: 50, altas_por_persona: 0 },
      ]);
      toast.info("Escenario Optimista cargado (60 altas proyectadas).");
    }
  };

  const updateGrupo = (index: number, field: string, value: any) => {
    setGrupos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove a simulated group/worker
  const handleRemoveGrupo = (index: number) => {
    if (grupos.length <= 1) {
      toast.warning("Debe mantener al menos un grupo o puesto en el simulador.");
      return;
    }
    setGrupos((prev) => prev.filter((_, i) => i !== index));
    toast.info("Puesto retirado del laboratorio de simulación.");
  };

  // Add a new simulated group/worker
  const handleAddStaffRow = () => {
    const selectedPerfil = perfilesList.find((p) => p.id === newStaffForm.perfil_id);
    const nombre = selectedPerfil ? selectedPerfil.nombre : newStaffForm.tipo_personal;
    const isSup = nombre.toLowerCase().includes("supervisor");
    setGrupos((prev) => [
      ...prev,
      {
        perfil_id: newStaffForm.perfil_id,
        tipo_personal: nombre,
        cantidad: Math.max(1, newStaffForm.cantidad),
        sueldo_base: newStaffForm.sueldo_base,
        gastos_adicionales: newStaffForm.gastos_adicionales,
        altas_por_persona: isSup ? 0 : newStaffForm.altas_por_persona,
      },
    ]);
    setAddStaffModalOpen(false);
    toast.success(`Puesto simulado "${nombre}" agregado al laboratorio.`);
  };

  // Import active real staff from CRM into simulation sandbox
  const handleImportRealStaff = async () => {
    try {
      const res = await api.get("/api/rentabilidad/actual");
      const realWorkers: any[] = res.data?.personalDetalle || [];
      if (realWorkers.length === 0) {
        toast.info("No hay colaboradores activos en Personal actualmente para importar.");
        return;
      }
      const imported = realWorkers.map((w: any) => ({
        perfil_id: w.perfil_id || 1,
        tipo_personal: w.perfil_nombre || w.nombre_completo,
        cantidad: 1,
        sueldo_base: Number(w.sueldo_base) || 0,
        gastos_adicionales: Number(w.gastos_adicionales) || 0,
        altas_por_persona: Number(w.altas) || 5,
      }));
      setGrupos(imported);
      toast.success(`Se importaron ${imported.length} colaboradores reales al simulador.`);
    } catch (e) {
      toast.error("Error al importar personal real.");
    }
  };

  // Save simulation
  const handleSaveSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simNameInput.trim()) {
      toast.error("Ingrese un nombre para el escenario de simulación.");
      return;
    }
    if (!simResult) return;

    try {
      setSavingSim(true);
      await api.post("/api/rentabilidad/simulaciones/save", {
        nombre_escenario: simNameInput.trim(),
        tipo_escenario: "PERSONALIZADO",
        arpu_promedio: simResult.arpu,
        gastos_fijos_oficina: simResult.gastos_fijos_oficina,
        total_altas: simResult.total_altas,
        factor_dealer: simResult.factor_dealer,
        comision_base_dealer: simResult.comision_base_dealer,
        cantidad_bonos: simResult.bonos_desbloqueados,
        bonos_dealer_total: simResult.total_bonos_dealer,
        bono_supervisor_matriz: simResult.bono_supervisor_matriz,
        ingresos_totales_brutos: simResult.ingresos_totales_brutos,
        total_planilla_comisiones: simResult.total_planilla_comisiones,
        total_gastos_personal: simResult.total_gastos_personal,
        egresos_totales: simResult.egresos_totales,
        ganancia_neta: simResult.ganancia_neta,
        margen_rentabilidad: simResult.margen_rentabilidad,
        parametros_json: JSON.stringify({ grupos, arpu, gastosFijos }),
      });

      toast.success("Simulación guardada con éxito en el historial.");
      setSaveNameModalOpen(false);
      setSimNameInput("");
      loadInitial();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar simulación.");
    } finally {
      setSavingSim(false);
    }
  };

  // Load a saved simulation
  const handleLoadSavedSim = (sim: any) => {
    try {
      if (sim.parametros_json) {
        const parsed = typeof sim.parametros_json === "string" ? JSON.parse(sim.parametros_json) : sim.parametros_json;
        if (parsed.grupos) setGrupos(parsed.grupos);
        if (parsed.arpu) setArpu(Number(parsed.arpu));
        if (parsed.gastosFijos) setGastosFijos(Number(parsed.gastosFijos));
      }
      setSavedModalOpen(false);
      toast.success(`Simulación "${sim.nombre_escenario}" cargada.`);
    } catch (err) {
      toast.error("Error al interpretar los parámetros guardados.");
    }
  };

  // Delete saved simulation
  const handleDeleteSavedSim = async (id: number) => {
    if (!confirm("¿Desea eliminar esta simulación guardada?")) return;
    try {
      await api.delete(`/api/rentabilidad/simulaciones/${id}`);
      toast.success("Simulación eliminada.");
      loadInitial();
    } catch (err: any) {
      toast.error("Error al eliminar simulación.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!simResult) return;

    const summaryRows = [
      { Parámetro: "ARPU Promedio (Sin IGV)", Valor: simResult.arpu },
      { Parámetro: "Altas Totales Estimadas", Valor: simResult.total_altas },
      { Parámetro: "Factor Dealer Alcanzado", Valor: `${simResult.factor_dealer}x` },
      { Parámetro: "Comisión Base Dealer (S/)", Valor: simResult.comision_base_dealer },
      { Parámetro: "Bonos Dealer Desbloqueados", Valor: simResult.bonos_desbloqueados },
      { Parámetro: "Total Bonos Dealer (S/)", Valor: simResult.total_bonos_dealer },
      { Parámetro: "Bono Supervisor Matriz (S/)", Valor: simResult.bono_supervisor_matriz },
      { Parámetro: "INGRESOS TOTALES DEALER (S/)", Valor: simResult.ingresos_totales_brutos },
      { Parámetro: "Total Planilla & Comisiones (S/)", Valor: simResult.total_planilla_comisiones },
      { Parámetro: "Total Gastos Personal (S/)", Valor: simResult.total_gastos_personal },
      { Parámetro: "Gastos Fijos Oficina (S/)", Valor: simResult.gastos_fijos_oficina },
      { Parámetro: "EGRESOS TOTALES (S/)", Valor: simResult.egresos_totales },
      { Parámetro: "GANANCIA NETA PROYECTADA (S/)", Valor: simResult.ganancia_neta },
      { Parámetro: "Margen de Rentabilidad (%)", Valor: `${simResult.margen_rentabilidad}%` },
    ];

    const groupRows = (simResult.grupos_detalle || []).map((g: any) => ({
      "Grupo / Perfil": g.tipo_personal,
      "Cantidad Personas": g.cantidad,
      "Sueldo Base (c/u)": g.sueldo_base,
      "Gastos Adic. (c/u)": g.gastos_adicionales,
      "Altas (c/u)": g.altas_por_persona,
      "Altas Totales Fila": g.altas_totales,
      "Factor CFM": g.factor_comision,
      "Bono Unitario": g.bono_unitario,
      "Comisiones Fila (S/)": g.comisiones_fila,
      "Pago Planilla Fila (S/)": g.pago_planilla_fila,
      "Total Gastos Adic. (S/)": g.total_gastos_adic_fila,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen_Simulacion");

    const wsGroups = XLSX.utils.json_to_sheet(groupRows);
    XLSX.utils.book_append_sheet(wb, wsGroups, "Detalle_Equipos");

    XLSX.writeFile(wb, `Simulador_Rentabilidad_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Simulación exportada a Excel exitosamente.");
  };

  // Comparatives
  const comp = useMemo(() => {
    const realAltas = actualData?.total_altas || 0;
    const simAltas = simResult?.total_altas || 0;
    const diffAltas = simAltas - realAltas;

    const realIngresos = actualData?.ingresos_brutos_dealer || 0;
    const simIngresos = simResult?.ingresos_totales_brutos || 0;
    const diffIngresos = simIngresos - realIngresos;

    const realEgresos = actualData?.total_egresos || 0;
    const simEgresos = simResult?.egresos_totales || 0;
    const diffEgresos = simEgresos - realEgresos;

    const realGanancia = actualData?.ganancia_neta || 0;
    const simGanancia = simResult?.ganancia_neta || 0;
    const diffGanancia = simGanancia - realGanancia;

    const realMargen = actualData?.margen_rentabilidad || 0;
    const simMargen = simResult?.margen_rentabilidad || 0;
    const diffMargen = simMargen - realMargen;

    return {
      realAltas, simAltas, diffAltas,
      realIngresos, simIngresos, diffIngresos,
      realEgresos, simEgresos, diffEgresos,
      realGanancia, simGanancia, diffGanancia,
      realMargen, simMargen, diffMargen,
    };
  }, [actualData, simResult]);

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
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-background text-foreground shadow-xs transition-all border border-border/60"
        >
          <Calculator className="size-3.5 text-blue-600" />
          <span>Simulador de Escenarios</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            Sandbox
          </Badge>
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
            <Calculator className="size-6 text-blue-600" />
            Simulador de Escenarios de Ingresos & Rentabilidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Laboratorio comercial predictivo: proyecte contrataciones, metas de ventas, escalas de comisiones y compare la situación actual con proyecciones futuras.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSavedModalOpen(true)}
            className="gap-2"
          >
            <FolderOpen className="size-4" />
            Simulaciones Guardadas ({savedSims.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveNameModalOpen(true)}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Save className="size-4" />
            Guardar Escenario
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

      {/* Quick Scenario Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-4 text-amber-500" />
          <span>Cargar Escenario Rápido:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyScenario("CONSERVADOR")}
            className="text-xs h-8 hover:bg-muted/80 gap-1.5"
          >
            <span>🌱</span>
            <span>Conservador (8 Altas)</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyScenario("NORMAL")}
            className="text-xs h-8 border-primary/40 text-primary hover:bg-primary/5 font-semibold gap-1.5"
          >
            <span>⭐</span>
            <span>Normal (20 Altas - Modelo Excel V10)</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyScenario("OPTIMISTA")}
            className="text-xs h-8 text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-1.5"
          >
            <span>🚀</span>
            <span>Optimista (60 Altas)</span>
          </Button>
        </div>
      </div>

      {/* Sandbox Isolation Notice Banner */}
      <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 mt-0.5">
          <Sparkles className="size-4" />
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <span>Laboratorio de Simulación Comercial Aislado</span>
            <Badge variant="outline" className="text-[10px] bg-blue-100/50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300">
              Sandbox 100% Hipotético
            </Badge>
          </div>
          <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
            Todo el personal, sueldos base, metas y gastos definidos en esta pantalla son <strong>exclusivamente para proyectar escenarios</strong>. Agregar, editar o eliminar puestos aquí <strong>NO afecta ni altera</strong> los empleados reales del CRM en el módulo de Personal.
          </p>
        </div>
      </div>

      {/* Simulator Form & Live Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Input Form (Teams, ARPU, Fijos) */}
        <Card className="bg-card shadow-xs lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Personal y Fuerza de Ventas Simulada
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure puestos de trabajo, sueldos y metas de ventas para simular el costo de planilla y comisiones.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setAddStaffModalOpen(true)}
                  className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  Agregar Puesto Simulado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportRealStaff}
                  className="gap-1.5 text-xs h-8 text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                >
                  <Download className="size-3.5" />
                  Importar Personal Real
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Global Params Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/40 rounded-xl border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ARPU Promedio (Sin IGV)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">S/</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={arpu}
                    onChange={(e) => setArpu(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Ej: Plan S/ 199 / 1.18 = 168.64</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Otros Gastos Fijos de Oficina</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">S/</span>
                  <Input
                    type="number"
                    step="10"
                    value={gastosFijos}
                    onChange={(e) => setGastosFijos(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Alquiler, internet, luz y suministros</span>
              </div>
            </div>

            {/* Groups Table Inputs */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px]">
                    <TableHead className="font-semibold">Perfil / Puesto Simulado</TableHead>
                    <TableHead className="font-semibold text-center w-20">Asesores</TableHead>
                    <TableHead className="font-semibold text-center w-24">Altas c/u</TableHead>
                    <TableHead className="font-semibold text-center">Altas Fila</TableHead>
                    <TableHead className="font-semibold text-right w-24">Sueldo Base</TableHead>
                    <TableHead className="font-semibold text-right w-24">Gastos Adic.</TableHead>
                    <TableHead className="font-semibold text-center w-12">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.map((g, idx) => {
                    const isSupervisor = g.tipo_personal === "Supervisor" || g.tipo_personal?.toLowerCase()?.includes("supervisor");

                    return (
                      <TableRow key={idx} className={isSupervisor ? "bg-primary/5 font-medium" : ""}>
                        <TableCell className="font-semibold text-xs">
                          {g.tipo_personal}
                          {isSupervisor && (
                            <span className="text-[10px] text-muted-foreground block font-normal">
                              (Comisiona s/ altas del equipo)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            value={g.cantidad}
                            onChange={(e) => updateGrupo(idx, "cantidad", Number(e.target.value))}
                            className="h-8 text-center text-xs w-16 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {isSupervisor ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              {simResult?.total_altas || 0}
                            </Badge>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={g.altas_por_persona}
                              onChange={(e) => updateGrupo(idx, "altas_por_persona", Number(e.target.value))}
                              className="h-8 text-center text-xs w-16 mx-auto font-bold"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {isSupervisor ? (simResult?.total_altas || 0) : g.cantidad * g.altas_por_persona}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="50"
                            value={g.sueldo_base}
                            onChange={(e) => updateGrupo(idx, "sueldo_base", Number(e.target.value))}
                            className="h-8 text-right text-xs w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="10"
                            value={g.gastos_adicionales}
                            onChange={(e) => updateGrupo(idx, "gastos_adicionales", Number(e.target.value))}
                            className="h-8 text-right text-xs w-16 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGrupo(idx)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Eliminar puesto simulado"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Simulation Financial Result */}
        <Card className="bg-card shadow-xs lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-600" />
              Resultado de la Simulación
            </CardTitle>
            <CardDescription className="text-xs">
              Cálculo en vivo de ingresos, bonos y rentabilidad Dealer.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-3 text-xs sm:text-sm flex-1">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Altas Totales Estimadas:</span>
              <span className="font-bold text-base text-foreground">{simResult?.total_altas || 0}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Factor Dealer Alcanzado:</span>
              <span className="font-semibold text-primary">{simResult?.factor_dealer || 0}x</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Comisión Base Dealer:</span>
              <span className="font-semibold font-mono">
                S/ {Number(simResult?.comision_base_dealer || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Bonos Dealer ({simResult?.bonos_desbloqueados || 0} u.):</span>
              <span className="font-semibold font-mono text-emerald-600">
                S/ {Number(simResult?.total_bonos_dealer || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Bono Supervisor Matriz:</span>
              <span className="font-semibold font-mono text-emerald-600">
                S/ {Number(simResult?.bono_supervisor_matriz || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b font-bold text-emerald-600 dark:text-emerald-400">
              <span>Ingresos Brutos Proyectados:</span>
              <span className="font-mono text-base">S/ {Number(simResult?.ingresos_totales_brutos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b text-muted-foreground">
              <span>Planilla y Comisiones:</span>
              <span className="text-rose-600 font-mono">
                - S/ {Number(simResult?.total_planilla_comisiones || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b text-muted-foreground">
              <span>Gastos del Personal + Fijos:</span>
              <span className="text-rose-600 font-mono">
                - S/ {Number((simResult?.total_gastos_personal || 0) + (simResult?.gastos_fijos_oficina || 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground">Ganancia Neta Dealer:</span>
                <span className={`font-bold text-lg font-mono ${(simResult?.ganancia_neta || 0) >= 0 ? "text-primary" : "text-rose-600"}`}>
                  S/ {Number(simResult?.ganancia_neta || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Margen de Rentabilidad:</span>
                <Badge className={`font-mono text-xs ${(simResult?.margen_rentabilidad || 0) >= 20 ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}>
                  {Number(simResult?.margen_rentabilidad || 0).toFixed(2)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Card: Where does Planilla & Comisiones come from? */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Calculator className="size-5 text-indigo-600" />
                Desglose Detallado de Egresos: ¿De dónde sale la planilla y comisiones?
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoría transparente del cálculo fila por fila: Sueldo Fijo + Comisiones Variables según escala + Bonos Fijos por tramo.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                ARPU Aplicado: S/ {Number(arpu).toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead className="font-semibold">Perfil / Puesto Simulado</TableHead>
                  <TableHead className="font-semibold text-center">Vendedores</TableHead>
                  <TableHead className="font-semibold text-right">Sueldo Base Total</TableHead>
                  <TableHead className="font-semibold text-center">Altas Grupo</TableHead>
                  <TableHead className="font-semibold text-center">Escala Alcanzada</TableHead>
                  <TableHead className="font-semibold text-right">Comisión Variable</TableHead>
                  <TableHead className="font-semibold text-right">Bono Fijo</TableHead>
                  <TableHead className="font-semibold text-right font-bold text-foreground">Subtotal Planilla</TableHead>
                  <TableHead className="font-semibold text-right">Gastos Movilidad</TableHead>
                  <TableHead className="font-semibold text-right pr-4 font-bold text-primary">Costo Total Fila</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {(simResult?.grupos_detalle || []).map((g: any, idx: number) => {
                  const isSupervisor = g.tipo_personal === "Supervisor" || g.tipo_personal?.toLowerCase()?.includes("supervisor");
                  const sueldoTotal = Number(g.sueldo_base_total ?? (g.cantidad * g.sueldo_base));
                  const comisionFila = Number(g.comisiones_fila || 0);
                  const bonosFila = Number(g.bonos_fila ?? (g.cantidad * (g.bono_unitario || 0)));
                  const planillaFila = Number(g.pago_planilla_fila || 0);
                  const gastosFila = Number(g.total_gastos_adic_fila || 0);
                  const costoTotalFila = Number(g.total_costo_fila ?? (planillaFila + gastosFila));

                  return (
                    <TableRow key={idx} className={isSupervisor ? "bg-primary/5 font-medium hover:bg-primary/10" : "hover:bg-muted/20"}>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{g.tipo_personal}</span>
                          {isSupervisor && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              Supervisor
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {g.cantidad} {g.cantidad === 1 ? "persona" : "personas"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        S/ {sueldoTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-muted-foreground block font-sans">
                          ({g.cantidad} × S/ {Number(g.sueldo_base).toLocaleString("es-PE")})
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-foreground">
                        {g.altas_totales} {isSupervisor ? "(Equipo)" : "altas"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-primary">{g.factor_comision} CFM</span>
                        <span className="text-[10px] text-muted-foreground block">
                          ({(Number(g.factor_comision) * 100).toFixed(0)}% del ARPU)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 font-mono">
                        S/ {comisionFila.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary font-mono">
                        S/ {bonosFila.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground text-sm font-mono">
                        S/ {planillaFila.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">
                        S/ {gastosFila.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right pr-4 font-bold text-primary text-sm font-mono">
                        S/ {costoTotalFila.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Detailed Summary Footer */}
          <div className="p-4 bg-muted/40 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground block">1. Total Sueldos Fijos:</span>
              <span className="font-bold text-sm text-foreground">
                S/ {Number((simResult?.grupos_detalle || []).reduce((acc: number, x: any) => acc + Number(x.sueldo_base_total ?? (x.cantidad * x.sueldo_base)), 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block">2. Total Comisiones Variables:</span>
              <span className="font-bold text-sm text-emerald-600">
                S/ {Number((simResult?.grupos_detalle || []).reduce((acc: number, x: any) => acc + Number(x.comisiones_fila || 0), 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block">3. Total Bonos Fijos por Escala:</span>
              <span className="font-bold text-sm text-primary">
                S/ {Number((simResult?.grupos_detalle || []).reduce((acc: number, x: any) => acc + Number(x.bonos_fila ?? (x.cantidad * (x.bono_unitario || 0))), 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-1 p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
              <span className="text-rose-700 dark:text-rose-300 font-semibold block">= TOTAL PLANILLA & COMISIONES:</span>
              <span className="font-bold text-base text-rose-600 font-mono">
                S/ {Number(simResult?.total_planilla_comisiones || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table: Situación Actual vs Simulación Proyectada */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Comparación de Impacto: Situación Real Actual vs. Simulación Proyectada
          </CardTitle>
          <CardDescription className="text-xs">
            Análisis de variación para toma de decisiones sobre ampliación de personal o metas de ventas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Indicador Financiero</TableHead>
                  <TableHead className="font-semibold text-right">Situación Actual (Real)</TableHead>
                  <TableHead className="font-semibold text-right">Simulación (Proyectada)</TableHead>
                  <TableHead className="font-semibold text-right">Variación Neta</TableHead>
                  <TableHead className="font-semibold text-center pr-4">Impacto Económico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {/* Altas */}
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="font-semibold">Altas Totales</TableCell>
                  <TableCell className="text-right font-medium">{comp.realAltas} contratos</TableCell>
                  <TableCell className="text-right font-bold text-foreground">{comp.simAltas} contratos</TableCell>
                  <TableCell className={`text-right font-bold ${comp.diffAltas >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {comp.diffAltas >= 0 ? `+${comp.diffAltas}` : comp.diffAltas}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    <Badge variant="outline" className={comp.diffAltas >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {comp.diffAltas >= 0 ? "Incremento" : "Disminución"}
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Ingresos Brutos */}
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="font-semibold">Ingresos Brutos del Dealer (ON Negocios)</TableCell>
                  <TableCell className="text-right font-medium">S/ {Number(comp.realIngresos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">S/ {Number(comp.simIngresos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-right font-bold ${comp.diffIngresos >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {comp.diffIngresos >= 0 ? `+ S/ ${comp.diffIngresos.toFixed(2)}` : `- S/ ${Math.abs(comp.diffIngresos).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    {comp.diffIngresos >= 0 ? (
                      <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                        <ArrowUpRight className="size-3.5" /> Favorable
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                        <ArrowDownRight className="size-3.5" /> Menor
                      </span>
                    )}
                  </TableCell>
                </TableRow>

                {/* Egresos Totales */}
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="font-semibold">Egresos Totales (Planilla + Gastos)</TableCell>
                  <TableCell className="text-right font-medium">S/ {Number(comp.realEgresos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-bold text-rose-600">S/ {Number(comp.simEgresos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    {comp.diffEgresos >= 0 ? `+ S/ ${comp.diffEgresos.toFixed(2)}` : `- S/ ${Math.abs(comp.diffEgresos).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    <span className="text-muted-foreground font-medium">
                      {comp.diffEgresos > 0 ? "Mayor Costo" : "Menor Costo"}
                    </span>
                  </TableCell>
                </TableRow>

                {/* Ganancia Neta */}
                <TableRow className="hover:bg-muted/20 bg-muted/30 font-semibold">
                  <TableCell className="font-bold text-foreground">Ganancia Neta del Dealer</TableCell>
                  <TableCell className="text-right font-semibold">S/ {Number(comp.realGanancia).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-bold text-primary text-sm">S/ {Number(comp.simGanancia).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-right font-bold text-sm ${comp.diffGanancia >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {comp.diffGanancia >= 0 ? `+ S/ ${comp.diffGanancia.toFixed(2)}` : `- S/ ${Math.abs(comp.diffGanancia).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    <Badge className={comp.diffGanancia >= 0 ? "bg-emerald-600 text-white font-bold" : "bg-rose-600 text-white font-bold"}>
                      {comp.diffGanancia >= 0 ? "Mayor Ganancia" : "Menor Ganancia"}
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Margen */}
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="font-semibold">Margen de Rentabilidad</TableCell>
                  <TableCell className="text-right font-medium">{Number(comp.realMargen).toFixed(2)}%</TableCell>
                  <TableCell className="text-right font-bold text-foreground">{Number(comp.simMargen).toFixed(2)}%</TableCell>
                  <TableCell className={`text-right font-bold ${comp.diffMargen >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {comp.diffMargen >= 0 ? `+${comp.diffMargen.toFixed(2)}%` : `${comp.diffMargen.toFixed(2)}%`}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    {comp.diffMargen >= 0 ? (
                      <span className="text-emerald-600 font-bold">Optimiza Margen</span>
                    ) : (
                      <span className="text-amber-600 font-bold">Dilución de Margen</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Guardar Simulación con Nombre */}
      <Dialog open={saveNameModalOpen} onOpenChange={setSaveNameModalOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" />
              Guardar Escenario de Simulación
            </DialogTitle>
            <DialogDescription>
              Asigne un nombre identificativo para consultar o comparar este escenario posteriormente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSimulation} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre del Escenario *</Label>
              <Input
                placeholder="Ej: Contratación 2 Full Time Q1, Expansión Lima Norte..."
                value={simNameInput}
                onChange={(e) => setSimNameInput(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs border">
              <div className="font-semibold text-foreground">Resumen del Escenario:</div>
              <div className="text-muted-foreground">• Altas Proyectadas: <b>{simResult?.total_altas || 0}</b></div>
              <div className="text-muted-foreground">• Ganancia Neta Estimada: <b>S/ {Number(simResult?.ganancia_neta || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</b></div>
              <div className="text-muted-foreground">• Margen de Rentabilidad: <b>{Number(simResult?.margen_rentabilidad || 0).toFixed(2)}%</b></div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setSaveNameModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingSim}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {savingSim ? "Guardando..." : "Guardar Simulación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Simulaciones Guardadas */}
      <Dialog open={savedModalOpen} onOpenChange={setSavedModalOpen}>
        <DialogContent className="sm:max-w-2xl max-w-2xl w-[95vw] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="size-5 text-primary" />
              Historial de Simulaciones Guardadas
            </DialogTitle>
            <DialogDescription>
              Seleccione un escenario guardado para cargarlo en el simulador o comparar rendimientos.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[380px] overflow-y-auto space-y-2 py-2">
            {savedSims.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No hay simulaciones guardadas aún. Configure un escenario y haga clic en "Guardar Escenario".
              </div>
            ) : (
              savedSims.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/60 rounded-xl border transition-all text-xs"
                >
                  <div>
                    <div className="font-bold text-foreground text-sm">{sim.nombre_escenario}</div>
                    <div className="text-muted-foreground mt-0.5">
                      {sim.total_altas} altas &bull; Ganancia: S/ {Number(sim.ganancia_neta).toLocaleString("es-PE", { minimumFractionDigits: 2 })} &bull; Margen: {sim.margen_rentabilidad}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadSavedSim(sim)}
                      className="text-xs h-8 gap-1.5 font-semibold text-primary"
                    >
                      Cargar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSavedSim(sim.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-3 border-t pt-3">
            <Button variant="outline" onClick={() => setSavedModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Agregar Puesto / Personal Simulado */}
      <Dialog open={addStaffModalOpen} onOpenChange={setAddStaffModalOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Agregar Puesto Simulado
            </DialogTitle>
            <DialogDescription>
              Incorpore un perfil o asesor hipotético al laboratorio para simular el impacto en ventas y planilla.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Perfil Comercial</Label>
              <select
                value={newStaffForm.perfil_id}
                onChange={(e) => {
                  const pid = Number(e.target.value);
                  const p = perfilesList.find((x) => x.id === pid);
                  setNewStaffForm({
                    ...newStaffForm,
                    perfil_id: pid,
                    tipo_personal: p ? p.nombre : newStaffForm.tipo_personal,
                    sueldo_base: p ? Number(p.sueldo_base) : newStaffForm.sueldo_base,
                    gastos_adicionales: p ? Number(p.gastos_adicionales_defecto) : newStaffForm.gastos_adicionales,
                  });
                }}
                className="w-full h-9 px-3 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {perfilesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Sueldo ref: S/ {Number(p.sueldo_base).toLocaleString("es-PE")})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cantidad de Personas</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newStaffForm.cantidad}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, cantidad: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meta Altas c/u</Label>
                <Input
                  type="number"
                  min="0"
                  max="200"
                  value={newStaffForm.altas_por_persona}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, altas_por_persona: Number(e.target.value) })}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sueldo Base c/u (S/)</Label>
                <Input
                  type="number"
                  step="50"
                  value={newStaffForm.sueldo_base}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, sueldo_base: Number(e.target.value) })}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gastos Adic. c/u (S/)</Label>
                <Input
                  type="number"
                  step="10"
                  value={newStaffForm.gastos_adicionales}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, gastos_adicionales: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3 border-t pt-3">
            <Button variant="outline" onClick={() => setAddStaffModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddStaffRow} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Agregar al Laboratorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
