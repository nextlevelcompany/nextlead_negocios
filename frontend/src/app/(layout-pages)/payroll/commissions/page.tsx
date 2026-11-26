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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Users,
  RefreshCw,
  Search,
  Filter,
  Download,
  DollarSign,
  Calendar,
  Award,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Building2,
  Sliders,
  FileSpreadsheet,
  Info,
  PlusCircle,
  Receipt,
  AlertTriangle,
  MinusCircle,
  Eye,
  Trash2,
  CheckCircle2,
  Percent,
  FileText,
  Clock,
  Printer,
} from "lucide-react";

export default function PayrollCommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRol, setFilterRol] = useState("all");

  const now = new Date();
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(now.getFullYear());

  // Modal de Registro de Descuento
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    trabajador_id: "",
    tipo: "Tardanza",
    monto: "",
    motivo: "",
    fecha: new Date().toISOString().split("T")[0],
  });

  // Modal de Detalle / Boleta de Liquidación
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Modal de Historial de Descuentos del Período
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyDiscounts, setHistoryDiscounts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/payroll/commissions?mes=${selectedMes}&anio=${selectedAnio}`);
      setData(res.data);
    } catch (err: any) {
      console.error("Error al cargar comisiones de personal:", err);
      toast.error("Error al cargar comisiones del personal.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryDiscounts = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get(`/api/payroll/discounts?mes=${selectedMes}&anio=${selectedAnio}`);
      setHistoryDiscounts(res.data || []);
    } catch (err: any) {
      console.error("Error al cargar descuentos:", err);
      toast.error("Error al obtener historial de descuentos.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [selectedMes, selectedAnio]);

  const kpis = data?.indicadores || {
    total_colaboradores: 0,
    total_altas_equipo: 0,
    total_sueldos_base: 0,
    total_comisiones: 0,
    total_bonos: 0,
    total_descuentos: 0,
    total_a_pagar: 0,
  };

  const arpu = data?.arpu || 168.64;
  const list: any[] = data?.detalles || [];

  // Lista única de roles operativos para el filtro
  const rolesDisponibles = useMemo(() => {
    const setRoles = new Set<string>();
    list.forEach((item) => {
      if (item.rol_operativo) setRoles.add(item.rol_operativo);
      if (item.perfil_nombre) setRoles.add(item.perfil_nombre);
    });
    return Array.from(setRoles);
  }, [list]);

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const full = `${item.nombre_completo} ${item.dni || ""} ${item.rol_operativo || ""} ${item.perfil_nombre || ""}`.toLowerCase();
      const matchSearch = full.includes(searchTerm.toLowerCase());
      const matchRol =
        filterRol === "all" ||
        (item.rol_operativo && item.rol_operativo.toLowerCase() === filterRol.toLowerCase()) ||
        (item.perfil_nombre && item.perfil_nombre.toLowerCase() === filterRol.toLowerCase());

      return matchSearch && matchRol;
    });
  }, [list, searchTerm, filterRol]);

  // Manejo de Registro de Descuento
  const handleOpenDiscountModal = (trabajadorId?: string | number) => {
    setDiscountForm({
      trabajador_id: trabajadorId ? String(trabajadorId) : (list.length > 0 ? String(list[0].id) : ""),
      tipo: "Tardanza",
      monto: "",
      motivo: "",
      fecha: new Date().toISOString().split("T")[0],
    });
    setIsDiscountModalOpen(true);
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.trabajador_id) {
      toast.error("Seleccione un colaborador.");
      return;
    }
    const montoNum = parseFloat(discountForm.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("Ingrese un monto válido mayor a 0.");
      return;
    }
    if (!discountForm.motivo.trim()) {
      toast.error("Ingrese el motivo o justificación del descuento.");
      return;
    }

    try {
      setIsSavingDiscount(true);
      await api.post("/api/payroll/discounts", {
        trabajador_id: Number(discountForm.trabajador_id),
        mes: selectedMes,
        anio: selectedAnio,
        fecha: discountForm.fecha,
        tipo: discountForm.tipo,
        monto: montoNum,
        motivo: discountForm.motivo.trim(),
        estado: "Pendiente",
      });

      toast.success("Descuento registrado correctamente.");
      setIsDiscountModalOpen(false);
      fetchCommissions();
    } catch (err: any) {
      console.error("Error al registrar descuento:", err);
      toast.error(err.response?.data?.message || "Error al registrar descuento.");
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleDeleteDiscount = async (discountId: number) => {
    if (!confirm("¿Está seguro de eliminar o anular este descuento?")) return;
    try {
      await api.delete(`/api/payroll/discounts/${discountId}`);
      toast.success("Descuento eliminado con éxito.");
      fetchCommissions();
      if (isHistoryModalOpen) {
        fetchHistoryDiscounts();
      }
      if (selectedWorkerDetails) {
        // Actualizar descuentos del colaborador seleccionado
        const updatedDetalles = selectedWorkerDetails.descuentos_detalle.filter((d: any) => d.id !== discountId);
        const newTotalDesc = updatedDetalles.reduce((acc: number, cur: any) => acc + (Number(cur.monto) || 0), 0);
        const newTotalPagar = Math.max(0, (selectedWorkerDetails.sueldo_base + selectedWorkerDetails.comision_monto + selectedWorkerDetails.bono_individual) - newTotalDesc);
        setSelectedWorkerDetails({
          ...selectedWorkerDetails,
          total_descuentos: newTotalDesc,
          descuentos_detalle: updatedDetalles,
          total_a_pagar: newTotalPagar,
        });
      }
    } catch (err: any) {
      console.error("Error al eliminar descuento:", err);
      toast.error("Error al eliminar descuento.");
    }
  };

  const handleOpenDetails = (worker: any) => {
    setSelectedWorkerDetails(worker);
    setIsDetailsModalOpen(true);
  };

  const handleOpenHistory = () => {
    fetchHistoryDiscounts();
    setIsHistoryModalOpen(true);
  };

  const handleExportExcel = () => {
    if (list.length === 0) {
      toast.error("No hay registros para exportar.");
      return;
    }
    try {
      const rows = filteredList.map((item) => ({
        Colaborador: item.nombre_completo,
        DNI: item.dni || "",
        "Rol Operativo": item.rol_operativo || "",
        "Perfil Comisional": item.perfil_nombre || item.rol_operativo || "",
        "Altas / Métricas": item.altas,
        "Factor Comis. (%)": item.factor_comision ? `${(item.factor_comision * 100).toFixed(0)}%` : "-",
        "Rango de Metas": item.rango_nombre || "",
        "Sueldo Base (S/)": item.sueldo_base,
        "Comisión Generada (S/)": item.comision_monto,
        "Bono Fijo (S/)": item.bono_individual,
        "Total Descuentos (S/)": item.total_descuentos || 0,
        "Total Neto a Pagar (S/)": item.total_a_pagar,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Comisiones_y_Descuentos");
      XLSX.writeFile(wb, `Liquidacion_Comisiones_${mesesNombres[selectedMes - 1]}_${selectedAnio}.xlsx`);
      toast.success("Archivo Excel exportado con éxito.");
    } catch (e: any) {
      console.error("Error al exportar:", e);
      toast.error("Error al exportar a Excel.");
    }
  };

  const getRoleBadge = (rol: string, perfil?: string) => {
    const text = rol || perfil || "General";
    const lower = text.toLowerCase();
    if (lower.includes("supervisor")) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-semibold">
          {text}
        </Badge>
      );
    }
    if (lower.includes("asesor") || lower.includes("vendedor") || lower.includes("comercial") || lower.includes("full time")) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium">
          {text}
        </Badge>
      );
    }
    if (lower.includes("repartidor") || lower.includes("conductor") || lower.includes("chofer")) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium">
          {text}
        </Badge>
      );
    }
    if (lower.includes("freelance")) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
          {text}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-medium">
        {text}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/payroll/staff" className="hover:text-primary transition-colors">
              Personal
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Comisiones y Liquidación por Rol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="size-7 text-emerald-600" />
            Comisiones y Liquidación de Personal
          </h1>
          <p className="text-sm text-muted-foreground">
            Cálculo integral por Rol: <span className="font-semibold text-foreground">Sueldo Básico + Comisiones + Bonos - Descuentos Registrados = Neto a Pagar</span>.
          </p>
        </div>

        {/* Action Controls */}
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

          <Button
            variant="default"
            size="sm"
            onClick={() => handleOpenDiscountModal()}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <MinusCircle className="size-4" />
            <span>Registrar Descuento</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleOpenHistory} className="gap-1.5 shadow-xs">
            <FileText className="size-4 text-slate-600" />
            <span>Ver Descuentos</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchCommissions} disabled={loading} className="gap-1.5 shadow-xs">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-emerald-700 hover:text-emerald-800 shadow-xs"
          >
            <Download className="size-4" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Formula Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Personal Activo</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{kpis.total_colaboradores}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Colaboradores evaluados</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Sueldos Básicos</CardTitle>
            <DollarSign className="size-4 text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-slate-800">
              S/ {Number(kpis.total_sueldos_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sueldo fijo contractual</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">(+) Comisiones</CardTitle>
            <TrendingUp className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-indigo-600">
              S/ {Number(kpis.total_comisiones || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{kpis.total_altas_equipo} altas / entregas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">(+) Bonos de Metas</CardTitle>
            <Award className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-amber-600">
              S/ {Number(kpis.total_bonos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Premios fijos por escala</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border border-rose-200 bg-rose-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-rose-700">(-) Descuentos</CardTitle>
            <MinusCircle className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-rose-600">
              - S/ {Number(kpis.total_descuentos || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-rose-500 mt-0.5">Tardanzas, adelantos y faltas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border border-emerald-200 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-800">(=) Total Neto a Pagar</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-emerald-700">
              S/ {Number(kpis.total_a_pagar || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Desembolso final neto</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por colaborador o DNI..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <label className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <Filter className="size-3.5" /> Filtrar por Rol:
              </label>
              <select
                value={filterRol}
                onChange={(e) => setFilterRol(e.target.value)}
                className="h-9 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer shadow-2xs"
              >
                <option value="all">Todos los Roles ({list.length})</option>
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="font-semibold">Colaborador</TableHead>
                  <TableHead className="font-semibold">Rol Operativo</TableHead>
                  <TableHead className="text-center font-semibold">Altas / Entregas</TableHead>
                  <TableHead className="text-center font-semibold">Factor / Rango</TableHead>
                  <TableHead className="text-right font-semibold">Sueldo Básico (S/)</TableHead>
                  <TableHead className="text-right font-semibold">(+) Comisión (S/)</TableHead>
                  <TableHead className="text-right font-semibold">(+) Bono (S/)</TableHead>
                  <TableHead className="text-right font-semibold">(-) Descuentos (S/)</TableHead>
                  <TableHead className="text-right font-semibold">(=) Neto a Pagar (S/)</TableHead>
                  <TableHead className="text-center font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredList.map((item, idx) => {
                  const factorPct = item.factor_comision ? (Number(item.factor_comision) * 100).toFixed(0) : "0";
                  const isSupervisor = (item.rol_operativo || "").toLowerCase().includes("supervisor");
                  const hasDiscounts = Number(item.total_descuentos || 0) > 0;

                  return (
                    <TableRow key={item.id || idx} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{item.nombre_completo}</span>
                          <span className="text-[11px] text-muted-foreground font-mono font-normal">
                            DNI: {item.dni || "-"} {item.telefono ? `· Tel: ${item.telefono}` : ""}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getRoleBadge(item.rol_operativo, item.perfil_nombre)}
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <Badge variant="secondary" className="font-bold text-xs">
                          {item.altas} {isSupervisor ? "(Equipo)" : ""}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-mono font-medium text-[11px]">
                        <div>
                          <span>{item.rango_nombre || "Sin Escala"}</span>
                          {item.factor_comision > 0 && (
                            <span className="text-muted-foreground block text-[10px]">
                              Factor: {factorPct}% ({item.factor_comision})
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-muted-foreground">
                        S/ {Number(item.sueldo_base || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-indigo-600">
                        S/ {Number(item.comision_monto || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-amber-600">
                        S/ {Number(item.bono_individual || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        {hasDiscounts ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item)}
                            className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                            title="Ver detalle de descuentos aplicados"
                          >
                            <MinusCircle className="size-3" />
                            <span>- S/ {Number(item.total_descuentos || 0).toFixed(2)}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground/60">S/ 0.00</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-sm text-foreground bg-muted/10">
                        S/ {Number(item.total_a_pagar || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDiscountModal(item.id)}
                            className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 text-[11px]"
                            title="Registrar Descuento a este colaborador"
                          >
                            <MinusCircle className="size-3.5" />
                            <span>Dscto</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetails(item)}
                            className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 text-[11px]"
                            title="Ver desglose y boleta de liquidación"
                          >
                            <Eye className="size-3.5" />
                            <span>Detalle</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-xs">
                      No se encontraron colaboradores para este período con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Explanatory Info Card */}
      <Card className="shadow-xs border bg-muted/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                Regla Contable: Sueldo Neto = Sueldo Básico + Comisiones (Altas x ARPU S/ {Number(arpu).toFixed(2)} x Factor) + Bonos por Tramo - Descuentos Registrados
              </p>
              <p>
                Los descuentos son auditables y se aplican por mes y año a cada colaborador según su rol operativo (tardanzas, faltas, adelantos de sueldo, préstamos o penalidades).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
              <Link href="/rentabilidad/configuracion">
                <Sliders className="size-3.5 text-primary" />
                <span>Configurar Escalas</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
              <Link href="/payroll/staff">
                <Users className="size-3.5 text-blue-600" />
                <span>Gestionar Personal</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: REGISTRAR DESCUENTO */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <MinusCircle className="size-5" />
              Registrar Descuento al Personal
            </DialogTitle>
            <DialogDescription>
              Ingrese la deducción aplicable para el período {mesesNombres[selectedMes - 1]} {selectedAnio}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDiscount} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Colaborador *
              </label>
              <select
                value={discountForm.trabajador_id}
                onChange={(e) => setDiscountForm({ ...discountForm, trabajador_id: e.target.value })}
                required
                className="w-full text-xs bg-card border rounded-md p-2 font-medium"
              >
                <option value="">-- Seleccione Colaborador --</option>
                {list.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre_completo} ({w.rol_operativo || "Personal"}) - DNI: {w.dni || "-"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Tipo de Descuento *
                </label>
                <select
                  value={discountForm.tipo}
                  onChange={(e) => setDiscountForm({ ...discountForm, tipo: e.target.value })}
                  className="w-full text-xs bg-card border rounded-md p-2 font-medium"
                >
                  <option value="Tardanza">Tardanza</option>
                  <option value="Falta">Falta Injustificada</option>
                  <option value="Adelanto">Adelanto de Sueldo</option>
                  <option value="Penalidad Comercial">Penalidad Comercial</option>
                  <option value="Préstamo">Préstamo de Personal</option>
                  <option value="Mermas / Pérdida">Mermas / Pérdida de Equipo</option>
                  <option value="Descuento Administrativo">Descuento Administrativo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Monto a Descontar (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">S/</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={discountForm.monto}
                    onChange={(e) => setDiscountForm({ ...discountForm, monto: e.target.value })}
                    className="pl-8 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Fecha del Incidente o Registro
              </label>
              <Input
                type="date"
                value={discountForm.fecha}
                onChange={(e) => setDiscountForm({ ...discountForm, fecha: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Motivo / Justificación *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Indique el motivo, fecha o justificación formal del descuento..."
                value={discountForm.motivo}
                onChange={(e) => setDiscountForm({ ...discountForm, motivo: e.target.value })}
                className="w-full text-xs bg-card border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDiscountModalOpen(false)}
                disabled={isSavingDiscount}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingDiscount}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-1"
              >
                {isSavingDiscount ? <RefreshCw className="size-4 animate-spin" /> : <MinusCircle className="size-4" />}
                <span>Guardar Descuento</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: BOLETA / DESGLOSE DE LIQUIDACIÓN INDIVIDUAL */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedWorkerDetails && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-5 text-primary" />
                    <span>Boleta de Liquidación y Comisiones</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-medium">
                    {mesesNombres[selectedMes - 1]} {selectedAnio}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Desglose financiero del colaborador {selectedWorkerDetails.nombre_completo}
                </DialogDescription>
              </DialogHeader>

              {/* Worker Header Info */}
              <div className="bg-muted/30 p-3 rounded-lg my-3 border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Colaborador</span>
                  <span className="font-semibold text-foreground">{selectedWorkerDetails.nombre_completo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Documento / DNI</span>
                  <span className="font-mono">{selectedWorkerDetails.dni || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Rol Operativo</span>
                  <div>{getRoleBadge(selectedWorkerDetails.rol_operativo, selectedWorkerDetails.perfil_nombre)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Altas Logradas</span>
                  <span className="font-bold font-mono text-emerald-600">{selectedWorkerDetails.altas} ventas</span>
                </div>
              </div>

              {/* Breakdown Formula Table */}
              <div className="space-y-4 my-2">
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 font-semibold text-xs border-b">
                    Conceptos de Remuneración y Comisiones (+)
                  </div>
                  <Table className="text-xs">
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Sueldo Básico Contractual</TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">Salario base fijado</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          S/ {Number(selectedWorkerDetails.sueldo_base || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Comisión por Ventas / Entregas</TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {selectedWorkerDetails.altas} x ARPU S/ {Number(selectedWorkerDetails.arpu || 168.64).toFixed(2)} x Factor {selectedWorkerDetails.factor_comision || 0}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-indigo-600">
                          + S/ {Number(selectedWorkerDetails.comision_monto || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {Number(selectedWorkerDetails.bono_individual || 0) > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">Bono Fijo por Rango</TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            Rango: {selectedWorkerDetails.rango_nombre}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-amber-600">
                            + S/ {Number(selectedWorkerDetails.bono_individual || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/20 font-semibold">
                        <TableCell colSpan={2}>Total Ingresos Brutos</TableCell>
                        <TableCell className="text-right font-mono">
                          S/ {(Number(selectedWorkerDetails.sueldo_base || 0) + Number(selectedWorkerDetails.comision_monto || 0) + Number(selectedWorkerDetails.bono_individual || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Deductions Section */}
                <div className="border rounded-md overflow-hidden border-rose-200">
                  <div className="bg-rose-50 px-3 py-2 font-semibold text-xs text-rose-800 border-b border-rose-200 flex items-center justify-between">
                    <span>Descuentos y Deducciones (-)</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleOpenDiscountModal(selectedWorkerDetails.id);
                      }}
                      className="h-6 text-[10px] text-rose-700 hover:text-rose-900 gap-1 p-1"
                    >
                      <PlusCircle className="size-3" />
                      <span>Agregar Descuento</span>
                    </Button>
                  </div>

                  {selectedWorkerDetails.descuentos_detalle && selectedWorkerDetails.descuentos_detalle.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader className="bg-rose-50/40">
                        <TableRow className="text-[11px]">
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Monto (S/)</TableHead>
                          <TableHead className="text-center w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedWorkerDetails.descuentos_detalle.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-muted-foreground text-[11px]">
                              {d.fecha || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] text-rose-700 bg-rose-50 border-rose-200">
                                {d.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{d.motivo}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-rose-600">
                              - S/ {Number(d.monto || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDiscount(d.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                                title="Eliminar descuento"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-rose-50/30 font-semibold">
                          <TableCell colSpan={3}>Total Descuentos Registrados</TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-700">
                            - S/ {Number(selectedWorkerDetails.total_descuentos || 0).toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No hay descuentos registrados para este colaborador en este período.
                    </div>
                  )}
                </div>

                {/* Final Net Calculation Box */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide block">
                      Total Neto Líquido a Pagar
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Básico + Comisiones + Bonos - Descuentos
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-700">
                    S/ {Number(selectedWorkerDetails.total_a_pagar || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="size-4" />
                  <span>Imprimir Boleta</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: HISTORIAL DE DESCUENTOS DEL PERÍODO */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileText className="size-5 text-rose-600" />
              <span>Historial de Descuentos ({mesesNombres[selectedMes - 1]} {selectedAnio})</span>
            </DialogTitle>
            <DialogDescription>
              Registro completo de deducciones y penalidades aplicadas a todo el personal.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto max-h-[400px]">
            {loadingHistory ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="size-4 animate-spin" /> Cargando descuentos...
              </div>
            ) : historyDiscounts.length > 0 ? (
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Monto (S/)</TableHead>
                    <TableHead className="text-center w-12">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyDiscounts.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-semibold">{d.trabajador_nombre}</TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">{d.rol_operativo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                          {d.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{d.fecha}</TableCell>
                      <TableCell className="text-muted-foreground">{d.motivo}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-600">
                        S/ {Number(d.monto || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDiscount(d.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          title="Eliminar descuento"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No se han registrado descuentos en este período.
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                setIsHistoryModalOpen(false);
                handleOpenDiscountModal();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1"
            >
              <MinusCircle className="size-4" />
              <span>+ Nuevo Descuento</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
