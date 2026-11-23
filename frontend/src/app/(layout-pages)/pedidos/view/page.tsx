"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Edit,
  DollarSign,
  MapPin,
  Phone,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  ArrowRight,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  X,
  RotateCcw,
} from "lucide-react";

export default function PedidosViewPage() {
  const [data, setData] = useState<{
    columns: any[];
    pedidos: any[];
    zonas: any[];
    drivers: any[];
    categories: any[];
  }>({
    columns: [],
    pedidos: [],
    zonas: [],
    drivers: [],
    categories: [],
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Filters state
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterZona, setFilterZona] = useState<string>("all");
  const [filterChofer, setFilterChofer] = useState<string>("all");
  const [filterPago, setFilterPago] = useState<string>("all");
  const [filterEtapa, setFilterEtapa] = useState<string>("all");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Move / Delivery Modal State
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [targetStage, setTargetStage] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [submittingMove, setSubmittingMove] = useState(false);

  // Drag and drop states
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const [dragOverColId, setDragOverColId] = useState<number | null>(null);

  // Delivery Form Inputs
  const [envasesEntregados, setEnvasesEntregados] = useState(0);
  const [envasesDevueltos, setEnvasesDevueltos] = useState(0);
  const [quienRecibio, setQuienRecibio] = useState("");
  const [montoFinal, setMontoFinal] = useState<number>(0);
  const [metodoPagoReal, setMetodoPagoReal] = useState("efectivo");
  const [pendientePago, setPendientePago] = useState(false);

  // Cancel Reason
  const [cancelReason, setCancelReason] = useState("");

  // New Column / Stage Modal
  const [showNewColumnModal, setShowNewColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/pedidos/logistics-data");
      if (res.data) {
        setData({
          columns: Array.isArray(res.data.columns) ? res.data.columns : [],
          pedidos: Array.isArray(res.data.pedidos) ? res.data.pedidos : [],
          zonas: Array.isArray(res.data.zonas) ? res.data.zonas : [],
          drivers: Array.isArray(res.data.drivers) ? res.data.drivers : [],
          categories: Array.isArray(res.data.categories) ? res.data.categories : [],
        });
      }
    } catch (err: any) {
      console.error("Error al cargar pedidos:", err);
      toast.error("Error al conectar con el backend de logística.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // 7-day strip calculation for current week (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDiff);

    const daysLabels = ["L", "M", "M", "J", "V", "S", "D"];
    const list: Array<{
      dateStr: string;
      label: string;
      dayNum: number;
      isToday: boolean;
      isActive: boolean;
      totalCount: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const isActive = filterDate === dateStr;
      const dayOrders = data.pedidos.filter((p) =>
        p.fecha_entrega ? String(p.fecha_entrega).startsWith(dateStr) : false
      );

      list.push({
        dateStr,
        label: daysLabels[i],
        dayNum: d.getDate(),
        isToday,
        isActive,
        totalCount: dayOrders.length,
      });
    }
    return list;
  }, [data.pedidos, filterDate]);

  // Filter Orders with comprehensive multi-criteria
  const filteredPedidos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return data.pedidos.filter((p) => {
      const cliente = (
        (p.contacto_nombre || "") +
        " " +
        (p.contacto_apellido || "") +
        " " +
        (p.empresa_nombre || "") +
        " " +
        (p.contacto_persona_nombre || "")
      ).toLowerCase();

      const matchTerm =
        !term ||
        (p.numero_pedido && p.numero_pedido.toLowerCase().includes(term)) ||
        cliente.includes(term) ||
        (p.direccion_entrega && p.direccion_entrega.toLowerCase().includes(term)) ||
        (p.telefono_movil && p.telefono_movil.includes(term)) ||
        (p.productos_resumen && p.productos_resumen.toLowerCase().includes(term)) ||
        (p.notas && p.notas.toLowerCase().includes(term));

      const matchZona = filterZona === "all" || String(p.zona) === filterZona;
      const matchChofer = filterChofer === "all" || String(p.chofer_id) === filterChofer;
      const matchPago = filterPago === "all" || (p.estado_pago || "").toLowerCase() === filterPago.toLowerCase();
      const matchEtapa = filterEtapa === "all" || String(p.etapa_id) === filterEtapa;
      const matchPrioridad =
        filterPrioridad === "all" ||
        (p.prioridad || "").toLowerCase() === filterPrioridad.toLowerCase();

      const matchDate =
        !filterDate ||
        (p.fecha_entrega && String(p.fecha_entrega).startsWith(filterDate));

      return matchTerm && matchZona && matchChofer && matchPago && matchEtapa && matchPrioridad && matchDate;
    });
  }, [data.pedidos, searchTerm, filterZona, filterChofer, filterPago, filterEtapa, filterPrioridad, filterDate]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterZona("all");
    setFilterChofer("all");
    setFilterPago("all");
    setFilterEtapa("all");
    setFilterPrioridad("all");
    setFilterDate(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    e.dataTransfer.setData("text/plain", String(orderId));
    e.dataTransfer.effectAllowed = "move";
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e: React.DragEvent, colId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: any) => {
    e.preventDefault();
    setDragOverColId(null);
    setDraggedOrderId(null);

    const orderIdStr = e.dataTransfer.getData("text/plain");
    if (!orderIdStr) return;

    const order = data.pedidos.find((x) => String(x.id) === String(orderIdStr));
    if (!order || order.etapa_id === targetCol.id) return;

    handleStageChange(order, targetCol);
  };

  // Handle stage change request
  const handleStageChange = (pedido: any, targetCol: any) => {
    setSelectedPedido(pedido);
    setTargetStage(targetCol);

    if (targetCol.es_entregado === 1) {
      // Setup delivery modal
      setMontoFinal(Number(pedido.total || 0));
      setMetodoPagoReal(pedido.metodo_pago || "efectivo");
      setQuienRecibio(
        (pedido.contacto_nombre ? pedido.contacto_nombre + " " + (pedido.contacto_apellido || "") : "") ||
        pedido.contacto_persona_nombre ||
        ""
      );
      setEnvasesEntregados(0);
      setEnvasesDevueltos(0);
      setPendientePago(pedido.estado_pago === "Pendiente");
      setShowDeliveryModal(true);
    } else if (targetCol.es_perdido === 1) {
      setCancelReason("");
      setShowCancelModal(true);
    } else {
      // Direct move
      executeMove(pedido.id, targetCol.id, {});
    }
  };

  const executeMove = async (pedidoId: number, etapaId: number, payload: any) => {
    setSubmittingMove(true);
    try {
      const res = await api.post("/api/pedidos/move", {
        pedido_id: pedidoId,
        etapa_id: etapaId,
        ...payload,
      });
      if (res.data?.status === "success" || res.status === 200) {
        toast.success(res.data?.message || "Pedido actualizado con éxito.");
        setShowDeliveryModal(false);
        setShowCancelModal(false);
        loadData();
      } else {
        toast.error(res.data?.message || "No se pudo mover el pedido.");
      }
    } catch (err: any) {
      console.error("Error al mover pedido:", err);
      toast.error(err.response?.data?.message || "Error al actualizar estado del pedido.");
    } finally {
      setSubmittingMove(false);
    }
  };

  const submitDelivery = () => {
    if (!selectedPedido || !targetStage) return;
    executeMove(selectedPedido.id, targetStage.id, {
      envases_entregados: envasesEntregados,
      envases_devueltos: envasesDevueltos,
      quien_recibio: quienRecibio,
      monto_final: montoFinal,
      metodo_pago_real: metodoPagoReal,
      pendiente_pago: pendientePago ? 1 : 0,
    });
  };

  const submitCancel = () => {
    if (!selectedPedido || !targetStage) return;
    executeMove(selectedPedido.id, targetStage.id, {
      cancel_reason: cancelReason,
    });
  };

  // Delete Order
  const handleDeletePedido = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este pedido permanentemente?")) return;
    try {
      const res = await api.delete(`/api/pedidos/${id}`);
      if (res.data?.status === "success" || res.status === 200) {
        toast.success("Pedido eliminado correctamente.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar pedido.");
    }
  };

  // Add Column
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      const res = await api.post("/api/pedidos/columns", { name: newColumnName.trim() });
      if (res.data?.status === "success" || res.status === 200) {
        toast.success("Etapa creada.");
        setNewColumnName("");
        setShowNewColumnModal(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al crear etapa.");
    }
  };

  // WhatsApp Share Link
  const shareWhatsApp = (p: any) => {
    const cliente =
      (p.contacto_nombre ? p.contacto_nombre + " " + (p.contacto_apellido || "") : "") ||
      p.empresa_nombre ||
      p.contacto_persona_nombre ||
      "Cliente";

    const msg =
      `🚚 *DETALLE DE DESPACHO - NEXTLEAD*\n` +
      `📦 *Pedido:* ${p.numero_pedido || `PED-${p.id}`}\n` +
      `👤 *Cliente:* ${cliente}\n` +
      `📍 *Dirección:* ${p.direccion_entrega || "No especificada"}\n` +
      `🛵 *Conductor:* ${p.chofer_n ? `${p.chofer_n} (Placa: ${p.vehiculo_placa || "N/A"})` : "Sin asignar"}\n` +
      `🛍️ *Productos:* ${p.productos_resumen || "Ver detalle"}\n` +
      `💰 *Total a Cobrar:* S/ ${Number(p.total || 0).toFixed(2)} (${p.metodo_pago || "Efectivo"})\n` +
      `📅 *Fecha:* ${p.fecha_entrega || todayStr} ${p.hora_entrega || ""}\n\n` +
      (p.latitud && p.longitud ? `🗺️ *Ubicación GPS:* https://maps.google.com/?q=${p.latitud},${p.longitud}` : "");

    const url = `https://wa.me/${(p.telefono_movil || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Export to Excel
  const exportToExcel = () => {
    const rows = filteredPedidos.map((p) => ({
      "N° Pedido": p.numero_pedido || `PED-${p.id}`,
      "Fecha Entrega": p.fecha_entrega || "",
      "Hora": p.hora_entrega || "",
      "Cliente":
        (p.contacto_nombre ? p.contacto_nombre + " " + (p.contacto_apellido || "") : "") ||
        p.empresa_nombre ||
        p.contacto_persona_nombre ||
        "",
      "Teléfono": p.telefono_movil || p.telefono_fijo || "",
      "Dirección": p.direccion_entrega || "",
      "Zona": p.zona_nombre || "",
      "Conductor": p.chofer_n ? `${p.chofer_n} ${p.chofer_a || ""}` : "",
      "Placa": p.vehiculo_placa || "",
      "Productos": p.productos_resumen || "",
      "Subtotal": Number(p.subtotal || 0),
      "IGV": Number(p.igv || 0),
      "Total": Number(p.total || 0),
      "Estado Pago": p.estado_pago || "Pendiente",
      "Método Pago": p.metodo_pago || "Efectivo",
      "Notas": p.notas || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos_nextlead_${todayStr}.xlsx`);
    toast.success("Archivo Excel exportado con éxito.");
  };

  const totalMontoNeto = filteredPedidos.reduce(
    (acc, curr) => acc + (Number(curr.subtotal) > 0 ? Number(curr.subtotal) : Number(curr.total || 0) / 1.18),
    0
  );

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="size-6 text-primary" />
            Control de Pedidos & Despachos
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline logístico interactivo sincronizado en tiempo real con conductores y base de datos (Montos sin IGV).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Sidebar Filter Button */}
          <Button
            variant={isFilterSidebarOpen ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
            title={isFilterSidebarOpen ? "Ocultar filtros laterales" : "Mostrar filtros laterales"}
          >
            {isFilterSidebarOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
            <span className="hidden sm:inline">{isFilterSidebarOpen ? "Ocultar Filtros" : "Filtros"}</span>
          </Button>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg bg-card p-0.5">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-8 gap-1.5 px-3"
            >
              <LayoutGrid className="size-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 gap-1.5 px-3"
            >
              <List className="size-4" />
              Tabla
            </Button>
          </div>

          {/* Direct Link to Reports */}
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/pedidos/reports">
              <BarChart3 className="size-4 text-indigo-600" />
              Reportes
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
            <Download className="size-4" />
            Excel
          </Button>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button size="sm" asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/pedidos/create">
              <Plus className="size-4" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Totales</CardTitle>
            <Truck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPedidos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes filtradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Carga Neta Total</CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              S/ {totalMontoNeto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base imponible (Sin IGV)</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conductores Activos</CardTitle>
            <CheckCircle2 className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.drivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unidades en flota</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zonas de Entrega</CardTitle>
            <MapPin className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.zonas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Coberturas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area with Collapsible Left Filter Sidebar */}
      <div className="flex flex-col lg:flex-row items-start gap-4 w-full min-w-0">
        {/* Collapsible Left Filter Sidebar */}
        {isFilterSidebarOpen && (
          <aside className="w-full lg:w-72 shrink-0 bg-card border rounded-xl p-3.5 shadow-xs space-y-4">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Filter className="size-3.5 text-primary" />
                <span>Filtros Logísticos</span>
                {(searchTerm || filterZona !== "all" || filterChofer !== "all" || filterPago !== "all" || filterEtapa !== "all" || filterPrioridad !== "all" || filterDate !== null) && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal bg-primary/10 text-primary">
                    Activos
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsFilterSidebarOpen(false)}
                title="Ocultar panel de filtros"
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            </div>

            {/* 1. Semana Actual (7-day Strip) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Semana Actual:</span>
                </div>
                {filterDate !== null && (
                  <button
                    onClick={() => setFilterDate(null)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Ver todos
                  </button>
                )}
              </div>

              {/* 7-day Strip */}
              <div className="grid grid-cols-7 gap-1 w-full">
                {weekDays.map((day) => {
                  const isSelected = filterDate === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setFilterDate(isSelected ? null : day.dateStr)}
                      title={`${day.label} ${day.dayNum} (${day.totalCount} pedidos)`}
                      className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-md border text-center transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : day.isToday
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "bg-background hover:bg-muted text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[10px] leading-tight font-medium opacity-80">{day.label}</span>
                      <span className="text-xs font-bold leading-tight mt-0.5">{day.dayNum}</span>
                      {day.totalCount > 0 ? (
                        <span
                          className={`text-[8px] font-bold px-1 rounded-full mt-0.5 leading-tight ${
                            isSelected
                              ? "bg-primary-foreground/30 text-primary-foreground"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {day.totalCount}
                        </span>
                      ) : (
                        <span className="text-[8px] opacity-0 select-none">-</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                variant={filterDate === null ? "secondary" : "outline"}
                size="sm"
                className="w-full h-6 text-[11px] font-medium"
                onClick={() => setFilterDate(null)}
              >
                {filterDate ? "Mostrar todos los días" : "Todos los días"}
              </Button>
            </div>

            {/* 2. Búsqueda */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Búsqueda
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cliente, pedido, teléfono, notas..."
                  className="pl-8 pr-7 h-8 text-xs w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Etapa Logística */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Etapa Logística
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterEtapa}
                onChange={(e) => setFilterEtapa(e.target.value)}
              >
                <option value="all">Todas las Etapas</option>
                {data.columns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Conductor Asignado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Conductor
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterChofer}
                onChange={(e) => setFilterChofer(e.target.value)}
              >
                <option value="all">Todos los Conductores</option>
                {data.drivers.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nombre} {d.apellido || ""} {d.vehiculo_placa ? `(${d.vehiculo_placa})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Zona de Despacho */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Zona de Despacho
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterZona}
                onChange={(e) => setFilterZona(e.target.value)}
              >
                <option value="all">Todas las Zonas</option>
                {data.zonas.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Estado de Pago */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Estado de Pago
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterPago}
                onChange={(e) => setFilterPago(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pagado">Pagados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>

            {/* 7. Prioridad */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Prioridad
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            {/* Botón Limpiar Filtros */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleResetFilters}
            >
              <RotateCcw className="size-3.5" />
              Limpiar Filtros
            </Button>
          </aside>
        )}

        {/* Main Area (Kanban / Table) */}
        <div className="flex-1 min-w-0 w-full overflow-hidden">

      {/* Main Content: Kanban or List */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-medium">Cargando pedidos desde la base de datos...</p>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD */
        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-4">
          <div className="flex gap-3.5 items-start min-w-max">
            {data.columns.map((col) => {
              const colPedidos = filteredPedidos.filter((p) => p.etapa_id === col.id);
              const colTotal = colPedidos.reduce(
                (sum, p) => sum + (Number(p.subtotal) > 0 ? Number(p.subtotal) : Number(p.total || 0) / 1.18),
                0
              );
              const isDropTarget = dragOverColId === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col)}
                  className={`w-72 min-w-[18rem] bg-muted/40 border rounded-xl flex flex-col max-h-[calc(100vh-320px)] min-h-[380px] shadow-xs transition-all duration-200 ${
                    isDropTarget
                      ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 shadow-md scale-[1.01]"
                      : ""
                  }`}
                >
                {/* Column Header */}
                <div className="p-3 border-b bg-card rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{col.nombre}</span>
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">
                      {colPedidos.length}
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    S/ {colTotal.toFixed(2)}
                  </span>
                </div>

                {/* Column Body: Order Cards */}
                <div className="p-2.5 overflow-y-auto flex flex-col gap-3 flex-1">
                  {colPedidos.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                      Arrastra pedidos aquí
                    </div>
                  ) : (
                    colPedidos.map((pedido) => {
                      const cliente =
                        (pedido.contacto_nombre
                          ? pedido.contacto_nombre + " " + (pedido.contacto_apellido || "")
                          : "") ||
                        pedido.empresa_nombre ||
                        pedido.contacto_persona_nombre ||
                        "Cliente General";
                      const isDragging = draggedOrderId === pedido.id;

                      return (
                        <Card
                          key={pedido.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, pedido.id)}
                          onDragEnd={() => {
                            setDraggedOrderId(null);
                            setDragOverColId(null);
                          }}
                          className={`p-3.5 bg-card hover:shadow-md transition-all border flex flex-col gap-2.5 text-sm cursor-grab active:cursor-grabbing select-none ${
                            isDragging
                              ? "opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/30"
                              : ""
                          }`}
                        >
                          {/* Card Top: Code & Menu */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary text-xs">
                              {pedido.numero_pedido || `PED-${pedido.id}`}
                            </span>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  pedido.estado_pago === "Pagado"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {pedido.estado_pago || "Pendiente"}
                              </Badge>

                              {/* Action Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Mover a Etapa</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {data.columns
                                    .filter((c) => c.id !== col.id)
                                    .map((targetCol) => (
                                      <DropdownMenuItem
                                        key={targetCol.id}
                                        onClick={() => handleStageChange(pedido, targetCol)}
                                        className="cursor-pointer"
                                      >
                                        <ArrowRight className="size-3.5 mr-2 text-muted-foreground" />
                                        {targetCol.nombre}
                                      </DropdownMenuItem>
                                    ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/pedidos/create?edit_id=${pedido.id}`} className="cursor-pointer">
                                      <Edit className="size-3.5 mr-2" />
                                      Editar Pedido
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => shareWhatsApp(pedido)} className="cursor-pointer">
                                    <Share2 className="size-3.5 mr-2 text-emerald-600" />
                                    Enviar a WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePedido(pedido.id)}
                                    className="text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Client & Address */}
                          <div>
                            <div className="font-semibold text-foreground text-sm">{cliente}</div>
                            {pedido.direccion_entrega && (
                              <div className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5 line-clamp-2">
                                <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                <span>{pedido.direccion_entrega}</span>
                              </div>
                            )}
                          </div>

                          {/* Products Summary */}
                          {pedido.productos_resumen && (
                            <div className="p-1.5 bg-muted/40 rounded text-xs text-muted-foreground flex items-center gap-1.5">
                              <Package className="size-3.5 shrink-0 text-primary" />
                              <span className="truncate">{pedido.productos_resumen}</span>
                            </div>
                          )}

                          {/* Logistics Tags */}
                          <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t">
                            {pedido.zona_nombre && (
                              <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                                📍 {pedido.zona_nombre}
                              </span>
                            )}
                            {pedido.chofer_n && (
                              <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                                🛵 {pedido.chofer_n}
                              </span>
                            )}
                            {pedido.fecha_entrega && (
                              <span className="bg-muted px-1.5 py-0.5 rounded ml-auto">
                                📅 {String(pedido.fecha_entrega).split("T")[0]}
                              </span>
                            )}
                          </div>

                          {/* Price & Quick Move */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-sm font-mono">
                                S/ {(Number(pedido.subtotal) > 0 ? Number(pedido.subtotal) : Number(pedido.total || 0) / 1.18).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">Sin IGV</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                const nextCol = data.columns.find((c) => c.orden === col.orden + 1);
                                if (nextCol) handleStageChange(pedido, nextCol);
                                else {
                                  const entregadoCol = data.columns.find((c) => c.es_entregado === 1);
                                  if (entregadoCol) handleStageChange(pedido, entregadoCol);
                                }
                              }}
                            >
                              Avanzar
                              <ChevronRight className="size-3" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Stage Column Button */}
          <div className="w-72 min-w-72 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 transition-colors">
            <Button variant="outline" size="sm" onClick={() => setShowNewColumnModal(true)} className="gap-2">
              <Plus className="size-4" />
              Nueva Etapa
            </Button>
          </div>
        </div>
      </div>
    ) : (
        /* TABLE VIEW */
        <Card className="bg-card">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">N° Pedido</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Dirección</TableHead>
                  <TableHead className="font-semibold">Productos</TableHead>
                  <TableHead className="font-semibold">Conductor</TableHead>
                  <TableHead className="font-semibold">Zona</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-center">Etapa</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      No se encontraron pedidos con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPedidos.map((pedido) => {
                    const etapa = data.columns.find((c) => c.id === pedido.etapa_id);
                    const cliente =
                      (pedido.contacto_nombre
                        ? pedido.contacto_nombre + " " + (pedido.contacto_apellido || "")
                        : "") ||
                      pedido.empresa_nombre ||
                      pedido.contacto_persona_nombre ||
                      "Cliente";

                    return (
                      <TableRow key={pedido.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-bold text-primary text-xs">
                          {pedido.numero_pedido || `PED-${pedido.id}`}
                        </TableCell>
                        <TableCell className="font-medium">{cliente}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {pedido.direccion_entrega || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {pedido.productos_resumen || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {pedido.chofer_n ? `${pedido.chofer_n} (${pedido.vehiculo_placa || "N/A"})` : "Sin asignar"}
                        </TableCell>
                        <TableCell className="text-xs">{pedido.zona_nombre || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {pedido.fecha_entrega ? String(pedido.fecha_entrega).split("T")[0] : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold font-mono">
                            S/ {(Number(pedido.subtotal) > 0 ? Number(pedido.subtotal) : Number(pedido.total || 0) / 1.18).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">Sin IGV</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {etapa?.nombre || "Registrado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600"
                              onClick={() => shareWhatsApp(pedido)}
                              title="Compartir por WhatsApp"
                            >
                              <Share2 className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Editar Pedido">
                              <Link href={`/pedidos/create?edit_id=${pedido.id}`}>
                                <Edit className="size-3.5 text-muted-foreground" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeletePedido(pedido.id)}
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      {/* DELIVERY MODAL (Confirmar Entrega y Generar Venta) */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-5" />
              Confirmar Entrega y Facturación
            </DialogTitle>
            <DialogDescription>
              Al completar la entrega, se creará automáticamente la venta en el módulo de Ventas y se actualizará el
              saldo de envases del cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Envases Entregados</label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={envasesEntregados}
                  onChange={(e) => setEnvasesEntregados(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Envases Recogidos/Devueltos</label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={envasesDevueltos}
                  onChange={(e) => setEnvasesDevueltos(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Persona que Recibió</label>
              <Input
                placeholder="Nombre de la persona que recepcionó"
                className="mt-1"
                value={quienRecibio}
                onChange={(e) => setQuienRecibio(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Monto Final Cobrado (S/)</label>
                <Input
                  type="number"
                  step="0.10"
                  className="mt-1 font-bold text-emerald-600"
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Método de Pago</label>
                <select
                  className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                  value={metodoPagoReal}
                  onChange={(e) => setMetodoPagoReal(e.target.value)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta POS</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="chkPendiente"
                className="rounded border"
                checked={pendientePago}
                onChange={(e) => setPendientePago(e.target.checked)}
              />
              <label htmlFor="chkPendiente" className="text-xs font-medium cursor-pointer">
                Marcar como <strong className="text-amber-600">Pendiente de Pago</strong> (Deuda / Crédito)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryModal(false)} disabled={submittingMove}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={submitDelivery}
              disabled={submittingMove}
            >
              <CheckCircle2 className="size-4" />
              {submittingMove ? "Guardando..." : "Confirmar Entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL MODAL */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Cancelar Pedido
            </DialogTitle>
            <DialogDescription>
              Indica la razón de la cancelación para registrar el historial en el CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-muted-foreground">Motivo de Cancelación</label>
            <textarea
              className="w-full h-24 p-2.5 mt-1 rounded-md border bg-background text-sm"
              placeholder="Ej: Cliente canceló por demora, dirección no encontrada, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={submittingMove}>
              Volver
            </Button>
            <Button variant="destructive" onClick={submitCancel} disabled={submittingMove}>
              {submittingMove ? "Cancelando..." : "Confirmar Cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW COLUMN MODAL */}
      <Dialog open={showNewColumnModal} onOpenChange={setShowNewColumnModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Etapa del Pipeline</DialogTitle>
            <DialogDescription>Agrega una columna personalizada para tu proceso logístico.</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-muted-foreground">Nombre de la Etapa</label>
            <Input
              placeholder="Ej: Control de Calidad, Empaque, etc."
              className="mt-1"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewColumnModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              Guardar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
