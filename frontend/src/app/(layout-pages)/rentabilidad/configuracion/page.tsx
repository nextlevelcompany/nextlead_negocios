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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  TrendingUp,
  Calculator,
  Award,
  DollarSign,
  Users,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Layers,
  Sliders,
  Briefcase,
  FileCheck,
  Building2,
  Check,
} from "lucide-react";

interface EscalaItem {
  id?: number;
  perfil_id: number;
  rango_nombre: string;
  ventas_minimas: number;
  ventas_maximas: number;
  factor_comision: number;
  bono_fijo: number;
}

interface PerfilItem {
  id: number;
  nombre: string;
  sueldo_base: number;
  gastos_adicionales_defecto: number;
  descripcion?: string;
  activo: boolean;
  orden: number;
  escalas?: EscalaItem[];
}

interface DealerParamItem {
  id?: number;
  ventas_minimas: number;
  factor_dealer: number;
  bono_unitario: number;
}

export default function RentabilidadConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingDealer, setSavingDealer] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingEscalas, setSavingEscalas] = useState(false);
  const [activeTab, setActiveTab] = useState("dealer-global");

  // Global Config state
  const [configGlobal, setConfigGlobal] = useState<Record<string, string>>({
    arpu_promedio: "168.64",
    divisor_bonos: "4",
    bono_supervisor_matriz_15: "1500.00",
    bono_supervisor_matriz_20: "3000.00",
    gastos_fijos_oficina: "500.00",
  });

  // Dealer Parameters state
  const [dealerParams, setDealerParams] = useState<DealerParamItem[]>([]);

  // Perfiles & Escalas state
  const [perfiles, setPerfiles] = useState<PerfilItem[]>([]);
  const [selectedPerfilId, setSelectedPerfilId] = useState<number | null>(null);

  // New Profile Modal state
  const [newPerfilOpen, setNewPerfilOpen] = useState(false);
  const [newPerfilName, setNewPerfilName] = useState("");
  const [newPerfilSueldo, setNewPerfilSueldo] = useState<number>(0);
  const [newPerfilGastos, setNewPerfilGastos] = useState<number>(50);
  const [newPerfilDesc, setNewPerfilDesc] = useState("");

  // Load configuration from API
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/rentabilidad/config");
      const { configGlobal: cg, perfiles: pList, dealerParametros: dp } = res.data;

      if (cg) setConfigGlobal(cg);
      if (dp) setDealerParams(dp);
      if (pList) {
        setPerfiles(pList);
        if (pList.length > 0) {
          if (!selectedPerfilId || !pList.some((p: PerfilItem) => p.id === selectedPerfilId)) {
            setSelectedPerfilId(pList[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error("Error al cargar configuración:", err);
      toast.error("Error al cargar la configuración de rentabilidad y comisiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const selectedPerfil = useMemo(() => {
    return perfiles.find((p) => p.id === selectedPerfilId) || perfiles[0] || null;
  }, [perfiles, selectedPerfilId]);

  // Handle Global Config Save
  const handleSaveGlobalConfig = async () => {
    try {
      setSavingGlobal(true);
      await api.post("/api/rentabilidad/config/global", configGlobal);
      toast.success("Parámetros globales actualizados correctamente.");
    } catch (err: any) {
      console.error("Error al guardar configuración global:", err);
      toast.error(err.response?.data?.message || "Error al actualizar parámetros globales.");
    } finally {
      setSavingGlobal(false);
    }
  };

  // Handle Dealer Params Save
  const handleSaveDealerParams = async () => {
    try {
      setSavingDealer(true);
      // Validate
      const sorted = [...dealerParams].sort((a, b) => a.ventas_minimas - b.ventas_minimas);
      await api.post("/api/rentabilidad/dealer-parametros/save", sorted);
      toast.success("Escala comisional del Dealer actualizada correctamente.");
      fetchConfig();
    } catch (err: any) {
      console.error("Error al guardar parámetros del Dealer:", err);
      toast.error(err.response?.data?.message || "Error al guardar escala del Dealer.");
    } finally {
      setSavingDealer(false);
    }
  };

  const handleAddDealerParam = () => {
    const lastMin = dealerParams.length > 0 ? Math.max(...dealerParams.map((p) => p.ventas_minimas)) + 5 : 0;
    setDealerParams([
      ...dealerParams,
      {
        ventas_minimas: lastMin,
        factor_dealer: 4.0,
        bono_unitario: 1500,
      },
    ]);
  };

  const handleDeleteDealerParam = async (param: DealerParamItem, index: number) => {
    if (param.id) {
      if (!confirm("¿Está seguro de eliminar este nivel de comisiones del Dealer?")) return;
      try {
        await api.delete(`/api/rentabilidad/dealer-parametros/${param.id}`);
        toast.success("Nivel eliminado.");
        setDealerParams((prev) => prev.filter((p) => p.id !== param.id));
      } catch (err: any) {
        toast.error("Error al eliminar nivel: " + (err.response?.data?.message || err.message));
      }
    } else {
      setDealerParams((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handle Perfil Edit
  const handleUpdateSelectedPerfil = async () => {
    if (!selectedPerfil) return;
    try {
      setSavingPerfil(true);
      await api.post("/api/rentabilidad/perfiles/save", selectedPerfil);
      toast.success(`Perfil "${selectedPerfil.nombre}" actualizado.`);
      fetchConfig();
    } catch (err: any) {
      console.error("Error al actualizar perfil:", err);
      toast.error(err.response?.data?.message || "Error al actualizar perfil.");
    } finally {
      setSavingPerfil(false);
    }
  };

  const handleCreateNewPerfil = async () => {
    if (!newPerfilName.trim()) {
      toast.error("El nombre del perfil es obligatorio.");
      return;
    }
    try {
      const res = await api.post("/api/rentabilidad/perfiles/save", {
        nombre: newPerfilName.trim(),
        sueldo_base: newPerfilSueldo,
        gastos_adicionales_defecto: newPerfilGastos,
        descripcion: newPerfilDesc.trim(),
        activo: true,
        orden: perfiles.length + 1,
      });
      toast.success("Perfil creado exitosamente.");
      setNewPerfilOpen(false);
      setNewPerfilName("");
      setNewPerfilSueldo(0);
      setNewPerfilGastos(50);
      setNewPerfilDesc("");

      const newId = res.data?.id;
      await fetchConfig();
      if (newId) setSelectedPerfilId(newId);
    } catch (err: any) {
      console.error("Error al crear perfil:", err);
      toast.error(err.response?.data?.message || "Error al crear perfil.");
    }
  };

  const handleDeletePerfil = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el perfil "${nombre}" y todas sus escalas asociadas?`)) return;
    try {
      await api.delete(`/api/rentabilidad/perfiles/${id}`);
      toast.success(`Perfil "${nombre}" eliminado.`);
      fetchConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar perfil.");
    }
  };

  // Handle Escalas Save for Selected Profile
  const handleSaveEscalas = async () => {
    if (!selectedPerfil || !selectedPerfil.escalas) return;
    try {
      setSavingEscalas(true);
      const sorted = [...selectedPerfil.escalas].sort((a, b) => a.ventas_minimas - b.ventas_minimas);
      await api.post("/api/rentabilidad/escalas/save", sorted);
      toast.success(`Escalas comisionales de "${selectedPerfil.nombre}" guardadas.`);
      fetchConfig();
    } catch (err: any) {
      console.error("Error al guardar escalas:", err);
      toast.error(err.response?.data?.message || "Error al guardar escalas comisionales.");
    } finally {
      setSavingEscalas(false);
    }
  };

  const handleAddEscala = () => {
    if (!selectedPerfil) return;
    const currentEscalas = selectedPerfil.escalas || [];
    const lastMin = currentEscalas.length > 0 ? Math.max(...currentEscalas.map((e) => e.ventas_minimas)) + 5 : 1;
    const newEscala: EscalaItem = {
      perfil_id: selectedPerfil.id,
      rango_nombre: `${lastMin} a más`,
      ventas_minimas: lastMin,
      ventas_maximas: 9999,
      factor_comision: 1.0,
      bono_fijo: 100,
    };

    setPerfiles((prev) =>
      prev.map((p) => {
        if (p.id === selectedPerfil.id) {
          return {
            ...p,
            escalas: [...(p.escalas || []), newEscala],
          };
        }
        return p;
      })
    );
  };

  const handleDeleteEscala = async (escala: EscalaItem, index: number) => {
    if (escala.id) {
      if (!confirm("¿Está seguro de eliminar este tramo comisional?")) return;
      try {
        await api.delete(`/api/rentabilidad/escalas/${escala.id}`);
        toast.success("Tramo comisional eliminado.");
        setPerfiles((prev) =>
          prev.map((p) => {
            if (p.id === selectedPerfil?.id) {
              return {
                ...p,
                escalas: (p.escalas || []).filter((e) => e.id !== escala.id),
              };
            }
            return p;
          })
        );
      } catch (err: any) {
        toast.error("Error al eliminar tramo: " + (err.response?.data?.message || err.message));
      }
    } else {
      setPerfiles((prev) =>
        prev.map((p) => {
          if (p.id === selectedPerfil?.id) {
            return {
              ...p,
              escalas: (p.escalas || []).filter((_, i) => i !== index),
            };
          }
          return p;
        })
      );
    }
  };

  // Export Complete Configuration to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Global Config & Dealer
      const globalData = [
        ["PARÁMETROS GLOBALES DEL DEALER", ""],
        ["ARPU Promedio (Sin IGV)", Number(configGlobal.arpu_promedio || 168.64)],
        ["Divisor de Bonos (Altas por bono)", Number(configGlobal.divisor_bonos || 4)],
        ["Bono Supervisor Matriz (15 Altas)", Number(configGlobal.bono_supervisor_matriz_15 || 1500)],
        ["Bono Supervisor Matriz (20 Altas)", Number(configGlobal.bono_supervisor_matriz_20 || 3000)],
        ["Gastos Fijos de Oficina Mensuales", Number(configGlobal.gastos_fijos_oficina || 500)],
        [],
        ["ESCALA COMISIONAL DEL DEALER (PAGO MATRIZ ON NEGOCIOS)", "", ""],
        ["Ventas Mínimas", "Factor Dealer (Multiplicador)", "Valor Bono Unitario (S/)"],
        ...dealerParams.map((p) => [p.ventas_minimas, p.factor_dealer, p.bono_unitario]),
      ];
      const wsGlobal = XLSX.utils.aoa_to_sheet(globalData);
      XLSX.utils.book_append_sheet(wb, wsGlobal, "Parámetros Dealer");

      // Sheet 2: Perfiles y Escalas
      const perfilesData: any[] = [
        ["PERFILES Y ESCALAS COMISIONALES FUERZA DE VENTAS", "", "", "", "", "", ""],
        ["Perfil", "Sueldo Base", "Gastos Adic.", "Rango", "Ventas Mín", "Ventas Máx", "% Comisión", "Bono Fijo (S/)"],
      ];

      perfiles.forEach((p) => {
        if (p.escalas && p.escalas.length > 0) {
          p.escalas.forEach((e) => {
            perfilesData.push([
              p.nombre,
              p.sueldo_base,
              p.gastos_adicionales_defecto,
              e.rango_nombre,
              e.ventas_minimas,
              e.ventas_maximas || "a más",
              `${(e.factor_comision * 100).toFixed(0)}% (${e.factor_comision})`,
              e.bono_fijo,
            ]);
          });
        } else {
          perfilesData.push([p.nombre, p.sueldo_base, p.gastos_adicionales_defecto, "Sin escalas", 0, 0, "0%", 0]);
        }
      });
      const wsPerfiles = XLSX.utils.aoa_to_sheet(perfilesData);
      XLSX.utils.book_append_sheet(wb, wsPerfiles, "Escalas por Perfil");

      XLSX.writeFile(wb, `Configuracion_Rentabilidad_Dealer_ON_Negocios_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Archivo Excel exportado con éxito.");
    } catch (e: any) {
      console.error("Error al exportar:", e);
      toast.error("Error al generar el archivo Excel.");
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/rentabilidad/actual" className="hover:text-primary transition-colors">
              Rentabilidad y Comisiones
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Configuración de Escalas y Parámetros</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Configuración y Escalas Comisionales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración de factores matriz del Dealer ON Negocios, perfiles de personal y rangos comisionales (Ref. V10).
          </p>
        </div>

        {/* Quick navigation and action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/rentabilidad/actual">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Rentabilidad Actual</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/rentabilidad/simulador">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Simulador</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/rentabilidad/comisiones">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Liquidaciones & Pagos</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading} className="gap-1.5 shadow-xs">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Actualizar</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/70 p-1 rounded-xl w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="dealer-global" className="gap-2 text-xs sm:text-sm py-2 px-4">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>1. Parámetros Globales & Dealer ON</span>
          </TabsTrigger>
          <TabsTrigger value="perfiles-escalas" className="gap-2 text-xs sm:text-sm py-2 px-4">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>2. Perfiles y Escalas de Fuerza de Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="matriz-referencia" className="gap-2 text-xs sm:text-sm py-2 px-4">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>3. Matriz Consolidada & Reglas V10</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* TAB 1: PARÁMETROS GLOBALES & DEALER ON NEGOCIOS                */}
        {/* ============================================================== */}
        <TabsContent value="dealer-global" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Global parameters card */}
            <Card className="lg:col-span-5 shadow-sm border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    Parámetros Operativos Globales
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    Fórmulas Base
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Valores constantes de referencia económica utilizados en todos los cálculos del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">ARPU Promedio Sin IGV (S/)</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">Excel: =199/1.18</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">S/</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-8 text-sm font-semibold"
                      value={configGlobal.arpu_promedio || ""}
                      onChange={(e) =>
                        setConfigGlobal({ ...configGlobal, arpu_promedio: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ingreso promedio mensual por cliente generado a ON Negocios sin impuestos (base S/ 168.64).
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Divisor de Bonos Dealer (Altas por Bono)</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">Excel: =INT(Altas/4)</span>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="text-sm font-semibold"
                    value={configGlobal.divisor_bonos || ""}
                    onChange={(e) =>
                      setConfigGlobal({ ...configGlobal, divisor_bonos: e.target.value })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cada 4 altas totales de todo el equipo desbloquean 1 bono pagado por la matriz ON Negocios.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bono Supervisor Matriz (15 Altas)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">S/</span>
                      <Input
                        type="number"
                        step="100"
                        className="pl-8 text-sm font-semibold"
                        value={configGlobal.bono_supervisor_matriz_15 || ""}
                        onChange={(e) =>
                          setConfigGlobal({
                            ...configGlobal,
                            bono_supervisor_matriz_15: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bono Supervisor Matriz (20 Altas)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">S/</span>
                      <Input
                        type="number"
                        step="100"
                        className="pl-8 text-sm font-semibold"
                        value={configGlobal.bono_supervisor_matriz_20 || ""}
                        onChange={(e) =>
                          setConfigGlobal({
                            ...configGlobal,
                            bono_supervisor_matriz_20: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Incentivo pagado por ON Negocios al Dealer para la supervisión si el equipo totaliza ≥15 o ≥20 altas.
                </p>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Otros Gastos Fijos de Oficina Mensuales (S/)</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">Excel: 500.00</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">S/</span>
                    <Input
                      type="number"
                      step="50"
                      className="pl-8 text-sm font-semibold"
                      value={configGlobal.gastos_fijos_oficina || ""}
                      onChange={(e) =>
                        setConfigGlobal({ ...configGlobal, gastos_fijos_oficina: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Costos de alquiler, luz, internet, servicios administrativos fijos del local comercial.
                  </p>
                </div>

                <div className="pt-3">
                  <Button
                    onClick={handleSaveGlobalConfig}
                    disabled={savingGlobal}
                    className="w-full gap-2 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingGlobal ? "Guardando..." : "Guardar Parámetros Globales"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dealer Scale Card */}
            <Card className="lg:col-span-7 shadow-sm border">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      Escala Comisional Matriz Dealer (ON Negocios)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Factores de comisión y bonos unitarios otorgados al Dealer según las altas totales consolidadas.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleAddDealerParam} className="gap-1.5 shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Nivel</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[140px] text-xs font-semibold">Ventas Mínimas</TableHead>
                        <TableHead className="text-xs font-semibold">Factor Dealer (Multiplicador)</TableHead>
                        <TableHead className="text-xs font-semibold">Valor Bono Unitario (S/)</TableHead>
                        <TableHead className="w-[80px] text-right text-xs font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dealerParams.map((dp, idx) => (
                        <TableRow key={dp.id || `dp-temp-${idx}`} className="hover:bg-muted/20">
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              className="h-8 text-xs font-semibold max-w-[100px]"
                              value={dp.ventas_minimas}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setDealerParams((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, ventas_minimas: val } : item))
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                className="h-8 text-xs font-semibold max-w-[100px]"
                                value={dp.factor_dealer}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setDealerParams((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, factor_dealer: val } : item))
                                  );
                                }}
                              />
                              <span className="text-xs text-muted-foreground font-mono">
                                ({dp.factor_dealer}x ARPU)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="relative max-w-[140px]">
                              <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">S/</span>
                              <Input
                                type="number"
                                step="50"
                                min="0"
                                className="pl-7 h-8 text-xs font-semibold"
                                value={dp.bono_unitario}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setDealerParams((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, bono_unitario: val } : item))
                                  );
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDealerParam(dp, idx)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar tramo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dealerParams.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                            No hay parámetros registrados. Haga clic en &quot;Agregar Nivel&quot; para definir la escala.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-4 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Fórmula Dealer: (Altas x Factor x ARPU) + (INT(Altas/4) x Bono Unitario)</span>
                  </div>
                  <Button
                    onClick={handleSaveDealerParams}
                    disabled={savingDealer}
                    className="w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-700 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDealer ? "Guardando..." : "Guardar Escala Dealer"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: PERFILES Y ESCALAS DE FUERZA DE VENTAS                  */}
        {/* ============================================================== */}
        <TabsContent value="perfiles-escalas" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Profiles List and Active Profile Details */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="shadow-sm border">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Perfiles de Venta
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPerfilOpen(true)}
                      className="gap-1 text-xs h-7 px-2"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nuevo</span>
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Seleccione un rol para editar sus condiciones y escala comisional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {perfiles.map((p) => {
                    const isSelected = p.id === selectedPerfilId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPerfilId(p.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 shadow-xs ring-1 ring-indigo-400/30"
                            : "hover:bg-muted/40 border-border"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{p.nombre}</span>
                            {!p.activo && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>Sueldo: S/ {Number(p.sueldo_base).toFixed(2)}</span>
                            <span>Gastos: S/ {Number(p.gastos_adicionales_defecto).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-mono bg-background"
                          >
                            {(p.escalas || []).length} tramos
                          </Badge>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Edit Selected Profile Details */}
              {selectedPerfil && (
                <Card className="shadow-sm border">
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Condiciones de: {selectedPerfil.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nombre del Perfil</Label>
                      <Input
                        className="h-8 text-xs font-semibold"
                        value={selectedPerfil.nombre}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPerfiles((prev) =>
                            prev.map((p) => (p.id === selectedPerfil.id ? { ...p, nombre: val } : p))
                          );
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Sueldo Base (S/)</Label>
                        <Input
                          type="number"
                          step="50"
                          min="0"
                          className="h-8 text-xs font-semibold"
                          value={selectedPerfil.sueldo_base}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPerfiles((prev) =>
                              prev.map((p) => (p.id === selectedPerfil.id ? { ...p, sueldo_base: val } : p))
                            );
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Gastos Adic. (S/)</Label>
                        <Input
                          type="number"
                          step="10"
                          min="0"
                          className="h-8 text-xs font-semibold"
                          value={selectedPerfil.gastos_adicionales_defecto}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPerfiles((prev) =>
                              prev.map((p) =>
                                p.id === selectedPerfil.id ? { ...p, gastos_adicionales_defecto: val } : p
                              )
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Descripción / Alcance</Label>
                      <Input
                        className="h-8 text-xs"
                        value={selectedPerfil.descripcion || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPerfiles((prev) =>
                            prev.map((p) => (p.id === selectedPerfil.id ? { ...p, descripcion: val } : p))
                          );
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedPerfil.activo}
                          onCheckedChange={(checked) => {
                            setPerfiles((prev) =>
                              prev.map((p) => (p.id === selectedPerfil.id ? { ...p, activo: checked } : p))
                            );
                          }}
                        />
                        <span className="text-xs font-medium">Perfil Activo</span>
                      </div>

                      {perfiles.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePerfil(selectedPerfil.id, selectedPerfil.nombre)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Eliminar Rol</span>
                        </Button>
                      )}
                    </div>

                    <Button
                      onClick={handleUpdateSelectedPerfil}
                      disabled={savingPerfil}
                      className="w-full gap-2 shadow-xs mt-2"
                      size="sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingPerfil ? "Guardando..." : "Guardar Condiciones"}</span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Escalas comisionales for the selected profile */}
            <div className="lg:col-span-8">
              {selectedPerfil ? (
                <Card className="shadow-sm border">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-indigo-600" />
                          Escala Comisional: {selectedPerfil.nombre}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Rangos de ventas individuales, % de comisión sobre el ARPU y bonos fijos por tramo alcanzado.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddEscala}
                          className="gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar Tramo</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 sm:p-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="w-[150px] text-xs font-semibold">Nombre del Rango</TableHead>
                            <TableHead className="w-[110px] text-xs font-semibold">Ventas Mín.</TableHead>
                            <TableHead className="w-[110px] text-xs font-semibold">Ventas Máx.</TableHead>
                            <TableHead className="text-xs font-semibold">% Comisión (Factor)</TableHead>
                            <TableHead className="text-xs font-semibold">Bono Fijo (S/)</TableHead>
                            <TableHead className="w-[70px] text-right text-xs font-semibold">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedPerfil.escalas || []).map((esc, idx) => (
                            <TableRow key={esc.id || `esc-temp-${idx}`} className="hover:bg-muted/20">
                              <TableCell>
                                <Input
                                  className="h-8 text-xs font-semibold"
                                  value={esc.rango_nombre}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPerfiles((prev) =>
                                      prev.map((p) => {
                                        if (p.id === selectedPerfil.id) {
                                          return {
                                            ...p,
                                            escalas: (p.escalas || []).map((item, i) =>
                                              i === idx ? { ...item, rango_nombre: val } : item
                                            ),
                                          };
                                        }
                                        return p;
                                      })
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-8 text-xs font-semibold"
                                  value={esc.ventas_minimas}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setPerfiles((prev) =>
                                      prev.map((p) => {
                                        if (p.id === selectedPerfil.id) {
                                          return {
                                            ...p,
                                            escalas: (p.escalas || []).map((item, i) =>
                                              i === idx ? { ...item, ventas_minimas: val } : item
                                            ),
                                          };
                                        }
                                        return p;
                                      })
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="9999"
                                  className="h-8 text-xs font-semibold"
                                  value={esc.ventas_maximas >= 9999 ? "" : esc.ventas_maximas}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 9999 : parseInt(e.target.value) || 0;
                                    setPerfiles((prev) =>
                                      prev.map((p) => {
                                        if (p.id === selectedPerfil.id) {
                                          return {
                                            ...p,
                                            escalas: (p.escalas || []).map((item, i) =>
                                              i === idx ? { ...item, ventas_maximas: val } : item
                                            ),
                                          };
                                        }
                                        return p;
                                      })
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    className="h-8 text-xs font-semibold max-w-[90px]"
                                    value={esc.factor_comision}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setPerfiles((prev) =>
                                        prev.map((p) => {
                                          if (p.id === selectedPerfil.id) {
                                            return {
                                              ...p,
                                              escalas: (p.escalas || []).map((item, i) =>
                                                i === idx ? { ...item, factor_comision: val } : item
                                              ),
                                            };
                                          }
                                          return p;
                                        })
                                      );
                                    }}
                                  />
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {(esc.factor_comision * 100).toFixed(0)}%
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="relative max-w-[120px]">
                                  <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">S/</span>
                                  <Input
                                    type="number"
                                    step="50"
                                    min="0"
                                    className="pl-7 h-8 text-xs font-semibold"
                                    value={esc.bono_fijo}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setPerfiles((prev) =>
                                        prev.map((p) => {
                                          if (p.id === selectedPerfil.id) {
                                            return {
                                              ...p,
                                              escalas: (p.escalas || []).map((item, i) =>
                                                i === idx ? { ...item, bono_fijo: val } : item
                                              ),
                                            };
                                          }
                                          return p;
                                        })
                                      );
                                    }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEscala(esc, idx)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Eliminar tramo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!selectedPerfil.escalas || selectedPerfil.escalas.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                                No hay tramos comisionales configurados para este perfil.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="p-4 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Comisión = Altas x ARPU x Factor + Bono Fijo del tramo alcanzado.</span>
                      </div>
                      <Button
                        onClick={handleSaveEscalas}
                        disabled={savingEscalas}
                        className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingEscalas ? "Guardando..." : "Guardar Escalas del Perfil"}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-12 text-center border rounded-xl bg-muted/10 text-muted-foreground">
                  Seleccione un perfil de la lista izquierda para editar sus escalas.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: MATRIZ CONSOLIDADA & REGLAS V10                         */}
        {/* ============================================================== */}
        <TabsContent value="matriz-referencia" className="mt-4 space-y-6">
          {/* Consolidated comparison table identical to Excel V10 */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Matriz Comparativa de Comisiones y Bonos por Rango (Excel V10)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparativa visual lado a lado de todos los perfiles de venta en cada escalón de metas comerciales.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                  ARPU: S/ {Number(configGlobal.arpu_promedio || 168.64).toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-xs">
                      <TableHead rowSpan={2} className="font-bold border-r">Rango de Ventas</TableHead>
                      <TableHead rowSpan={2} className="font-bold border-r text-center">Ventas Mínimas</TableHead>
                      {perfiles.map((p) => (
                        <TableHead
                          key={`th-${p.id}`}
                          colSpan={2}
                          className="font-bold text-center border-r bg-muted/40"
                        >
                          ROL: {p.nombre.toUpperCase()}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="bg-muted/30 text-[11px]">
                      {perfiles.map((p) => (
                        <React.Fragment key={`subth-${p.id}`}>
                          <TableHead className="text-center font-semibold text-muted-foreground">
                            % Comis.
                          </TableHead>
                          <TableHead className="text-center font-semibold text-muted-foreground border-r">
                            Bono (S/)
                          </TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {/* Display standard ranges */}
                    {[
                      { nombre: "0 Ventas", min: 0 },
                      { nombre: "1 - 5 Ventas", min: 1 },
                      { nombre: "6 - 10 Ventas", min: 6 },
                      { nombre: "11 - 15 Ventas", min: 11 },
                      { nombre: "16 - 20 Ventas", min: 16 },
                      { nombre: "21 a más", min: 21 },
                    ].map((bracket, bIdx) => (
                      <TableRow key={`bracket-${bIdx}`} className="hover:bg-muted/20">
                        <TableCell className="font-semibold border-r">{bracket.nombre}</TableCell>
                        <TableCell className="text-center font-mono border-r font-medium">
                          {bracket.min}
                        </TableCell>
                        {perfiles.map((p) => {
                          const scale = (p.escalas || [])
                            .filter((e) => e.ventas_minimas <= bracket.min)
                            .sort((a, b) => b.ventas_minimas - a.ventas_minimas)[0];

                          const factor = scale ? scale.factor_comision : 0;
                          const bono = scale ? scale.bono_fijo : 0;

                          return (
                            <React.Fragment key={`val-${p.id}-${bIdx}`}>
                              <TableCell className="text-center font-mono">
                                {factor > 0 ? (
                                  <span className="font-semibold text-foreground">
                                    {(factor * 100).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0%</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono border-r">
                                {bono > 0 ? (
                                  <span className="font-semibold text-emerald-600">
                                    S/ {bono.toFixed(0)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">S/ 0</span>
                                )}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mathematical Rules and Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-xs border">
              <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Award className="w-4 h-4" />
                  1. Ingresos Dealer (Matriz ON)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 text-muted-foreground">
                <p>
                  El Dealer percibe 3 componentes financieros directamente de la matriz ON Negocios:
                </p>
                <div className="p-2.5 rounded-md bg-muted/40 font-mono text-[11px] space-y-1 text-foreground">
                  <div>• <strong>Comisión Base:</strong> Altas Totales x Factor Dealer x ARPU.</div>
                  <div>• <strong>Bonos Desbloqueados:</strong> INT(Altas / 4) x Valor Bono Unitario.</div>
                  <div>• <strong>Bono Supervisor Matriz:</strong> S/ 1,500 (≥15) o S/ 3,000 (≥20 altas).</div>
                </div>
                <p>
                  <strong>Ingresos Brutos =</strong> Comisión Base + Bonos Desbloqueados + Bono Matriz.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border">
              <CardHeader className="pb-3 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <Users className="w-4 h-4" />
                  2. Egresos de Planilla y Fuerza de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 text-muted-foreground">
                <p>
                  Cada perfil tiene condiciones específicas acordes a su tipo de contratación:
                </p>
                <div className="p-2.5 rounded-md bg-muted/40 font-mono text-[11px] space-y-1 text-foreground">
                  <div>• <strong>Full / Part-Time:</strong> Sueldo Base + Comisión + Bono + Gastos.</div>
                  <div>• <strong>Freelance:</strong> 100% variable (Comisión + Bono Fijo de su tramo).</div>
                  <div>• <strong>Supervisor:</strong> Comisiona sobre las <em>altas consolidadas</em> del equipo.</div>
                </div>
                <p>
                  <strong>Total Planilla =</strong> Sumatoria de pagos a todo el personal.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border">
              <CardHeader className="pb-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  3. Ganancia Neta y Margen Comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 text-muted-foreground">
                <p>
                  El resultado del negocio consolida todos los flujos reales de ingresos y costos:
                </p>
                <div className="p-2.5 rounded-md bg-muted/40 font-mono text-[11px] space-y-1 text-foreground">
                  <div>• <strong>Egresos Totales:</strong> Planilla + Gastos Personal + Gastos Fijos.</div>
                  <div>• <strong>Ganancia Neta:</strong> Ingresos Dealer - Egresos Totales.</div>
                  <div>• <strong>Margen (%):</strong> (Ganancia Neta / Ingresos Totales) x 100.</div>
                </div>
                <p>
                  Permite evaluar rápidamente el ROI antes de sumar nuevos vendedores a la estructura.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: New Perfil Dialog */}
      <Dialog open={newPerfilOpen} onOpenChange={setNewPerfilOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Crear Nuevo Perfil de Personal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina un nuevo rol comercial para asignar personal y personalizar sus escalas comisionales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre del Perfil *</Label>
              <Input
                placeholder="Ej: Senior B2B, Ejecutivo Corporativo"
                value={newPerfilName}
                onChange={(e) => setNewPerfilName(e.target.value)}
                className="text-sm font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sueldo Base (S/)</Label>
                <Input
                  type="number"
                  step="50"
                  min="0"
                  value={newPerfilSueldo}
                  onChange={(e) => setNewPerfilSueldo(parseFloat(e.target.value) || 0)}
                  className="text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gastos Adicionales (S/)</Label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  value={newPerfilGastos}
                  onChange={(e) => setNewPerfilGastos(parseFloat(e.target.value) || 0)}
                  className="text-sm font-semibold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descripción</Label>
              <Input
                placeholder="Responsabilidades y enfoque comercial"
                value={newPerfilDesc}
                onChange={(e) => setNewPerfilDesc(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setNewPerfilOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateNewPerfil} className="bg-indigo-600 hover:bg-indigo-700">
              Crear Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
