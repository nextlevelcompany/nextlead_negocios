"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Kanban,
  List as ListIcon,
  RefreshCw,
  Plus,
  Search,
  ArrowRight,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Tag as TagIcon,
  Columns3,
  Calendar,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2,
  Layers,
  User,
  Printer,
  Coins,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Building2,
  Package,
  FileText,
  Phone,
  MessageSquare,
  Copy,
  UserCheck,
  Briefcase,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { OpportunityWhatsAppModal } from "@/components/opportunities/OpportunityWhatsAppModal";
import { ModalCrearActividad } from "@/components/actividades/ModalCrearActividad";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import {
  OpportunityWhatsAppParams,
  buildOpportunityWhatsAppMessage,
  copyOpportunityToClipboard,
} from "@/components/opportunities/opportunityWhatsApp";

interface KanbanColumn {
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
  productos_json?: string | null;
  contacto_tipo_persona?: string | null;
  numero_documento?: string | null;
  contacto_nombre_completo?: string | null;
  contacto_persona?: string | null;
  contacto_persona_calculado?: string | null;
  trabajador_id?: number | null;
  vendedor_nombre?: string | null;
  vendedor_perfil?: string | null;
  vendedor_perfil_id?: number | null;
  supervisor_id?: number | null;
  supervisor_nombre?: string | null;
  equipo_nombre?: string | null;
  telefono_movil?: string | null;
  contacto_email?: string | null;
  contacto_nombre?: string | null;
  empresa_id?: number | null;
  empresa_razon_social?: string | null;
  tipo_propuesta?: string | null;
  moneda?: string | null;
  total_instalacion?: number | null;
  plazo_acuerdo?: number | null;
  detalles_json?: string | null;
  direccion_completa?: string | null;
}

interface KanbanTag {
  id: number;
  nombre: string;
  color: string;
}

interface ContactOption {
  id: number;
  tipo_persona: string;
  display_name: string;
}

export default function OpportunitiesKanbanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tags, setTags] = useState<KanbanTag[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  // View state
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [draggedOppId, setDraggedOppId] = useState<number | null>(null);
  const [dragOverColId, setDragOverColId] = useState<number | null>(null);

  // Pagination for List View
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(25);

  // WhatsApp Share State
  const [selectedOppForWhatsApp, setSelectedOppForWhatsApp] = useState<Opportunity | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);

  // Actividades State
  const [selectedOppForActividad, setSelectedOppForActividad] = useState<Opportunity | null>(null);
  const [actividadModalOpen, setActividadModalOpen] = useState(false);

  const getOpportunityWhatsAppParams = (opp: Opportunity): OpportunityWhatsAppParams => {
    let itemsParsed: any[] = [];
    if (opp.detalles_json) {
      try {
        itemsParsed = JSON.parse(opp.detalles_json);
      } catch (e) {}
    } else if (opp.productos_json) {
      try {
        const prod = JSON.parse(opp.productos_json);
        itemsParsed = Array.isArray(prod)
          ? prod.map((p: any) => ({
              titulo: p.nombre,
              descripcion: p.nombre,
              cantidad: p.cantidad,
              precio: p.precio,
            }))
          : [];
      } catch (e) {}
    }

    return {
      id: opp.id,
      titulo: opp.titulo,
      empresa: opp.contacto_nombre_completo || "Cliente",
      ruc: opp.numero_documento || "",
      direccion: opp.direccion_completa || itemsParsed[0]?.direccion || "",
      contacto: opp.contacto_persona_calculado || opp.contacto_persona || "",
      telefono: opp.telefono_movil || "",
      correo: opp.contacto_email || "",
      tipo_propuesta: opp.tipo_propuesta || "venta",
      plazo_acuerdo: opp.plazo_acuerdo || 24,
      moneda: opp.moneda || "Soles",
      items: itemsParsed,
      total_mensual: opp.valor,
      total_instalacion: opp.total_instalacion || 0,
      asesor_nombre: opp.vendedor_nombre || "",
      notas: opp.notas || "",
    };
  };

  const handleOpenWhatsAppModal = (opp: Opportunity) => {
    setSelectedOppForWhatsApp(opp);
    setWhatsAppModalOpen(true);
  };

  const handleDirectCopyWhatsApp = async (opp: Opportunity) => {
    const params = getOpportunityWhatsAppParams(opp);
    const text = buildOpportunityWhatsAppMessage(params);
    const ok = await copyOpportunityToClipboard(text);
    if (ok) {
      toast.success(`¡Detalles de la oportunidad #${opp.id} copiados para WhatsApp!`);
    } else {
      toast.error("No se pudo copiar automáticamente al portapapeles.");
    }
  };

  // Filters
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);

  // Collapse sidebar by default on mobile / smaller screens to avoid blocking the board
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsFilterSidebarOpen(false);
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Commercial Filters (Supervisor, Modalidad: Ejecutivo/Freelance/Supervisor, Asesor)
  const [filterSupervisor, setFilterSupervisor] = useState<string>("all");
  const [filterPerfil, setFilterPerfil] = useState<string>("all"); // 'all' | 'ejecutivo' | 'freelance' | 'supervisor'
  const [filterVendedor, setFilterVendedor] = useState<string>("all");
  const [staffList, setStaffList] = useState<any[]>([]);

  // User scope tracking for privacy
  const [isOwnScope, setIsOwnScope] = useState(false);
  const [ownTrabajadorId, setOwnTrabajadorId] = useState<string | null>(null);

  useEffect(() => {
    const applyUserScope = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_active_user");
        if (stored) {
          try {
            const u = JSON.parse(stored);
            let m: any = {};
            if (u.modules) {
              m = typeof u.modules === "string" ? JSON.parse(u.modules) : u.modules;
            }
            if (m.sales_scope === "own" || u.role === "VENDEDOR") {
              setIsOwnScope(true);
              if (m.trabajador_id) {
                const tid = String(m.trabajador_id);
                setOwnTrabajadorId(tid);
                setFilterVendedor(tid);
              }
            } else {
              setIsOwnScope(false);
              setOwnTrabajadorId(null);
            }
          } catch {}
        }
      }
    };
    applyUserScope();
    const handleUserSwitch = () => applyUserScope();
    window.addEventListener("crm_user_switched", handleUserSwitch);
    return () => window.removeEventListener("crm_user_switched", handleUserSwitch);
  }, []);

  // Modals state
  const [showColModal, setShowColModal] = useState(false);
  const [colForm, setColForm] = useState<{
    id?: number | null;
    nombre: string;
    es_ganada: boolean;
    label_ganada: string;
    es_perdida: boolean;
    label_perdida: string;
  }>({
    id: null,
    nombre: "",
    es_ganada: false,
    label_ganada: "Ganada",
    es_perdida: false,
    label_perdida: "Perdida",
  });
  const [savingCol, setSavingCol] = useState(false);

  const [showTagModal, setShowTagModal] = useState(false);
  const [tagForm, setTagForm] = useState<{ nombre: string; color: string }>({
    nombre: "",
    color: "#6366f1",
  });
  const [savingTag, setSavingTag] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [res, staffRes] = await Promise.all([
        api.get("/api/opportunities/kanban?includeContacts=false"),
        api.get("/api/payroll/staff").catch(() => ({ data: [] })),
      ]);
      if (res.data) {
        setColumns(res.data.columns || []);
        setOpportunities(res.data.opportunities || []);
        setTags(res.data.tags || []);
        setContacts(res.data.contacts || []);
        if (res.data.staff && Array.isArray(res.data.staff) && res.data.staff.length > 0) {
          setStaffList(res.data.staff);
        } else if (staffRes.data && Array.isArray(staffRes.data)) {
          setStaffList(staffRes.data);
        }
      }
    } catch (err: any) {
      console.error("Error loading opportunities:", err);
      toast.error(err.response?.data?.message || "Error al cargar las oportunidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lista dinámica de Supervisores únicos
  const allSupervisores = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    staffList.forEach((st) => {
      const isSup =
        (st.rol_operativo && st.rol_operativo.toLowerCase().includes("supervisor")) ||
        (st.perfil_nombre && st.perfil_nombre.toLowerCase().includes("supervisor")) ||
        st.perfil_comision_id === 4;
      if (isSup && st.id) {
        const label = `${st.nombre} ${st.apellido || ""}`.trim();
        map.set(String(st.id), { id: String(st.id), label });
      }
    });
    opportunities.forEach((o) => {
      if (
        o.supervisor_id &&
        o.supervisor_nombre &&
        o.supervisor_nombre.trim() !== "Sin Supervisor" &&
        o.supervisor_nombre.trim() !== ""
      ) {
        if (!map.has(String(o.supervisor_id))) {
          map.set(String(o.supervisor_id), { id: String(o.supervisor_id), label: o.supervisor_nombre });
        }
      } else if (
        o.supervisor_nombre &&
        o.supervisor_nombre.trim() !== "Sin Supervisor" &&
        o.supervisor_nombre.trim() !== ""
      ) {
        if (!map.has(o.supervisor_nombre)) {
          map.set(o.supervisor_nombre, { id: o.supervisor_nombre, label: o.supervisor_nombre });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [staffList, opportunities]);

  // Lista dinámica de Ejecutivos / Vendedores únicos
  const allVendedores = useMemo(() => {
    const map = new Map<string, { id: string; label: string; perfil?: string; perfilKey?: string }>();
    staffList.forEach((st) => {
      if (st.id && st.nombre) {
        const label = `${st.nombre} ${st.apellido || ""}`.trim();
        const perfilStr = st.perfil_nombre || st.rol_operativo || "Asesor";
        map.set(String(st.id), {
          id: String(st.id),
          label,
          perfil: perfilStr,
          perfilKey: perfilStr.toLowerCase(),
        });
      }
    });
    opportunities.forEach((o) => {
      const idKey = o.trabajador_id ? String(o.trabajador_id) : (o.vendedor_nombre || "");
      if (idKey && !map.has(idKey)) {
        map.set(idKey, {
          id: idKey,
          label: o.vendedor_nombre || "Asesor",
          perfil: o.vendedor_perfil || undefined,
          perfilKey: (o.vendedor_perfil || "").toLowerCase(),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [staffList, opportunities]);

  // Lista de vendedores filtrada opcionalmente por modalidad seleccionada
  const visibleVendedores = useMemo(() => {
    if (filterPerfil === "all") return allVendedores;
    return allVendedores.filter((v) => {
      const p = (v.perfil || "").toLowerCase();
      if (filterPerfil === "freelance") return p.includes("freelance");
      if (filterPerfil === "supervisor") return p.includes("supervisor");
      if (filterPerfil === "ejecutivo") return !p.includes("freelance") && !p.includes("supervisor");
      return true;
    });
  }, [allVendedores, filterPerfil]);

  // Compute Weekdays for calendar strip
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

  // Filtered opportunities
  const filteredOpps = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return opportunities.filter((opp) => {
      const matchSearch =
        !term ||
        (opp.titulo && opp.titulo.toLowerCase().includes(term)) ||
        (opp.contacto_nombre_completo && opp.contacto_nombre_completo.toLowerCase().includes(term)) ||
        (opp.numero_documento && opp.numero_documento.includes(term)) ||
        (opp.notas && opp.notas.toLowerCase().includes(term)) ||
        (opp.etiquetas && opp.etiquetas.toLowerCase().includes(term)) ||
        (opp.vendedor_nombre && opp.vendedor_nombre.toLowerCase().includes(term)) ||
        (opp.supervisor_nombre && opp.supervisor_nombre.toLowerCase().includes(term));

      const matchPriority =
        filterPriority === "all" ||
        (opp.prioridad || "").toLowerCase() === filterPriority.toLowerCase();

      const matchTag =
        filterTag === "all" ||
        (opp.etiquetas && opp.etiquetas.includes(filterTag));

      const matchDate =
        !filterDate ||
        (opp.created_at && opp.created_at.startsWith(filterDate));

      // 1. Filtro por Supervisor
      let matchSupervisor = true;
      if (filterSupervisor !== "all") {
        if (filterSupervisor === "unassigned") {
          matchSupervisor = opp.supervisor_id == null && (!opp.supervisor_nombre || opp.supervisor_nombre === "Sin Asignar");
        } else {
          if (opp.supervisor_id == null && (!opp.supervisor_nombre || opp.supervisor_nombre === "Sin Asignar")) {
            matchSupervisor = false;
          } else {
            const selectedSup = staffList.find((st) => String(st.id) === filterSupervisor);
            const supFullName = selectedSup ? `${selectedSup.nombre} ${selectedSup.apellido || ""}`.trim().toLowerCase() : "";
            const oppSupName = (opp.supervisor_nombre || "").trim().toLowerCase();

            matchSupervisor =
              (opp.supervisor_id != null && String(opp.supervisor_id) === filterSupervisor) ||
              oppSupName === filterSupervisor.toLowerCase() ||
              (supFullName !== "" && (oppSupName === supFullName || oppSupName.includes(selectedSup?.nombre?.toLowerCase() || "")));
          }
        }
      }

      // 2. Filtro por Modalidad / Perfil (ejecutivo, freelance, supervisor)
      let matchPerfil = true;
      if (filterPerfil !== "all") {
        const hasWorker = opp.trabajador_id != null || (opp.vendedor_nombre && opp.vendedor_nombre !== "Sin Asignar");
        if (!hasWorker) {
          matchPerfil = false;
        } else {
          const p = (opp.vendedor_perfil || "").toLowerCase();
          if (filterPerfil === "freelance") {
            matchPerfil = p.includes("freelance");
          } else if (filterPerfil === "supervisor") {
            matchPerfil = p.includes("supervisor");
          } else if (filterPerfil === "ejecutivo") {
            matchPerfil = !p.includes("freelance") && !p.includes("supervisor");
          }
        }
      }

      // 3. Filtro por Ejecutivo / Vendedor específico
      let matchVendedor = true;
      if (filterVendedor !== "all") {
        if (filterVendedor === "unassigned") {
          matchVendedor = opp.trabajador_id == null && (!opp.vendedor_nombre || opp.vendedor_nombre === "Sin Asignar");
        } else {
          if (opp.trabajador_id == null && (!opp.vendedor_nombre || opp.vendedor_nombre === "Sin Asignar")) {
            matchVendedor = false;
          } else {
            const selectedWorker = staffList.find((st) => String(st.id) === filterVendedor);
            const workerFullName = selectedWorker ? `${selectedWorker.nombre} ${selectedWorker.apellido || ""}`.trim().toLowerCase() : "";
            const oppVenName = (opp.vendedor_nombre || "").trim().toLowerCase();

            matchVendedor =
              (opp.trabajador_id != null && String(opp.trabajador_id) === filterVendedor) ||
              oppVenName === filterVendedor.toLowerCase() ||
              (workerFullName !== "" && (oppVenName === workerFullName || (selectedWorker?.nombre && oppVenName.includes(selectedWorker.nombre.toLowerCase()))));
          }
        }
      }

      return matchSearch && matchPriority && matchTag && matchDate && matchSupervisor && matchPerfil && matchVendedor;
    });
  }, [opportunities, staffList, searchTerm, filterPriority, filterTag, filterDate, filterSupervisor, filterPerfil, filterVendedor]);

  const paginatedOpps = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filteredOpps.slice(start, start + listPageSize);
  }, [filteredOpps, listPage, listPageSize]);

  // Statistics (Calculados Sin IGV según precios base)
  const stats = useMemo(() => {
    const totalCount = opportunities.length;
    const totalValue = opportunities.reduce((sum, o) => sum + ((Number(o.valor) || 0) / 1.18), 0);

    const wonStageIds = new Set(columns.filter((c) => c.es_ganada).map((c) => c.id));
    const lostStageIds = new Set(columns.filter((c) => c.es_perdida).map((c) => c.id));

    const wonCount = opportunities.filter((o) => wonStageIds.has(o.etapa_id)).length;
    const wonValue = opportunities
      .filter((o) => wonStageIds.has(o.etapa_id))
      .reduce((sum, o) => sum + ((Number(o.valor) || 0) / 1.18), 0);

    const activeCount = opportunities.filter(
      (o) => !wonStageIds.has(o.etapa_id) && !lostStageIds.has(o.etapa_id)
    ).length;

    const conversionRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

    return {
      totalCount,
      totalValue,
      wonCount,
      wonValue,
      activeCount,
      conversionRate,
    };
  }, [opportunities, columns]);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, oppId: number) => {
    e.dataTransfer.setData("text/plain", String(oppId));
    e.dataTransfer.effectAllowed = "move";
    setDraggedOppId(oppId);
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

  const handleDrop = async (e: React.DragEvent, targetCol: KanbanColumn) => {
    e.preventDefault();
    setDragOverColId(null);
    setDraggedOppId(null);

    const oppIdStr = e.dataTransfer.getData("text/plain");
    if (!oppIdStr) return;

    const oppId = Number(oppIdStr);
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.etapa_id === targetCol.id) return;

    await executeMove(opp.id, targetCol.id, targetCol);
  };

  const executeMove = async (oppId: number, targetColId: number, targetCol?: KanbanColumn) => {
    try {
      const res = await api.post("/api/opportunities/move", {
        opp_id: oppId,
        etapa_id: targetColId,
      });

      if (res.data?.message) {
        if (res.data?.venta_creada) {
          toast.success(`¡Oportunidad Ganada! Venta ${res.data.numero_venta} Creada`, {
            description: `Se ha generado automáticamente la venta ${res.data.numero_venta} en el módulo de Ventas.`,
            duration: 6000,
          });
        } else if (targetCol?.es_ganada) {
          toast.success("¡Oportunidad Ganada!", {
            description: res.data?.numero_venta
              ? `Vinculada con la venta ${res.data.numero_venta} en el módulo de Ventas.`
              : "Se ha registrado la oportunidad en etapa Ganada.",
            duration: 5000,
          });
        } else {
          toast.success(res.data.message);
        }
        loadData();
      }
    } catch (err: any) {
      console.error("Error moving opportunity:", err);
      toast.error(err.response?.data?.message || "Error al mover la oportunidad.");
    }
  };

  // Delete opportunity
  const handleDeleteOpportunity = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta oportunidad?")) return;
    try {
      await api.delete(`/api/opportunities/${id}`);
      toast.success("Oportunidad eliminada.");
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      console.error("Error deleting opportunity:", err);
      toast.error(err.response?.data?.message || "No se pudo eliminar la oportunidad.");
    }
  };

  // Save Column
  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.nombre.trim()) {
      toast.error("El nombre de la columna es obligatorio.");
      return;
    }
    setSavingCol(true);
    try {
      await api.post("/api/opportunities/columns/save", colForm);
      toast.success("Etapa guardada con éxito.");
      setShowColModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar columna.");
    } finally {
      setSavingCol(false);
    }
  };

  // Delete Column
  const handleDeleteColumn = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta columna de la vista?")) return;
    try {
      await api.delete(`/api/opportunities/columns/${id}`);
      toast.success("Columna eliminada.");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo eliminar la columna.");
    }
  };

  // State & Handlers for reordering columns left/right
  const [movingColId, setMovingColId] = useState<number | null>(null);

  const handleMoveColumn = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[targetIndex];
    newColumns[targetIndex] = temp;

    setColumns(newColumns);
    setMovingColId(temp.id);

    try {
      const orderIds = newColumns.map((c) => c.id);
      await api.post("/api/opportunities/columns/order", orderIds);
      toast.success(`Columna "${temp.nombre}" movida a la ${direction === "left" ? "izquierda" : "derecha"}.`);
    } catch (err: any) {
      console.error("Error updating column order:", err);
      toast.error("Error al guardar el nuevo orden de columnas.");
      loadData();
    } finally {
      setMovingColId(null);
    }
  };

  const handleMoveColumnInModal = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[targetIndex];
    newColumns[targetIndex] = temp;

    setColumns(newColumns);

    try {
      const orderIds = newColumns.map((c) => c.id);
      await api.post("/api/opportunities/columns/order", orderIds);
      toast.success(`Orden de "${temp.nombre}" actualizado.`);
    } catch (err: any) {
      toast.error("Error al reordenar etapas.");
      loadData();
    }
  };

  // Helper to safely parse products JSON
  const parseProducts = (jsonStr?: string | null): any[] => {
    if (!jsonStr) return [];
    try {
      const parsed = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Save Tag
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagForm.nombre.trim()) {
      toast.error("El nombre de la etiqueta es obligatorio.");
      return;
    }
    setSavingTag(true);
    try {
      await api.post("/api/opportunities/tags/save", tagForm);
      toast.success("Etiqueta guardada.");
      setTagForm({ nombre: "", color: "#6366f1" });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar etiqueta.");
    } finally {
      setSavingTag(false);
    }
  };

  // Delete Tag from Master Catalog (optimistic without blocking alert)
  const handleDeleteTag = async (id: number) => {
    const previousTags = [...tags];
    setTags((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/api/opportunities/tags/${id}`);
      toast.success("Etiqueta eliminada del catálogo.");
    } catch (err: any) {
      setTags(previousTags);
      toast.error(err.response?.data?.message || "No se pudo eliminar la etiqueta.");
    }
  };

  // Remove a single tag from an opportunity
  const handleRemoveTagFromOpportunity = async (
    e: React.MouseEvent,
    oppId: number,
    tagToRemove: string,
    currentTags?: string | null
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentTags) return;
    const updated = currentTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && t.toLowerCase() !== tagToRemove.toLowerCase())
      .join(", ");

    // Optimistic UI update
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, etiquetas: updated || null } : o))
    );

    try {
      await api.patch(`/api/opportunities/${oppId}/tags`, { etiquetas: updated || "" });
      toast.success(`Etiqueta "${tagToRemove}" quitada de la oportunidad.`);
    } catch (err) {
      toast.error("No se pudo actualizar la oportunidad.");
      loadData();
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportData = filteredOpps.map((o) => {
        const col = columns.find((c) => c.id === o.etapa_id);
        return {
          ID: o.id,
          Título: o.titulo,
          Cliente: o.contacto_nombre_completo || "Sin Asignar",
          Documento: o.numero_documento || "",
          Etapa: col?.nombre || "",
          "Valor Sin IGV (S/)": ((Number(o.valor || 0)) / 1.18).toFixed(2),
          "Valor Inc IGV (S/)": Number(o.valor || 0).toFixed(2),
          Prioridad: o.prioridad,
          Etiquetas: o.etiquetas || "",
          Notas: o.notas || "",
          "Fecha Registro": o.created_at ? o.created_at.substring(0, 10) : "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Oportunidades");
      XLSX.writeFile(wb, `Oportunidades_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel descargado correctamente.");
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      toast.error("Error al exportar a Excel.");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="size-5 sm:size-6 text-emerald-600 shrink-0" />
            Oportunidades
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pipeline de ventas y cotizaciones comerciales.
          </p>
        </div>

        {/* Action Buttons & View Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="size-3.5" />
              Tablero
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="size-3.5" />
              Lista
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setColForm({
                id: null,
                nombre: "",
                es_ganada: false,
                label_ganada: "Ganada",
                es_perdida: false,
                label_perdida: "Perdida",
              });
              setShowColModal(true);
            }}
          >
            <Columns3 className="size-3.5" />
            Etapas
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowTagModal(true)}
          >
            <TagIcon className="size-3.5" />
            Etiquetas
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            asChild
          >
            <Link href="/opportunities/reports">
              <BarChart3 className="size-3.5 text-indigo-600" />
              Reportes
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            className="w-full sm:w-auto order-first sm:order-last h-9 sm:h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            asChild
          >
            <Link href="/opportunities/create">
              <Plus className="size-4" />
              Nueva Oportunidad
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pipeline Activo</span>
            <Layers className="size-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">{stats.activeCount}</div>
          <p className="text-[11px] text-muted-foreground">Leads en negociación</p>
        </Card>

        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Valor Estimado</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-emerald-600">
            S/ {stats.totalValue.toFixed(2)}
          </div>
          <p className="text-[11px] text-muted-foreground">Total en embudo</p>
        </Card>

        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ganadas</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">{stats.wonCount}</div>
          <p className="text-[11px] text-muted-foreground truncate">
            S/ {stats.wonValue.toFixed(2)} pedidos
          </p>
        </Card>

        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Conversión</span>
            <TrendingUp className="size-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-indigo-600">
            {stats.conversionRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-muted-foreground">Cierre exitoso</p>
        </Card>
      </div>

      {/* Main Content Area with Collapsible Left Filter Sidebar */}
      <div className="flex flex-col lg:flex-row items-start gap-4 w-full min-w-0">
        {/* Collapsible Left Filter Sidebar */}
        {isFilterSidebarOpen && (
          <aside className="w-full lg:w-60 xl:w-72 shrink-0 bg-card border rounded-xl p-3.5 shadow-xs space-y-4">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Filter className="size-3.5 text-primary" />
                <span>Filtros</span>
                {(searchTerm || filterPriority !== "all" || filterTag !== "all" || filterDate !== null || filterSupervisor !== "all" || filterPerfil !== "all" || filterVendedor !== "all") && (
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

            {/* 1. Semana Actual */}
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

              {/* 7-day Strip (L 16, M 17, M 18, J 19 [count], V 20, S 21, D 22) */}
              <div className="grid grid-cols-7 gap-1 w-full">
                {weekDays.map((day) => {
                  const isSelected = filterDate === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setFilterDate(isSelected ? null : day.dateStr)}
                      title={`${day.label} ${day.dayNum} (${day.totalCount} oportunidades)`}
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
                  placeholder="Buscar por lead, cliente, documento, nota o etiqueta..."
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

            {/* 3. Prioridad */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Prioridad
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="Alta">Prioridad Alta</option>
                <option value="Media">Prioridad Media</option>
                <option value="Baja">Prioridad Baja</option>
              </select>
            </div>

            {/* 4. Etiquetas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Etiquetas
              </label>
              <select
                className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="all">Todas las Etiquetas</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Equipo Comercial: Supervisor, Modalidad y Asesor */}
            <div className="space-y-2.5 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Briefcase className="size-3.5 text-primary" />
                <span>Equipo Comercial</span>
              </div>

              {/* Filtro: Supervisor */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  Supervisor
                </label>
                <select
                  className="w-full h-8 px-2 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={filterSupervisor}
                  onChange={(e) => setFilterSupervisor(e.target.value)}
                >
                  <option value="all">Todos los Supervisores</option>
                  {allSupervisores.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Modalidad / Perfil (Ejecutivo, Freelance, Supervisor) */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Briefcase className="size-3 text-blue-600" />
                  Modalidad / Perfil
                </label>
                <select
                  className="w-full h-8 px-2 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={filterPerfil}
                  onChange={(e) => setFilterPerfil(e.target.value)}
                >
                  <option value="all">Todas las Modalidades</option>
                  <option value="ejecutivo">Ejecutivo (Full Time / Planilla)</option>
                  <option value="freelance">Freelance (Comisionista)</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              {/* Filtro: Ejecutivo / Asesor */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="size-3 text-indigo-600" />
                  Ejecutivo / Asesor
                </label>
                {isOwnScope ? (
                  <div className="w-full h-8 px-2.5 rounded-md border bg-muted/40 text-xs text-foreground flex items-center justify-between font-medium">
                    <span className="truncate">Mis Asignadas</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      Asesor
                    </Badge>
                  </div>
                ) : (
                  <select
                    className="w-full h-8 px-2 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={filterVendedor}
                    onChange={(e) => setFilterVendedor(e.target.value)}
                  >
                    <option value="all">Todos los Asesores</option>
                    <option value="unassigned">Sin Asignar (Pendientes)</option>
                    {visibleVendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} {v.perfil ? `(${v.perfil})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Reset Filters & Results Count */}
            <div className="pt-2 border-t space-y-2">
              {(searchTerm || filterPriority !== "all" || filterTag !== "all" || filterDate !== null || filterSupervisor !== "all" || filterPerfil !== "all" || (filterVendedor !== "all" && !isOwnScope)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 border-dashed"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterPriority("all");
                    setFilterTag("all");
                    setFilterDate(null);
                    setFilterSupervisor("all");
                    setFilterPerfil("all");
                    setFilterVendedor(isOwnScope && ownTrabajadorId ? ownTrabajadorId : "all");
                  }}
                >
                  <RotateCcw className="size-3" />
                  Limpiar filtros
                </Button>
              )}
              <p className="text-[11px] text-center text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filteredOpps.length}</span> de {opportunities.length} oportunidades
              </p>
            </div>
          </aside>
        )}

        {/* Main Board / Table Area */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Top Banner when sidebar is collapsed */}
          {!isFilterSidebarOpen && (
            <div className="flex items-center justify-between bg-card border rounded-lg px-3 py-1.5 text-xs shadow-2xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterSidebarOpen(true)}
                className="h-7 text-xs gap-1.5"
              >
                <PanelLeftOpen className="size-3.5" />
                Mostrar Filtros
                {(searchTerm || filterPriority !== "all" || filterTag !== "all" || filterDate !== null || filterSupervisor !== "all" || filterPerfil !== "all" || filterVendedor !== "all") && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </Button>
              <span className="text-muted-foreground text-[11px]">
                Mostrando <strong className="text-foreground">{filteredOpps.length}</strong> de {opportunities.length} oportunidades
                {(searchTerm || filterPriority !== "all" || filterTag !== "all" || filterDate !== null || filterSupervisor !== "all" || filterPerfil !== "all" || filterVendedor !== "all") && (
                  <span className="text-primary ml-1">(Filtros activos)</span>
                )}
              </span>
            </div>
          )}

          {/* Quick Commercial Filter Bar */}
          <div className="bg-card border rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 shrink-0">
                <Filter className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Filtros Rápidos:</span>
              </span>

              {/* Selector Supervisor */}
              <div className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-600 hidden md:inline shrink-0" />
                <select
                  className="h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                  value={filterSupervisor}
                  onChange={(e) => setFilterSupervisor(e.target.value)}
                  title="Filtrar por Supervisor"
                >
                  <option value="all">Supervisor: Todos</option>
                  {allSupervisores.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      Sup. {sup.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector Modalidad / Perfil */}
              <div className="flex items-center gap-1">
                <Briefcase className="size-3.5 text-blue-600 hidden md:inline shrink-0" />
                <select
                  className="h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                  value={filterPerfil}
                  onChange={(e) => setFilterPerfil(e.target.value)}
                  title="Filtrar por Modalidad (Ejecutivo, Freelance, Supervisor)"
                >
                  <option value="all">Modalidad: Todas</option>
                  <option value="ejecutivo">Ejecutivo (Full Time / Planilla)</option>
                  <option value="freelance">Freelance (Comisionista)</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              {/* Selector Ejecutivo / Asesor */}
              <div className="flex items-center gap-1">
                <UserCheck className="size-3.5 text-indigo-600 hidden md:inline shrink-0" />
                {isOwnScope ? (
                  <div className="h-8 px-2.5 rounded-lg border bg-muted/40 text-xs text-foreground flex items-center gap-1.5 font-medium shadow-2xs">
                    <span>Mis Oportunidades</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      Asignadas
                    </Badge>
                  </div>
                ) : (
                  <select
                    className="h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs max-w-[210px]"
                    value={filterVendedor}
                    onChange={(e) => setFilterVendedor(e.target.value)}
                    title="Filtrar por Ejecutivo / Asesor comercial"
                  >
                    <option value="all">Asesor: Todos</option>
                    <option value="unassigned">Sin Asignar (Pendientes)</option>
                    {visibleVendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} {v.perfil ? `(${v.perfil})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Reset Commercial Filters if any active */}
              {(filterSupervisor !== "all" || filterPerfil !== "all" || (filterVendedor !== "all" && !isOwnScope)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterSupervisor("all");
                    setFilterPerfil("all");
                    setFilterVendedor(isOwnScope && ownTrabajadorId ? ownTrabajadorId : "all");
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                  title="Restablecer filtros comerciales"
                >
                  <RotateCcw className="size-3" />
                  Limpiar comercial
                </Button>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground ml-auto shrink-0 font-medium">
              <span className="font-bold text-foreground">{filteredOpps.length}</span> oportunidades
            </div>
          </div>

          {/* Main Content Area */}
          {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-medium">Cargando embudo de oportunidades...</p>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD CONTAINER: horizontally scrolls within screen width */
        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-4">
          <div className="flex gap-3.5 items-start min-w-max">
            {columns.map((col, colIndex) => {
              const colOpps = filteredOpps.filter((o) => o.etapa_id === col.id);
              const colTotalSinIgv = colOpps.reduce((sum, o) => sum + ((Number(o.valor) || 0) / 1.18), 0);
              const isDropTarget = dragOverColId === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col)}
                  className={`w-72 sm:w-80 min-w-[17.5rem] sm:min-w-[19.5rem] bg-muted/40 border rounded-xl flex flex-col max-h-[calc(100vh-320px)] min-h-[380px] shadow-xs transition-all duration-200 ${
                    isDropTarget
                      ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 shadow-md scale-[1.01]"
                      : ""
                  }`}
                >
                  {/* Column Header with Left / Right reorder buttons */}
                  <div className="p-2.5 border-b bg-card rounded-t-xl flex items-center justify-between shrink-0 gap-1.5">
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <span className="font-bold text-xs text-foreground truncate" title={col.nombre}>
                        {col.nombre}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`px-1.5 py-0 text-[10px] shrink-0 ${
                          col.es_ganada
                            ? "bg-emerald-500/15 text-emerald-600 font-semibold"
                            : col.es_perdida
                            ? "bg-destructive/15 text-destructive font-semibold"
                            : ""
                        }`}
                      >
                        {colOpps.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-0.5" title="Total columna sin IGV">
                        S/ {colTotalSinIgv.toFixed(2)}
                      </span>
                      {/* Left & Right Reorder Buttons */}
                      <div className="flex items-center bg-muted/70 rounded border p-0.5 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          disabled={colIndex === 0 || movingColId !== null}
                          onClick={() => handleMoveColumn(colIndex, "left")}
                          title="Mover columna a la izquierda"
                        >
                          <ChevronLeft className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          disabled={colIndex === columns.length - 1 || movingColId !== null}
                          onClick={() => handleMoveColumn(colIndex, "right")}
                          title="Mover columna a la derecha"
                        >
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Column Body: Draggable Cards */}
                  <div className="p-2 overflow-y-auto flex flex-col gap-2.5 flex-1">
                    {colOpps.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-muted-foreground border-2 border-dashed rounded-lg">
                        Arrastra oportunidades aquí
                      </div>
                    ) : (
                      colOpps.map((opp) => {
                        const isDragging = draggedOppId === opp.id;
                        const cliente = opp.contacto_nombre_completo || "Sin Asignar";
                        const contactoPersona = opp.contacto_persona || opp.contacto_persona_calculado;
                        const products = parseProducts(opp.productos_json);

                        const priorityColor =
                          opp.prioridad === "Alta"
                            ? "bg-red-500/10 text-red-600 border-red-500/30 font-semibold"
                            : opp.prioridad === "Baja"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold";

                        return (
                          <Card
                            key={opp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, opp.id)}
                            onDragEnd={() => {
                              setDraggedOppId(null);
                              setDragOverColId(null);
                            }}
                            className={`p-3 bg-card hover:shadow-md transition-all border flex flex-col gap-2 text-xs cursor-grab active:cursor-grabbing select-none ${
                              isDragging
                                ? "opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/30"
                                : ""
                            }`}
                          >
                            {/* 1. Top Header: COT Code, Proposal Type, Priority Badge & Action Menu */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold">
                                  COT-{String(opp.id).padStart(4, "0")}
                                </span>
                                {opp.tipo_propuesta === "renovacion" ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300">
                                    Renovación
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300">
                                    Venta Nueva
                                  </Badge>
                                )}
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityColor}`}>
                                  {opp.prioridad || "Media"}
                                </Badge>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                  <DropdownMenuLabel>Mover a Etapa</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {columns
                                    .filter((c) => c.id !== col.id)
                                    .map((targetCol) => (
                                      <DropdownMenuItem
                                        key={targetCol.id}
                                        onClick={() => executeMove(opp.id, targetCol.id, targetCol)}
                                        className="cursor-pointer text-xs"
                                      >
                                        <ArrowRight className="size-3 mr-1.5 text-muted-foreground" />
                                        {targetCol.nombre}
                                      </DropdownMenuItem>
                                    ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOppForActividad(opp);
                                      setActividadModalOpen(true);
                                    }}
                                    className="cursor-pointer text-xs text-blue-700 font-medium"
                                  >
                                    <CalendarClock className="size-3.5 mr-1.5" />
                                    Programar Actividad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenWhatsAppModal(opp);
                                    }}
                                    className="cursor-pointer text-xs text-emerald-700 font-medium"
                                  >
                                    <MessageSquare className="size-3.5 mr-1.5" />
                                    Compartir por WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDirectCopyWhatsApp(opp);
                                    }}
                                    className="cursor-pointer text-xs font-medium"
                                  >
                                    <Copy className="size-3.5 mr-1.5 text-muted-foreground" />
                                    Copiar Detalles (WSP)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/opportunities/print?id=${opp.id}`}
                                      className="cursor-pointer text-xs text-emerald-700 font-medium"
                                    >
                                      <Printer className="size-3.5 mr-1.5" />
                                      Ver Cotización (PDF)
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/opportunities/create?edit_id=${opp.id}`}
                                      className="cursor-pointer text-xs"
                                    >
                                      <Edit className="size-3.5 mr-1.5" />
                                      Editar Oportunidad
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteOpportunity(opp.id)}
                                    className="text-destructive cursor-pointer text-xs"
                                  >
                                    <Trash2 className="size-3.5 mr-1.5" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* 2. Proposal / Lead Title */}
                            <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                              {opp.titulo}
                            </h4>

                            {/* 3. Company & Key Contact Info */}
                            <div className="space-y-1 bg-muted/20 border border-border/50 rounded-md p-1.5">
                              {/* Company / Razón Social */}
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground truncate" title={cliente}>
                                <Building2 className="size-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{cliente}</span>
                                {opp.numero_documento && (
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    ({opp.numero_documento})
                                  </span>
                                )}
                              </div>

                              {/* Attention / Contact Person */}
                              {contactoPersona && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate" title={`Atención: ${contactoPersona}`}>
                                  <User className="size-3 text-primary shrink-0" />
                                  <span className="truncate">
                                    <strong className="text-foreground font-medium">Atenc:</strong> {contactoPersona}
                                  </span>
                                </div>
                              )}

                              {/* Phone & WhatsApp Link */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 border-t border-border/40">
                                <span className="flex items-center gap-1 truncate">
                                  <Phone className="size-2.5 text-muted-foreground" />
                                  {opp.telefono_movil || "Sin teléfono"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-[10px] shrink-0 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOppForActividad(opp);
                                      setActividadModalOpen(true);
                                    }}
                                    title="Programar una llamada, reunión o seguimiento en la agenda"
                                  >
                                    <CalendarClock className="size-2.5" /> Actividad
                                  </button>
                                  <button
                                    type="button"
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 text-[10px] shrink-0 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenWhatsAppModal(opp);
                                    }}
                                    title="Ver, copiar y enviar todos los detalles de la oportunidad por WhatsApp"
                                  >
                                    <MessageSquare className="size-2.5" /> WhatsApp
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 4. Proposal Services / Products Preview */}
                            {products.length > 0 && (
                              <div className="bg-muted/40 border border-border/70 rounded-md p-1.5 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                  <span className="flex items-center gap-1 text-primary font-semibold">
                                    <Package className="size-3" />
                                    Servicios ({products.length})
                                  </span>
                                  {opp.plazo_acuerdo ? (
                                    <span className="bg-background px-1.5 py-0.2 rounded border text-[9px] font-medium text-muted-foreground">
                                      Acuerdo {opp.plazo_acuerdo} meses
                                    </span>
                                  ) : null}
                                </div>
                                <div className="space-y-0.5">
                                  {products.slice(0, 2).map((p: any, idx: number) => (
                                    <div key={idx} className="text-[11px] text-foreground truncate flex items-center justify-between">
                                      <span className="truncate">• {p.nombre || "Servicio"}</span>
                                      <span className="text-muted-foreground shrink-0 text-[10px] font-mono ml-1 font-medium">
                                        x{p.cantidad || 1}
                                      </span>
                                    </div>
                                  ))}
                                  {products.length > 2 && (
                                    <div className="text-[9px] text-muted-foreground italic">
                                      +{products.length - 2} servicio(s) adicional(es)...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 5. Commercial Pricing & Installation (Precios Sin IGV) */}
                            {(() => {
                              const valorTotal = Number(opp.valor || 0);
                              const valorSinIgv = valorTotal > 0 ? valorTotal / 1.18 : 0;
                              const instTotal = Number(opp.total_instalacion || 0);
                              const instSinIgv = instTotal > 0 ? instTotal / 1.18 : 0;
                              const curr = opp.moneda === "Dólares" ? "$" : "S/";

                              return (
                                <div className="grid grid-cols-2 gap-1.5 bg-muted/20 border border-border/50 rounded-md p-1.5 text-xs">
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold">
                                        Mensualidad
                                      </span>
                                      <span className="text-[8px] font-semibold text-muted-foreground bg-muted/60 px-1 rounded">
                                        Sin IGV
                                      </span>
                                    </div>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                                      {curr} {valorSinIgv.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-[8px] font-semibold text-muted-foreground bg-muted/60 px-1 rounded">
                                        Sin IGV
                                      </span>
                                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold">
                                        Instalación
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-foreground">
                                      {instTotal > 0 ? (
                                        `${curr} ${instSinIgv.toFixed(2)}`
                                      ) : (
                                        <span className="text-emerald-600 font-semibold text-[10px]">Gratis</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 6. Tags */}
                            {opp.etiquetas && (
                              <div className="flex flex-wrap gap-1">
                                {opp.etiquetas.split(",").map((t, idx) => {
                                  const cleanTag = t.trim();
                                  if (!cleanTag) return null;
                                  return (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 font-normal bg-primary/5 text-primary border-primary/20 flex items-center gap-1 group/tag"
                                    >
                                      <span>{cleanTag}</span>
                                      <button
                                        type="button"
                                        title={`Quitar etiqueta "${cleanTag}" de esta oportunidad`}
                                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full px-0.5 leading-none transition-colors"
                                        onClick={(e) => handleRemoveTagFromOpportunity(e, opp.id, cleanTag, opp.etiquetas)}
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}

                            {/* 7. Notes Preview */}
                            {opp.notas && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/40 px-1.5 py-0.5 rounded">
                                {opp.notas}
                              </p>
                            )}

                            {/* 8. Card Footer: PDF, Edit, Sales Rep, Profile Badge, Supervisor & Date */}
                            <div className="flex flex-col gap-1.5 pt-2 border-t text-xs">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1 font-semibold"
                                    asChild
                                    title="Ver / Imprimir Cotización PDF"
                                  >
                                    <Link href={`/opportunities/print?id=${opp.id}`}>
                                      <FileText className="size-3" />
                                      PDF
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    asChild
                                    title="Editar oportunidad"
                                  >
                                    <Link href={`/opportunities/create?edit_id=${opp.id}`}>
                                      <Edit className="size-3" />
                                    </Link>
                                  </Button>
                                </div>

                                {opp.created_at && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {opp.created_at.substring(0, 10)}
                                  </span>
                                )}
                              </div>

                              {/* Commercial staff assignment info */}
                              <div className="flex items-center justify-between text-[10px] bg-muted/40 rounded px-1.5 py-1 gap-1">
                                <div className="flex items-center gap-1 truncate max-w-[170px]" title={`Asesor: ${opp.vendedor_nombre || "Sin Asignar"}`}>
                                  <User className="size-3 text-muted-foreground shrink-0" />
                                  <span className="truncate font-medium text-foreground">
                                    {opp.vendedor_nombre || "Sin Asignar"}
                                  </span>
                                  {opp.vendedor_perfil && (
                                    <span
                                      className={`px-1 py-0 rounded text-[9px] font-semibold shrink-0 ${
                                        opp.vendedor_perfil.toLowerCase().includes("freelance")
                                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                          : opp.vendedor_perfil.toLowerCase().includes("supervisor")
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      }`}
                                    >
                                      {opp.vendedor_perfil.toLowerCase().includes("freelance")
                                        ? "Freelance"
                                        : opp.vendedor_perfil.toLowerCase().includes("supervisor")
                                        ? "Supervisor"
                                        : "Ejecutivo"}
                                    </span>
                                  )}
                                </div>

                                {opp.supervisor_nombre && opp.supervisor_nombre !== "Sin Supervisor" && (
                                  <span
                                    className="text-[9px] text-muted-foreground truncate max-w-[100px] text-right"
                                    title={`Supervisor: ${opp.supervisor_nombre}`}
                                  >
                                    Sup: {opp.supervisor_nombre.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <Card className="bg-card shadow-xs w-full max-w-full min-w-0 overflow-x-auto">
          {/* MOBILE CARDS VIEW (< md) */}
          <div className="block md:hidden divide-y divide-border/60">
            {filteredOpps.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No se encontraron oportunidades con los filtros seleccionados.
              </div>
            ) : (
              paginatedOpps.map((opp) => {
                const etapa = columns.find((c) => c.id === opp.etapa_id);
                return (
                  <div key={opp.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{opp.id}
                        </span>
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {opp.titulo}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {opp.contacto_nombre_completo || opp.contacto_persona || "Sin contacto"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-xs sm:text-sm text-emerald-600 block">
                          S/ {Number(opp.valor || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {opp.created_at ? opp.created_at.substring(0, 10) : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      {etapa && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 font-medium ${
                            etapa.es_ganada
                              ? "bg-emerald-500/15 text-emerald-600"
                              : etapa.es_perdida
                              ? "bg-destructive/15 text-destructive"
                              : ""
                          }`}
                        >
                          {etapa.nombre}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 capitalize ${
                          opp.prioridad === "alta" || opp.prioridad === "urgente"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {opp.prioridad || "Normal"}
                      </Badge>
                      {opp.vendedor_nombre && (
                        <span className="text-xs text-muted-foreground ml-auto truncate max-w-[130px]">
                          👤 {opp.vendedor_nombre}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 px-2.5 min-h-[36px] text-emerald-700"
                        asChild
                      >
                        <Link href={`/opportunities/print?id=${opp.id}`}>
                          <Printer className="size-3.5" />
                          PDF
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 px-2.5 min-h-[36px]"
                        asChild
                      >
                        <Link href={`/opportunities/create?edit_id=${opp.id}`}>
                          <Edit className="size-3.5" />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <CardContent className="p-0 overflow-x-auto hidden md:block">
            <div className="min-w-[1000px] smooth-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-xs">ID</TableHead>
                  <TableHead className="text-xs">Título de Lead</TableHead>
                  <TableHead className="text-xs">Cliente / Contacto</TableHead>
                  <TableHead className="text-xs">Asesor / Modalidad</TableHead>
                  <TableHead className="text-xs">Supervisor</TableHead>
                  <TableHead className="text-xs">Etapa</TableHead>
                  <TableHead className="text-xs">Prioridad</TableHead>
                  <TableHead className="text-xs">Valor (Sin IGV)</TableHead>
                  <TableHead className="text-xs">Etiquetas</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground text-xs">
                      No se encontraron oportunidades con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOpps.map((opp) => {
                    const col = columns.find((c) => c.id === opp.etapa_id);
                    return (
                      <TableRow key={opp.id} className="text-xs">
                        <TableCell className="font-medium text-muted-foreground">
                          #{opp.id}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground max-w-xs truncate">
                          {opp.titulo}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {opp.contacto_nombre_completo || "Sin Asignar"}
                            </span>
                            {opp.numero_documento && (
                              <span className="text-[11px] text-muted-foreground">
                                Doc: {opp.numero_documento}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {opp.vendedor_nombre || "Sin Asignar"}
                            </span>
                            {opp.vendedor_perfil && (
                              <span
                                className={`w-fit px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                  opp.vendedor_perfil.toLowerCase().includes("freelance")
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                    : opp.vendedor_perfil.toLowerCase().includes("supervisor")
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                }`}
                              >
                                {opp.vendedor_perfil.toLowerCase().includes("freelance")
                                  ? "Freelance"
                                  : opp.vendedor_perfil.toLowerCase().includes("supervisor")
                                  ? "Supervisor"
                                  : "Ejecutivo"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-xs">
                            {opp.supervisor_nombre && opp.supervisor_nombre !== "Sin Supervisor"
                              ? opp.supervisor_nombre
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              col?.es_ganada
                                ? "bg-emerald-500/15 text-emerald-600"
                                : col?.es_perdida
                                ? "bg-destructive/15 text-destructive"
                                : ""
                            }`}
                          >
                            {col?.nombre || "Sin Etapa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              opp.prioridad === "Alta"
                                ? "text-red-600 border-red-500/30"
                                : opp.prioridad === "Baja"
                                ? "text-blue-600 border-blue-500/30"
                                : "text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {opp.prioridad || "Media"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          S/ {((Number(opp.valor || 0)) / 1.18).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {opp.etiquetas ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {opp.etiquetas.split(",").map((t, i) => {
                                const cleanTag = t.trim();
                                if (!cleanTag) return null;
                                return (
                                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 flex items-center gap-1">
                                    <span>{cleanTag}</span>
                                    <button
                                      type="button"
                                      title={`Quitar etiqueta "${cleanTag}"`}
                                      className="text-muted-foreground hover:text-red-600 leading-none"
                                      onClick={(e) => handleRemoveTagFromOpportunity(e, opp.id, cleanTag, opp.etiquetas)}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {opp.created_at ? opp.created_at.substring(0, 10) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedOppForActividad(opp);
                                setActividadModalOpen(true);
                              }}
                              title="Programar Actividad / Seguimiento"
                            >
                              <CalendarClock className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleOpenWhatsAppModal(opp)}
                              title="Compartir y enviar detalles por WhatsApp"
                            >
                              <MessageSquare className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-700 hover:bg-emerald-50"
                              asChild
                              title="Ver / Imprimir Cotización PDF"
                            >
                              <Link href={`/opportunities/print?id=${opp.id}`}>
                                <Printer className="size-3.5" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Editar Oportunidad">
                              <Link href={`/opportunities/create?edit_id=${opp.id}`}>
                                <Edit className="size-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteOpportunity(opp.id)}
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
            </div>
          </CardContent>
          <DataTablePagination
            currentPage={listPage}
            pageSize={listPageSize}
            totalItems={filteredOpps.length}
            onPageChange={setListPage}
            onPageSizeChange={setListPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemName="oportunidades"
          />
        </Card>
      )}
        </div>
      </div>

      {/* MODAL: STAGES / COLUMNS MANAGEMENT */}
      <Dialog open={showColModal} onOpenChange={setShowColModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Etapas del Embudo</DialogTitle>
            <DialogDescription>
              Configura las columnas de tu tablero Kanban y sus reglas automáticas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto border rounded-lg p-2 bg-muted/20">
              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2 rounded border bg-card text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {/* Up / Down stage order buttons */}
                    <div className="flex items-center gap-0.5 bg-muted/60 rounded border p-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        disabled={idx === 0}
                        onClick={() => handleMoveColumnInModal(idx, "up")}
                        title="Subir posición"
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        disabled={idx === columns.length - 1}
                        onClick={() => handleMoveColumnInModal(idx, "down")}
                        title="Bajar posición"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </div>
                    <span className="font-medium truncate">{col.nombre}</span>
                    {col.es_ganada && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px] shrink-0">
                        Ganada (Convierte a Pedido)
                      </Badge>
                    )}
                    {col.es_perdida && (
                      <Badge className="bg-destructive/15 text-destructive text-[9px] shrink-0">
                        Perdida
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        setColForm({
                          id: col.id,
                          nombre: col.nombre,
                          es_ganada: !!col.es_ganada,
                          label_ganada: col.label_ganada || "Ganada",
                          es_perdida: !!col.es_perdida,
                          label_perdida: col.label_perdida || "Perdida",
                        })
                      }
                    >
                      <Edit className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDeleteColumn(col.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveColumn} className="flex flex-col gap-3 pt-2 border-t">
              <h4 className="text-xs font-semibold">
                {colForm.id ? "Editar Etapa" : "Crear Nueva Etapa"}
              </h4>
              <Input
                placeholder="Nombre de la etapa (ej. Propuesta Enviada)"
                value={colForm.nombre}
                onChange={(e) => setColForm({ ...colForm, nombre: e.target.value })}
                className="h-8 text-xs"
              />

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colForm.es_ganada}
                    onChange={(e) =>
                      setColForm({
                        ...colForm,
                        es_ganada: e.target.checked,
                        es_perdida: e.target.checked ? false : colForm.es_perdida,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <span>¿Es Etapa Ganada?</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colForm.es_perdida}
                    onChange={(e) =>
                      setColForm({
                        ...colForm,
                        es_perdida: e.target.checked,
                        es_ganada: e.target.checked ? false : colForm.es_ganada,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <span>¿Es Etapa Perdida?</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                {colForm.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      setColForm({
                        id: null,
                        nombre: "",
                        es_ganada: false,
                        label_ganada: "Ganada",
                        es_perdida: false,
                        label_perdida: "Perdida",
                      })
                    }
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={savingCol}
                >
                  {savingCol ? "Guardando..." : colForm.id ? "Actualizar" : "Guardar Etapa"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: TAGS MANAGEMENT */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Etiquetas</DialogTitle>
            <DialogDescription>
              Crea o elimina etiquetas para clasificar tus oportunidades comerciales.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-wrap gap-1.5 p-2.5 border rounded-lg bg-muted/20 min-h-16">
              {tags.length === 0 ? (
                <span className="text-xs text-muted-foreground">No hay etiquetas registradas.</span>
              ) : (
                tags.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded border bg-card text-xs"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: t.color || "#6366f1" }}
                    />
                    <span className="font-medium text-[11px]">{t.nombre}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(t.id)}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                      title="Eliminar etiqueta del catálogo"
                    >
                      <Trash2 className="size-3 text-red-500 hover:text-red-600" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSaveTag} className="flex flex-col gap-3 pt-2 border-t">
              <h4 className="text-xs font-semibold">Nueva Etiqueta</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre (ej. Bidón 20L)"
                  value={tagForm.nombre}
                  onChange={(e) => setTagForm({ ...tagForm, nombre: e.target.value })}
                  className="flex-1 h-8 text-xs"
                />
                <input
                  type="color"
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  className="h-8 w-10 rounded border p-0.5 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={savingTag}
                >
                  {savingTag ? "Guardando..." : "Agregar Etiqueta"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal para copiar y enviar detalles de oportunidad a WhatsApp */}
      <OpportunityWhatsAppModal
        open={whatsAppModalOpen}
        onOpenChange={setWhatsAppModalOpen}
        data={selectedOppForWhatsApp ? getOpportunityWhatsAppParams(selectedOppForWhatsApp) : {}}
      />

      {/* Modal para programar actividad vinculada a la oportunidad */}
      {selectedOppForActividad && (
        <ModalCrearActividad
          open={actividadModalOpen}
          onOpenChange={setActividadModalOpen}
          onSuccess={() => {
            toast.success(`Actividad programada para oportunidad #${selectedOppForActividad.id}`);
          }}
          initialData={{
            oportunidad_id: selectedOppForActividad.id,
            oportunidad_titulo: selectedOppForActividad.titulo,
            contacto_id: selectedOppForActividad.contacto_id || null,
            contacto_nombre: selectedOppForActividad.contacto_nombre_completo || selectedOppForActividad.contacto_persona || selectedOppForActividad.contacto_nombre || undefined,
            empresa_id: selectedOppForActividad.empresa_id || null,
            asunto: `Seguimiento: ${selectedOppForActividad.titulo}`,
          }}
        />
      )}
    </div>
  );
}
