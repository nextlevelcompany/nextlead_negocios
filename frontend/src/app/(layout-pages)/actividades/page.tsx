"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

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
} from "@/components/ui/dialog";

import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Phone,
  MessageSquare,
  Briefcase,
  Truck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  CalendarCheck,
  Award,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckSquare,
  ListTodo,
  UserCheck,
} from "lucide-react";

export default function ActividadesPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"planificador" | "tablero" | "supervision">("planificador");
  const [currentCalendarView, setCurrentCalendarView] = useState<"timeGridWeek" | "timeGridDay" | "dayGridMonth">("timeGridWeek");
  const calendarRef = useRef<FullCalendar>(null);

  // Datos
  const [actividades, setActividades] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({
    hoy_pendientes: 0,
    vencidas: 0,
    completadas_hoy: 0,
    completadas_mes: 0,
    futuras: 0,
    ranking: [],
  });

  // Filtros
  const [filterTrabajador, setFilterTrabajador] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterContexto, setFilterContexto] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"hoy" | "vencidas" | "programadas" | "historial">("hoy");

  // Selectores para el modal de creación
  const [staffList, setStaffList] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [oppsList, setOppsList] = useState<any[]>([]);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formActividad, setFormActividad] = useState({
    id: null as number | null,
    tipo: "Llamada",
    asunto: "",
    descripcion: "",
    fecha_programada: "",
    fecha_fin_programada: "",
    prioridad: "Media",
    trabajador_id: "",
    contacto_id: "",
    oportunidad_id: "",
    venta_id: "",
    pedido_id: "",
  });

  // Modal Completar (Registrar lo que se hizo)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [activityToComplete, setActivityToComplete] = useState<any | null>(null);
  const [completeForm, setCompleteForm] = useState({
    resultado_estado: "Exitoso",
    resultado_notas: "",
    duracion_minutos: "15",
    programar_siguiente: false,
  });

  // Modal Detalle
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  // Carga inicial
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTrabajador !== "all") params.append("trabajador_id", filterTrabajador);
      if (filterTipo !== "all") params.append("tipo", filterTipo);

      const [resAct, resKpis] = await Promise.all([
        api.get(`/api/actividades?${params.toString()}`),
        api.get(`/api/actividades/kpis${filterTrabajador !== "all" ? `?trabajador_id=${filterTrabajador}` : ""}`),
      ]);

      setActividades(resAct.data || []);
      setKpis(resKpis.data || {});
    } catch (err: any) {
      console.error("Error al cargar actividades:", err);
      toast.error("Error al cargar actividades y planificador.");
    } finally {
      setLoading(false);
    }
  };

  const loadAuxData = async () => {
    try {
      const [resStaff, resContacts, resOpps] = await Promise.allSettled([
        api.get("/api/payroll/staff"),
        api.get("/api/contacts?limit=100"),
        api.get("/api/opportunities/kanban"),
      ]);

      if (resStaff.status === "fulfilled") setStaffList(resStaff.value.data || []);
      if (resContacts.status === "fulfilled") {
        const cData = resContacts.value.data;
        setContactsList(Array.isArray(cData) ? cData : (cData?.content || cData?.contactos || []));
      }
      if (resOpps.status === "fulfilled") {
        const kanbanData = resOpps.value.data;
        const allOpps: any[] = [];
        if (Array.isArray(kanbanData?.columnas)) {
          kanbanData.columnas.forEach((col: any) => {
            if (Array.isArray(col.oportunidades)) allOpps.push(...col.oportunidades);
          });
        }
        setOppsList(allOpps);
      }
    } catch (ignored) {}
  };

  useEffect(() => {
    fetchData();
  }, [filterTrabajador, filterTipo]);

  useEffect(() => {
    loadAuxData();
  }, []);

  // Filtrado en memoria
  const filteredActividades = useMemo(() => {
    return actividades.filter((a) => {
      const fullText = `${a.asunto} ${a.contacto_nombre || ""} ${a.trabajador_nombre || ""} ${a.descripcion || ""}`.toLowerCase();
      const matchSearch = fullText.includes(searchTerm.toLowerCase());

      const matchContexto =
        filterContexto === "all" ||
        (filterContexto === "oportunidad" && a.oportunidad_id) ||
        (filterContexto === "venta" && a.venta_id) ||
        (filterContexto === "pedido" && a.pedido_id) ||
        (filterContexto === "contacto" && a.contacto_id && !a.oportunidad_id && !a.venta_id && !a.pedido_id) ||
        (filterContexto === "interna" && !a.contacto_id && !a.oportunidad_id && !a.venta_id && !a.pedido_id);

      return matchSearch && matchContexto;
    });
  }, [actividades, searchTerm, filterContexto]);

  // Listas por pestañas de la vista Tablero
  const nowStr = new Date().toISOString();
  const todayDateStr = nowStr.split("T")[0];

  const listHoy = useMemo(() => {
    return filteredActividades.filter(
      (a) => a.estado === "Pendiente" && a.fecha_programada && a.fecha_programada.startsWith(todayDateStr)
    );
  }, [filteredActividades, todayDateStr]);

  const listVencidas = useMemo(() => {
    return filteredActividades.filter(
      (a) => a.estado === "Pendiente" && a.fecha_programada && a.fecha_programada < nowStr && !a.fecha_programada.startsWith(todayDateStr)
    );
  }, [filteredActividades, nowStr, todayDateStr]);

  const listProgramadas = useMemo(() => {
    return filteredActividades.filter(
      (a) => a.estado === "Pendiente" && a.fecha_programada && a.fecha_programada > nowStr && !a.fecha_programada.startsWith(todayDateStr)
    );
  }, [filteredActividades, nowStr, todayDateStr]);

  const listHistorial = useMemo(() => {
    return filteredActividades.filter((a) => a.estado === "Completada");
  }, [filteredActividades]);

  // Mapeo para FullCalendar (Planificador)
  const calendarEvents = useMemo(() => {
    return filteredActividades.map((a) => {
      let color = "#3b82f6"; // Azul Llamada
      if (a.tipo === "WhatsApp") color = "#10b981"; // Verde
      else if (a.tipo === "Reunión Presencial" || a.tipo === "Videollamada") color = "#8b5cf6"; // Morado
      else if (a.tipo === "Visita Técnica" || a.tipo === "Instalación") color = "#f59e0b"; // Ámbar
      else if (a.tipo === "Despacho" || a.tipo === "Cobranza") color = "#06b6d4"; // Celeste
      else if (a.tipo === "Tarea Interna") color = "#64748b"; // Gris

      const isOverdue = a.estado === "Pendiente" && a.fecha_programada < nowStr;
      if (isOverdue) color = "#e11d48"; // Rojo alerta

      return {
        id: String(a.id),
        title: `${getIconEmoji(a.tipo)} ${a.asunto} ${a.contacto_nombre ? `(${a.contacto_nombre})` : ""}`,
        start: a.fecha_programada,
        end: a.fecha_fin_programada || undefined,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        extendedProps: { ...a, isOverdue },
      };
    });
  }, [filteredActividades, nowStr]);

  function getIconEmoji(tipo: string) {
    switch (tipo) {
      case "Llamada": return "📞";
      case "WhatsApp": return "💬";
      case "Reunión Presencial": return "🟣";
      case "Videollamada": return "💻";
      case "Visita Técnica": return "🛠️";
      case "Envío de Cotización": return "📄";
      case "Cobranza": return "💰";
      default: return "📌";
    }
  }

  // Drag & drop reschedule
  const handleEventDrop = async (info: any) => {
    const actId = info.event.id;
    const newStart = info.event.startStr;
    const newEnd = info.event.endStr || null;

    try {
      await api.put(`/api/actividades/${actId}`, {
        fecha_programada: newStart,
        fecha_fin_programada: newEnd,
      });
      toast.success("Actividad reprogramada con éxito.");
      fetchData();
    } catch (err: any) {
      info.revert();
      toast.error("Error al reprogramar actividad.");
    }
  };

  // Abrir modal de creación
  const handleOpenCreateModal = (dateStr?: string) => {
    const defaultStart = dateStr
      ? (dateStr.includes("T") ? dateStr.slice(0, 16) : `${dateStr}T10:00`)
      : new Date().toISOString().slice(0, 16);

    setFormActividad({
      id: null,
      tipo: "Llamada",
      asunto: "",
      descripcion: "",
      fecha_programada: defaultStart,
      fecha_fin_programada: "",
      prioridad: "Media",
      trabajador_id: filterTrabajador !== "all" ? filterTrabajador : (staffList[0]?.id ? String(staffList[0].id) : ""),
      contacto_id: "",
      oportunidad_id: "",
      venta_id: "",
      pedido_id: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveActividad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActividad.asunto.trim()) {
      toast.error("Ingrese el asunto de la actividad.");
      return;
    }
    if (!formActividad.fecha_programada) {
      toast.error("Seleccione la fecha y hora programada.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        tipo: formActividad.tipo,
        asunto: formActividad.asunto.trim(),
        descripcion: formActividad.descripcion.trim(),
        fecha_programada: formActividad.fecha_programada,
        fecha_fin_programada: formActividad.fecha_fin_programada || null,
        prioridad: formActividad.prioridad,
        trabajador_id: formActividad.trabajador_id ? Number(formActividad.trabajador_id) : null,
        contacto_id: formActividad.contacto_id ? Number(formActividad.contacto_id) : null,
        oportunidad_id: formActividad.oportunidad_id ? Number(formActividad.oportunidad_id) : null,
        venta_id: formActividad.venta_id ? Number(formActividad.venta_id) : null,
        pedido_id: formActividad.pedido_id ? Number(formActividad.pedido_id) : null,
      };

      if (formActividad.id) {
        await api.put(`/api/actividades/${formActividad.id}`, payload);
        toast.success("Actividad actualizada correctamente.");
      } else {
        await api.post("/api/actividades", payload);
        toast.success("Actividad programada exitosamente.");
      }

      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar actividad:", err);
      toast.error(err.response?.data?.message || "Error al guardar actividad.");
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal de completar actividad
  const handleOpenCompleteModal = (act: any) => {
    setActivityToComplete(act);
    setCompleteForm({
      resultado_estado: "Exitoso",
      resultado_notas: "",
      duracion_minutos: "15",
      programar_siguiente: false,
    });
    setIsCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeForm.resultado_notas.trim()) {
      toast.error("Ingrese las notas o resumen de lo que se habló/hizo.");
      return;
    }

    try {
      await api.put(`/api/actividades/${activityToComplete.id}/completar`, {
        resultado_estado: completeForm.resultado_estado,
        resultado_notas: completeForm.resultado_notas.trim(),
        duracion_minutos: Number(completeForm.duracion_minutos) || 15,
      });

      toast.success("¡Actividad completada y registrada en la bitácora!");
      setIsCompleteModalOpen(false);

      if (completeForm.programar_siguiente) {
        // Pre-cargar siguiente seguimiento con el mismo cliente y responsable
        setFormActividad({
          id: null,
          tipo: "Llamada",
          asunto: `Seguimiento: ${activityToComplete.asunto}`,
          descripcion: `Continuación de gestión previa: ${completeForm.resultado_notas.trim()}`,
          fecha_programada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          fecha_fin_programada: "",
          prioridad: "Media",
          trabajador_id: activityToComplete.trabajador_id ? String(activityToComplete.trabajador_id) : "",
          contacto_id: activityToComplete.contacto_id ? String(activityToComplete.contacto_id) : "",
          oportunidad_id: activityToComplete.oportunidad_id ? String(activityToComplete.oportunidad_id) : "",
          venta_id: activityToComplete.venta_id ? String(activityToComplete.venta_id) : "",
          pedido_id: activityToComplete.pedido_id ? String(activityToComplete.pedido_id) : "",
        });
        setIsCreateModalOpen(true);
      }

      fetchData();
    } catch (err: any) {
      toast.error("Error al completar actividad.");
    }
  };

  const handleDeleteActividad = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta actividad?")) return;
    try {
      await api.delete(`/api/actividades/${id}`);
      toast.success("Actividad eliminada.");
      fetchData();
      setIsDetailModalOpen(false);
    } catch (err: any) {
      toast.error("Error al eliminar actividad.");
    }
  };

  const handleOpenDetailModal = (act: any) => {
    setSelectedActivity(act);
    setIsDetailModalOpen(true);
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case "Urgente":
        return <Badge variant="destructive" className="font-bold text-[10px]">Urgente</Badge>;
      case "Alta":
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 font-semibold text-[10px]">Alta</Badge>;
      case "Baja":
        return <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 text-[10px]">Baja</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px]">Media</Badge>;
    }
  };

  const renderBadgeContexto = (item: any) => {
    if (item.oportunidad_id) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] gap-1 font-medium">
          <Sparkles className="size-3" />
          <span>Oportunidad: {item.oportunidad_titulo || `#${item.oportunidad_id}`}</span>
        </Badge>
      );
    }
    if (item.venta_id) {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] gap-1 font-medium">
          <Award className="size-3" />
          <span>Venta #{item.numero_venta || item.venta_id}</span>
        </Badge>
      );
    }
    if (item.pedido_id) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] gap-1 font-medium">
          <Truck className="size-3" />
          <span>Pedido #{item.numero_pedido || item.pedido_id}</span>
        </Badge>
      );
    }
    if (item.contacto_id) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] gap-1 font-medium">
          <Users className="size-3" />
          <span>Cliente: {item.contacto_nombre}</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[11px] font-medium">
        Tarea Interna
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/contactos" className="hover:text-primary transition-colors">
              Comercial
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Planificador & Bitácora de Actividades</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="size-7 text-primary" />
            Actividades & Planificador de Operaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Planifica llamadas, reuniones y entregas por horas, y audita la bitácora de gestiones realizadas por el equipo.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch de Vistas */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs">
            <button
              onClick={() => setViewMode("planificador")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "planificador" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="size-3.5" />
              <span>Planificador</span>
            </button>
            <button
              onClick={() => setViewMode("tablero")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "tablero" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListTodo className="size-3.5" />
              <span>Agenda de Tareas</span>
            </button>
            <button
              onClick={() => setViewMode("supervision")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "supervision" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="size-3.5" />
              <span>Bitácora de Productividad</span>
            </button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleOpenCreateModal()}
            className="gap-1.5 shadow-xs"
          >
            <PlusCircle className="size-4" />
            <span>Planificar Actividad</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 shadow-xs">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card
          onClick={() => { setViewMode("tablero"); setActiveTab("hoy"); }}
          className="bg-card shadow-xs border cursor-pointer hover:border-amber-300 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-amber-700">Para Hoy (Pendientes)</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{kpis.hoy_pendientes || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Gestiones por realizar hoy</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setViewMode("tablero"); setActiveTab("vencidas"); }}
          className="bg-card shadow-xs border border-rose-200 bg-rose-50/20 cursor-pointer hover:border-rose-400 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-rose-700">Vencidas (Sin Completar)</CardTitle>
            <AlertTriangle className="size-4 text-rose-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-rose-600">{kpis.vencidas || 0}</div>
            <p className="text-[11px] text-rose-500 mt-0.5">Fecha límite sobrepasada</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setViewMode("supervision"); }}
          className="bg-card shadow-xs border border-emerald-200 bg-emerald-50/20 cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-800">Completadas Hoy</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-emerald-700">{kpis.completadas_hoy || 0}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Verificadas con notas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-indigo-700">Completadas en el Mes</CardTitle>
            <Award className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-indigo-600">{kpis.completadas_mes || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Gestiones cerradas con éxito</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setViewMode("tablero"); setActiveTab("programadas"); }}
          className="bg-card shadow-xs border cursor-pointer hover:border-blue-300 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-blue-700">Programadas Futuras</CardTitle>
            <CalendarIcon className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{kpis.futuras || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Compromisos agendados</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Filters */}
      <Card className="bg-card shadow-xs border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, asunto o nota..."
                className="pl-9 h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro Colaborador */}
            <select
              value={filterTrabajador}
              onChange={(e) => setFilterTrabajador(e.target.value)}
              className="h-8 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer"
            >
              <option value="all">Todos los Colaboradores</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.apellido || ""} ({s.rol_operativo})
                </option>
              ))}
            </select>

            {/* Filtro Tipo */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="h-8 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer"
            >
              <option value="all">Todos los Tipos</option>
              <option value="Llamada">📞 Llamadas</option>
              <option value="WhatsApp">💬 WhatsApp</option>
              <option value="Reunión Presencial">🟣 Reuniones</option>
              <option value="Videollamada">💻 Videollamadas</option>
              <option value="Visita Técnica">🛠️ Visitas Técnicas</option>
              <option value="Envío de Cotización">📄 Cotizaciones</option>
              <option value="Cobranza">💰 Cobranzas</option>
              <option value="Tarea Interna">📌 Tareas Internas</option>
            </select>

            {/* Filtro Contexto */}
            <select
              value={filterContexto}
              onChange={(e) => setFilterContexto(e.target.value)}
              className="h-8 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer"
            >
              <option value="all">Todo Contexto (Ventas, Pedidos, Opps)</option>
              <option value="oportunidad">Solo Oportunidades (Kanban)</option>
              <option value="venta">Solo Ventas</option>
              <option value="pedido">Solo Pedidos</option>
              <option value="contacto">Solo Clientes / Contactos</option>
              <option value="interna">Solo Tareas Internas</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Mostrando <strong className="text-foreground">{filteredActividades.length}</strong> actividades</span>
          </div>
        </div>
      </Card>

      {/* VISTA 1: PLANIFICADOR (FULLCALENDAR TIMEGRID) */}
      {viewMode === "planificador" && (
        <Card className="bg-card shadow-xs border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => calendarRef.current?.getApi().prev()}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calendarRef.current?.getApi().next()}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => calendarRef.current?.getApi().today()}
                className="h-8 px-3 text-xs font-semibold"
              >
                Hoy
              </Button>
            </div>

            <h2 className="text-base font-bold text-foreground">
              {calendarRef.current?.getApi().view.title}
            </h2>

            <div className="flex items-center gap-1">
              <Button
                variant={currentCalendarView === "timeGridDay" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => {
                  calendarRef.current?.getApi().changeView("timeGridDay");
                  setCurrentCalendarView("timeGridDay");
                }}
              >
                Día
              </Button>
              <Button
                variant={currentCalendarView === "timeGridWeek" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => {
                  calendarRef.current?.getApi().changeView("timeGridWeek");
                  setCurrentCalendarView("timeGridWeek");
                }}
              >
                Semana (Horas)
              </Button>
              <Button
                variant={currentCalendarView === "dayGridMonth" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => {
                  calendarRef.current?.getApi().changeView("dayGridMonth");
                  setCurrentCalendarView("dayGridMonth");
                }}
              >
                Mes
              </Button>
            </div>
          </div>

          <div className="planificador-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentCalendarView}
              headerToolbar={false}
              height="auto"
              locale="es"
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              events={calendarEvents}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              dateClick={(info) => {
                handleOpenCreateModal(info.dateStr);
              }}
              eventClick={(info) => {
                const act = actividades.find((a) => String(a.id) === info.event.id);
                if (act) handleOpenDetailModal(act);
              }}
              eventDidMount={(info) => {
                const ext = info.event.extendedProps;
                if (ext.estado === "Completada") {
                  info.el.style.opacity = "0.7";
                  info.el.style.textDecoration = "line-through";
                }
                if (ext.isOverdue) {
                  info.el.style.boxShadow = "0 0 0 2px #e11d48";
                }
              }}
            />
          </div>
        </Card>
      )}

      {/* VISTA 2: TABLERO OPERATIVO / AGENDA DE TAREAS */}
      {viewMode === "tablero" && (
        <Card className="bg-card shadow-xs border">
          <CardHeader className="p-4 border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border text-xs">
                <button
                  onClick={() => setActiveTab("hoy")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "hoy" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="size-3.5 text-amber-500" />
                  <span>Para Hoy</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 font-bold">{listHoy.length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab("vencidas")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "vencidas" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle className="size-3.5 text-rose-500" />
                  <span>Vencidas</span>
                  {listVencidas.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1 font-bold">{listVencidas.length}</Badge>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("programadas")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "programadas" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarIcon className="size-3.5 text-blue-500" />
                  <span>Próximas</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{listProgramadas.length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab("historial")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "historial" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Historial (Lo Hecho)</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{listHistorial.length}</Badge>
                </button>
              </div>

              <span className="text-xs text-muted-foreground">
                {activeTab === "historial" ? "Bitácora de interacciones completadas con resultados registrados" : "Compromisos comerciales pendientes de ejecución"}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="w-10 text-center"></TableHead>
                    <TableHead className="font-semibold">Actividad & Tipo</TableHead>
                    <TableHead className="font-semibold">Vínculo / Contexto</TableHead>
                    <TableHead className="font-semibold">Cliente / Contacto</TableHead>
                    <TableHead className="font-semibold">Responsable</TableHead>
                    <TableHead className="font-semibold">Horario Programado</TableHead>
                    <TableHead className="font-semibold">Prioridad</TableHead>
                    {activeTab === "historial" && <TableHead className="font-semibold">Resultado & Notas</TableHead>}
                    <TableHead className="text-center font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {(activeTab === "hoy" ? listHoy :
                    activeTab === "vencidas" ? listVencidas :
                    activeTab === "programadas" ? listProgramadas : listHistorial
                  ).map((item) => {
                    const isDone = item.estado === "Completada";
                    const isOverdue = item.estado === "Pendiente" && item.fecha_programada < nowStr;

                    return (
                      <TableRow key={item.id} className={`hover:bg-muted/20 ${isOverdue ? "bg-rose-50/20" : ""}`}>
                        {/* Checkbox para completar rápido */}
                        <TableCell className="text-center">
                          {isDone ? (
                            <CheckCircle2 className="size-4 text-emerald-600 inline" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCompleteModal(item)}
                              className="size-4 rounded border border-muted-foreground/40 hover:border-emerald-600 hover:bg-emerald-50 transition-colors inline-block"
                              title="Marcar como Completada"
                            />
                          )}
                        </TableCell>

                        {/* Asunto y Tipo */}
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className={`text-foreground ${isDone ? "line-through text-muted-foreground" : "font-semibold"}`}>
                              {item.asunto}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{getIconEmoji(item.tipo)}</span>
                              <span>{item.tipo}</span>
                              {item.descripcion && <span>· {item.descripcion.slice(0, 45)}...</span>}
                            </span>
                          </div>
                        </TableCell>

                        {/* Vínculo inteligente */}
                        <TableCell>
                          {renderBadgeContexto(item)}
                        </TableCell>

                        {/* Cliente */}
                        <TableCell>
                          {item.contacto_nombre ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{item.contacto_nombre}</span>
                              {item.contacto_telefono && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span>{item.contacto_telefono}</span>
                                  <a
                                    href={`https://wa.me/${item.contacto_telefono.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:text-emerald-800"
                                    title="Abrir WhatsApp"
                                  >
                                    <MessageSquare className="size-3 inline" />
                                  </a>
                                  <a
                                    href={`tel:${item.contacto_telefono}`}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Llamar"
                                  >
                                    <Phone className="size-3 inline" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic">-</span>
                          )}
                        </TableCell>

                        {/* Responsable */}
                        <TableCell>
                          <span className="font-medium text-foreground">{item.trabajador_nombre || "Sin Asignar"}</span>
                          {item.trabajador_rol && (
                            <span className="block text-[10px] text-muted-foreground">{item.trabajador_rol}</span>
                          )}
                        </TableCell>

                        {/* Horario */}
                        <TableCell className="font-mono text-[11px]">
                          <div>
                            <span className={isOverdue ? "text-rose-600 font-bold" : "text-foreground"}>
                              {item.fecha_programada ? item.fecha_programada.replace("T", " ").slice(0, 16) : "-"}
                            </span>
                            {isOverdue && (
                              <span className="block text-[10px] text-rose-500 font-sans font-medium">⚠️ Vencida</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Prioridad */}
                        <TableCell>
                          {getPriorityBadge(item.prioridad)}
                        </TableCell>

                        {/* Si es historial: Notas del resultado */}
                        {activeTab === "historial" && (
                          <TableCell className="max-w-xs">
                            <div className="flex flex-col text-[11px]">
                              <Badge variant="outline" className="w-fit text-[10px] text-emerald-700 bg-emerald-50 mb-0.5">
                                {item.resultado_estado || "Completado"}
                              </Badge>
                              <span className="text-foreground">{item.resultado_notas || "-"}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Realizado: {item.fecha_ejecutada ? item.fecha_ejecutada.replace("T", " ").slice(0, 16) : "-"}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {/* Acciones */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!isDone && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenCompleteModal(item)}
                                className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-[11px] font-semibold"
                                title="Marcar como Realizada y anotar resultado"
                              >
                                <CheckSquare className="size-3.5 mr-1" />
                                <span>Hecho</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDetailModal(item)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Ver Detalle"
                            >
                              <ExternalLink className="size-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteActividad(item.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                              title="Eliminar"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {((activeTab === "hoy" && listHoy.length === 0) ||
                    (activeTab === "vencidas" && listVencidas.length === 0) ||
                    (activeTab === "programadas" && listProgramadas.length === 0) ||
                    (activeTab === "historial" && listHistorial.length === 0)) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                        No hay actividades en esta sección para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VISTA 3: BITÁCORA Y SUPERVISIÓN DE PRODUCTIVIDAD */}
      {viewMode === "supervision" && (
        <div className="flex flex-col gap-4">
          <Card className="bg-card shadow-xs border">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Productividad y Auditoría por Asesor (Últimos 30 días)
              </CardTitle>
              <CardDescription className="text-xs">
                Verifica la cantidad de gestiones cerradas por cada colaborador y detecta cuellos de botella o actividades vencidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Colaborador</TableHead>
                    <TableHead className="font-semibold">Rol Operativo</TableHead>
                    <TableHead className="text-center font-semibold">Completadas (Lo Hecho)</TableHead>
                    <TableHead className="text-center font-semibold">Pendientes para Hoy</TableHead>
                    <TableHead className="text-center font-semibold">Vencidas Sin Atender</TableHead>
                    <TableHead className="text-center font-semibold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.ranking && kpis.ranking.map((row: any) => (
                    <TableRow key={row.trabajador_id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">{row.trabajador_nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{row.rol_operativo}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-700 text-sm">
                        {row.completadas || 0}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-amber-600">
                        {row.pendientes_hoy || 0}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-rose-600">
                        {row.vencidas || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFilterTrabajador(String(row.trabajador_id));
                            setViewMode("tablero");
                            setActiveTab("historial");
                          }}
                          className="h-7 text-[11px] gap-1"
                        >
                          <FileText className="size-3" />
                          <span>Auditar Bitácora</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: PLANIFICAR ACTIVIDAD */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CalendarCheck className="size-5 text-primary" />
              <span>{formActividad.id ? "Editar Actividad" : "Planificar Nueva Actividad"}</span>
            </DialogTitle>
            <DialogDescription>
              Programa una llamada, reunión o seguimiento comercial/operativo en la agenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveActividad} className="flex flex-col gap-3.5 py-1 text-xs">
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Asunto de la Actividad *
              </label>
              <Input
                required
                placeholder="Ej: Llamada para confirmar firma de contrato Fibra 100M"
                value={formActividad.asunto}
                onChange={(e) => setFormActividad({ ...formActividad, asunto: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Tipo de Actividad *
                </label>
                <select
                  value={formActividad.tipo}
                  onChange={(e) => setFormActividad({ ...formActividad, tipo: e.target.value })}
                  className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
                >
                  <option value="Llamada">📞 Llamada Telefónica</option>
                  <option value="WhatsApp">💬 Mensaje / WhatsApp</option>
                  <option value="Reunión Presencial">🟣 Reunión Presencial</option>
                  <option value="Videollamada">💻 Videollamada / Demo</option>
                  <option value="Visita Técnica">🛠️ Visita Técnica / Instalación</option>
                  <option value="Envío de Cotización">📄 Envío de Cotización</option>
                  <option value="Cobranza">💰 Cobranza / Pago</option>
                  <option value="Tarea Interna">📌 Tarea Interna</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Prioridad
                </label>
                <select
                  value={formActividad.prioridad}
                  onChange={(e) => setFormActividad({ ...formActividad, prioridad: e.target.value })}
                  className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Fecha y Hora de Inicio *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={formActividad.fecha_programada}
                  onChange={(e) => setFormActividad({ ...formActividad, fecha_programada: e.target.value })}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Hora de Fin (Opcional)
                </label>
                <Input
                  type="datetime-local"
                  value={formActividad.fecha_fin_programada}
                  onChange={(e) => setFormActividad({ ...formActividad, fecha_fin_programada: e.target.value })}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Responsable Asignado
                </label>
                <select
                  value={formActividad.trabajador_id}
                  onChange={(e) => setFormActividad({ ...formActividad, trabajador_id: e.target.value })}
                  className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
                >
                  <option value="">-- Sin Asignar --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.apellido || ""} ({s.rol_operativo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Cliente / Contacto Asociado
                </label>
                <select
                  value={formActividad.contacto_id}
                  onChange={(e) => setFormActividad({ ...formActividad, contacto_id: e.target.value })}
                  className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
                >
                  <option value="">-- Independiente (Sin Cliente) --</option>
                  {contactsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razon_social || `${c.nombres || ""} ${c.apellidos || ""}`.trim() || c.nombre || `ID #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Oportunidad asociada */}
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Oportunidad Comercial (Opcional)
              </label>
              <select
                value={formActividad.oportunidad_id}
                onChange={(e) => setFormActividad({ ...formActividad, oportunidad_id: e.target.value })}
                className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
              >
                <option value="">-- Ninguna --</option>
                {oppsList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo} (S/ {o.valor || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Descripción / Instrucciones
              </label>
              <textarea
                rows={2}
                placeholder="Detalle o notas de preparación para la gestión..."
                value={formActividad.descripcion}
                onChange={(e) => setFormActividad({ ...formActividad, descripcion: e.target.value })}
                className="w-full text-xs bg-card border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5">
                {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
                <span>Guardar Actividad</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: COMPLETAR ACTIVIDAD (REGISTRAR LO QUE SE HIZO) */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckSquare className="size-5" />
              <span>Registrar Resultado de la Gestión</span>
            </DialogTitle>
            <DialogDescription>
              {activityToComplete?.asunto}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmComplete} className="flex flex-col gap-3 py-1 text-xs">
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                ¿Cuál fue el resultado de la gestión? *
              </label>
              <select
                value={completeForm.resultado_estado}
                onChange={(e) => setCompleteForm({ ...completeForm, resultado_estado: e.target.value })}
                className="w-full h-9 bg-card border rounded-md px-2.5 font-medium"
              >
                <option value="Exitoso">✅ Exitoso / Aceptó propuesta</option>
                <option value="Reunión Realizada">🟣 Reunión realizada</option>
                <option value="Volver a llamar">📞 Volver a llamar / Pidió tiempo</option>
                <option value="No contestó / Ocupado">❌ No contestó / Teléfono ocupado</option>
                <option value="No interesado">⛔ Cliente no interesado / Rechazó</option>
                <option value="Completado">✔️ Tarea completada con éxito</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Notas y Acuerdos (Lo que se habló / verificó) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Escriba las notas exactas de lo conversado o verificado para la bitácora..."
                value={completeForm.resultado_notas}
                onChange={(e) => setCompleteForm({ ...completeForm, resultado_notas: e.target.value })}
                className="w-full text-xs bg-card border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Duración Invertida (minutos)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={completeForm.duracion_minutos}
                  onChange={(e) => setCompleteForm({ ...completeForm, duracion_minutos: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={completeForm.programar_siguiente}
                    onChange={(e) => setCompleteForm({ ...completeForm, programar_siguiente: e.target.checked })}
                    className="rounded border-muted-foreground"
                  />
                  <span className="font-medium text-foreground">Programar siguiente seguimiento</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCompleteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <CheckCircle2 className="size-4" />
                <span>Guardar en Bitácora</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DETALLE DE ACTIVIDAD */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          {selectedActivity && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getIconEmoji(selectedActivity.tipo)}</span>
                    <span>{selectedActivity.asunto}</span>
                  </div>
                  <Badge variant={selectedActivity.estado === "Completada" ? "default" : "secondary"} className="text-xs">
                    {selectedActivity.estado}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Programada para: {selectedActivity.fecha_programada ? selectedActivity.fecha_programada.replace("T", " ").slice(0, 16) : "-"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 py-3 text-xs">
                {/* Context badge */}
                <div>{renderBadgeContexto(selectedActivity)}</div>

                {/* Cliente */}
                {selectedActivity.contacto_nombre && (
                  <div className="bg-muted/40 p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Cliente / Empresa</span>
                      <span className="font-bold text-foreground text-sm">{selectedActivity.contacto_nombre}</span>
                      {selectedActivity.contacto_telefono && (
                        <span className="block text-muted-foreground font-mono">{selectedActivity.contacto_telefono}</span>
                      )}
                    </div>
                    {selectedActivity.contacto_telefono && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${selectedActivity.contacto_telefono.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-md shadow-xs"
                          title="Enviar WhatsApp"
                        >
                          <MessageSquare className="size-4" />
                        </a>
                        <a
                          href={`tel:${selectedActivity.contacto_telefono}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-xs"
                          title="Llamar"
                        >
                          <Phone className="size-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Asignado */}
                <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-md border text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Responsable Asignado</span>
                    <span className="font-semibold text-foreground">{selectedActivity.trabajador_nombre || "Sin Asignar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Prioridad</span>
                    <div>{getPriorityBadge(selectedActivity.prioridad)}</div>
                  </div>
                </div>

                {/* Descripción previa */}
                {selectedActivity.descripcion && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold mb-0.5">Instrucciones previas</span>
                    <div className="p-2 bg-muted/10 border rounded text-foreground">{selectedActivity.descripcion}</div>
                  </div>
                )}

                {/* Si ya fue completada: Resultado */}
                {selectedActivity.estado === "Completada" && (
                  <div className="border border-emerald-200 bg-emerald-50/40 p-3 rounded-lg">
                    <span className="text-emerald-800 font-bold block mb-1">
                      Resultado Registrado ({selectedActivity.resultado_estado || "Completado"})
                    </span>
                    <p className="text-foreground">{selectedActivity.resultado_notas}</p>
                    <span className="text-[10px] text-muted-foreground block mt-1 font-mono">
                      Completada el: {selectedActivity.fecha_ejecutada ? selectedActivity.fecha_ejecutada.replace("T", " ").slice(0, 16) : "-"}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteActividad(selectedActivity.id)}
                  className="text-rose-600 hover:bg-rose-50 gap-1 text-xs"
                >
                  <Trash2 className="size-3.5" />
                  <span>Eliminar</span>
                </Button>

                <div className="flex items-center gap-2">
                  {selectedActivity.estado !== "Completada" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenCompleteModal(selectedActivity);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                    >
                      <CheckSquare className="size-3.5" />
                      <span>Marcar Hecho</span>
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
