"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
  Package,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  RotateCcw,
  PieChart as PieChartIcon,
  FileText,
  MapPin,
  UserCheck,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

// Factor IGV Perú (18%)
const IGV_FACTOR = 1.18;

// Helper: Extraer monto NETO sin IGV de cada pedido
const getNetoPedido = (p: any): number => {
  if (p.subtotal && Number(p.subtotal) > 0) return Number(p.subtotal);
  return Number(p.total || 0) / IGV_FACTOR;
};

// Formato de moneda peruana
const formatPEN = (val: number): string => {
  return `S/ ${val.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Tooltip para Gráficas
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-card/95 p-2.5 shadow-md text-xs backdrop-blur-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => {
        const isMoney =
          entry.name?.toLowerCase().includes("monto") ||
          entry.name?.toLowerCase().includes("total") ||
          entry.name?.toLowerCase().includes("neto") ||
          entry.dataKey?.toLowerCase().includes("total");

        return (
          <div key={i} className="flex items-center gap-2 text-muted-foreground my-0.5">
            <span
              className="size-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span>{entry.name}:</span>
            <span className="font-bold text-foreground font-mono">
              {isMoney && typeof entry.value === "number"
                ? `${formatPEN(entry.value)} (Sin IGV)`
                : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function PedidosReportsPage() {
  const [columns, setColumns] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Layout state
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);

  // Filters state
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/pedidos/logistics-data");
      if (res.data) {
        setColumns(Array.isArray(res.data.columns) ? res.data.columns : []);
        setPedidos(Array.isArray(res.data.pedidos) ? res.data.pedidos : []);
        setZonas(Array.isArray(res.data.zonas) ? res.data.zonas : []);
        setDrivers(Array.isArray(res.data.drivers) ? res.data.drivers : []);
      }
    } catch (e) {
      console.error("Error loading logistics data for reports:", e);
      toast.error("Error al cargar datos analíticos de pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calendar Weekdays Strip
  const weekDays = useMemo(() => {
    const list = [];
    const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const start = new Date(now);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const label = dayLabels[d.getDay()];
      const dayNum = d.getDate();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;
      const isActive = filterDate === dateStr;

      const dayPedidos = pedidos.filter((p) => {
        if (!p.fecha_entrega) return false;
        return String(p.fecha_entrega).startsWith(dateStr);
      });

      list.push({
        dateStr,
        label,
        dayNum,
        isToday,
        isActive,
        totalCount: dayPedidos.length,
      });
    }
    return list;
  }, [pedidos, filterDate]);

  // Stage lookup map
  const stageMap = useMemo(() => {
    const map = new Map<number, any>();
    columns.forEach((s) => map.set(s.id, s));
    return map;
  }, [columns]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      period !== "all" ||
      filterDate !== null ||
      customStartDate !== "" ||
      customEndDate !== "" ||
      searchTerm.trim() !== "" ||
      selectedStage !== "all" ||
      selectedPriority !== "all" ||
      selectedPaymentStatus !== "all" ||
      selectedDriver !== "all" ||
      selectedZone !== "all"
    );
  }, [
    period,
    filterDate,
    customStartDate,
    customEndDate,
    searchTerm,
    selectedStage,
    selectedPriority,
    selectedPaymentStatus,
    selectedDriver,
    selectedZone,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setPeriod("all");
    setFilterDate(null);
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchTerm("");
    setSelectedStage("all");
    setSelectedPriority("all");
    setSelectedPaymentStatus("all");
    setSelectedDriver("all");
    setSelectedZone("all");
  };

  // Filtered orders
  const filteredPedidos = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const query = searchTerm.toLowerCase().trim();

    return pedidos.filter((p) => {
      // 1. Specific Date from Calendar Strip
      if (filterDate) {
        if (!p.fecha_entrega || !String(p.fecha_entrega).startsWith(filterDate)) {
          return false;
        }
      }

      // 2. Custom Date Range
      if (customStartDate || customEndDate) {
        if (!p.fecha_entrega) return false;
        const pDate = String(p.fecha_entrega).substring(0, 10);
        if (customStartDate && pDate < customStartDate) return false;
        if (customEndDate && pDate > customEndDate) return false;
      }

      // 3. Period (Month / Year) if no specific day filter
      if (!filterDate && !customStartDate && !customEndDate) {
        if (p.fecha_entrega) {
          const d = new Date(p.fecha_entrega);
          if (!isNaN(d.getTime())) {
            if (period === "month") {
              if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
            } else if (period === "year") {
              if (d.getFullYear() !== currentYear) return false;
            }
          }
        }
      }

      // 4. Stage
      if (selectedStage !== "all" && String(p.etapa_id) !== selectedStage) {
        return false;
      }

      // 5. Priority
      if (selectedPriority !== "all" && (p.prioridad || "Media") !== selectedPriority) {
        return false;
      }

      // 6. Payment Status
      if (selectedPaymentStatus !== "all") {
        if ((p.estado_pago || "pendiente").toLowerCase() !== selectedPaymentStatus.toLowerCase()) {
          return false;
        }
      }

      // 7. Driver
      if (selectedDriver !== "all" && String(p.chofer_id) !== selectedDriver) {
        return false;
      }

      // 8. Zone
      if (selectedZone !== "all" && String(p.zona) !== selectedZone) {
        return false;
      }

      // 9. Text Search
      if (query) {
        const client = (
          (p.contacto_nombre || "") +
          " " +
          (p.contacto_apellido || "") +
          " " +
          (p.empresa_nombre || "") +
          " " +
          (p.contacto_persona_nombre || "")
        ).toLowerCase();
        const numMatch = (p.numero_pedido || "").toLowerCase().includes(query);
        const dirMatch = (p.direccion_entrega || "").toLowerCase().includes(query);
        const prodMatch = (p.productos_resumen || "").toLowerCase().includes(query);
        const phoneMatch = (p.telefono_movil || "").includes(query);
        if (!client.includes(query) && !numMatch && !dirMatch && !prodMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    pedidos,
    period,
    filterDate,
    customStartDate,
    customEndDate,
    selectedStage,
    selectedPriority,
    selectedPaymentStatus,
    selectedDriver,
    selectedZone,
    searchTerm,
  ]);

  // Aggregate stats (TODOS LOS MONTOS SIN IGV)
  const stats = useMemo(() => {
    const totalCount = filteredPedidos.length;
    const totalMontoNeto = filteredPedidos.reduce((sum, p) => sum + getNetoPedido(p), 0);

    let deliveredCount = 0;
    let deliveredMontoNeto = 0;

    let inRouteCount = 0;
    let inRouteMontoNeto = 0;

    let pendingCount = 0;
    let pendingMontoNeto = 0;

    let cancelledCount = 0;
    let cancelledMontoNeto = 0;

    filteredPedidos.forEach((p) => {
      const st = stageMap.get(p.etapa_id);
      const neto = getNetoPedido(p);
      const isDelivered = st?.es_entregado === 1 || (st?.nombre || "").toLowerCase().includes("entregado");
      const isLost = st?.es_perdido === 1 || (st?.nombre || "").toLowerCase().includes("cancelado");
      const isRoute = (st?.nombre || "").toLowerCase().includes("ruta");

      if (isDelivered) {
        deliveredCount += 1;
        deliveredMontoNeto += neto;
      } else if (isLost) {
        cancelledCount += 1;
        cancelledMontoNeto += neto;
      } else if (isRoute) {
        inRouteCount += 1;
        inRouteMontoNeto += neto;
      } else {
        pendingCount += 1;
        pendingMontoNeto += neto;
      }
    });

    const completionRate = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;
    const avgTicketNeto = totalCount > 0 ? totalMontoNeto / totalCount : 0;

    // Distribution by Stage (Montos Netos sin IGV)
    const byStage = columns
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((st) => {
        const inThisStage = filteredPedidos.filter((p) => p.etapa_id === st.id);
        const count = inThisStage.length;
        const totalNeto = inThisStage.reduce((sum, p) => sum + getNetoPedido(p), 0);
        const isDelivered = st.es_entregado === 1 || st.nombre.toLowerCase().includes("entregado");
        const isLost = st.es_perdido === 1 || st.nombre.toLowerCase().includes("cancelado");
        const isRoute = st.nombre.toLowerCase().includes("ruta");

        const color = isDelivered ? "#10b981" : isLost ? "#f43f5e" : isRoute ? "#3b82f6" : "#f59e0b";

        return {
          stageId: st.id,
          nombre: st.nombre,
          orden: st.orden,
          isDelivered,
          isLost,
          count,
          totalNeto,
          fill: color,
        };
      });

    // Distribution by Driver
    const byDriver: Record<string, { count: number; totalNeto: number; nombre: string; placa: string }> = {};
    filteredPedidos.forEach((p) => {
      const driverName = p.chofer_n ? `${p.chofer_n} ${p.chofer_a || ""}`.trim() : "Sin Conductor Asignado";
      const placa = p.vehiculo_placa || "-";
      if (!byDriver[driverName]) {
        byDriver[driverName] = { count: 0, totalNeto: 0, nombre: driverName, placa };
      }
      byDriver[driverName].count += 1;
      byDriver[driverName].totalNeto += getNetoPedido(p);
    });

    const driversList = Object.values(byDriver).sort((a, b) => b.totalNeto - a.totalNeto);

    // Distribution by Zone
    const byZone: Record<string, { count: number; totalNeto: number }> = {};
    filteredPedidos.forEach((p) => {
      const zName = p.zona_nombre || "Sin Zona Asignada";
      if (!byZone[zName]) byZone[zName] = { count: 0, totalNeto: 0 };
      byZone[zName].count += 1;
      byZone[zName].totalNeto += getNetoPedido(p);
    });

    // Chart Data 1: Donut Status
    const statusPieData = [
      { name: "Entregados", value: deliveredCount, totalNeto: deliveredMontoNeto, color: "#10b981" },
      { name: "En Ruta", value: inRouteCount, totalNeto: inRouteMontoNeto, color: "#3b82f6" },
      { name: "Pendientes", value: pendingCount, totalNeto: pendingMontoNeto, color: "#f59e0b" },
      { name: "Cancelados", value: cancelledCount, totalNeto: cancelledMontoNeto, color: "#f43f5e" },
    ].filter((d) => d.value > 0);

    // Chart Data 2: Top Drivers (Sin IGV)
    const topDriversChartData = driversList.slice(0, 5).map((d) => ({
      name: d.nombre.length > 14 ? d.nombre.substring(0, 12) + "..." : d.nombre,
      "Carga Neta (Sin IGV)": Math.round(d.totalNeto),
      Despachos: d.count,
    }));

    return {
      totalCount,
      totalMontoNeto,
      deliveredCount,
      deliveredMontoNeto,
      inRouteCount,
      inRouteMontoNeto,
      pendingCount,
      pendingMontoNeto,
      cancelledCount,
      cancelledMontoNeto,
      completionRate,
      avgTicketNeto,
      byStage,
      driversList,
      byZone,
      statusPieData,
      topDriversChartData,
    };
  }, [filteredPedidos, columns, stageMap]);

  // Export to Excel (Sin IGV)
  const handleExportExcel = () => {
    if (filteredPedidos.length === 0) {
      toast.info("No hay pedidos que coincidan con los filtros seleccionados.");
      return;
    }

    const rows = filteredPedidos.map((p) => {
      const st = stageMap.get(p.etapa_id);
      const neto = getNetoPedido(p);
      const cliente =
        (p.contacto_nombre ? p.contacto_nombre + " " + (p.contacto_apellido || "") : "") ||
        p.empresa_nombre ||
        p.contacto_persona_nombre ||
        "Cliente General";

      return {
        "N° Pedido": p.numero_pedido || `PED-${p.id}`,
        "Cliente": cliente,
        "Teléfono": p.telefono_movil || p.telefono_fijo || "-",
        "Dirección Entrega": p.direccion_entrega || "-",
        "Zona": p.zona_nombre || "-",
        "Conductor": p.chofer_n ? `${p.chofer_n} ${p.chofer_a || ""}`.trim() : "Sin asignar",
        "Placa Vehículo": p.vehiculo_placa || "-",
        "Etapa": st?.nombre || "Sin etapa",
        "Prioridad": p.prioridad || "Media",
        "Productos Resumen": p.productos_resumen || "-",
        "Base Neta (PEN Sin IGV)": Number(neto.toFixed(2)),
        "Total (PEN Con IGV)": Number(Number(p.total || 0).toFixed(2)),
        "Estado Pago": (p.estado_pago || "Pendiente").toUpperCase(),
        "Método Pago": (p.metodo_pago || "Efectivo").toUpperCase(),
        "Fecha Entrega": p.fecha_entrega ? String(p.fecha_entrega).substring(0, 10) : "-",
        "Notas": p.notas || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Pedidos");
    XLSX.writeFile(wb, `Reporte_Pedidos_SinIGV_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Reporte descargado en Excel con base imponible (Sin IGV).");
  };

  // Export to PDF Ejecutivo Formal
  const handleExportPDF = () => {
    if (filteredPedidos.length === 0) {
      toast.info("No hay pedidos para generar el PDF.");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const nowStr = new Date().toLocaleDateString("es-PE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Cabecera Corporativa
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("NEXTLEAD NEGOCIOS - INFORME EJECUTIVO DE DESPACHOS", 14, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Trazabilidad Logística de Pedidos (Montos Netos sin IGV) | Generado: ${nowStr}`, 14, 18);

      // Resumen Ejecutivo de Métricas
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("1. Resumen de Despachos y Cumplimiento", 14, 32);

      const kpiData = [
        [
          `Facturación Neta Pedidos:\n${formatPEN(stats.totalMontoNeto)}`,
          `Entregados con Éxito:\n${stats.deliveredCount} (${stats.completionRate.toFixed(1)}%)`,
          `En Ruta / Despacho:\n${stats.inRouteCount} pedidos`,
          `Ticket Medio Neto:\n${formatPEN(stats.avgTicketNeto)}`,
        ],
        [
          `Monto Neto Entregado:\n${formatPEN(stats.deliveredMontoNeto)}`,
          `Pendientes de Entrega:\n${stats.pendingCount} pedidos`,
          `Cancelados / Reprog:\n${stats.cancelledCount} pedidos`,
          `Total de Órdenes:\n${stats.totalCount} pedidos`,
        ],
      ];

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        body: kpiData,
        styles: { fontSize: 8, cellPadding: 3, halign: "center", fontStyle: "bold" },
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Tabla Desempeño por Conductor
      const startAfterKpi = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 70;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("2. Desempeño y Carga por Conductor (Sin IGV)", 14, startAfterKpi);

      const driverRows = stats.driversList.map((d) => [
        d.nombre,
        d.placa,
        d.count.toString(),
        formatPEN(d.totalNeto),
      ]);

      autoTable(doc, {
        startY: startAfterKpi + 3,
        head: [["Conductor / Repartidor", "Placa", "Despachos", "Carga Neta Asignada (Sin IGV)"]],
        body: driverRows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      // Tabla Detalle de Pedidos
      const startAfterDrivers = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 120;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("3. Detalle de Pedidos Filtrados (Primeros 35 registros)", 14, startAfterDrivers);

      const pedidoRows = filteredPedidos.slice(0, 35).map((p) => {
        const st = stageMap.get(p.etapa_id);
        const neto = getNetoPedido(p);
        const cliente =
          (p.contacto_nombre ? p.contacto_nombre + " " + (p.contacto_apellido || "") : "") ||
          p.empresa_nombre ||
          "Cliente";

        return [
          p.numero_pedido || `PED-${p.id}`,
          cliente.length > 22 ? cliente.substring(0, 20) + "..." : cliente,
          st?.nombre || "Sin etapa",
          p.chofer_n ? `${p.chofer_n}` : "Sin asignar",
          p.zona_nombre || "-",
          formatPEN(neto),
          p.fecha_entrega ? String(p.fecha_entrega).substring(0, 10) : "-",
        ];
      });

      autoTable(doc, {
        startY: startAfterDrivers + 3,
        head: [["N° Pedido", "Cliente", "Etapa", "Conductor", "Zona", "Base Neta", "F. Entrega"]],
        body: pedidoRows,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      doc.save(`Informe_Ejecutivo_Pedidos_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Informe Ejecutivo de Pedidos descargado en PDF.");
    } catch (err: any) {
      console.error("Error al generar PDF de pedidos:", err);
      toast.error("Error al generar el documento PDF.");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-5 w-full min-w-0">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs"
            >
              <Link href="/pedidos/view">
                <ArrowLeft className="size-3.5 mr-1" />
                Volver a Pedidos
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold">
              Valores Netos (Sin IGV)
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="size-5 sm:size-6 text-indigo-600" />
            Reportes & Analítica de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Métricas de cumplimiento de entrega, volumen de carga, desempeño por conductor y gráficas logísticas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Left Filter Sidebar */}
          <Button
            variant={isFilterSidebarOpen ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
            title={isFilterSidebarOpen ? "Ocultar panel de filtros" : "Mostrar panel de filtros"}
          >
            {isFilterSidebarOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
            <span>{isFilterSidebarOpen ? "Ocultar Filtros" : "Filtros"}</span>
            {hasActiveFilters && (
              <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {/* Export PDF Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 gap-1.5 text-xs border-indigo-600/30 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
          >
            <FileText className="size-3.5 text-indigo-600" />
            Informe PDF
          </Button>

          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 gap-1.5 text-xs border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="size-3.5 text-emerald-600" />
            Exportar Excel
          </Button>

          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            asChild
          >
            <Link href="/pedidos/create">
              <Plus className="size-3.5" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Main Content Layout with Left Filter Sidebar */}
      <div className="flex flex-col lg:flex-row items-start gap-4 w-full min-w-0">
        {/* COLLAPSIBLE LEFT FILTER SIDEBAR */}
        {isFilterSidebarOpen && (
          <aside className="w-full lg:w-72 shrink-0 bg-card border rounded-xl p-3.5 shadow-xs space-y-4">
            {/* Header with Title and Reset */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Filter className="size-3.5 text-indigo-600" />
                <span>Filtros de Logística</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                    Activos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={handleResetFilters}
                    title="Restablecer todos los filtros"
                  >
                    <RotateCcw className="size-3" />
                    Limpiar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsFilterSidebarOpen(false)}
                  title="Ocultar panel"
                >
                  <PanelLeftClose className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* 1. Período Rápido */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Período
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  className={`h-7 rounded text-[11px] font-medium transition-all ${
                    period === "all" && !filterDate && !customStartDate && !customEndDate
                      ? "bg-secondary text-secondary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setPeriod("all");
                    setFilterDate(null);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Histórico
                </button>
                <button
                  type="button"
                  className={`h-7 rounded text-[11px] font-medium transition-all ${
                    period === "month" && !filterDate && !customStartDate && !customEndDate
                      ? "bg-secondary text-secondary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setPeriod("month");
                    setFilterDate(null);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  className={`h-7 rounded text-[11px] font-medium transition-all ${
                    period === "year" && !filterDate && !customStartDate && !customEndDate
                      ? "bg-secondary text-secondary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setPeriod("year");
                    setFilterDate(null);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Este Año
                </button>
              </div>
            </div>

            {/* 2. Semana Actual (Tira de 7 Días) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Semana Actual:</span>
                </div>
                {filterDate !== null && (
                  <button
                    onClick={() => setFilterDate(null)}
                    className="text-[10px] text-indigo-600 hover:underline font-medium"
                  >
                    Ver todos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-7 gap-1 w-full">
                {weekDays.map((day) => {
                  const isSelected = filterDate === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => {
                        setFilterDate(isSelected ? null : day.dateStr);
                        if (!isSelected) {
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }
                      }}
                      title={`${day.label} ${day.dayNum} (${day.totalCount} pedidos)`}
                      className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-md border text-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
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
                              ? "bg-white/30 text-white"
                              : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400"
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

              {filterDate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[11px] font-medium"
                  onClick={() => setFilterDate(null)}
                >
                  Mostrar todos los días
                </Button>
              )}
            </div>

            {/* 3. Rango de Fechas Personalizado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Rango Personalizado
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Desde</span>
                  <Input
                    type="date"
                    className="h-7 text-[11px] px-2 w-full"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setFilterDate(null);
                    }}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Hasta</span>
                  <Input
                    type="date"
                    className="h-7 text-[11px] px-2 w-full"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setFilterDate(null);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Búsqueda */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Búsqueda Textual
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cliente, N° pedido, dirección, chofer..."
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

            {/* 5. Etapa del Pedido */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Etapa de Entrega
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                <option value="all">Todas las Etapas</option>
                {columns.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nombre} {st.es_entregado === 1 ? "✓" : st.es_perdido === 1 ? "✗" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Conductor / Repartidor */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Conductor / Repartidor
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
              >
                <option value="all">Todos los Conductores</option>
                {drivers.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nombre} {d.apellido || ""} {d.vehiculo_placa ? `(${d.vehiculo_placa})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Zona de Despacho */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Zona de Cobertura
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="all">Todas las Zonas</option>
                {zonas.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Estado de Pago */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Estado de Cobro
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pagado">Pagados</option>
                <option value="pendiente">Pendientes de Pago</option>
              </select>
            </div>

            {/* Summary count */}
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Pedidos filtrados:</span>
              <strong className="text-foreground font-mono">{filteredPedidos.length} órdenes</strong>
            </div>
          </aside>
        )}

        {/* RIGHT FULL-WIDTH CONTENT COLUMN */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* 1. Primary Advanced KPI Cards (MONTOS SIN IGV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full min-w-0">
            {/* Facturación Neta de Pedidos */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Carga Total de Pedidos</CardTitle>
                  <span className="text-[10px] text-indigo-600 font-mono font-medium block">Sin IGV (Base)</span>
                </div>
                <Layers className="size-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatPEN(stats.totalMontoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  En {stats.totalCount} pedidos registrados
                </p>
              </CardContent>
            </Card>

            {/* Entregados con Éxito */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Entregados con Éxito</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">Tasa: {stats.completionRate.toFixed(1)}%</span>
                </div>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600 font-mono">
                  {formatPEN(stats.deliveredMontoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <strong className="text-foreground">{stats.deliveredCount}</strong> órdenes entregadas
                </p>
              </CardContent>
            </Card>

            {/* En Ruta / Despacho */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">En Ruta / Tránsito</CardTitle>
                  <span className="text-[10px] text-blue-600 font-mono font-medium block">Flota en camino</span>
                </div>
                <Truck className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600 font-mono">
                  {formatPEN(stats.inRouteMontoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {stats.inRouteCount} órdenes en tránsito
                </p>
              </CardContent>
            </Card>

            {/* Pendientes de Preparación */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pendientes de Salida</CardTitle>
                  <span className="text-[10px] text-amber-600 font-mono font-medium block">Por despachar</span>
                </div>
                <Clock className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600 font-mono">
                  {formatPEN(stats.pendingMontoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {stats.pendingCount} órdenes en almacén
                </p>
              </CardContent>
            </Card>

            {/* Ticket Promedio Neto */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Medio</CardTitle>
                  <span className="text-[10px] text-purple-600 font-mono font-medium block">Sin IGV / Orden</span>
                </div>
                <Package className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatPEN(stats.avgTicketNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cancelados: {stats.cancelledCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. VISUAL CHARTS ROW (GRÁFICAS EN VIVO) */}
          {mounted && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full min-w-0">
              {/* Gráfica 1: Valor Neto por Etapa (BarChart) */}
              <Card className="lg:col-span-2 bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-indigo-600" />
                    Valor de Carga Neta por Etapa de Despacho (Sin IGV)
                  </CardTitle>
                  <CardDescription>
                    Distribución del monto neto de pedidos en cada fase de la logística.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-2 sm:px-4">
                  {stats.byStage.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                      Sin datos para graficar.
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.byStage}
                          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="nombre"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `S/ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                            tick={{ fontSize: 11 }}
                          />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="totalNeto"
                            name="Carga Neta (Sin IGV)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                          >
                            {stats.byStage.map((entry, index) => (
                              <Cell key={`cell-st-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfica 2: Estado de Cumplimiento (Donut Chart) */}
              <Card className="bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="size-4 text-emerald-600" />
                    Estado de Cumplimiento
                  </CardTitle>
                  <CardDescription>
                    Proporción de entregas realizadas vs pendientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-2">
                  {stats.statusPieData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                      Sin datos para graficar.
                    </div>
                  ) : (
                    <div className="h-64 w-full flex flex-col items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="80%">
                        <RechartsPieChart>
                          <Pie
                            data={stats.statusPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                          >
                            {stats.statusPieData.map((entry, index) => (
                              <Cell key={`pie-ped-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomChartTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>

                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-1">
                        {stats.statusPieData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}:</span>
                            <strong className="text-foreground font-mono">{d.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfica 3: Carga por Conductor */}
          {mounted && stats.topDriversChartData.length > 0 && (
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="size-4 text-indigo-600" />
                  Carga y Despachos por Conductor (Sin IGV)
                </CardTitle>
                <CardDescription>
                  Volumen monetario neto asignado y cantidad de entregas por unidad de reparto.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-2 sm:px-4">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topDriversChartData}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `S/ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                        tick={{ fontSize: 11 }}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar dataKey="Carga Neta (Sin IGV)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Despachos" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Distribution Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
            {/* Desglose por Etapa */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="size-4 text-indigo-600" />
                  Resumen de Pedidos por Etapa (Sin IGV)
                </CardTitle>
                <CardDescription>Conteo y monto neto acumulado en cada fase.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-center">Órdenes</TableHead>
                      <TableHead className="text-right">Monto Neto (Sin IGV)</TableHead>
                      <TableHead className="text-right">% Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byStage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Sin etapas configuradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.byStage.map((st) => {
                        const share = stats.totalMontoNeto > 0 ? (st.totalNeto / stats.totalMontoNeto) * 100 : 0;
                        return (
                          <TableRow key={st.stageId} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="size-2 rounded-full inline-block" style={{ backgroundColor: st.fill }} />
                              {st.nombre}
                            </TableCell>
                            <TableCell className="text-center font-mono">{st.count}</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatPEN(st.totalNeto)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {share.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Desglose por Zona */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="size-4 text-amber-500" />
                  Resumen por Zona de Cobertura (Sin IGV)
                </CardTitle>
                <CardDescription>Distribución geográfica de la demanda logística.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Zona</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-right">Total Neto (Sin IGV)</TableHead>
                      <TableHead className="text-right">% Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.byZone).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Sin datos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(stats.byZone).map(([zName, data]) => {
                        const share = stats.totalMontoNeto > 0 ? (data.totalNeto / stats.totalMontoNeto) * 100 : 0;
                        return (
                          <TableRow key={zName} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-foreground">{zName}</TableCell>
                            <TableCell className="text-center font-mono">{data.count}</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatPEN(data.totalNeto)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {share.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* 4. Detailed Filtered Orders Table */}
          <Card className="bg-card shadow-xs border">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="size-4 text-indigo-600" />
                    Detalle de Pedidos Registrados (Base Imponible sin IGV)
                  </CardTitle>
                  <CardDescription>
                    {filteredPedidos.length} órdenes encontradas según los filtros activos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-[90px]">N° Pedido</TableHead>
                    <TableHead>Cliente / Contacto</TableHead>
                    <TableHead>Conductor / Placa</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead className="text-center">Etapa</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                    <TableHead className="text-right font-semibold">Total Neto (Sin IGV)</TableHead>
                    <TableHead className="text-center">F. Entrega</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No se encontraron pedidos con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPedidos.map((p) => {
                      const st = stageMap.get(p.etapa_id);
                      const neto = getNetoPedido(p);
                      const cliente =
                        (p.contacto_nombre ? p.contacto_nombre + " " + (p.contacto_apellido || "") : "") ||
                        p.empresa_nombre ||
                        p.contacto_persona_nombre ||
                        "Cliente General";

                      const isDelivered = st?.es_entregado === 1 || (st?.nombre || "").toLowerCase().includes("entregado");
                      const isLost = st?.es_perdido === 1 || (st?.nombre || "").toLowerCase().includes("cancelado");
                      const isRoute = (st?.nombre || "").toLowerCase().includes("ruta");

                      return (
                        <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-foreground">
                            {p.numero_pedido || `PED-${p.id}`}
                          </TableCell>
                          <TableCell className="max-w-[190px] truncate">
                            <div className="font-medium text-foreground">{cliente}</div>
                            {p.telefono_movil && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {p.telefono_movil}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-muted-foreground">
                            {p.chofer_n ? `${p.chofer_n} (${p.vehiculo_placa || "S.P."})` : "Sin asignar"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.zona_nombre || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isDelivered
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : isLost
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                  : isRoute
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {st?.nombre || "Sin Etapa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] ${
                                (p.estado_pago || "").toLowerCase() === "pagado"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {(p.estado_pago || "Pendiente").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            {formatPEN(neto)}
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-muted-foreground whitespace-nowrap">
                            {p.fecha_entrega ? String(p.fecha_entrega).substring(0, 10) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-xs"
                            >
                              <Link href={`/pedidos/create?edit_id=${p.id}`}>
                                Ver / Editar
                                <ExternalLink className="size-3 ml-1" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
