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
  Target,
  Download,
  RefreshCw,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  UserCheck,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
  Briefcase,
  Flame,
  Award,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  RotateCcw,
  PieChart as PieChartIcon,
  FileText,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Percent,
} from "lucide-react";

interface Stage {
  id: number;
  nombre: string;
  orden: number;
  es_ganada?: boolean;
  label_ganada?: string;
  es_perdida?: boolean;
  label_perdida?: string;
}

interface Opportunity {
  id: number;
  titulo: string;
  contacto_id?: number | null;
  etapa_id: number;
  valor: number;
  prioridad: string;
  etiquetas?: string | null;
  usuario_id?: number | null;
  orden?: number;
  created_at?: string;
  notas?: string | null;
  contacto_nombre_completo?: string | null;
  numero_documento?: string | null;
  vendedor_nombre?: string | null;
  telefono_movil?: string | null;
  contacto_email?: string | null;
  tipo_propuesta?: string | null;
  moneda?: string | null;
  total_instalacion?: number | null;
  plazo_acuerdo?: number | null;
}

// Factor IGV Perú (18%)
const IGV_FACTOR = 1.18;
const toNeto = (monto: number | null | undefined): number => {
  return Number(monto || 0) / IGV_FACTOR;
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
          entry.name?.toLowerCase().includes("valor") ||
          entry.name?.toLowerCase().includes("mrr") ||
          entry.name?.toLowerCase().includes("tcv") ||
          entry.name?.toLowerCase().includes("cuota") ||
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

export default function OpportunitiesReportsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Layout state: Sidebar filter open/close
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);

  // Filters state
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [filterStalledOnly, setFilterStalledOnly] = useState<boolean>(false);

  // Meta mensual por asesor (por defecto S/ 4,000 neto sin IGV)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(4000);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Data from /api/opportunities/kanban
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/opportunities/kanban");
      if (res.data) {
        setStages(Array.isArray(res.data.columns) ? res.data.columns : []);
        setOpportunities(Array.isArray(res.data.opportunities) ? res.data.opportunities : []);
      }
    } catch (err: any) {
      console.error("Error al cargar datos de analítica de oportunidades:", err);
      toast.error(err.response?.data?.message || "Error al cargar datos de oportunidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute unique sellers list
  const sellersList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      const s = o.vendedor_nombre?.trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [opportunities]);

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

      const dayOpps = opportunities.filter((o) => {
        if (!o.created_at) return false;
        return o.created_at.startsWith(dateStr);
      });

      list.push({
        dateStr,
        label,
        dayNum,
        isToday,
        isActive,
        totalCount: dayOpps.length,
      });
    }
    return list;
  }, [opportunities, filterDate]);

  // Stage lookup map
  const stageMap = useMemo(() => {
    const map = new Map<number, Stage>();
    stages.forEach((s) => map.set(s.id, s));
    return map;
  }, [stages]);

  // Helper: Probabilidad por etapa para Forecast Ponderado
  const getStageProbability = (st?: Stage): number => {
    if (!st) return 0.2;
    if (st.es_ganada) return 1.0;
    if (st.es_perdida) return 0.0;
    const name = st.nombre.toLowerCase();
    if (name.includes("prospecc")) return 0.15;
    if (name.includes("negociac")) return 0.50;
    if (name.includes("aceptac") || name.includes("técnic")) return 0.85;
    return 0.35;
  };

  // Helper: Cálculo de días en pipeline
  const getDaysInPipeline = (createdAt?: string): number => {
    if (!createdAt) return 0;
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return 0;
    const diff = Math.max(0, new Date().getTime() - d.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

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
      selectedSeller !== "all" ||
      filterStalledOnly
    );
  }, [
    period,
    filterDate,
    customStartDate,
    customEndDate,
    searchTerm,
    selectedStage,
    selectedPriority,
    selectedSeller,
    filterStalledOnly,
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
    setSelectedSeller("all");
    setFilterStalledOnly(false);
  };

  // Filtered Opportunities based on all criteria
  const filteredOpportunities = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const query = searchTerm.toLowerCase().trim();

    return opportunities.filter((opp) => {
      const st = stageMap.get(opp.etapa_id);
      const days = getDaysInPipeline(opp.created_at);

      // Filter: Only stalled (> 15 days active)
      if (filterStalledOnly) {
        if (st?.es_ganada || st?.es_perdida || days <= 15) {
          return false;
        }
      }

      // 1. Specific Date from Calendar Strip
      if (filterDate) {
        if (!opp.created_at || !opp.created_at.startsWith(filterDate)) {
          return false;
        }
      }

      // 2. Custom Date Range
      if (customStartDate || customEndDate) {
        if (!opp.created_at) return false;
        const oppDate = opp.created_at.substring(0, 10);
        if (customStartDate && oppDate < customStartDate) return false;
        if (customEndDate && oppDate > customEndDate) return false;
      }

      // 3. Period (Month / Year) if no specific day filter
      if (!filterDate && !customStartDate && !customEndDate) {
        if (opp.created_at) {
          const d = new Date(opp.created_at);
          if (!isNaN(d.getTime())) {
            if (period === "month") {
              if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
            } else if (period === "year") {
              if (d.getFullYear() !== currentYear) return false;
            }
          }
        }
      }

      // 4. Stage Filter
      if (selectedStage !== "all" && String(opp.etapa_id) !== selectedStage) {
        return false;
      }

      // 5. Priority Filter
      if (selectedPriority !== "all" && opp.prioridad !== selectedPriority) {
        return false;
      }

      // 6. Seller Filter
      if (selectedSeller !== "all") {
        const sellerName = opp.vendedor_nombre?.trim() || "Sin Asignar";
        if (sellerName !== selectedSeller) return false;
      }

      // 7. Text Search
      if (query) {
        const titleMatch = (opp.titulo || "").toLowerCase().includes(query);
        const clientMatch = (opp.contacto_nombre_completo || "").toLowerCase().includes(query);
        const docMatch = (opp.numero_documento || "").toLowerCase().includes(query);
        const sellerMatch = (opp.vendedor_nombre || "").toLowerCase().includes(query);
        const noteMatch = (opp.notas || "").toLowerCase().includes(query);
        if (!titleMatch && !clientMatch && !docMatch && !sellerMatch && !noteMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    opportunities,
    period,
    filterDate,
    customStartDate,
    customEndDate,
    selectedStage,
    selectedPriority,
    selectedSeller,
    filterStalledOnly,
    searchTerm,
    stageMap,
  ]);

  // Aggregated KPIs calculated from filtered dataset (TODOS LOS MONTOS SIN IGV)
  const stats = useMemo(() => {
    const totalCount = filteredOpportunities.length;

    let totalMrrNeto = 0;
    let totalTcvNeto = 0;
    let weightedForecastNeto = 0;

    let wonCount = 0;
    let wonMrrNeto = 0;
    let wonTcvNeto = 0;

    let lostCount = 0;
    let lostMrrNeto = 0;
    let lostTcvNeto = 0;

    let activeCount = 0;
    let activeMrrNeto = 0;
    let activeTcvNeto = 0;

    let stalledCount = 0;
    let totalDaysSum = 0;

    filteredOpportunities.forEach((opp) => {
      const st = stageMap.get(opp.etapa_id);
      const mrrNeto = toNeto(opp.valor);
      const instalacionNeto = toNeto(opp.total_instalacion);
      const plazo = Number(opp.plazo_acuerdo) || 12;
      const tcvNeto = (mrrNeto * plazo) + instalacionNeto;

      const prob = getStageProbability(st);
      weightedForecastNeto += tcvNeto * prob;

      totalMrrNeto += mrrNeto;
      totalTcvNeto += tcvNeto;

      const days = getDaysInPipeline(opp.created_at);
      totalDaysSum += days;

      if (st?.es_ganada) {
        wonCount += 1;
        wonMrrNeto += mrrNeto;
        wonTcvNeto += tcvNeto;
      } else if (st?.es_perdida) {
        lostCount += 1;
        lostMrrNeto += mrrNeto;
        lostTcvNeto += tcvNeto;
      } else {
        activeCount += 1;
        activeMrrNeto += mrrNeto;
        activeTcvNeto += tcvNeto;
        if (days > 15) stalledCount += 1;
      }
    });

    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : (totalCount > 0 ? (wonCount / totalCount) * 100 : 0);
    const avgDaysInPipeline = totalCount > 0 ? Math.round(totalDaysSum / totalCount) : 0;
    const avgTicketMrrNeto = totalCount > 0 ? totalMrrNeto / totalCount : 0;
    const avgWonTcvNeto = wonCount > 0 ? wonTcvNeto / wonCount : 0;

    // Distribution by Stage (Montos SIN IGV)
    const byStage = stages
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((st) => {
        const inThisStage = filteredOpportunities.filter((o) => o.etapa_id === st.id);
        const count = inThisStage.length;
        const totalMrrNetoStage = inThisStage.reduce((sum, o) => sum + toNeto(o.valor), 0);
        const totalTcvNetoStage = inThisStage.reduce((sum, o) => {
          const mrr = toNeto(o.valor);
          const inst = toNeto(o.total_instalacion);
          const p = Number(o.plazo_acuerdo) || 12;
          return sum + (mrr * p + inst);
        }, 0);

        const color = st.es_ganada ? "#10b981" : st.es_perdida ? "#f43f5e" : "#6366f1";
        return {
          stageId: st.id,
          nombre: st.nombre,
          orden: st.orden,
          isWon: !!st.es_ganada,
          isLost: !!st.es_perdida,
          count,
          totalMrrNeto: totalMrrNetoStage,
          totalTcvNeto: totalTcvNetoStage,
          fill: color,
        };
      });

    // Distribution by Priority (Montos SIN IGV)
    const byPriority: Record<string, { count: number; totalTcvNeto: number; totalMrrNeto: number }> = {
      Alta: { count: 0, totalTcvNeto: 0, totalMrrNeto: 0 },
      Media: { count: 0, totalTcvNeto: 0, totalMrrNeto: 0 },
      Baja: { count: 0, totalTcvNeto: 0, totalMrrNeto: 0 },
    };

    filteredOpportunities.forEach((o) => {
      const p = o.prioridad ? o.prioridad.trim() : "Media";
      const key = byPriority[p] ? p : "Media";
      const mrr = toNeto(o.valor);
      const inst = toNeto(o.total_instalacion);
      const tcv = (mrr * (Number(o.plazo_acuerdo) || 12)) + inst;

      byPriority[key].count += 1;
      byPriority[key].totalMrrNeto += mrr;
      byPriority[key].totalTcvNeto += tcv;
    });

    // Performance by Sales Rep / User (SIN IGV)
    const byUser: Record<
      string,
      {
        nombre: string;
        totalOpps: number;
        wonOpps: number;
        lostOpps: number;
        activeOpps: number;
        wonMrrNeto: number;
        wonTcvNeto: number;
        activeTcvNeto: number;
        totalTcvNeto: number;
      }
    > = {};

    filteredOpportunities.forEach((o) => {
      const seller = o.vendedor_nombre?.trim() || "Sin Asignar";
      if (!byUser[seller]) {
        byUser[seller] = {
          nombre: seller,
          totalOpps: 0,
          wonOpps: 0,
          lostOpps: 0,
          activeOpps: 0,
          wonMrrNeto: 0,
          wonTcvNeto: 0,
          activeTcvNeto: 0,
          totalTcvNeto: 0,
        };
      }

      const st = stageMap.get(o.etapa_id);
      const mrr = toNeto(o.valor);
      const inst = toNeto(o.total_instalacion);
      const tcv = (mrr * (Number(o.plazo_acuerdo) || 12)) + inst;

      byUser[seller].totalOpps += 1;
      byUser[seller].totalTcvNeto += tcv;

      if (st?.es_ganada) {
        byUser[seller].wonOpps += 1;
        byUser[seller].wonMrrNeto += mrr;
        byUser[seller].wonTcvNeto += tcv;
      } else if (st?.es_perdida) {
        byUser[seller].lostOpps += 1;
      } else {
        byUser[seller].activeOpps += 1;
        byUser[seller].activeTcvNeto += tcv;
      }
    });

    const userStatsList = Object.values(byUser).sort(
      (a, b) => b.wonTcvNeto - a.wonTcvNeto || b.totalOpps - a.totalOpps
    );

    // Chart Data 1: Donut distribution by Status
    const statusPieData = [
      { name: "Ganadas", value: wonCount, tcvNeto: wonTcvNeto, mrrNeto: wonMrrNeto, color: "#10b981" },
      { name: "En Curso", value: activeCount, tcvNeto: activeTcvNeto, mrrNeto: activeMrrNeto, color: "#6366f1" },
      { name: "Perdidas", value: lostCount, tcvNeto: lostTcvNeto, mrrNeto: lostMrrNeto, color: "#f43f5e" },
    ].filter((d) => d.value > 0);

    // Chart Data 2: Top Sellers comparison (Cuota vs Facturado Neto)
    const sellerQuotaChartData = userStatsList.slice(0, 5).map((u) => ({
      name: u.nombre.length > 13 ? u.nombre.substring(0, 11) + "..." : u.nombre,
      "Facturado Neto (Sin IGV)": Math.round(u.wonTcvNeto),
      "Meta Mensual (Sin IGV)": monthlyTarget,
    }));

    return {
      totalCount,
      totalMrrNeto,
      totalTcvNeto,
      weightedForecastNeto,
      wonCount,
      wonMrrNeto,
      wonTcvNeto,
      lostCount,
      lostMrrNeto,
      lostTcvNeto,
      activeCount,
      activeMrrNeto,
      activeTcvNeto,
      stalledCount,
      avgDaysInPipeline,
      winRate,
      avgTicketMrrNeto,
      avgWonTcvNeto,
      byStage,
      byPriority,
      userStatsList,
      statusPieData,
      sellerQuotaChartData,
    };
  }, [filteredOpportunities, stages, stageMap, monthlyTarget]);

  // Export to Excel (Con desglose SIN IGV)
  const handleExportExcel = () => {
    if (filteredOpportunities.length === 0) {
      toast.info("No hay oportunidades que coincidan con los filtros seleccionados.");
      return;
    }

    const rows = filteredOpportunities.map((o) => {
      const st = stageMap.get(o.etapa_id);
      let estadoTxt = st ? st.nombre : "Sin Etapa";
      if (st?.es_ganada) estadoTxt += " (GANADA)";
      if (st?.es_perdida) estadoTxt += " (PERDIDA)";

      const mrrNeto = toNeto(o.valor);
      const instNeto = toNeto(o.total_instalacion);
      const plazo = Number(o.plazo_acuerdo) || 12;
      const tcvNeto = (mrrNeto * plazo) + instNeto;
      const days = getDaysInPipeline(o.created_at);

      return {
        "ID": o.id,
        "Título / Propuesta": o.titulo || "Sin título",
        "Cliente / Contacto": o.contacto_nombre_completo || "Contacto Directo",
        "RUC / DNI": o.numero_documento || "-",
        "Teléfono": o.telefono_movil || "-",
        "Asesor Comercial": o.vendedor_nombre || "Sin Asignar",
        "Etapa": estadoTxt,
        "Prioridad": o.prioridad || "Media",
        "MRR Mensual Neto (PEN Sin IGV)": Number(mrrNeto.toFixed(2)),
        "Instalación Neta (PEN Sin IGV)": Number(instNeto.toFixed(2)),
        "Plazo (Meses)": plazo,
        "TCV Total Contrato (PEN Sin IGV)": Number(tcvNeto.toFixed(2)),
        "Días en Pipeline": days,
        "En Riesgo (>15d)": (!st?.es_ganada && !st?.es_perdida && days > 15) ? "SÍ" : "NO",
        "Fecha Creación": o.created_at ? String(o.created_at).replace("T", " ").substring(0, 16) : "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Oportunidades");
    XLSX.writeFile(wb, `Reporte_Oportunidades_SinIGV_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Reporte descargado en Excel con montos Netos (Sin IGV).");
  };

  // Export to PDF Ejecutivo Formal
  const handleExportPDF = () => {
    if (filteredOpportunities.length === 0) {
      toast.info("No hay oportunidades para generar el PDF.");
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
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("NEXTLEAD NEGOCIOS - INFORME EJECUTIVO DE VENTAS", 14, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Análisis Comercial de Oportunidades (Montos Netos sin IGV) | Generado: ${nowStr}`, 14, 18);

      // Bloque de Resumen Ejecutivo de Métricas (Sin IGV)
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("1. Resumen Ejecutivo del Pipeline", 14, 32);

      const kpiData = [
        [
          `TCV Total Pipeline (Neto):\n${formatPEN(stats.totalTcvNeto)}`,
          `Forecast Ponderado:\n${formatPEN(stats.weightedForecastNeto)}`,
          `MRR Recurrente Total:\n${formatPEN(stats.totalMrrNeto)}`,
          `Tasa de Cierre:\n${stats.winRate.toFixed(1)}%`,
        ],
        [
          `Ventas Ganadas (Neto):\n${formatPEN(stats.wonTcvNeto)} (${stats.wonCount} ops)`,
          `Activas en Curso:\n${formatPEN(stats.activeTcvNeto)} (${stats.activeCount} ops)`,
          `Perdidas:\n${formatPEN(stats.lostTcvNeto)} (${stats.lostCount} ops)`,
          `Deals en Riesgo (>15d):\n${stats.stalledCount} oportunidades`,
        ],
      ];

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        body: kpiData,
        styles: { fontSize: 8, cellPadding: 3, halign: "center", fontStyle: "bold" },
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Tabla de Desempeño por Asesor
      const startAfterKpi = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 70;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("2. Desempeño y Cuota por Asesor Comercial (Sin IGV)", 14, startAfterKpi);

      const asesorRows = stats.userStatsList.map((u) => {
        const pctCuota = monthlyTarget > 0 ? (u.wonTcvNeto / monthlyTarget) * 100 : 0;
        return [
          u.nombre,
          u.totalOpps.toString(),
          u.wonOpps.toString(),
          formatPEN(u.wonTcvNeto),
          formatPEN(monthlyTarget),
          `${pctCuota.toFixed(1)}%`,
        ];
      });

      autoTable(doc, {
        startY: startAfterKpi + 3,
        head: [["Asesor", "Ops", "Ganadas", "Total Ganado (Sin IGV)", "Meta (Sin IGV)", "% Cuota"]],
        body: asesorRows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      // Tabla Detalle de Oportunidades Filtradas
      const startAfterAsesores = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 120;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("3. Detalle de Oportunidades Filtradas", 14, startAfterAsesores);

      const oppRows = filteredOpportunities.slice(0, 35).map((o) => {
        const st = stageMap.get(o.etapa_id);
        const mrr = toNeto(o.valor);
        const tcv = (mrr * (Number(o.plazo_acuerdo) || 12)) + toNeto(o.total_instalacion);
        return [
          `#${o.id}`,
          o.titulo ? (o.titulo.length > 25 ? o.titulo.substring(0, 23) + "..." : o.titulo) : "-",
          o.contacto_nombre_completo ? (o.contacto_nombre_completo.length > 22 ? o.contacto_nombre_completo.substring(0, 20) + "..." : o.contacto_nombre_completo) : "-",
          st?.nombre || "Sin etapa",
          o.vendedor_nombre || "Sin Asignar",
          formatPEN(mrr),
          formatPEN(tcv),
        ];
      });

      autoTable(doc, {
        startY: startAfterAsesores + 3,
        head: [["ID", "Propuesta", "Cliente", "Etapa", "Asesor", "MRR (Sin IGV)", "TCV (Sin IGV)"]],
        body: oppRows,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      doc.save(`Informe_Ejecutivo_Oportunidades_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Informe Ejecutivo descargado en PDF.");
    } catch (err: any) {
      console.error("Error al generar PDF:", err);
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
              <Link href="/opportunities/view">
                <ArrowLeft className="size-3.5 mr-1" />
                Volver al Pipeline
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">
              Valores Netos (Sin IGV)
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="size-5 sm:size-6 text-indigo-600" />
            Reportes & Analítica de Oportunidades
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Métricas ejecutivas de recurrencia (MRR), valor de contratos (TCV), forecast ponderado y gráficas de desempeño.
          </p>
        </div>

        {/* Global Toolbar Buttons */}
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
            <Link href="/opportunities/create">
              <Plus className="size-3.5" />
              Nueva Oportunidad
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
                <span>Filtros de Reporte</span>
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

            {/* Quick alert: Estancadas (> 15 días) */}
            <div className="p-2.5 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-3.5 text-amber-600" />
                  <span>Deals en Riesgo</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100">
                  {stats.stalledCount}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Oportunidades con más de 15 días sin avanzar.
              </p>
              <Button
                variant={filterStalledOnly ? "secondary" : "outline"}
                size="sm"
                className={`w-full h-6 text-[11px] mt-2 gap-1 font-medium ${
                  filterStalledOnly ? "bg-amber-600 text-white hover:bg-amber-700" : ""
                }`}
                onClick={() => setFilterStalledOnly(!filterStalledOnly)}
              >
                <ShieldAlert className="size-3" />
                {filterStalledOnly ? "Viendo sólo en riesgo" : "Filtrar deals en riesgo"}
              </Button>
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
                      title={`${day.label} ${day.dayNum} (${day.totalCount} oportunidades)`}
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
                  placeholder="Cliente, lead, RUC, nota..."
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

            {/* 5. Etapa del Pipeline */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Etapa del Pipeline
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                <option value="all">Todas las Etapas</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nombre} {st.es_ganada ? "✓ (Ganada)" : st.es_perdida ? "✗ (Perdida)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Prioridad */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Nivel de Prioridad
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="Alta">Prioridad Alta</option>
                <option value="Media">Prioridad Media</option>
                <option value="Baja">Prioridad Baja</option>
              </select>
            </div>

            {/* 7. Asesor Comercial */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Asesor Comercial
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <option value="all">Todos los Asesores</option>
                {sellersList.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </div>

            {/* Meta mensual ajustable */}
            <div className="space-y-1 pt-2 border-t">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Meta Mensual (Sin IGV)</span>
                <span className="font-mono text-indigo-600 font-bold">S/ {monthlyTarget}</span>
              </label>
              <Input
                type="number"
                step="500"
                className="h-7 text-xs"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(Math.max(1000, Number(e.target.value) || 0))}
              />
            </div>

            {/* Summary count */}
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Resultados filtrados:</span>
              <strong className="text-foreground font-mono">{filteredOpportunities.length} ops</strong>
            </div>
          </aside>
        )}

        {/* RIGHT FULL-WIDTH CONTENT COLUMN */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* 1. Primary Advanced KPI Cards (SIN IGV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full min-w-0">
            {/* TCV Total del Pipeline */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">TCV Total Pipeline</CardTitle>
                  <span className="text-[10px] text-amber-600 font-mono font-medium block">Sin IGV (Neto)</span>
                </div>
                <Layers className="size-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatPEN(stats.totalTcvNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Valor de contratos ({stats.totalCount} deals)</span>
                </p>
              </CardContent>
            </Card>

            {/* Forecast Ponderado */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Forecast Ponderado</CardTitle>
                  <span className="text-[10px] text-indigo-600 font-mono font-medium block">Probabilidad Etapas</span>
                </div>
                <Zap className="size-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-indigo-600 font-mono">
                  {formatPEN(stats.weightedForecastNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Proyección realista de ingresos
                </p>
              </CardContent>
            </Card>

            {/* MRR Recurrente Total */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">MRR Total Mensual</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">Sin IGV Recurrente</span>
                </div>
                <TrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600 font-mono">
                  {formatPEN(stats.totalMrrNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ganado: <strong className="text-foreground">{formatPEN(stats.wonMrrNeto)}</strong>
                </p>
              </CardContent>
            </Card>

            {/* Tasa de Conversión & Ciclo */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Efectividad de Cierre</CardTitle>
                  <span className="text-[10px] text-purple-600 font-mono font-medium block">Win Rate</span>
                </div>
                <Award className="size-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-600">
                  {stats.winRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ciclo medio: <strong className="text-foreground font-mono">{stats.avgDaysInPipeline}d</strong>
                </p>
              </CardContent>
            </Card>

            {/* Deals Ganados TCV */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">Ventas Cerradas (TCV)</CardTitle>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium block">{stats.wonCount} Ganadas</span>
                </div>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatPEN(stats.wonTcvNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ticket medio: {formatPEN(stats.avgWonTcvNeto)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. VISUAL CHARTS ROW (GRÁFICAS EN VIVO) */}
          {mounted && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full min-w-0">
              {/* Gráfica 1: Valor Acumulado por Etapa (BarChart) */}
              <Card className="lg:col-span-2 bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="size-4 text-indigo-600" />
                        Valor Total del Contrato (TCV) por Etapa
                      </CardTitle>
                      <CardDescription>
                        Volumen monetario neto proyectado según etapa del embudo comercial (Sin IGV).
                      </CardDescription>
                    </div>
                  </div>
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
                          margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="nombre"
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fontSize: 11 }}
                            angle={-15}
                            textAnchor="end"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `S/ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                            tick={{ fontSize: 11 }}
                          />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="totalTcvNeto"
                            name="TCV Neto (Sin IGV)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                          >
                            {stats.byStage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfica 2: Distribución por Estado / Conversión (Donut Chart) */}
              <Card className="bg-card shadow-xs border">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="size-4 text-emerald-600" />
                    Estado de Oportunidades & MRR
                  </CardTitle>
                  <CardDescription>
                    Distribución de clientes cerrados vs en negociación.
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
                              <Cell key={`donut-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomChartTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>

                      {/* Donut Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-1">
                        {stats.statusPieData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="text-muted-foreground">{d.name}:</span>
                            <strong className="text-foreground font-mono">{d.value}</strong>
                            <span className="text-[10px] text-muted-foreground">({formatPEN(d.mrrNeto)} MRR)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfica 3: Cuota Comercial y Ranking por Asesor */}
          {mounted && stats.sellerQuotaChartData.length > 0 && (
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="size-4 text-indigo-600" />
                      Cumplimiento de Meta Mensual por Asesor Comercial (Sin IGV)
                    </CardTitle>
                    <CardDescription>
                      Comparativa entre la facturación neta cerrada y la cuota objetivo asignada ({formatPEN(monthlyTarget)} neto).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-2 sm:px-4">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.sellerQuotaChartData}
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
                      <Bar dataKey="Facturado Neto (Sin IGV)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Meta Mensual (Sin IGV)" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Breakdowns: Funnel Stages & Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full min-w-0">
            {/* Embudo Comercial por Etapas */}
            <Card className="lg:col-span-2 bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-indigo-600" />
                  Embudo Comercial y Recurrencia por Etapas
                </CardTitle>
                <CardDescription>
                  Métricas de MRR mensual y TCV total sin IGV por cada etapa del pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Deals</TableHead>
                      <TableHead className="text-right">MRR Mensual (Sin IGV)</TableHead>
                      <TableHead className="text-right font-bold">TCV Contrato (Sin IGV)</TableHead>
                      <TableHead className="w-[110px] text-right">% Pipeline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byStage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          No hay etapas configuradas en el pipeline.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.byStage.map((st) => {
                        const sharePct = stats.totalTcvNeto > 0 ? (st.totalTcvNeto / stats.totalTcvNeto) * 100 : 0;
                        return (
                          <TableRow key={st.stageId} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-semibold text-foreground">
                              {st.nombre}
                            </TableCell>
                            <TableCell className="text-center">
                              {st.isWon ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Ganada
                                </Badge>
                              ) : st.isLost ? (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                                  Perdida
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                  En Curso
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium">
                              {st.count}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-emerald-600">
                              {formatPEN(st.totalMrrNeto)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              {formatPEN(st.totalTcvNeto)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-[11px] text-muted-foreground w-9">
                                  {sharePct.toFixed(1)}%
                                </span>
                                <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      st.isWon
                                        ? "bg-emerald-500"
                                        : st.isLost
                                        ? "bg-rose-500"
                                        : "bg-indigo-500"
                                    }`}
                                    style={{ width: `${Math.min(100, sharePct)}%` }}
                                  />
                                </div>
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

            {/* Priority Distribution */}
            <Card className="bg-card shadow-xs border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="size-4 text-amber-500" />
                  Distribución por Prioridad (Sin IGV)
                </CardTitle>
                <CardDescription>
                  Volumen monetario según urgencia comercial.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Alta */}
                <div className="p-3.5 rounded-lg border bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-rose-500 inline-block" />
                      Prioridad Alta
                    </span>
                    <span className="text-xs font-bold font-mono text-rose-700 dark:text-rose-400">
                      {stats.byPriority.Alta.count} leads
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-bold font-mono text-foreground">
                    {formatPEN(stats.byPriority.Alta.totalTcvNeto)}
                  </div>
                  <div className="w-full h-1.5 bg-rose-200/50 dark:bg-rose-900/40 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${stats.totalTcvNeto > 0 ? (stats.byPriority.Alta.totalTcvNeto / stats.totalTcvNeto) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Media */}
                <div className="p-3.5 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500 inline-block" />
                      Prioridad Media
                    </span>
                    <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">
                      {stats.byPriority.Media.count} leads
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-bold font-mono text-foreground">
                    {formatPEN(stats.byPriority.Media.totalTcvNeto)}
                  </div>
                  <div className="w-full h-1.5 bg-amber-200/50 dark:bg-amber-900/40 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${stats.totalTcvNeto > 0 ? (stats.byPriority.Media.totalTcvNeto / stats.totalTcvNeto) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Baja */}
                <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-slate-400 inline-block" />
                      Prioridad Baja
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-400">
                      {stats.byPriority.Baja.count} leads
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-bold font-mono text-foreground">
                    {formatPEN(stats.byPriority.Baja.totalTcvNeto)}
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-slate-500 rounded-full"
                      style={{
                        width: `${stats.totalTcvNeto > 0 ? (stats.byPriority.Baja.totalTcvNeto / stats.totalTcvNeto) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 4. Sales Reps Ranking & Cuota Table */}
          <Card className="bg-card shadow-xs border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="size-4 text-indigo-600" />
                Ranking Comercial y Cumplimiento de Cuota (Sin IGV)
              </CardTitle>
              <CardDescription>
                Desempeño individual: facturación neta cerrada vs meta de {formatPEN(monthlyTarget)} neto por asesor.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-[50px] text-center">Rank</TableHead>
                    <TableHead>Asesor Comercial</TableHead>
                    <TableHead className="text-center">Total Ops</TableHead>
                    <TableHead className="text-center text-emerald-700 dark:text-emerald-400 font-semibold">Ganadas</TableHead>
                    <TableHead className="text-center text-rose-700 dark:text-rose-400">Perdidas</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-700 dark:text-emerald-400">Total Ganado (Sin IGV)</TableHead>
                    <TableHead className="text-right font-medium text-indigo-700 dark:text-indigo-400">En Curso (Sin IGV)</TableHead>
                    <TableHead className="text-center w-[160px]">Progreso de Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.userStatsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">
                        Sin registros de asesores en el filtro seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.userStatsList.map((user, idx) => {
                      const pctCuota = monthlyTarget > 0 ? (user.wonTcvNeto / monthlyTarget) * 100 : 0;
                      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}°`;

                      return (
                        <TableRow key={user.nombre} className="text-xs hover:bg-muted/30">
                          <TableCell className="text-center font-bold font-mono">
                            {medal}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground flex items-center gap-2">
                            <div className="size-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                              {user.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            {user.nombre}
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">{user.totalOpps}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-emerald-600">{user.wonOpps}</TableCell>
                          <TableCell className="text-center font-mono text-rose-600">{user.lostOpps}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {formatPEN(user.wonTcvNeto)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-indigo-600">
                            {formatPEN(user.activeTcvNeto)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pctCuota >= 100 ? "bg-emerald-500" : pctCuota >= 50 ? "bg-indigo-500" : "bg-amber-500"
                                  }`}
                                  style={{ width: `${Math.min(100, pctCuota)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold w-12 text-right">
                                {pctCuota.toFixed(0)}%
                              </span>
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

          {/* 5. Detailed Opportunities Table */}
          <Card className="bg-card shadow-xs border">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="size-4 text-indigo-600" />
                    Detalle Completo de Oportunidades (Valores Netos sin IGV)
                  </CardTitle>
                  <CardDescription>
                    {filteredOpportunities.length} registro(s) encontrados según los filtros activos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Propuesta / Asunto</TableHead>
                    <TableHead>Cliente / Contacto</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead className="text-center">Etapa</TableHead>
                    <TableHead className="text-right">MRR (Sin IGV)</TableHead>
                    <TableHead className="text-center">Plazo</TableHead>
                    <TableHead className="text-right font-bold">TCV (Sin IGV)</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                        No se encontraron oportunidades con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOpportunities.map((opp) => {
                      const st = stageMap.get(opp.etapa_id);
                      const isWon = st?.es_ganada;
                      const isLost = st?.es_perdida;
                      const mrrNeto = toNeto(opp.valor);
                      const instNeto = toNeto(opp.total_instalacion);
                      const plazo = Number(opp.plazo_acuerdo) || 12;
                      const tcvNeto = (mrrNeto * plazo) + instNeto;
                      const days = getDaysInPipeline(opp.created_at);
                      const isStalled = !isWon && !isLost && days > 15;

                      return (
                        <TableRow key={opp.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-mono text-muted-foreground">
                            #{opp.id}
                          </TableCell>
                          <TableCell className="font-medium text-foreground max-w-[220px] truncate">
                            {opp.titulo || "Sin título"}
                          </TableCell>
                          <TableCell className="max-w-[190px] truncate">
                            <div className="font-medium text-foreground">
                              {opp.contacto_nombre_completo || "Contacto Directo"}
                            </div>
                            {opp.numero_documento && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {opp.numero_documento}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {opp.vendedor_nombre || "Sin Asignar"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isWon
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : isLost
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                  : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                              }`}
                            >
                              {st?.nombre || "Sin Etapa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-emerald-600">
                            {formatPEN(mrrNeto)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {plazo}m
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            {formatPEN(tcvNeto)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                                isStalled
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold"
                                  : "text-muted-foreground"
                              }`}
                              title={isStalled ? "Alerta: Oportunidad estancada más de 15 días" : `${days} días`}
                            >
                              {isStalled && <AlertTriangle className="size-2.5 text-rose-600" />}
                              {days}d
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-xs"
                            >
                              <Link href={`/opportunities/create?edit_id=${opp.id}`}>
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
