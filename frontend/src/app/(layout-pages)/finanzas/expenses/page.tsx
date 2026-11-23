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
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  DollarSign,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Tag,
  Building2,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface GastoItem {
  id: number;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  categoria_id: number;
  categoria_nombre?: string | null;
  categoria_tipo?: string | null;
  grupo_contable?: string | null;
  vehiculo_id?: number | null;
  conductor_nombre?: string | null;
  vehiculo_placa?: string | null;
  fecha_gasto: string;
  numero_comprobante?: string | null;
  tipo_comprobante?: string | null;
  descripcion: string;
  cantidad?: number;
  costo_unitario?: number;
  monto_total: number;
  estado_pago: string;
  metodo_pago?: string | null;
  archivo_comprobante?: string | null;
}

interface CategoriaGasto {
  id: number;
  nombre: string;
  tipo: string;
  grupo_contable: string;
  activo: boolean;
}

interface ProveedorItem {
  id: number;
  razon_social: string;
  ruc?: string;
}

export default function ExpensesPage() {
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total_mes: number; total_pendiente: number }>({
    total_mes: 0,
    total_pendiente: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterPeriodo, setFilterPeriodo] = useState<"mes" | "todo">("mes");

  // Modal: Create / Edit Gasto
  const [showModal, setShowModal] = useState(false);
  const [savingGasto, setSavingGasto] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoItem | null>(null);

  const [form, setForm] = useState({
    id: null as number | null,
    categoria_id: "" as string | number,
    proveedor_id: "" as string | number,
    vehiculo_id: "" as string | number,
    fecha_gasto: new Date().toISOString().substring(0, 10),
    tipo_comprobante: "Factura",
    numero_comprobante: "",
    descripcion: "",
    cantidad: 1,
    costo_unitario: "",
    monto_total: "",
    estado_pago: "Pagado",
    metodo_pago: "Transferencia",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [gastosRes, sumRes, catRes, provRes, logRes] = await Promise.all([
        api.get("/api/gastos"),
        api.get("/api/gastos/summary"),
        api.get("/api/gastos/categorias"),
        api.get("/api/proveedores"),
        api.get("/api/pedidos/logistics-data"),
      ]);

      setGastos(Array.isArray(gastosRes.data) ? gastosRes.data : []);
      if (sumRes.data) {
        setSummary({
          total_mes: Number(sumRes.data.total_mes || 0),
          total_pendiente: Number(sumRes.data.total_pendiente || 0),
        });
      }
      setCategorias(Array.isArray(catRes.data) ? catRes.data : []);
      setProveedores(Array.isArray(provRes.data) ? provRes.data : []);
      if (logRes.data && logRes.data.drivers) {
        setDrivers(logRes.data.drivers);
      }
    } catch (err: any) {
      console.error("Error loading expenses:", err);
      toast.error("Error al cargar gastos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Gastos
  const filteredGastos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return gastos.filter((g) => {
      const matchSearch =
        !term ||
        (g.descripcion && g.descripcion.toLowerCase().includes(term)) ||
        (g.proveedor_nombre && g.proveedor_nombre.toLowerCase().includes(term)) ||
        (g.categoria_nombre && g.categoria_nombre.toLowerCase().includes(term)) ||
        (g.numero_comprobante && g.numero_comprobante.toLowerCase().includes(term)) ||
        (g.vehiculo_placa && g.vehiculo_placa.toLowerCase().includes(term));

      const matchCat = filterCategoria === "all" || String(g.categoria_id) === filterCategoria;
      const matchEstado = filterEstado === "all" || g.estado_pago.toLowerCase() === filterEstado.toLowerCase();

      let matchDate = true;
      if (filterPeriodo === "mes" && g.fecha_gasto) {
        const parts = g.fecha_gasto.split("-");
        const yr = parseInt(parts[0]);
        const mo = parseInt(parts[1]);
        matchDate = yr === currentYear && mo === currentMonth;
      }

      return matchSearch && matchCat && matchEstado && matchDate;
    });
  }, [gastos, searchTerm, filterCategoria, filterEstado, filterPeriodo]);

  // Open Modal for New Gasto
  const handleOpenNew = () => {
    setEditingGasto(null);
    setForm({
      id: null,
      categoria_id: categorias[0]?.id ? String(categorias[0].id) : "",
      proveedor_id: "",
      vehiculo_id: "",
      fecha_gasto: new Date().toISOString().substring(0, 10),
      tipo_comprobante: "Factura",
      numero_comprobante: "",
      descripcion: "",
      cantidad: 1,
      costo_unitario: "",
      monto_total: "",
      estado_pago: "Pagado",
      metodo_pago: "Transferencia",
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (gasto: GastoItem) => {
    setEditingGasto(gasto);
    setForm({
      id: gasto.id,
      categoria_id: gasto.categoria_id ? String(gasto.categoria_id) : "",
      proveedor_id: gasto.proveedor_id ? String(gasto.proveedor_id) : "",
      vehiculo_id: gasto.vehiculo_id ? String(gasto.vehiculo_id) : "",
      fecha_gasto: gasto.fecha_gasto ? gasto.fecha_gasto.substring(0, 10) : "",
      tipo_comprobante: gasto.tipo_comprobante || "Factura",
      numero_comprobante: gasto.numero_comprobante || "",
      descripcion: gasto.descripcion || "",
      cantidad: Number(gasto.cantidad || 1),
      costo_unitario: gasto.costo_unitario ? String(gasto.costo_unitario) : "",
      monto_total: String(gasto.monto_total || ""),
      estado_pago: gasto.estado_pago || "Pagado",
      metodo_pago: gasto.metodo_pago || "Transferencia",
    });
    setShowModal(true);
  };

  // Handle Save
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(form.monto_total);
    if (!form.categoria_id) {
      toast.error("Selecciona una categoría de gasto.");
      return;
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      toast.error("Ingresa un monto total válido mayor a 0.");
      return;
    }

    setSavingGasto(true);
    try {
      const payload = {
        id: form.id,
        categoria_id: Number(form.categoria_id),
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        vehiculo_id: form.vehiculo_id ? Number(form.vehiculo_id) : null,
        fecha_gasto: form.fecha_gasto,
        tipo_comprobante: form.tipo_comprobante,
        numero_comprobante: form.numero_comprobante,
        descripcion: form.descripcion,
        cantidad: Number(form.cantidad) || 1,
        costo_unitario: form.costo_unitario ? parseFloat(form.costo_unitario) : totalNum,
        monto_total: totalNum,
        estado_pago: form.estado_pago,
        metodo_pago: form.metodo_pago,
      };

      await api.post("/api/gastos/save", payload);
      toast.success(form.id ? "Gasto actualizado con éxito." : "Gasto registrado con éxito.");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error("Error saving expense:", err);
      toast.error(err.response?.data?.message || "Error al registrar el gasto.");
    } finally {
      setSavingGasto(false);
    }
  };

  // Handle Delete
  const handleDeleteGasto = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este gasto? Si fue pagado, se reversará también la salida de caja.")) return;

    try {
      await api.delete(`/api/gastos/${id}`);
      toast.success("Gasto eliminado con éxito.");
      loadData();
    } catch (err: any) {
      console.error("Error deleting expense:", err);
      toast.error(err.response?.data?.message || "Error al eliminar gasto.");
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const rows = filteredGastos.map((g) => ({
        ID: g.id,
        Fecha: g.fecha_gasto ? g.fecha_gasto.substring(0, 10) : "",
        Categoría: g.categoria_nombre || "",
        Grupo: g.grupo_contable || "",
        Descripción: g.descripcion,
        Proveedor: g.proveedor_nombre || "",
        Vehículo: g.vehiculo_placa ? `${g.conductor_nombre || ""} (${g.vehiculo_placa})` : "",
        Comprobante: `${g.tipo_comprobante || ""} ${g.numero_comprobante || ""}`.trim(),
        "Monto Sin IGV (S/)": (Number(g.monto_total || 0) / 1.18).toFixed(2),
        "Monto Total (S/)": Number(g.monto_total || 0).toFixed(2),
        "Estado Pago": g.estado_pago,
        "Método Pago": g.metodo_pago || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gastos");
      XLSX.writeFile(wb, `Gastos_CRM_${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success("Excel descargado correctamente.");
    } catch (err) {
      toast.error("Error al exportar Excel.");
    }
  };

  const totalFilteredNeto = filteredGastos.reduce((sum, g) => sum + Number(g.monto_total || 0) / 1.18, 0);
  const totalFilteredTotal = filteredGastos.reduce((sum, g) => sum + Number(g.monto_total || 0), 0);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="size-6 text-rose-600" />
            Control de Gastos & Egresos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento de gastos operativos, comerciales, logísticos y administrativos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
            <Download className="size-4 text-emerald-600" />
            Exportar Excel
          </Button>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={handleOpenNew}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
          >
            <Plus className="size-4" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos del Mes</CardTitle>
            <DollarSign className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              S/ {summary.total_mes.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Egresos totales del mes en curso</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de Pago</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              S/ {summary.total_pendiente.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Obligaciones por liquidar</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Filtrado (Sin IGV)</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              S/ {totalFilteredNeto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base imponible sin impuestos</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros en Vista</CardTitle>
            <Receipt className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{filteredGastos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Gastos según filtros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="bg-card shadow-xs p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción, proveedor, comprobante, placa..."
              className="pl-8 h-8 text-xs w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categoría */}
          <div>
            <select
              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="all">Categoría: Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Pago */}
          <div>
            <select
              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="all">Estado: Todos</option>
              <option value="pagado">Pagados</option>
              <option value="pendiente">Pendientes</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <select
              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value as any)}
            >
              <option value="mes">Este Mes</option>
              <option value="todo">Histórico Completo</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Gastos Table */}
      <Card className="bg-card shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold text-xs">Fecha</TableHead>
                <TableHead className="font-semibold text-xs">Categoría & Grupo</TableHead>
                <TableHead className="font-semibold text-xs">Descripción</TableHead>
                <TableHead className="font-semibold text-xs">Proveedor</TableHead>
                <TableHead className="font-semibold text-xs">Comprobante</TableHead>
                <TableHead className="font-semibold text-xs text-right">Sin IGV</TableHead>
                <TableHead className="font-semibold text-xs text-right">Total (S/)</TableHead>
                <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                <TableHead className="font-semibold text-xs text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="size-6 animate-spin text-primary" />
                      <span className="text-xs">Cargando gastos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredGastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                    No se encontraron gastos registrados para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGastos.map((g) => {
                  const neto = Number(g.monto_total || 0) / 1.18;
                  const isPagado = g.estado_pago.toLowerCase() === "pagado";

                  return (
                    <tr key={g.id} className="hover:bg-muted/30 border-b transition-colors text-xs">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {g.fecha_gasto ? g.fecha_gasto.substring(0, 10) : "---"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">{g.categoria_nombre || "General"}</div>
                        {g.grupo_contable && (
                          <span className="text-[10px] text-muted-foreground">{g.grupo_contable}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="truncate max-w-xs">{g.descripcion}</div>
                        {g.vehiculo_placa && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <Truck className="size-3" />
                            {g.conductor_nombre} ({g.vehiculo_placa})
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {g.proveedor_nombre ? (
                          <span className="font-medium text-foreground">{g.proveedor_nombre}</span>
                        ) : (
                          "---"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {g.numero_comprobante ? (
                          <span className="font-mono text-[11px]">
                            {g.tipo_comprobante ? `${g.tipo_comprobante.substring(0, 4)}. ` : ""}
                            {g.numero_comprobante}
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        S/ {neto.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        S/ {Number(g.monto_total || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            isPagado
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {g.estado_pago}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(g)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded"
                            title="Editar gasto"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGasto(g.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-600 rounded"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL: REGISTRAR / EDITAR GASTO */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Receipt className="size-5" />
              {editingGasto ? `Editar Gasto #${editingGasto.id}` : "Registrar Nuevo Gasto"}
            </DialogTitle>
            <DialogDescription>
              Registra los datos contables del gasto. Al marcarlo como "Pagado", se registrará el egreso correspondiente en caja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGasto} className="space-y-3.5 py-2">
            {/* Categoría y Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categoría de Gasto *</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} ({c.grupo_contable})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fecha del Gasto *</Label>
                <Input
                  type="date"
                  value={form.fecha_gasto}
                  onChange={(e) => setForm({ ...form, fecha_gasto: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            {/* Proveedor y Vehículo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Proveedor (Opcional)</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.proveedor_id}
                  onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                >
                  <option value="">-- Sin Proveedor / Directo --</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.razon_social} {p.ruc ? `(${p.ruc})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vehículo / Flota (Si aplica)</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.vehiculo_id}
                  onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })}
                >
                  <option value="">-- No Aplica --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.vehiculo_placa ? `${d.vehiculo_placa} - ` : ""}{d.nombre} {d.apellido || ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comprobante */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo Comprobante</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.tipo_comprobante}
                  onChange={(e) => setForm({ ...form, tipo_comprobante: e.target.value })}
                >
                  <option value="Factura">Factura</option>
                  <option value="Boleta">Boleta</option>
                  <option value="Recibo por Honorarios">Recibo Honorarios</option>
                  <option value="Nota de Venta / Ticket">Ticket / Nota</option>
                  <option value="Sin Comprobante">Sin Comprobante</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Número de Comprobante</Label>
                <Input
                  placeholder="Ej. F001-0004523"
                  value={form.numero_comprobante}
                  onChange={(e) => setForm({ ...form, numero_comprobante: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descripción / Concepto *</Label>
              <Input
                placeholder="Ej. Mantenimiento cambio de aceite, combustible 10 galones, etc."
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Monto Total */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monto Total (S/) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.monto_total}
                  onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estado de Pago</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.estado_pago}
                  onChange={(e) => setForm({ ...form, estado_pago: e.target.value })}
                >
                  <option value="Pagado">Pagado</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Medio de Pago</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.metodo_pago}
                  onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Yape">Yape / Plin</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingGasto}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {savingGasto ? "Guardando..." : editingGasto ? "Actualizar Gasto" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
