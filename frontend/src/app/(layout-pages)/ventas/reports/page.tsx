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
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  RefreshCw,
  CreditCard,
  Package,
  Calendar,
  Building2,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Filter,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  RotateCcw,
  Receipt,
  BarChart3,
  FileText,
  Wrench,
  FileCheck,
  AlertCircle,
} from "lucide-react";

// Factor IGV Perú (18%)
const IGV_FACTOR = 1.18;

// Helper: Extraer monto NETO sin IGV de cada venta
const getNetoVenta = (s: any): number => {
  if (s.subtotal && Number(s.subtotal) > 0) return Number(s.subtotal);
  return Number(s.total || 0) / IGV_FACTOR;
};

// Helper: Extraer monto pagado NETO sin IGV
const getNetoCobrado = (s: any): number => {
  return Number(s.monto_pagado || 0) / IGV_FACTOR;
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
          entry.name?.toLowerCase().includes("cobrado") ||
          entry.name?.toLowerCase().includes("facturado") ||
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

export default function SalesReportsPage() {
  const [sales, setSales] = useState<any[]>([]);
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
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [selectedInstallStatus, setSelectedInstallStatus] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/sales");
      setSales(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error loading sales for reports:", e);
      toast.error("Error al cargar datos analíticos de ventas.");
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

      const daySales = sales.filter((s) => {
        if (!s.fecha_venta) return false;
        return String(s.fecha_venta).startsWith(dateStr);
      });

      list.push({
        dateStr,
        label,
        dayNum,
        isToday,
        isActive,
        totalCount: daySales.length,
      });
    }
    return list;
  }, [sales, filterDate]);

  // Unique payment methods
  const paymentMethodsList = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      const m = s.metodo_pago?.trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [sales]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      period !== "all" ||
      filterDate !== null ||
      customStartDate !== "" ||
      customEndDate !== "" ||
      searchTerm.trim() !== "" ||
      selectedDocType !== "all" ||
      selectedPaymentStatus !== "all" ||
      selectedMethod !== "all" ||
      selectedInstallStatus !== "all"
    );
  }, [
    period,
    filterDate,
    customStartDate,
    customEndDate,
    searchTerm,
    selectedDocType,
    selectedPaymentStatus,
    selectedMethod,
    selectedInstallStatus,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setPeriod("all");
    setFilterDate(null);
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchTerm("");
    setSelectedDocType("all");
    setSelectedPaymentStatus("all");
    setSelectedMethod("all");
    setSelectedInstallStatus("all");
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const query = searchTerm.toLowerCase().trim();

    return sales.filter((s) => {
      // 1. Specific Date from Calendar Strip
      if (filterDate) {
        if (!s.fecha_venta || !String(s.fecha_venta).startsWith(filterDate)) {
          return false;
        }
      }

      // 2. Custom Date Range
      if (customStartDate || customEndDate) {
        if (!s.fecha_venta) return false;
        const sDate = String(s.fecha_venta).substring(0, 10);
        if (customStartDate && sDate < customStartDate) return false;
        if (customEndDate && sDate > customEndDate) return false;
      }

      // 3. Period (Month / Year) if no specific day filter
      if (!filterDate && !customStartDate && !customEndDate) {
        if (s.fecha_venta) {
          const d = new Date(s.fecha_venta);
          if (!isNaN(d.getTime())) {
            if (period === "month") {
              if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
            } else if (period === "year") {
              if (d.getFullYear() !== currentYear) return false;
            }
          }
        }
      }

      // 4. Document Type
      if (selectedDocType !== "all") {
        if ((s.tipo_comprobante || "").toLowerCase() !== selectedDocType.toLowerCase()) {
          return false;
        }
      }

      // 5. Payment Status
      if (selectedPaymentStatus !== "all") {
        if ((s.estado_pago || "").toLowerCase() !== selectedPaymentStatus.toLowerCase()) {
          return false;
        }
      }

      // 6. Payment Method
      if (selectedMethod !== "all") {
        if ((s.metodo_pago || "").trim() !== selectedMethod) {
          return false;
        }
      }

      // 7. Installation Status
      if (selectedInstallStatus !== "all") {
        if ((s.estado_instalacion || "pendiente").toLowerCase() !== selectedInstallStatus.toLowerCase()) {
          return false;
        }
      }

      // 8. Text Search
      if (query) {
        const clientMatch = (s.cliente_nombre_completo || "").toLowerCase().includes(query);
        const docMatch = (s.numero_documento || "").toLowerCase().includes(query);
        const numMatch = (s.numero_venta || "").toLowerCase().includes(query);
        const prodMatch = (s.productos_detalle || "").toLowerCase().includes(query);
        if (!clientMatch && !docMatch && !numMatch && !prodMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    sales,
    period,
    filterDate,
    customStartDate,
    customEndDate,
    selectedDocType,
    selectedPaymentStatus,
    selectedMethod,
    selectedInstallStatus,
    searchTerm,
  ]);

  // Aggregate stats (MONTOS SIN IGV)
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    const totalMontoNeto = filteredSales.reduce((sum, s) => sum + getNetoVenta(s), 0);
    const totalCobradoNeto = filteredSales.reduce((sum, s) => sum + getNetoCobrado(s), 0);
    const totalPendienteNeto = Math.max(0, totalMontoNeto - totalCobradoNeto);
    const pctCobrado = totalMontoNeto > 0 ? (totalCobradoNeto / totalMontoNeto) * 100 : 0;
    const ticketPromedioNeto = totalCount > 0 ? totalMontoNeto / totalCount : 0;

    // Métricas de Operaciones e Instalaciones
    let instaladosCount = 0;
    let enProcesoCount = 0;
    let pendientesInstCount = 0;
    let expedientesAprobados = 0;

    filteredSales.forEach((s) => {
      const inst = (s.estado_instalacion || "pendiente").toLowerCase();
      if (inst === "instalado") instaladosCount += 1;
      else if (inst === "en_proceso") enProcesoCount += 1;
      else pendientesInstCount += 1;

      if ((s.estado_aprobacion || "pendiente").toLowerCase() === "aprobado") {
        expedientesAprobados += 1;
      }
    });

    const pctInstalado = totalCount > 0 ? (instaladosCount / totalCount) * 100 : 0;
    const pctAprobadoDoc = totalCount > 0 ? (expedientesAprobados / totalCount) * 100 : 0;

    // By Payment Method (Montos Netos sin IGV)
    const byMethod: Record<string, { count: number; totalNeto: number }> = {};
    filteredSales.forEach((s) => {
      const met = (s.metodo_pago || "Efectivo").trim();
      if (!byMethod[met]) byMethod[met] = { count: 0, totalNeto: 0 };
      byMethod[met].count += 1;
      byMethod[met].totalNeto += getNetoVenta(s);
    });

    // By Document Type (Montos Netos sin IGV)
    const byDoc: Record<string, { count: number; totalNeto: number }> = {};
    filteredSales.forEach((s) => {
      const doc = (s.tipo_comprobante || "nota_venta").trim();
      if (!byDoc[doc]) byDoc[doc] = { count: 0, totalNeto: 0 };
      byDoc[doc].count += 1;
      byDoc[doc].totalNeto += getNetoVenta(s);
    });

    // Chart Data 1: Comprobantes Donut (Sin IGV)
    const docColorMap: Record<string, string> = {
      factura: "#3b82f6",
      boleta: "#10b981",
      nota_venta: "#f59e0b",
    };
    const docPieData = Object.entries(byDoc).map(([doc, data]) => ({
      name: doc.toUpperCase().replace("_", " "),
      value: data.count,
      totalNeto: data.totalNeto,
      color: docColorMap[doc.toLowerCase()] || "#8b5cf6",
    }));

    // Chart Data 2: Metodos Bar (Sin IGV)
    const methodColors = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
    const methodChartData = Object.entries(byMethod).map(([method, data], idx) => ({
      name: method,
      "Facturación Neta (Sin IGV)": Math.round(data.totalNeto),
      Operaciones: data.count,
      color: methodColors[idx % methodColors.length],
    }));

    // Chart Data 3: Operaciones e Instalaciones
    const operationsData = [
      { name: "Instalados", cantidad: instaladosCount, fill: "#10b981" },
      { name: "En Proceso", cantidad: enProcesoCount, fill: "#3b82f6" },
      { name: "Pendiente Factib.", cantidad: pendientesInstCount, fill: "#f59e0b" },
    ];

    return {
      totalCount,
      totalMontoNeto,
      totalCobradoNeto,
      totalPendienteNeto,
      pctCobrado,
      ticketPromedioNeto,
      instaladosCount,
      enProcesoCount,
      pendientesInstCount,
      expedientesAprobados,
      pctInstalado,
      pctAprobadoDoc,
      byMethod,
      byDoc,
      docPieData,
      methodChartData,
      operationsData,
    };
  }, [filteredSales]);

  // Export Excel (Con desglose sin IGV)
  const handleExport = () => {
    if (filteredSales.length === 0) {
      toast.info("No hay ventas para exportar.");
      return;
    }

    const rows = filteredSales.map((s) => {
      const neto = getNetoVenta(s);
      const igv = Number(s.total || 0) - neto;
      const pagadoNeto = getNetoCobrado(s);

      return {
        "N° Venta": s.numero_venta || `VEN-${s.id}`,
        "Tipo Comprobante": (s.tipo_comprobante || "Nota de Venta").toUpperCase().replace("_", " "),
        "Fecha": s.fecha_venta ? String(s.fecha_venta).replace("T", " ").substring(0, 16) : "-",
        "Cliente": s.cliente_nombre_completo || "Cliente General",
        "RUC / DNI": s.numero_documento || "-",
        "Subtotal / Base (PEN Sin IGV)": Number(neto.toFixed(2)),
        "IGV (PEN 18%)": Number(igv.toFixed(2)),
        "Total Facturado (PEN Con IGV)": Number(Number(s.total || 0).toFixed(2)),
        "Monto Pagado Neto (PEN Sin IGV)": Number(pagadoNeto.toFixed(2)),
        "Estado Pago": (s.estado_pago || "Pendiente").toUpperCase(),
        "Método de Pago": (s.metodo_pago || "Efectivo").toUpperCase(),
        "Estado Instalación": (s.estado_instalacion || "Pendiente").toUpperCase(),
        "Expediente Documental": (s.estado_aprobacion || "Pendiente").toUpperCase(),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Ventas");
    XLSX.writeFile(wb, `Reporte_Financiero_Ventas_SinIGV_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Reporte descargado en Excel con base imponible (Sin IGV).");
  };

  // Export PDF Ejecutivo Formal
  const handleExportPDF = () => {
    if (filteredSales.length === 0) {
      toast.info("No hay ventas para generar el PDF.");
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
      doc.text("NEXTLEAD NEGOCIOS - INFORME FINANCIERO Y VENTAS", 14, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Resumen de Cobranza e Instalaciones (Valores Netos sin IGV) | Generado: ${nowStr}`, 14, 18);

      // 1. Resumen Financiero
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("1. Resumen Financiero y Recaudación Neta", 14, 32);

      const kpiData = [
        [
          `Facturación Neta Total:\n${formatPEN(stats.totalMontoNeto)}`,
          `Recaudado Neto:\n${formatPEN(stats.totalCobradoNeto)} (${stats.pctCobrado.toFixed(1)}%)`,
          `Saldo Pendiente Neto:\n${formatPEN(stats.totalPendienteNeto)}`,
          `Ticket Medio Neto:\n${formatPEN(stats.ticketPromedioNeto)}`,
        ],
        [
          `Transacciones:\n${stats.totalCount} operaciones`,
          `Instaladas con Éxito:\n${stats.instaladosCount} (${stats.pctInstalado.toFixed(1)}%)`,
          `Expedientes Aprobados:\n${stats.expedientesAprobados} (${stats.pctAprobadoDoc.toFixed(1)}%)`,
          `Pendientes Factibilidad:\n${stats.pendientesInstCount} ventas`,
        ],
      ];

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        body: kpiData,
        styles: { fontSize: 8, cellPadding: 3, halign: "center", fontStyle: "bold" },
        headStyles: { fillColor: [16, 185, 129] },
      });

      // 2. Desglose por Método de Cobro
      const startAfterKpi = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 70;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("2. Recaudación por Canal de Pago (Sin IGV)", 14, startAfterKpi);

      const methodRows = Object.entries(stats.byMethod).map(([m, d]) => {
        const share = stats.totalMontoNeto > 0 ? (d.totalNeto / stats.totalMontoNeto) * 100 : 0;
        return [m, d.count.toString(), formatPEN(d.totalNeto), `${share.toFixed(1)}%`];
      });

      autoTable(doc, {
        startY: startAfterKpi + 3,
        head: [["Canal de Pago", "Operaciones", "Facturado Neto (Sin IGV)", "% Participación"]],
        body: methodRows,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      // 3. Detalle de Comprobantes
      const startAfterMethods = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 120;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("3. Detalle de Ventas Registradas (Primeras 35 operaciones)", 14, startAfterMethods);

      const salesRows = filteredSales.slice(0, 35).map((s) => {
        const neto = getNetoVenta(s);
        const pagadoNeto = getNetoCobrado(s);
        return [
          s.numero_venta || `VEN-${s.id}`,
          (s.tipo_comprobante || "nota_venta").toUpperCase().replace("_", " "),
          s.cliente_nombre_completo ? (s.cliente_nombre_completo.length > 25 ? s.cliente_nombre_completo.substring(0, 23) + "..." : s.cliente_nombre_completo) : "Cliente",
          s.metodo_pago || "Efectivo",
          (s.estado_pago || "pendiente").toUpperCase(),
          formatPEN(neto),
          formatPEN(pagadoNeto),
        ];
      });

      autoTable(doc, {
        startY: startAfterMethods + 3,
        head: [["N° Venta", "Tipo", "Cliente", "Método", "Estado", "Base Neta", "Cobrado Neto"]],
        body: salesRows,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      doc.save(`Informe_Ejecutivo_Ventas_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Informe Ejecutivo de Ventas descargado en PDF.");
    } catch (err: any) {
      console.error("Error al generar PDF de ventas:", err);
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
              <Link href="/ventas/view">
                <ArrowLeft className="size-3.5 mr-1" />
                Volver a Ventas
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
              Base Imponible (Sin IGV)
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="size-5 sm:size-6 text-emerald-600" />
            Reportes & Rendimiento de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Métricas ejecutivas de facturación neta, efectividad de cobranza, estado de instalaciones y expediente documental.
          </p>
        </div>

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
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
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
            onClick={handleExport}
            className="h-8 gap-1.5 text-xs border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="size-3.5 text-emerald-600" />
            Exportar Excel
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
                <Filter className="size-3.5 text-emerald-600" />
                <span>Filtros de Ventas</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
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
                    className="text-[10px] text-emerald-600 hover:underline font-medium"
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
                      title={`${day.label} ${day.dayNum} (${day.totalCount} ventas)`}
                      className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-md border text-center transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
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
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
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
                  placeholder="Cliente, RUC, N° venta, producto..."
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

            {/* 5. Estado de Instalación */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Estado Instalación
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                value={selectedInstallStatus}
                onChange={(e) => setSelectedInstallStatus(e.target.value)}
              >
                <option value="all">Todas las Instalaciones</option>
                <option value="instalado">✓ Instalado / Operativo</option>
                <option value="en_proceso">⏳ En Proceso Técnico</option>
                <option value="pendiente">⚠ Pendiente Factibilidad</option>
              </select>
            </div>

            {/* 6. Tipo de Comprobante */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Tipo de Comprobante
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
              >
                <option value="all">Todos los Comprobantes</option>
                <option value="factura">Factura Electrónica</option>
                <option value="boleta">Boleta Electrónica</option>
                <option value="nota_venta">Nota de Venta</option>
              </select>
            </div>

            {/* 7. Estado de Pago */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Estado de Pago
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pagado">Pagado / Liquidado</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Pago Parcial</option>
              </select>
            </div>

            {/* 8. Método de Pago */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Método de Pago
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
              >
                <option value="all">Todos los Métodos</option>
                {paymentMethodsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary count */}
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Ventas filtradas:</span>
              <strong className="text-foreground font-mono">{filteredSales.length} regs</strong>
            </div>
          </aside>
        )}

        {/* RIGHT FULL-WIDTH CONTENT COLUMN */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* 1. KPI Cards (MONTOS SIN IGV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full min-w-0">
            {/* Facturación Neta */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Facturación Neta</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">Sin IGV (Base)</span>
                </div>
                <DollarSign className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatPEN(stats.totalMontoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  En {stats.totalCount} ventas registradas
                </p>
              </CardContent>
            </Card>

            {/* Recaudación Efectiva Neta */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Recaudación Neta</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">Cobrado Neto</span>
                </div>
                <CheckCircle2 className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600 font-mono">
                  {formatPEN(stats.totalCobradoNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Efectividad: <strong className="text-foreground">{stats.pctCobrado.toFixed(1)}%</strong>
                </p>
              </CardContent>
            </Card>

            {/* Saldo Pendiente Neto */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Saldo por Cobrar</CardTitle>
                  <span className="text-[10px] text-amber-600 font-mono font-medium block">Pendiente Neto</span>
                </div>
                <Clock className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600 font-mono">
                  {formatPEN(stats.totalPendienteNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Pendiente de liquidación</p>
              </CardContent>
            </Card>

            {/* Instalaciones Completadas */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Instaladas</CardTitle>
                  <span className="text-[10px] text-indigo-600 font-mono font-medium block">Tasa de Conexión</span>
                </div>
                <Wrench className="size-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-indigo-600">
                  {stats.pctInstalado.toFixed(1)}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {stats.instaladosCount} de {stats.totalCount} servicios activos
                </p>
              </CardContent>
            </Card>

            {/* Salud Documental */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Expedientes Aprobados</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">Legal / Conforme</span>
                </div>
                <FileCheck className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {stats.pctAprobadoDoc.toFixed(1)}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {stats.expedientesAprobados} contratos conformes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. VISUAL CHARTS ROW (GRÁFICAS EN VIVO) */}
          {mounted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
              {/* Gráfica 1: Composición por Tipo de Comprobante (Donut sin IGV) */}
              <Card className="bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="size-4 text-emerald-600" />
                    Distribución por Tipo de Comprobante (Sin IGV)
                  </CardTitle>
                  <CardDescription>
                    Participación de Facturas, Boletas y Notas de Venta en la base imponible neta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-2">
                  {stats.docPieData.length === 0 ? (
                    <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                      Sin datos para graficar.
                    </div>
                  ) : (
                    <div className="h-60 w-full flex flex-col items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="80%">
                        <RechartsPieChart>
                          <Pie
                            data={stats.docPieData}
                            dataKey="totalNeto"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                          >
                            {stats.docPieData.map((entry, index) => (
                              <Cell key={`pie-doc-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomChartTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>

                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-1">
                        {stats.docPieData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}:</span>
                            <strong className="text-foreground font-mono">
                              {formatPEN(d.totalNeto)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfica 2: Facturación por Método de Pago (BarChart sin IGV) */}
              <Card className="bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-emerald-600" />
                    Recaudación Neta por Canal de Pago (Sin IGV)
                  </CardTitle>
                  <CardDescription>
                    Volumen neto recaudado a través de cada canal y pasarela de cobro.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-2 sm:px-4">
                  {stats.methodChartData.length === 0 ? (
                    <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                      Sin datos para graficar.
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.methodChartData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="name"
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
                            dataKey="Facturación Neta (Sin IGV)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                          >
                            {stats.methodChartData.map((entry, index) => (
                              <Cell key={`cell-met-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. Distribution Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
            {/* Métodos de Pago */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="size-4 text-emerald-600" />
                  Detalle Numérico por Método de Cobro (Sin IGV)
                </CardTitle>
                <CardDescription>Operaciones y porcentaje de recaudación neta.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Método</TableHead>
                      <TableHead className="text-center">Operaciones</TableHead>
                      <TableHead className="text-right">Total Neto (Sin IGV)</TableHead>
                      <TableHead className="text-right">% Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.byMethod).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Sin datos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(stats.byMethod).map(([method, data]) => {
                        const share = stats.totalMontoNeto > 0 ? (data.totalNeto / stats.totalMontoNeto) * 100 : 0;
                        return (
                          <TableRow key={method} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-foreground">{method}</TableCell>
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

            {/* Tipos de Comprobante */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="size-4 text-emerald-600" />
                  Detalle Numérico por Comprobante (Sin IGV)
                </CardTitle>
                <CardDescription>Composición fiscal (Facturas, Boletas, Notas de Venta).</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Tipo Documento</TableHead>
                      <TableHead className="text-center">Comprobantes</TableHead>
                      <TableHead className="text-right">Total Neto (Sin IGV)</TableHead>
                      <TableHead className="text-right">% Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.byDoc).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Sin datos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(stats.byDoc).map(([doc, data]) => {
                        const share = stats.totalMontoNeto > 0 ? (data.totalNeto / stats.totalMontoNeto) * 100 : 0;
                        return (
                          <TableRow key={doc} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-foreground uppercase">
                              {doc.replace("_", " ")}
                            </TableCell>
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

          {/* 4. Detailed Filtered Sales Table */}
          <Card className="bg-card shadow-xs border">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="size-4 text-emerald-600" />
                    Detalle de Ventas Registradas (Base Imponible sin IGV)
                  </CardTitle>
                  <CardDescription>
                    {filteredSales.length} transacciones encontradas según los filtros activos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-[90px]">N° Venta</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Método</TableHead>
                    <TableHead className="text-center">Instalación</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right font-semibold">Base Neta (Sin IGV)</TableHead>
                    <TableHead className="text-right text-emerald-600">Cobrado Neto</TableHead>
                    <TableHead className="text-center">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No se encontraron ventas con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((s) => {
                      const neto = getNetoVenta(s);
                      const cobradoNeto = getNetoCobrado(s);
                      const inst = (s.estado_instalacion || "pendiente").toLowerCase();

                      return (
                        <TableRow key={s.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-foreground">
                            {s.numero_venta || `VEN-${s.id}`}
                          </TableCell>
                          <TableCell className="uppercase text-[11px] font-medium text-muted-foreground">
                            {(s.tipo_comprobante || "nota_venta").replace("_", " ")}
                          </TableCell>
                          <TableCell className="max-w-[190px] truncate">
                            <div className="font-medium text-foreground">
                              {s.cliente_nombre_completo || "Cliente General"}
                            </div>
                            {s.numero_documento && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {s.numero_documento}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {s.metodo_pago || "Efectivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                inst === "instalado"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : inst === "en_proceso"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {inst.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] ${
                                s.estado_pago === "pagado"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : s.estado_pago === "parcial"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {(s.estado_pago || "Pendiente").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            {formatPEN(neto)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                            {formatPEN(cobradoNeto)}
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-muted-foreground whitespace-nowrap">
                            {s.fecha_venta ? String(s.fecha_venta).substring(0, 10) : "-"}
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
