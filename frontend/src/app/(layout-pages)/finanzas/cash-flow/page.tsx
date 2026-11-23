"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  Ban,
  Clock,
  User,
  RotateCcw,
  CreditCard,
  Layers,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

interface CashMovement {
  id: number;
  tipo: "Ingreso" | "Egreso";
  categoria: string;
  monto: number;
  metodo_pago: string;
  referencia_id?: number | null;
  tabla_referencia?: string | null;
  doc_referencia?: string | null;
  notas?: string | null;
  archivo_comprobante?: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha: string;
}

interface AccountBalance {
  metodo_pago: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export default function CashFlowPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [summary, setSummary] = useState<{ total_ingresos: number; total_egresos: number; saldo_neto: number }>({
    total_ingresos: 0,
    total_egresos: 0,
    saldo_neto: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterMetodo, setFilterMetodo] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterPeriodo, setFilterPeriodo] = useState<"hoy" | "semana" | "mes" | "personalizado" | "todo">("mes");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");

  // Modal: Create Movement
  const [showModal, setShowModal] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [form, setForm] = useState({
    tipo: "Ingreso" as "Ingreso" | "Egreso",
    categoria: "Venta",
    monto: "",
    metodo_pago: "Efectivo",
    fecha: new Date().toISOString().substring(0, 16),
    notas: "",
  });

  // Modal: Void Movement
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedMovementToVoid, setSelectedMovementToVoid] = useState<CashMovement | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  // Compute dates based on filterPeriodo
  const { dateDesde, dateHasta } = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (filterPeriodo === "hoy") {
      return { dateDesde: todayStr, dateHasta: todayStr };
    }
    if (filterPeriodo === "semana") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { dateDesde: mStr, dateHasta: todayStr };
    }
    if (filterPeriodo === "mes") {
      const startOfMonth = `${yyyy}-${mm}-01`;
      return { dateDesde: startOfMonth, dateHasta: todayStr };
    }
    return { dateDesde: customDesde || "", dateHasta: customHasta || "" };
  }, [filterPeriodo, customDesde, customHasta]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateDesde) params.desde = dateDesde;
      if (dateHasta) params.hasta = dateHasta;
      if (filterTipo !== "all") params.tipo = filterTipo;
      if (filterMetodo !== "all") params.metodo = filterMetodo;

      const [movRes, saldosRes, sumRes] = await Promise.all([
        api.get("/api/finanzas/movimientos", { params }),
        api.get("/api/finanzas/saldos"),
        api.get("/api/finanzas/resumen", { params }),
      ]);

      setMovements(Array.isArray(movRes.data) ? movRes.data : []);
      setBalances(Array.isArray(saldosRes.data) ? saldosRes.data : []);
      if (sumRes.data) {
        setSummary({
          total_ingresos: Number(sumRes.data.total_ingresos || 0),
          total_egresos: Number(sumRes.data.total_egresos || 0),
          saldo_neto: Number(sumRes.data.saldo_neto || 0),
        });
      }
    } catch (err: any) {
      console.error("Error loading cash flow:", err);
      toast.error("Error al cargar movimientos de caja.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateDesde, dateHasta, filterTipo, filterMetodo]);

  // Client-side filtering (Search, Categoría, Tipo, Método)
  const filteredMovements = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return movements.filter((m) => {
      const cat = (m.categoria || "").toLowerCase();
      const notas = (m.notas || "").toLowerCase();
      const metodo = (m.metodo_pago || "").toLowerCase();
      const doc = (m.doc_referencia || "").toLowerCase();
      const usuario = (m.usuario_nombre || "").toLowerCase();

      // 1. Search term match
      const matchesSearch =
        !term ||
        cat.includes(term) ||
        notas.includes(term) ||
        metodo.includes(term) ||
        doc.includes(term) ||
        usuario.includes(term) ||
        String(m.id).includes(term);

      // 2. Categoria match
      const matchesCategoria =
        filterCategoria === "all" || cat === filterCategoria.toLowerCase();

      return matchesSearch && matchesCategoria;
    });
  }, [movements, searchTerm, filterCategoria]);

  // Available unique categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    movements.forEach((m) => {
      if (m.categoria && m.categoria.trim()) {
        set.add(m.categoria.trim());
      }
    });
    return Array.from(set).sort();
  }, [movements]);

  // Available unique payment methods
  const availableMethods = useMemo(() => {
    const set = new Set<string>();
    balances.forEach((b) => {
      if (b.metodo_pago && b.metodo_pago.trim()) set.add(b.metodo_pago.trim());
    });
    movements.forEach((m) => {
      if (m.metodo_pago && m.metodo_pago.trim()) set.add(m.metodo_pago.trim());
    });
    if (set.size === 0) {
      ["Efectivo", "Transferencia", "Yape", "Plin", "Tarjeta"].forEach((d) => set.add(d));
    }
    return Array.from(set).sort();
  }, [balances, movements]);

  // Real-time summary of currently filtered movements
  const filteredSummary = useMemo(() => {
    let ing = 0;
    let egr = 0;
    filteredMovements.forEach((m) => {
      const monto = Number(m.monto || 0);
      if (m.tipo === "Ingreso") ing += monto;
      else egr += monto;
    });
    return {
      ingresos: ing,
      egresos: egr,
      saldo: ing - egr,
      count: filteredMovements.length,
    };
  }, [filteredMovements]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterTipo("all");
    setFilterMetodo("all");
    setFilterCategoria("all");
    setFilterPeriodo("mes");
    setCustomDesde("");
    setCustomHasta("");
  };

  // Handle Save Movement
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("Ingresa un monto válido mayor a 0.");
      return;
    }

    setSavingMovement(true);
    try {
      const payload = {
        tipo: form.tipo,
        categoria: form.categoria,
        monto: montoNum,
        metodo_pago: form.metodo_pago,
        fecha: form.fecha ? form.fecha.replace("T", " ") + ":00" : null,
        notas: form.notas,
      };

      await api.post("/api/finanzas/movimientos/save", payload);
      toast.success("Movimiento registrado con éxito.");
      setShowModal(false);
      setForm({
        tipo: "Ingreso",
        categoria: "Venta",
        monto: "",
        metodo_pago: "Efectivo",
        fecha: new Date().toISOString().substring(0, 16),
        notas: "",
      });
      loadData();
    } catch (err: any) {
      console.error("Error saving cash movement:", err);
      toast.error(err.response?.data?.message || "Error al registrar movimiento.");
    } finally {
      setSavingMovement(false);
    }
  };

  // Handle Void Movement
  const handleConfirmVoid = async () => {
    if (!selectedMovementToVoid) return;
    if (!voidReason.trim()) {
      toast.error("Por favor ingresa el motivo de la anulación.");
      return;
    }

    setVoiding(true);
    try {
      await api.post(`/api/finanzas/movimientos/anular/${selectedMovementToVoid.id}`, {
        observacion: voidReason,
      });
      toast.success("Movimiento anulado y reversado en caja.");
      setVoidModalOpen(false);
      setSelectedMovementToVoid(null);
      setVoidReason("");
      loadData();
    } catch (err: any) {
      console.error("Error voiding movement:", err);
      toast.error(err.response?.data?.message || "Error al anular movimiento.");
    } finally {
      setVoiding(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows = filteredMovements.map((m) => ({
        ID: m.id,
        Fecha: m.fecha ? m.fecha.substring(0, 19) : "",
        Tipo: m.tipo,
        Categoría: m.categoria,
        "Método de Pago": m.metodo_pago,
        Monto: Number(m.monto || 0),
        Referencia: m.doc_referencia || m.tabla_referencia || "",
        Notas: m.notas || "",
        Usuario: m.usuario_nombre || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Flujo_de_Caja");
      XLSX.writeFile(wb, `Flujo_Caja_${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success("Excel descargado correctamente.");
    } catch (err) {
      toast.error("Error al exportar Excel.");
    }
  };

  const totalGlobalSaldo = balances.reduce((sum, b) => sum + Number(b.saldo || 0), 0);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="size-6 text-emerald-600" />
            Flujo de Caja & Movimientos
          </h1>
          <p className="text-sm text-muted-foreground">
            Control integral de entradas, salidas, conciliación de cuentas y arqueo de caja en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sidebarOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-2 h-8 text-xs font-medium cursor-pointer"
            title={sidebarOpen ? "Ocultar panel de filtros lateral derecho" : "Mostrar panel de filtros lateral derecho"}
          >
            {sidebarOpen ? <PanelRightClose className="size-4 text-emerald-600" /> : <PanelRightOpen className="size-4 text-emerald-600" />}
            <span>{sidebarOpen ? "Ocultar Filtros" : "Mostrar Filtros"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 h-8 text-xs cursor-pointer">
            <Download className="size-4 text-emerald-600" />
            Exportar Excel
          </Button>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 h-8 text-xs cursor-pointer">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="gap-2 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total General en Cuentas */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total Cuentas</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGlobalSaldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              S/ {totalGlobalSaldo.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Disponibilidad en caja y bancos</p>
          </CardContent>
        </Card>

        {/* Ingresos del Período */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Período</CardTitle>
            <ArrowDownLeft className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              S/ {summary.total_ingresos.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cobros de ventas y abonos</p>
          </CardContent>
        </Card>

        {/* Egresos del Período */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos del Período</CardTitle>
            <ArrowUpRight className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              S/ {summary.total_egresos.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gastos, compras y pagos</p>
          </CardContent>
        </Card>

        {/* Flujo Neto del Período */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flujo Neto Período</CardTitle>
            <Layers className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.saldo_neto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              S/ {summary.saldo_neto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ingresos menos egresos</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances Strip */}
      <div className="bg-card border rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <CreditCard className="size-3.5 text-primary" />
          Disponibilidad por Medio de Pago / Cuenta:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {balances.map((b, idx) => (
            <div key={idx} className="bg-muted/40 border rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-xs font-semibold text-foreground capitalize truncate">{b.metodo_pago}</span>
              <div className="mt-1">
                <span className={`text-sm font-bold font-mono ${Number(b.saldo) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  S/ {Number(b.saldo).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between mt-1 pt-1 border-t">
                <span>+S/{Number(b.ingresos).toFixed(0)}</span>
                <span>-S/{Number(b.egresos).toFixed(0)}</span>
              </div>
            </div>
          ))}
          {balances.length === 0 && (
            <div className="col-span-full text-xs text-muted-foreground py-2 italic">
              No hay cuentas con movimientos registrados aún.
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace (Table on Left/Center + Filter Sidebar on the Right) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* =============================================================== */}
        {/* ÁREA DE MOVIMIENTOS: BARRA DE BÚSQUEDA RÁPIDA Y TABLA */}
        {/* =============================================================== */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Quick Search & Filter Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Búsqueda rápida por concepto, categoría, comprobante o cuenta..."
                className="pl-8 h-8 text-xs w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Mostrando <strong className="text-foreground">{filteredMovements.length}</strong> de {movements.length} movimientos
              </span>

              {(searchTerm || filterTipo !== "all" || filterMetodo !== "all" || filterCategoria !== "all" || filterPeriodo !== "mes" || customDesde || customHasta) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 text-xs text-destructive hover:text-destructive px-2 gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>

          {/* Movements Table */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-xs">Fecha / Hora</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Tipo</TableHead>
                    <TableHead className="font-semibold text-xs">Categoría & Detalle</TableHead>
                    <TableHead className="font-semibold text-xs">Medio de Pago</TableHead>
                    <TableHead className="font-semibold text-xs">Referencia / Origen</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Monto</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Usuario</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="size-6 animate-spin text-primary" />
                          <span className="text-xs">Cargando movimientos de caja...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                        No se encontraron movimientos registrados para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map((m) => {
                      const isIngreso = m.tipo === "Ingreso";
                      const isAnulado = m.notas && m.notas.includes("ANULADO");

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-muted/30 border-b transition-colors text-xs ${
                            isAnulado ? "opacity-60 bg-muted/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {m.fecha ? m.fecha.substring(0, 16).replace("T", " ") : "---"}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 inline-flex items-center gap-1 ${
                                isIngreso
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                              }`}
                            >
                              {isIngreso ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                              {m.tipo}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{m.categoria}</span>
                              {m.categoria?.toLowerCase().includes("comisi") && (
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-400/30 text-[10px] font-semibold py-0 px-1.5">
                                  Comisión Telco
                                </Badge>
                              )}
                            </div>
                            {m.notas && <div className="text-[11px] text-muted-foreground truncate max-w-xs">{m.notas}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {m.metodo_pago}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                            {m.doc_referencia ? (
                              <span className="font-medium text-foreground">{m.doc_referencia}</span>
                            ) : m.tabla_referencia ? (
                              <span className="capitalize">{m.tabla_referencia} #{m.referencia_id}</span>
                            ) : (
                              "Directo / Manual"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={isIngreso ? "text-emerald-600" : "text-rose-600"}>
                              {isIngreso ? "+" : "-"} S/ {Number(m.monto || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground text-[11px]">
                            {m.usuario_nombre || "Admin"}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {isAnulado ? (
                              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">
                                Anulado
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMovementToVoid(m);
                                  setVoidReason("");
                                  setVoidModalOpen(true);
                                }}
                                className="h-7 text-[11px] text-muted-foreground hover:text-rose-600 px-2 gap-1 cursor-pointer"
                                title="Anular movimiento y generar reversión"
                              >
                                <Ban className="size-3.5" />
                                Anular
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* =============================================================== */}
        {/* PANEL LATERAL DE FILTROS AL LADO DERECHO */}
        {/* =============================================================== */}
        {sidebarOpen && (
          <div className="w-full lg:w-80 shrink-0">
            <Card className="bg-card sticky top-4 shadow-sm border">
              <CardHeader className="p-3.5 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="size-3.5 text-emerald-600" />
                  Filtros de Caja
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-6 text-[10px] text-destructive hover:text-destructive px-1.5 font-bold cursor-pointer"
                >
                  LIMPIAR
                </Button>
              </CardHeader>

              <CardContent className="p-3.5 flex flex-col gap-4 text-xs">
                {/* 1. Tipo de Movimiento */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo de Movimiento
                  </Label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/60 rounded-md border text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterTipo("all")}
                      className={`py-1.5 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                        filterTipo === "all"
                          ? "bg-background text-foreground shadow-2xs font-bold border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTipo("Ingreso")}
                      className={`py-1.5 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                        filterTipo === "Ingreso"
                          ? "bg-emerald-600 text-white font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      + Ingresos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTipo("Egreso")}
                      className={`py-1.5 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                        filterTipo === "Egreso"
                          ? "bg-rose-600 text-white font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      - Egresos
                    </button>
                  </div>
                </div>

                {/* 2. Cuenta / Medio de Pago */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="side_filter_metodo" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="size-3 text-primary" />
                    Cuenta / Medio de Pago
                  </Label>
                  <select
                    id="side_filter_metodo"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs font-medium cursor-pointer"
                    value={filterMetodo}
                    onChange={(e) => setFilterMetodo(e.target.value)}
                  >
                    <option value="all">Todas las Cuentas</option>
                    {availableMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Categoría de Movimiento */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="side_filter_categoria" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Layers className="size-3 text-indigo-500" />
                    Categoría
                  </Label>
                  <select
                    id="side_filter_categoria"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs font-medium cursor-pointer"
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                  >
                    <option value="all">Todas las Categorías</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Período de Tiempo */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="side_filter_periodo" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="size-3 text-amber-500" />
                    Período
                  </Label>
                  <select
                    id="side_filter_periodo"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs font-medium cursor-pointer"
                    value={filterPeriodo}
                    onChange={(e) => setFilterPeriodo(e.target.value as any)}
                  >
                    <option value="hoy">📅 Hoy</option>
                    <option value="semana">📅 Esta Semana</option>
                    <option value="mes">📅 Este Mes</option>
                    <option value="personalizado">📅 Rango Personalizado</option>
                    <option value="todo">📅 Histórico Completo</option>
                  </select>
                </div>

                {/* Rango de Fechas Personalizado */}
                <div className="flex flex-col gap-1.5 pt-1 border-t">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Rango de Fechas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="custom_desde" className="text-[10px] text-muted-foreground">Desde</Label>
                      <Input
                        id="custom_desde"
                        type="date"
                        className="h-8 text-[11px] px-2 font-mono"
                        value={customDesde}
                        onChange={(e) => {
                          setCustomDesde(e.target.value);
                          setFilterPeriodo("personalizado");
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom_hasta" className="text-[10px] text-muted-foreground">Hasta</Label>
                      <Input
                        id="custom_hasta"
                        type="date"
                        className="h-8 text-[11px] px-2 font-mono"
                        value={customHasta}
                        onChange={(e) => {
                          setCustomHasta(e.target.value);
                          setFilterPeriodo("personalizado");
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Mini Resumen en Vivo del Filtro */}
                <div className="p-3 bg-muted/50 rounded-lg border space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span className="text-muted-foreground">Registros Filtrados:</span>
                    <Badge variant="secondary" className="font-bold">{filteredSummary.count}</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between items-center text-emerald-600 font-medium">
                      <span>Total Ingresos:</span>
                      <span>+S/ {filteredSummary.ingresos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-600 font-medium">
                      <span>Total Egresos:</span>
                      <span>-S/ {filteredSummary.egresos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t font-bold text-foreground">
                      <span>Flujo Neto:</span>
                      <span className={filteredSummary.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        S/ {filteredSummary.saldo.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR NUEVO MOVIMIENTO DE CAJA */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="size-5" />
              Nuevo Movimiento de Caja
            </DialogTitle>
            <DialogDescription>
              Registra una entrada o salida directa de dinero indicando el método de pago y la categoría.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMovement} className="space-y-4 py-2">
            {/* Tipo: Ingreso / Egreso */}
            <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-lg border">
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: "Ingreso", categoria: "Comisión" })}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  form.tipo === "Ingreso"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="size-3.5" />
                Ingreso (+)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: "Egreso", categoria: "Gasto Operativo" })}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  form.tipo === "Egreso"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="size-3.5" />
                Egreso (-)
              </button>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Categoría *</Label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                required
              >
                {form.tipo === "Ingreso" ? (
                  <>
                    <option value="Comisión">Comisión (Operador Telecom)</option>
                    <option value="Comisión de Venta">Comisión de Venta</option>
                    <option value="Venta Directa">Venta Directa</option>
                    <option value="Cobro de Factura">Cobro de Factura</option>
                    <option value="Aporte de Capital">Aporte de Capital</option>
                    <option value="Préstamo Recibido">Préstamo Recibido</option>
                    <option value="Devolución">Devolución / Reintegro</option>
                    <option value="Otro Ingreso">Otro Ingreso</option>
                  </>
                ) : (
                  <>
                    <option value="Comisión a Asesor">Comisión a Asesor / Vendedor</option>
                    <option value="Gasto Operativo">Gasto Operativo</option>
                    <option value="Pago a Proveedor">Pago a Proveedor</option>
                    <option value="Combustible">Combustible</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Planilla / Sueldos">Planilla / Sueldos</option>
                    <option value="Servicios Básicos">Servicios Básicos (Luz/Agua/Net)</option>
                    <option value="Cuota Bancaria">Cuota Bancaria / Préstamo</option>
                    <option value="Retiro de Socios">Retiro de Socios</option>
                    <option value="Otro Egreso">Otro Egreso</option>
                  </>
                )}
              </select>
            </div>

            {/* Monto y Método de Pago */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monto (S/) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cuenta / Medio de Pago *</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.metodo_pago}
                  onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Yape">Yape / Plin</option>
                  <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                </select>
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Fecha y Hora</Label>
              <Input
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            {/* Notas / Observaciones */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Concepto / Observaciones</Label>
              <Textarea
                placeholder="Detalle o justificación del movimiento..."
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingMovement}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {savingMovement ? "Guardando..." : "Registrar en Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ANULAR MOVIMIENTO */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="size-5" />
              Confirmar Anulación de Movimiento
            </DialogTitle>
            <DialogDescription>
              Se creará un asiento de reversión por el monto de{" "}
              <strong className="text-foreground">S/ {Number(selectedMovementToVoid?.monto || 0).toFixed(2)}</strong> para
              equilibrar el saldo de caja y se marcará el registro como anulado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Motivo de Anulación *</Label>
              <Input
                placeholder="Ej. Registro duplicado, error en digitación del monto..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVoidModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={voiding}
              onClick={handleConfirmVoid}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {voiding ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
