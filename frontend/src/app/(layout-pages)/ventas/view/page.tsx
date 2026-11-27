"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  CreditCard,
  Ban,
  Printer,
  FileText,
  Building2,
  Package,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertTriangle,
  Kanban,
  List as ListIcon,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Columns3,
  MoreHorizontal,
  Trash2,
  Palette,
  Phone,
  MessageSquare,
  User,
  Users,
  Edit,
  FileCheck,
  UploadCloud,
  Upload,
  Paperclip,
  File as FileIcon,
  CheckCheck,
  FolderArchive,
  Image as ImageIcon,
  Lock,
  Unlock,
  CalendarClock,
} from "lucide-react";
import { ModalCrearActividad } from "@/components/actividades/ModalCrearActividad";

export interface InstalledDocItem {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  fecha: string;
  size?: number;
}

interface SaleDetailItem {
  id: number;
  venta_id: number;
  producto_id: number;
  producto_nombre?: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Sale {
  id: number;
  numero_venta: string;
  contacto_id?: number | null;
  cliente_nombre_completo?: string | null;
  numero_documento?: string | null;
  telefono_principal?: string | null;
  email?: string | null;
  fecha_venta: string;
  estado: string;
  metodo_pago?: string | null;
  estado_pago: string;
  total: number;
  monto_pagado: number;
  subtotal?: number;
  igv?: number;
  tipo_comprobante?: string | null;
  direccion_entrega?: string | null;
  notas?: string | null;
  oportunidad_id?: number | null;
  oportunidad_titulo?: string | null;
  productos_detalle?: string | null;
  documentos_instalacion?: string | null;
  estado_instalacion?: string | null;
  fecha_instalacion?: string | null;
  tecnico_instalador?: string | null;
  notas_instalacion?: string | null;
  facturas_seguimiento?: string | null;
  estado_aprobacion?: string | null;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
  trabajador_id?: number | null;
  vendedor_nombre?: string | null;
  vendedor_cargo?: string | null;
  vendedor_perfil?: string | null;
  equipo?: string | null;
  equipo_nombre?: string | null;
  supervisor_id?: number | null;
  supervisor_nombre?: string | null;
  act_id?: number | null;
  act_tipo?: string | null;
  act_asunto?: string | null;
  act_fecha_programada?: string | null;
  act_estado?: string | null;
  act_prioridad?: string | null;
  act_pendientes_count?: number | null;
  items?: SaleDetailItem[];
}

export interface FacturaTrackingItem {
  num: number;
  label: string;
  estado: "pagado" | "pendiente";
  monto: number;
  fecha_pago?: string | null;
  comprobante?: string | null;
}

export function parse4Invoices(jsonStr?: string | null, total: number = 0, estadoPago: string = "pendiente"): FacturaTrackingItem[] {
  const defaultMonthly = Number(total) > 0 ? Number(total) : 0;
  const isPaidF1 = (estadoPago || "").toLowerCase() === "pagado";

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    } catch {}
  }

  return [
    { num: 1, label: "Factura 1", estado: isPaidF1 ? "pagado" : "pendiente", monto: defaultMonthly, fecha_pago: isPaidF1 ? new Date().toISOString().substring(0, 10) : null, comprobante: isPaidF1 ? "F001" : null },
    { num: 2, label: "Factura 2", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
    { num: 3, label: "Factura 3", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
    { num: 4, label: "Factura 4", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
  ];
}

export interface VentasStage {
  id: string;
  label: string;
  color: string;
  badgeClass?: string;
  es_ganada?: boolean;
  es_perdida?: boolean;
}

const DEFAULT_STAGES: VentasStage[] = [
  { id: "pendiente", label: "DOCUMENTACIÓN", color: "#f59e0b", es_ganada: false, es_perdida: false, badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "por_aprobar", label: "POR APROBAR", color: "#8b5cf6", es_ganada: false, es_perdida: false, badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { id: "en_proceso", label: "PROGRAMADA / INSTALACIÓN", color: "#0ea5e9", es_ganada: false, es_perdida: false, badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  { id: "completada", label: "INSTALADA (CERRADA)", color: "#10b981", es_ganada: true, es_perdida: false, badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { id: "cancelada", label: "ANULADA / SIN FACTIBILIDAD", color: "#ef4444", es_ganada: false, es_perdida: true, badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
];

const PRESET_COLORS = [
  { name: "Ámbar / Naranja", color: "#f59e0b" },
  { name: "Cielo / Azul", color: "#0ea5e9" },
  { name: "Esmeralda / Verde", color: "#10b981" },
  { name: "Rojo / Coral", color: "#ef4444" },
  { name: "Índigo / Azul Profundo", color: "#6366f1" },
  { name: "Púrpura / Violeta", color: "#8b5cf6" },
  { name: "Rosa / Magenta", color: "#ec4899" },
  { name: "Pizarra / Gris", color: "#64748b" },
];

export default function SalesViewPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'kanban' | 'list'
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Left Filter Sidebar: Collapsible
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Collapse sidebar by default on mobile / smaller screens to avoid blocking the board
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Actividades State
  const [selectedVentaForActividad, setSelectedVentaForActividad] = useState<any | null>(null);
  const [actividadModalOpen, setActividadModalOpen] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(25);
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterPago, setFilterPago] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterMetodo, setFilterMetodo] = useState<string>("all");
  const [filterComprobante, setFilterComprobante] = useState<string>("all");
  const [filterVendedor, setFilterVendedor] = useState<string>("all");
  const [filterSupervisor, setFilterSupervisor] = useState<string>("all");
  const [filterEquipo, setFilterEquipo] = useState<string>("all");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isOwnScope, setIsOwnScope] = useState(false);
  const [ownTrabajadorId, setOwnTrabajadorId] = useState<string | null>(null);

  // Drag and Drop hover state
  const [draggedSaleId, setDraggedSaleId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modales de Confirmación de Cierre / Bloqueo / Desbloqueo
  const [installConfirmSale, setInstallConfirmSale] = useState<Sale | null>(null);
  const [unlockSale, setUnlockSale] = useState<Sale | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Stages / Columns State
  const [stages, setStages] = useState<VentasStage[]>(DEFAULT_STAGES);
  const [showColModal, setShowColModal] = useState(false);
  const [colForm, setColForm] = useState<{
    id: string;
    label: string;
    color: string;
    es_ganada: boolean;
    es_perdida: boolean;
  }>({
    id: "pendiente",
    label: "DOCUMENTACIÓN",
    color: "#f59e0b",
    es_ganada: false,
    es_perdida: false,
  });

  // Load persisted stages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nextlead_ventas_kanban_stages_v4");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.map((st: any) => ({
            ...st,
            es_ganada: st.es_ganada !== undefined ? st.es_ganada : st.id === "completada",
            es_perdida: st.es_perdida !== undefined ? st.es_perdida : st.id === "cancelada",
          }));
          setStages(merged);
        }
      }
    } catch (e) {
      console.error("Error reading saved stages from localStorage:", e);
    }
  }, []);

  const saveStages = (newStages: VentasStage[]) => {
    setStages(newStages);
    try {
      localStorage.setItem("nextlead_ventas_kanban_stages_v4", JSON.stringify(newStages));
    } catch (e) {
      console.error("Error saving stages to localStorage:", e);
    }
  };

  // Reorder columns left / right
  const handleMoveColumn = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    saveStages(newStages);
    toast.success(`Columna "${temp.label}" movida a la ${direction === "left" ? "izquierda" : "derecha"}.`);
  };

  // Reorder columns in Modal (up / down)
  const handleMoveColumnInModal = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    saveStages(newStages);
    toast.success(`Orden de "${temp.label}" actualizado.`);
  };

  // Open Create Column
  const handleOpenCreateCol = () => {
    setColForm({
      id: "",
      label: "",
      color: "#0ea5e9",
      es_ganada: false,
      es_perdida: false,
    });
    setShowColModal(true);
  };

  // Open Edit Column
  const handleOpenEditCol = (st: VentasStage) => {
    setColForm({
      id: st.id,
      label: st.label,
      color: st.color || "#f59e0b",
      es_ganada: !!st.es_ganada,
      es_perdida: !!st.es_perdida,
    });
    setShowColModal(true);
  };

  // Save Column (Create or Update)
  const handleSaveColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = colForm.label.trim();
    if (!cleanLabel) {
      toast.error("El nombre de la columna es obligatorio.");
      return;
    }

    if (colForm.id) {
      // Editar columna existente
      const newStages = stages.map((st) => {
        if (st.id === colForm.id) {
          return {
            ...st,
            label: cleanLabel.toUpperCase(),
            color: colForm.color,
            es_ganada: colForm.es_ganada,
            es_perdida: colForm.es_perdida,
          };
        }
        return {
          ...st,
          es_ganada: colForm.es_ganada ? false : st.es_ganada,
          es_perdida: colForm.es_perdida ? false : st.es_perdida,
        };
      });
      saveStages(newStages);
      toast.success(`Columna "${cleanLabel.toUpperCase()}" actualizada con éxito.`);
    } else {
      // Crear nueva columna
      let generatedSlug = cleanLabel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      if (!generatedSlug) {
        generatedSlug = `etapa_${Date.now().toString().slice(-4)}`;
      }

      // Evitar slug duplicado
      if (stages.some((st) => st.id === generatedSlug)) {
        generatedSlug = `${generatedSlug}_${Date.now().toString().slice(-4)}`;
      }

      const newStage: VentasStage = {
        id: generatedSlug,
        label: cleanLabel.toUpperCase(),
        color: colForm.color,
        es_ganada: colForm.es_ganada,
        es_perdida: colForm.es_perdida,
        badgeClass: colForm.es_ganada
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
          : colForm.es_perdida
          ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
          : "bg-primary/10 text-primary border-primary/30",
      };

      const updatedExisting = stages.map((st) => ({
        ...st,
        es_ganada: colForm.es_ganada ? false : st.es_ganada,
        es_perdida: colForm.es_perdida ? false : st.es_perdida,
      }));

      const newStages = [...updatedExisting, newStage];
      saveStages(newStages);
      toast.success(`Nueva columna "${cleanLabel.toUpperCase()}" creada con éxito.`);
    }

    setShowColModal(false);
  };

  // Delete Column
  const handleDeleteColumn = async (stageId: string) => {
    if (stages.length <= 1) {
      toast.error("El tablero debe contener al menos una columna.");
      return;
    }

    const stToDelete = stages.find((st) => st.id === stageId);
    if (!stToDelete) return;

    const remainingStages = stages.filter((st) => st.id !== stageId);
    const targetFallbackStage = remainingStages[0];

    const salesInStage = sales.filter(
      (s) => (s.estado || "pendiente").toLowerCase() === stageId
    );

    if (salesInStage.length > 0) {
      const confirmReassign = confirm(
        `Hay ${salesInStage.length} venta(s) en la etapa "${stToDelete.label}".\n\nSi eliminas esta columna, sus ventas se transferirán a "${targetFallbackStage.label}".\n\n¿Deseas continuar?`
      );
      if (!confirmReassign) return;

      // Transferir ventas a la etapa de respaldo
      for (const s of salesInStage) {
        try {
          await api.post("/api/sales/update-status", {
            id: s.id,
            estado: targetFallbackStage.id,
          });
        } catch (err) {
          console.error("Error al transferir venta:", err);
        }
      }

      setSales((prev) =>
        prev.map((s) =>
          (s.estado || "pendiente").toLowerCase() === stageId
            ? { ...s, estado: targetFallbackStage.id }
            : s
        )
      );
    } else {
      const confirmDelete = confirm(`¿Estás seguro de eliminar la columna "${stToDelete.label}"?`);
      if (!confirmDelete) return;
    }

    saveStages(remainingStages);
    toast.success(`Columna "${stToDelete.label}" eliminada con éxito.`);

    if (colForm.id === stageId) {
      setColForm({
        id: targetFallbackStage.id,
        label: targetFallbackStage.label,
        color: targetFallbackStage.color,
        es_ganada: !!targetFallbackStage.es_ganada,
        es_perdida: !!targetFallbackStage.es_perdida,
      });
    }
  };

  // Reset to default columns
  const handleResetStages = () => {
    if (confirm("¿Deseas restablecer las columnas a sus nombres y orden predeterminados?")) {
      saveStages(DEFAULT_STAGES);
      toast.success("Columnas restablecidas a valores iniciales.");
      setShowColModal(false);
    }
  };

  // Modals state
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [loadingViewSale, setLoadingViewSale] = useState(false);

  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [payForm, setPayForm] = useState({
    metodo_pago: "Transferencia",
    estado_pago: "pagado",
    monto_pagado: 0,
    entrega_ok: true,
  });
  const [savingPay, setSavingPay] = useState(false);

  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Modal: Documentación de Instalación
  const [docsSale, setDocsSale] = useState<Sale | null>(null);
  const [docsList, setDocsList] = useState<InstalledDocItem[]>([]);
  const [tecnicoInstalador, setTecnicoInstalador] = useState("");
  const [notasInstalacion, setNotasInstalacion] = useState("");
  const [estadoInstalacion, setEstadoInstalacion] = useState("pendiente");
  const [docTipoSelect, setDocTipoSelect] = useState("Acta de Instalación y Conformidad");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);

  // Modal: Seguimiento de 4 Facturas
  const [invoicesSale, setInvoicesSale] = useState<Sale | null>(null);
  const [invoicesList, setInvoicesList] = useState<FacturaTrackingItem[]>([]);
  const [savingInvoices, setSavingInvoices] = useState(false);

  const handleOpenInvoicesModal = (sale: Sale) => {
    setInvoicesSale(sale);
    setInvoicesList(parse4Invoices(sale.facturas_seguimiento, sale.total, sale.estado_pago));
  };

  const handleToggleInvoice = (invNum: number) => {
    setInvoicesList((prev) =>
      prev.map((inv) => {
        if (inv.num === invNum) {
          const isCurrentlyPaid = inv.estado === "pagado";
          return {
            ...inv,
            estado: isCurrentlyPaid ? "pendiente" : "pagado",
            fecha_pago: isCurrentlyPaid ? null : (inv.fecha_pago || new Date().toISOString().substring(0, 10)),
            comprobante: isCurrentlyPaid ? null : (inv.comprobante || `F00${invNum}`),
          };
        }
        return inv;
      })
    );
  };

  const handleUpdateInvoiceField = (invNum: number, field: "monto" | "fecha_pago" | "comprobante", value: any) => {
    setInvoicesList((prev) =>
      prev.map((inv) => (inv.num === invNum ? { ...inv, [field]: value } : inv))
    );
  };

  const handleSaveInvoices = async () => {
    if (!invoicesSale) return;
    setSavingInvoices(true);
    try {
      const f1Paid = invoicesList[0]?.estado === "pagado";
      await api.post("/api/sales/update-invoices", {
        id: invoicesSale.id,
        facturas_seguimiento: invoicesList,
        f1_pagada: f1Paid,
      });
      toast.success(`Seguimiento de facturas guardado para venta ${invoicesSale.numero_venta}.`);
      setInvoicesSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar facturas.");
    } finally {
      setSavingInvoices(false);
    }
  };

  // Helper: parse installation docs JSON
  const parseInstallationDocs = (jsonStr?: string | null): InstalledDocItem[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const handleOpenDocsModal = (sale: Sale) => {
    setDocsSale(sale);
    setDocsList(parseInstallationDocs(sale.documentos_instalacion));
    setNotasInstalacion(sale.notas || "");
    setEstadoInstalacion(sale.estado_instalacion || "pendiente");
    setDocTipoSelect("DNI / RUC del Titular");
  };

  const handleApproveDocs = async (saleToApprove?: Sale) => {
    const target = saleToApprove || docsSale;
    if (!target) return;
    try {
      await api.post("/api/sales/approve-docs", {
        id: target.id,
        estado_aprobacion: "aprobada",
        aprobado_por: "Administración",
        nuevo_estado: "en_proceso",
      });
      toast.success(`¡Expediente de ${target.numero_venta} aprobado con éxito!`);
      if (docsSale && docsSale.id === target.id) {
        setDocsSale({ ...docsSale, estado_aprobacion: "aprobada", aprobado_por: "Administración" });
      }
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al aprobar documentación.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/sales/upload-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newDoc: InstalledDocItem = {
        id: `doc_${Date.now()}`,
        tipo: docTipoSelect,
        nombre: res.data?.filename || file.name,
        url: res.data?.url || "",
        fecha: new Date().toISOString(),
        size: file.size,
      };
      setDocsList((prev) => [...prev, newDoc]);
      toast.success(`Archivo "${file.name}" cargado con éxito.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al subir el archivo.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleRemoveDoc = (docId: string) => {
    setDocsList((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSaveDocs = async () => {
    if (!docsSale) return;
    setSavingDocs(true);
    try {
      await api.post("/api/sales/save-docs", {
        id: docsSale.id,
        documentos: JSON.stringify(docsList),
        estado_instalacion: docsSale.estado_instalacion || "pendiente",
        tecnico_instalador: docsSale.tecnico_instalador || "",
        notas_instalacion: notasInstalacion.trim(),
        completar_venta: false,
      });

      toast.success(`Expediente y documentos de ${docsSale.numero_venta} guardados con éxito.`);
      setDocsSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar documentación.");
    } finally {
      setSavingDocs(false);
    }
  };

  // Fetch sales from API
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/sales");
      setSales(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error al cargar ventas:", err);
      toast.error("No se pudo conectar con el servidor de ventas.");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get("/api/payroll/staff");
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar staff:", err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchStaff();

    // Aplicar alcance según el usuario activo (ej: Vendedor solo ve sus ventas)
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

    const handleUserSwitch = (e: any) => {
      applyUserScope();
    };

    window.addEventListener("crm_user_switched", handleUserSwitch);
    return () => {
      window.removeEventListener("crm_user_switched", handleUserSwitch);
    };
  }, []);

  // Lista dinámica de Vendedores únicos (desde ventas + staff)
  const allVendedores = useMemo(() => {
    const map = new Map<string, { id: string; label: string; perfil?: string }>();
    staffList.forEach((st) => {
      if (st.id && st.nombre) {
        const label = `${st.nombre} ${st.apellido || ""}`.trim();
        map.set(String(st.id), {
          id: String(st.id),
          label,
          perfil: st.perfil_nombre || st.rol_operativo,
        });
      }
    });
    sales.forEach((s) => {
      if (s.trabajador_id && s.vendedor_nombre) {
        if (!map.has(String(s.trabajador_id))) {
          map.set(String(s.trabajador_id), {
            id: String(s.trabajador_id),
            label: s.vendedor_nombre,
            perfil: s.vendedor_perfil || undefined,
          });
        }
      } else if (s.vendedor_nombre && !map.has(s.vendedor_nombre)) {
        map.set(s.vendedor_nombre, {
          id: s.vendedor_nombre,
          label: s.vendedor_nombre,
          perfil: s.vendedor_perfil || undefined,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [sales, staffList]);

  // Lista dinámica de Supervisores únicos (desde ventas + staff)
  const allSupervisores = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    staffList.forEach((st) => {
      const isSupervisor =
        (st.rol_operativo && st.rol_operativo.toLowerCase().includes("supervisor")) ||
        (st.perfil_nombre && st.perfil_nombre.toLowerCase().includes("supervisor")) ||
        st.perfil_comision_id === 4;
      if (isSupervisor && st.id) {
        const label = `${st.nombre} ${st.apellido || ""}`.trim();
        map.set(String(st.id), { id: String(st.id), label });
      }
    });
    sales.forEach((s) => {
      if (
        s.supervisor_id &&
        s.supervisor_nombre &&
        s.supervisor_nombre.trim() !== "Sin Supervisor" &&
        s.supervisor_nombre.trim() !== ""
      ) {
        if (!map.has(String(s.supervisor_id))) {
          map.set(String(s.supervisor_id), {
            id: String(s.supervisor_id),
            label: s.supervisor_nombre,
          });
        }
      } else if (
        s.supervisor_nombre &&
        s.supervisor_nombre.trim() !== "Sin Supervisor" &&
        s.supervisor_nombre.trim() !== ""
      ) {
        if (!map.has(s.supervisor_nombre)) {
          map.set(s.supervisor_nombre, {
            id: s.supervisor_nombre,
            label: s.supervisor_nombre,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [sales, staffList]);

  // Lista dinámica de Equipos únicos (desde ventas + staff)
  const allEquipos = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((st) => {
      if (st.equipo && st.equipo.trim()) {
        set.add(st.equipo.trim());
      }
    });
    sales.forEach((s) => {
      const eq = s.equipo_nombre || s.equipo;
      if (eq && eq.trim()) {
        set.add(eq.trim());
      }
    });
    return Array.from(set).sort();
  }, [sales, staffList]);

  // Weekdays strip calculation (L, M, M, J, V, S, D)
  const weekDays = useMemo(() => {
    const list = [];
    const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const start = new Date(now);
    start.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label = dayLabels[d.getDay()];
      const dayNum = d.getDate();
      const isToday = dateStr === now.toISOString().split("T")[0];
      const isActive = filterDesde === dateStr && filterHasta === dateStr;

      // Count for this day
      const daySales = sales.filter((s) => {
        if (!s.fecha_venta) return false;
        return s.fecha_venta.split("T")[0] === dateStr;
      });
      const wonStageIds = new Set(
        stages.filter((st) => st.es_ganada).map((st) => st.id.toLowerCase())
      );
      const lostStageIds = new Set(
        stages.filter((st) => st.es_perdida).map((st) => st.id.toLowerCase())
      );

      const completedCount = daySales.filter((s) => {
        const st = (s.estado || "").toLowerCase();
        return wonStageIds.size > 0 ? wonStageIds.has(st) : st === "completada";
      }).length;
      const pendingCount = daySales.filter((s) => {
        const st = (s.estado || "").toLowerCase();
        const isWon = wonStageIds.size > 0 ? wonStageIds.has(st) : st === "completada";
        const isLost = lostStageIds.size > 0 ? lostStageIds.has(st) : st === "cancelada";
        return !isWon && !isLost;
      }).length;

      list.push({ dateStr, label, dayNum, isToday, isActive, pendingCount, completedCount });
    }
    return list;
  }, [sales, filterDesde, filterHasta, stages]);

  // Filter Helper: Toggle single day filter
  const filterByDay = (dateStr: string) => {
    if (filterDesde === dateStr && filterHasta === dateStr) {
      setFilterDesde("");
      setFilterHasta("");
    } else {
      setFilterDesde(dateStr);
      setFilterHasta(dateStr);
    }
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDesde("");
    setFilterHasta("");
    setFilterPago("all");
    setFilterEstado("all");
    setFilterMetodo("all");
    setFilterComprobante("all");
    setFilterVendedor(isOwnScope && ownTrabajadorId ? ownTrabajadorId : "all");
    setFilterSupervisor("all");
    setFilterEquipo("all");
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // 1. Search filter
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (s.numero_venta && s.numero_venta.toLowerCase().includes(term)) ||
        (s.cliente_nombre_completo && s.cliente_nombre_completo.toLowerCase().includes(term)) ||
        (s.numero_documento && s.numero_documento.toLowerCase().includes(term)) ||
        (s.productos_detalle && s.productos_detalle.toLowerCase().includes(term)) ||
        (s.oportunidad_titulo && s.oportunidad_titulo.toLowerCase().includes(term)) ||
        (s.vendedor_nombre && s.vendedor_nombre.toLowerCase().includes(term)) ||
        (s.supervisor_nombre && s.supervisor_nombre.toLowerCase().includes(term)) ||
        (s.equipo_nombre && s.equipo_nombre.toLowerCase().includes(term));

      // 2. Date filters
      const saleDate = s.fecha_venta ? s.fecha_venta.split("T")[0] : "";
      const matchDesde = !filterDesde || (saleDate && saleDate >= filterDesde);
      const matchHasta = !filterHasta || (saleDate && saleDate <= filterHasta);

      // 3. Estado de Pago filter
      const salePago = (s.estado_pago || "pendiente").toLowerCase();
      const matchPago = filterPago === "all" || salePago === filterPago.toLowerCase();

      // 4. Estado Operativo filter
      const saleEstado = (s.estado || "pendiente").toLowerCase();
      const matchEstado = filterEstado === "all" || saleEstado === filterEstado.toLowerCase();

      // 5. Método de Pago filter
      const saleMetodo = (s.metodo_pago || "").toLowerCase();
      const matchMetodo = filterMetodo === "all" || saleMetodo.includes(filterMetodo.toLowerCase());

      // 6. Tipo Comprobante filter
      const saleComp = (s.tipo_comprobante || "nota_venta").toLowerCase();
      const matchComp = filterComprobante === "all" || saleComp === filterComprobante.toLowerCase();

      // 7. Filtro por Vendedor
      if (filterVendedor !== "all") {
        if (filterVendedor === "unassigned") {
          if (s.trabajador_id != null || (s.vendedor_nombre && s.vendedor_nombre !== "Sin Asignar")) return false;
        } else {
          if (s.trabajador_id == null && (!s.vendedor_nombre || s.vendedor_nombre === "Sin Asignar")) return false;
          const selectedWorker = staffList?.find((st: any) => String(st.id) === filterVendedor);
          const workerFullName = selectedWorker ? `${selectedWorker.nombre} ${selectedWorker.apellido || ""}`.trim().toLowerCase() : "";
          const saleVenName = (s.vendedor_nombre || "").trim().toLowerCase();

          const matchesVendedor =
            (s.trabajador_id != null && String(s.trabajador_id) === filterVendedor) ||
            (saleVenName !== "" && saleVenName === filterVendedor.toLowerCase()) ||
            (workerFullName !== "" && (saleVenName === workerFullName || (selectedWorker?.nombre && saleVenName.includes(selectedWorker.nombre.toLowerCase()))));
          if (!matchesVendedor) return false;
        }
      }

      // 8. Filtro por Supervisor
      if (filterSupervisor !== "all") {
        if (filterSupervisor === "unassigned") {
          if (s.supervisor_id != null || (s.supervisor_nombre && s.supervisor_nombre !== "Sin Asignar")) return false;
        } else {
          if (s.supervisor_id == null && (!s.supervisor_nombre || s.supervisor_nombre === "Sin Asignar")) return false;
          const selectedSup = staffList?.find((st: any) => String(st.id) === filterSupervisor);
          const supFullName = selectedSup ? `${selectedSup.nombre} ${selectedSup.apellido || ""}`.trim().toLowerCase() : "";
          const saleSupName = (s.supervisor_nombre || "").trim().toLowerCase();

          const matchesSupervisor =
            (s.supervisor_id != null && String(s.supervisor_id) === filterSupervisor) ||
            (saleSupName !== "" && saleSupName === filterSupervisor.toLowerCase()) ||
            (supFullName !== "" && (saleSupName === supFullName || (selectedSup?.nombre && saleSupName.includes(selectedSup.nombre.toLowerCase()))));
          if (!matchesSupervisor) return false;
        }
      }

      // 9. Filtro por Equipo
      if (filterEquipo !== "all") {
        const eqName = (s.equipo_nombre || s.equipo || "").trim().toLowerCase();
        if (eqName !== filterEquipo.trim().toLowerCase()) return false;
      }

      return matchSearch && matchDesde && matchHasta && matchPago && matchEstado && matchMetodo && matchComp;
    });
  }, [sales, staffList, searchTerm, filterDesde, filterHasta, filterPago, filterEstado, filterMetodo, filterComprobante, filterVendedor, filterSupervisor, filterEquipo]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return filteredSales.slice(start, start + salesPageSize);
  }, [filteredSales, salesPage, salesPageSize]);

  // Helper: Extraer monto NETO sin IGV de una venta (Base Imponible para telecomunicaciones)
  const getNetoVenta = (s: Sale): number => {
    if (s.subtotal && Number(s.subtotal) > 0) return Number(s.subtotal);
    const tot = Number(s.total || 0);
    return tot > 0 ? tot / 1.18 : 0;
  };

  // Helper: Extraer monto cobrado NETO sin IGV
  const getNetoCobrado = (s: Sale): number => {
    const pag = Number(s.monto_pagado || 0);
    if (pag <= 0) return 0;
    const tot = Number(s.total || 0);
    const net = getNetoVenta(s);
    return tot > 0 ? (pag * net / tot) : pag / 1.18;
  };

  // KPI Calculations (Calculados estrictamente SIN IGV / Base Imponible Neta para métricas reales del Dealer)
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    const totalMontoNeto = filteredSales.reduce((acc, curr) => acc + getNetoVenta(curr), 0);
    const totalCobradoNeto = filteredSales.reduce((acc, curr) => acc + getNetoCobrado(curr), 0);

    const wonStageIds = new Set(
      stages.filter((st) => st.es_ganada).map((st) => st.id.toLowerCase())
    );

    // Ventas Finales Concretadas (Instaladas y Certificadas) - Monto Sin IGV
    const ventasInstaladasList = filteredSales.filter((s) => {
      const isInstDone = (s.estado_instalacion || "").toLowerCase() === "completada";
      const st = (s.estado || "pendiente").toLowerCase();
      return isInstDone || (wonStageIds.size > 0 ? wonStageIds.has(st) : st === "completada");
    });
    const montoInstaladas = ventasInstaladasList.reduce((acc, curr) => acc + getNetoVenta(curr), 0);
    const countInstaladas = ventasInstaladasList.length;

    // Ventas en Cola de Instalación (Pipeline Operativo) - Monto Sin IGV
    const ventasPorInstalarList = filteredSales.filter((s) => {
      const isInstDone = (s.estado_instalacion || "").toLowerCase() === "completada";
      const st = (s.estado || "pendiente").toLowerCase();
      const isWon = wonStageIds.size > 0 ? wonStageIds.has(st) : st === "completada";
      const isLost = st === "cancelada" || stages.find((col) => col.id === st)?.es_perdida;
      return !isInstDone && !isWon && !isLost;
    });
    const montoPorInstalar = ventasPorInstalarList.reduce((acc, curr) => acc + getNetoVenta(curr), 0);
    const countPorInstalar = ventasPorInstalarList.length;

    // 1ra Factura Cobrada (Liquidada)
    const pagadas = filteredSales.filter(
      (s) => (s.estado_pago || "").toLowerCase() === "pagado"
    ).length;

    // Por Cobrar (Pendiente de 1ra Factura) - Monto Sin IGV
    const pendientesPago = filteredSales.filter((s) => {
      const isLost = s.estado === "cancelada" || stages.find((col) => col.id === s.estado)?.es_perdida;
      return !isLost && (s.estado_pago || "").toLowerCase() !== "pagado";
    });
    const totalPendiente = pendientesPago.reduce(
      (acc, curr) => {
        const net = getNetoVenta(curr);
        const netPaid = getNetoCobrado(curr);
        return acc + Math.max(0, net - netPaid);
      },
      0
    );
    const countPendientePago = pendientesPago.length;

    return {
      totalCount,
      totalMonto: totalMontoNeto,
      totalCobrado: totalCobradoNeto,
      totalPendiente,
      montoInstaladas,
      countInstaladas,
      montoPorInstalar,
      countPorInstalar,
      pagadas,
      countPendientePago,
      ticketPromedio: totalCount > 0 ? totalMontoNeto / totalCount : 0,
    };
  }, [filteredSales, stages]);

  // Drag and Drop & Menu Stage Move
  const handleMoveStage = async (saleId: number, targetStage: string) => {
    setDraggedSaleId(null);
    setDragOverStage(null);
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale || targetSale.estado === targetStage) return;

    // 1. Si la venta ya está bloqueada (completada / instalada / cancelada)
    const isAlreadyLocked =
      (targetSale.estado || "").toLowerCase() === "completada" ||
      (targetSale.estado || "").toLowerCase() === "cancelada" ||
      (targetSale.estado_instalacion || "").toLowerCase() === "completada";

    if (isAlreadyLocked) {
      toast.warning(
        `La venta ${targetSale.numero_venta} está cerrada y bloqueada. Usa la opción "Desbloquear Venta" para poder trasladarla.`
      );
      return;
    }

    // 2. Si el destino es INSTALADA (completada) -> Modal de Confirmación y Bloqueo
    if (targetStage === "completada") {
      setInstallConfirmSale(targetSale);
      return;
    }

    // 3. Si el destino es ANULADA (cancelada) -> Modal de Anulación y Bloqueo
    if (targetStage === "cancelada") {
      handleOpenCancel(targetSale);
      return;
    }

    // 4. Traslado regular entre otras etapas operativas
    executeMoveStage(saleId, targetStage);
  };

  // Ejecutar el traslado real a una etapa
  const executeMoveStage = async (saleId: number, targetStage: string) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) return;

    // Optimistic UI update
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              estado: targetStage,
              estado_instalacion: targetStage === "completada" ? "completada" : s.estado_instalacion,
              fecha_instalacion:
                targetStage === "completada"
                  ? s.fecha_instalacion || new Date().toISOString()
                  : s.fecha_instalacion,
            }
          : s
      )
    );

    try {
      await api.post("/api/sales/update-status", {
        id: saleId,
        estado: targetStage,
      });
      const stageName = stages.find((st) => st.id === targetStage)?.label || targetStage;
      if (targetStage === "completada") {
        toast.success(
          `🎉 ¡Venta ${targetSale.numero_venta} cerrada e INSTALADA! Queda bloqueada y contabilizada en Rentabilidad.`
        );
      } else if (targetStage === "cancelada") {
        toast.info(`Venta ${targetSale.numero_venta} anulada y bloqueada.`);
      } else {
        toast.success(`Venta ${targetSale.numero_venta} movida a ${stageName}`);
      }
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al mover etapa de venta.");
      fetchSales(); // Rollback
    }
  };

  // Desbloquear venta cerrada o anulada
  const handleExecuteUnlock = async (saleId: number) => {
    setUnlocking(true);
    try {
      await api.post("/api/sales/unlock", { id: saleId, target_estado: "en_proceso" });
      toast.success("Venta desbloqueada con éxito y trasladada a Programada / Instalación.");
      setUnlockSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al desbloquear venta.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDragStart = (saleId: number) => {
    const sale = sales.find((s) => s.id === saleId);
    if (sale) {
      const isLocked =
        (sale.estado || "").toLowerCase() === "completada" ||
        (sale.estado || "").toLowerCase() === "cancelada" ||
        (sale.estado_instalacion || "").toLowerCase() === "completada";
      if (isLocked) {
        toast.warning(`La venta ${sale.numero_venta} está bloqueada y no puede ser arrastrada.`);
        return;
      }
    }
    setDraggedSaleId(saleId);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedSaleId) {
      handleMoveStage(draggedSaleId, targetStage);
      setDraggedSaleId(null);
    }
  };

  // Open Full Detail Modal
  const handleOpenView = async (sale: Sale) => {
    setViewSale(sale);
    setLoadingViewSale(true);
    try {
      const res = await api.get(`/api/sales/${sale.id}`);
      if (res.data) {
        setViewSale(res.data);
      }
    } catch (e) {
      // Keep initial data
    } finally {
      setLoadingViewSale(false);
    }
  };

  // Open Pay Modal
  const handleOpenPay = (sale: Sale) => {
    setPaySale(sale);
    setPayForm({
      metodo_pago: sale.metodo_pago && sale.metodo_pago !== "Pendiente" ? sale.metodo_pago : "Transferencia",
      estado_pago: "pagado",
      monto_pagado: Number(sale.total) || 0,
      entrega_ok: false,
    });
  };

  // Submit Payment
  const handleSavePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySale) return;
    setSavingPay(true);
    try {
      await api.post("/api/sales/validate", {
        id: paySale.id,
        metodo_pago: payForm.metodo_pago,
        estado_pago: payForm.estado_pago,
        monto_pagado: Number(payForm.monto_pagado),
        entrega_ok: payForm.entrega_ok,
      });
      toast.success(`Cobro registrado para la venta ${paySale.numero_venta}`);
      setPaySale(null);
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al registrar cobro.");
    } finally {
      setSavingPay(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancel = (sale: Sale) => {
    setCancelSale(sale);
    setCancelMotivo("");
  };

  // Submit Cancel
  const handleSaveCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelSale || !cancelMotivo.trim()) return;
    setCancelling(true);
    try {
      await api.post("/api/sales/cancel", {
        id: cancelSale.id,
        motivo: cancelMotivo.trim(),
      });
      toast.success(`Venta ${cancelSale.numero_venta} anulada correctamente.`);
      setCancelSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al anular venta.");
    } finally {
      setCancelling(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSales.length === 0) {
      toast.info("No hay ventas para exportar con los filtros seleccionados.");
      return;
    }

    const rows = filteredSales.map((s) => ({
      "N° Venta": s.numero_venta || `VEN-${s.id}`,
      "Tipo Comprobante": (s.tipo_comprobante || "Nota de Venta").toUpperCase().replace("_", " "),
      "Fecha Emisión": s.fecha_venta ? String(s.fecha_venta).replace("T", " ").substring(0, 16) : "-",
      "Cliente": s.cliente_nombre_completo || "Cliente General",
      "RUC / DNI": s.numero_documento || "-",
      "Productos Facturados": s.productos_detalle || "Venta directa",
      "Valor Venta Neto (Sin IGV)": Number(getNetoVenta(s)).toFixed(2),
      "IGV 18% (PEN)": Number(s.igv || (Number(s.total || 0) - getNetoVenta(s))).toFixed(2),
      "Total Facturado Inc. IGV": Number(s.total || 0).toFixed(2),
      "Monto Pagado (PEN)": Number(s.monto_pagado || 0).toFixed(2),
      "Estado de Pago": (s.estado_pago || "Pendiente").toUpperCase(),
      "Método de Pago": (s.metodo_pago || "Efectivo").toUpperCase(),
      "Estado Operativo": (s.estado || "Completada").toUpperCase(),
      "Origen": s.oportunidad_id ? `Cotización COT-${String(s.oportunidad_id).padStart(4, "0")}` : "Venta Directa",
      "Notas": s.notas || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Reporte_Ventas_NextLead_${today}.xlsx`);
    toast.success("Reporte de Ventas descargado en Excel.");
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="size-6 text-emerald-600" />
            Ventas & Facturación
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión integral de ventas, tablero de despachos, comprobantes y flujo de cobros.
          </p>
        </div>

        {/* View Mode Switcher & Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Left Filter Sidebar */}
          <Button
            variant={sidebarOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 gap-1.5 text-xs font-medium"
            title={sidebarOpen ? "Ocultar panel de filtros" : "Mostrar panel de filtros"}
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            <span>{sidebarOpen ? "Ocultar Filtros" : "Mostrar Filtros"}</span>
          </Button>

          {/* Kanban vs List Switcher */}
          <div className="flex items-center rounded-lg border bg-background p-0.5 text-xs">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5 font-medium"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="size-3.5" />
              Tablero
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5 font-medium"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="size-3.5" />
              Lista
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchSales} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 gap-1.5 text-xs">
            <Download className="size-3.5 text-emerald-600" />
            Excel
          </Button>

          {viewMode === "kanban" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const firstCol = stages[0];
                setColForm({
                  id: firstCol.id,
                  label: firstCol.label,
                  color: firstCol.color,
                  es_ganada: !!firstCol.es_ganada,
                  es_perdida: !!firstCol.es_perdida,
                });
                setShowColModal(true);
              }}
              className="h-8 gap-1.5 text-xs"
              title="Gestionar y reordenar columnas del tablero"
            >
              <Columns3 className="size-3.5" />
              Columnas
            </Button>
          )}

          <Button size="sm" asChild className="w-full sm:w-auto order-first sm:order-last h-9 sm:h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs">
            <Link href="/ventas/create">
              <Plus className="size-4" />
              Nueva Venta
            </Link>
          </Button>
        </div>
      </div>

      {/* 1.1 Barra Superior de Filtros Comerciales (Supervisor / Vendedor / Equipo) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-card border rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs mr-1">
            <Users className="size-4 text-indigo-600" />
            <span>Filtros Comerciales:</span>
          </div>

          {/* Quick Filter: Supervisor */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg border px-2 py-1">
            <ShieldCheck className="size-3.5 text-amber-600 shrink-0" />
            <select
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer text-foreground"
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
            >
              <option value="all">Supervisor: Todos</option>
              {allSupervisores.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter: Vendedor */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg border px-2 py-1">
            <User className="size-3.5 text-indigo-600 shrink-0" />
            {isOwnScope ? (
              <span className="text-xs font-semibold text-emerald-600 px-1">Mis Ventas Asignadas</span>
            ) : (
              <select
                className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer text-foreground"
                value={filterVendedor}
                onChange={(e) => setFilterVendedor(e.target.value)}
              >
                <option value="all">Vendedor: Todos</option>
                {allVendedores.map((ven) => (
                  <option key={ven.id} value={ven.id}>
                    {ven.label} {ven.perfil ? `(${ven.perfil})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Filter: Equipo */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg border px-2 py-1">
            <Building2 className="size-3.5 text-blue-600 shrink-0" />
            <select
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer text-foreground"
              value={filterEquipo}
              onChange={(e) => setFilterEquipo(e.target.value)}
            >
              <option value="all">Equipo: Todos</option>
              {allEquipos.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status of filter & quick reset button */}
        {(filterSupervisor !== "all" || (!isOwnScope && filterVendedor !== "all") || filterEquipo !== "all") && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Mostrando <strong className="text-foreground">{filteredSales.length}</strong> de {sales.length} ventas
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterSupervisor("all");
                setFilterVendedor(isOwnScope && ownTrabajadorId ? ownTrabajadorId : "all");
                setFilterEquipo("all");
              }}
              className="h-7 text-xs text-destructive hover:text-destructive px-2 gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className="size-3" />
              Limpiar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* 2. KPI Summary Cards (Calculados Sin IGV - Base Imponible del Negocio) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
        {/* KPI 1: Ventas Finales Instaladas */}
        <Card className="bg-card shadow-xs p-3 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Instaladas (Sin IGV)</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold mt-1 text-emerald-600">
            S/ {stats.montoInstaladas.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.countInstaladas} alta(s) con instalación certificada
          </p>
        </Card>

        {/* KPI 2: En Cola de Instalación */}
        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Por Instalar (Sin IGV)</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-amber-600">
            S/ {stats.montoPorInstalar.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.countPorInstalar} en trámite de cuadrilla técnica
          </p>
        </Card>

        {/* KPI 3: 1ra Factura Cobrada */}
        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cobrado Neto (Sin IGV)</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">
            S/ {stats.totalCobrado.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.pagadas} cliente(s) con 1ra cuota cobrada
          </p>
        </Card>

        {/* KPI 4: Por Cobrar (Pendiente de 1ra Factura) */}
        <Card className="bg-card shadow-xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Por Cobrar (Sin IGV)</span>
            <CreditCard className="size-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">
            S/ {stats.totalPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.countPendientePago} saldo pendiente de cobro
          </p>
        </Card>
      </div>

      {/* 3. Main Workspace: Lateral Filter Sidebar + Content (Kanban / List) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* =============================================================== */}
        {/* PANEL LATERAL DE FILTROS (FILTRO DE LA IZQUIERDA) */}
        {/* =============================================================== */}
        {sidebarOpen && (
          <div className="w-full lg:w-60 xl:w-72 shrink-0">
            <Card className="bg-card sticky top-4 shadow-sm border">
              <CardHeader className="p-3.5 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="size-3.5 text-primary" />
                  Filtros de Ventas
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-6 text-[10px] text-destructive hover:text-destructive px-1.5 font-bold"
                >
                  LIMPIAR
                </Button>
              </CardHeader>

              <CardContent className="p-3.5 flex flex-col gap-4 text-xs">
                {/* Search in Sidebar */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Búsqueda General</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cliente, N° venta, RUC..."
                      className="pl-8 h-8 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Estructura Comercial en Barra Lateral */}
                <div className="p-3 bg-muted/40 rounded-lg border border-border/70 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-[11px] uppercase tracking-wider">
                    <Users className="size-3.5 text-indigo-600" />
                    Estructura Comercial
                  </div>

                  {/* 1. Supervisor */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="side_filter_supervisor" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Supervisor
                    </Label>
                    <select
                      id="side_filter_supervisor"
                      className="h-8 px-2 rounded-md border bg-background text-xs font-medium"
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

                  {/* 2. Vendedor */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="side_filter_vendedor" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendedor / Asesor
                    </Label>
                    <select
                      id="side_filter_vendedor"
                      className="h-8 px-2 rounded-md border bg-background text-xs font-medium"
                      value={filterVendedor}
                      onChange={(e) => setFilterVendedor(e.target.value)}
                    >
                      <option value="all">Todos los Vendedores</option>
                      {allVendedores.map((ven) => (
                        <option key={ven.id} value={ven.id}>
                          {ven.label} {ven.perfil ? `(${ven.perfil})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Equipo */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="side_filter_equipo" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Equipo Comercial
                    </Label>
                    <select
                      id="side_filter_equipo"
                      className="h-8 px-2 rounded-md border bg-background text-xs font-medium"
                      value={filterEquipo}
                      onChange={(e) => setFilterEquipo(e.target.value)}
                    >
                      <option value="all">Todos los Equipos</option>
                      {allEquipos.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ventas de la Semana: 7 Days Strip */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Ventas de la Semana
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => filterByDay(day.dateStr)}
                        className={`flex flex-col items-center justify-center p-1 rounded-md border text-center transition-all cursor-pointer ${
                          day.isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                            : day.isToday
                            ? "bg-accent border-primary/50 text-foreground font-semibold"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                        style={{ minHeight: "52px" }}
                        title={`${day.dateStr}: ${day.completedCount} completadas, ${day.pendingCount} pendientes`}
                      >
                        <span className="text-[8px] font-extrabold uppercase leading-none">{day.label}</span>
                        <span className="text-xs font-bold my-0.5 leading-none">{day.dayNum}</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {day.pendingCount > 0 && (
                            <span className="size-2 rounded-full bg-amber-500 inline-block" title={`${day.pendingCount} pendientes`} />
                          )}
                          {day.completedCount > 0 && (
                            <span className="size-2 rounded-full bg-emerald-500 inline-block" title={`${day.completedCount} completadas`} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rango de Fechas */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Rango de Fechas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="desde" className="text-[10px] text-muted-foreground">Desde</Label>
                      <Input
                        id="desde"
                        type="date"
                        className="h-8 text-[11px] px-2 font-mono"
                        value={filterDesde}
                        onChange={(e) => setFilterDesde(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hasta" className="text-[10px] text-muted-foreground">Hasta</Label>
                      <Input
                        id="hasta"
                        type="date"
                        className="h-8 text-[11px] px-2 font-mono"
                        value={filterHasta}
                        onChange={(e) => setFilterHasta(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Estado de Pago */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter_pago" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado de Pago
                  </Label>
                  <select
                    id="filter_pago"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs"
                    value={filterPago}
                    onChange={(e) => setFilterPago(e.target.value)}
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="pagado">● Pagado al 100%</option>
                    <option value="parcial">◐ Pago Parcial (Abono)</option>
                    <option value="pendiente">○ Pendiente de Cobro</option>
                  </select>
                </div>

                {/* Estado Operativo / Entrega */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter_estado" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado de Entrega
                  </Label>
                  <select
                    id="filter_estado"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs"
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                  >
                    <option value="all">Todas las Etapas</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Medio de Pago */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter_metodo" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Medio de Cobro
                  </Label>
                  <select
                    id="filter_metodo"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs"
                    value={filterMetodo}
                    onChange={(e) => setFilterMetodo(e.target.value)}
                  >
                    <option value="all">Todos los Medios</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                  </select>
                </div>

                {/* Tipo de Comprobante */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter_comprobante" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo de Comprobante
                  </Label>
                  <select
                    id="filter_comprobante"
                    className="h-8 px-2.5 rounded-md border bg-background text-xs"
                    value={filterComprobante}
                    onChange={(e) => setFilterComprobante(e.target.value)}
                  >
                    <option value="all">Todos los Comprobantes</option>
                    <option value="factura">Factura Electrónica</option>
                    <option value="boleta">Boleta Electrónica</option>
                    <option value="nota_venta">Nota de Venta</option>
                  </select>
                </div>
              </CardContent>
              <DataTablePagination
                currentPage={salesPage}
                pageSize={salesPageSize}
                totalItems={filteredSales.length}
                onPageChange={setSalesPage}
                onPageSizeChange={setSalesPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                itemName="ventas"
              />
            </Card>
          </div>
        )}

        {/* =============================================================== */}
        {/* ÁREA DE CONTENIDO PRINCIPAL: TABLERO KANBAN O LISTA */}
        {/* =============================================================== */}
        <div className="flex-1 min-w-0 w-full">
          {/* TABLERO KANBAN */}
          {viewMode === "kanban" ? (
            <div className="w-full max-w-full min-w-0 overflow-x-auto pb-4">
              <div className="flex gap-3.5 items-start min-w-max">
                {stages.map((stage, stageIndex) => {
                  const colSales = filteredSales.filter(
                    (s) => (s.estado || "pendiente").toLowerCase() === stage.id
                  );
                  const colTotal = colSales.reduce((sum, s) => sum + getNetoVenta(s), 0);
                  const isOver = dragOverStage === stage.id;

                  return (
                    <div
                      key={stage.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverStage(stage.id);
                      }}
                      onDragLeave={() => setDragOverStage(null)}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      className={`w-80 min-w-[20rem] shrink-0 bg-muted/40 border rounded-xl flex flex-col min-h-[500px] shadow-xs transition-all duration-200 ${
                        isOver
                          ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 shadow-md"
                          : ""
                      }`}
                    >
                      {/* Column Header with Left / Right reorder buttons */}
                      <div className="p-2.5 border-b bg-card rounded-t-xl flex items-center justify-between shrink-0 gap-1.5">
                        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                          <span className="font-bold text-xs text-foreground truncate" title={stage.label}>
                            {stage.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`px-1.5 py-0 text-[10px] shrink-0 ${
                              stage.es_ganada
                                ? "bg-emerald-500/15 text-emerald-600 font-semibold"
                                : stage.es_perdida
                                ? "bg-destructive/15 text-destructive font-semibold"
                                : ""
                            }`}
                          >
                            {colSales.length}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] font-bold text-foreground mr-0.5" title="Total neto sin IGV en etapa">
                            S/ {colTotal.toFixed(2)}
                          </span>

                          {/* Left & Right Reorder Buttons */}
                          <div className="flex items-center bg-muted/70 rounded border p-0.5 gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              disabled={stageIndex === 0}
                              onClick={() => handleMoveColumn(stageIndex, "left")}
                              title="Mover columna a la izquierda"
                            >
                              <ChevronLeft className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              disabled={stageIndex === stages.length - 1}
                              onClick={() => handleMoveColumn(stageIndex, "right")}
                              title="Mover columna a la derecha"
                            >
                              <ChevronRight className="size-3" />
                            </Button>
                          </div>

                          {/* Column Options Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                title="Opciones de columna"
                              >
                                <MoreVertical className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem
                                onClick={() => handleOpenEditCol(stage)}
                                className="cursor-pointer text-xs"
                              >
                                <Edit className="size-3 mr-1.5 text-primary" />
                                Editar Columna
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={stageIndex === 0}
                                onClick={() => handleMoveColumn(stageIndex, "left")}
                                className="cursor-pointer text-xs"
                              >
                                <ArrowLeft className="size-3 mr-1.5" />
                                Mover a la Izquierda
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={stageIndex === stages.length - 1}
                                onClick={() => handleMoveColumn(stageIndex, "right")}
                                className="cursor-pointer text-xs"
                              >
                                <ArrowRight className="size-3 mr-1.5" />
                                Mover a la Derecha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteColumn(stage.id)}
                                className="cursor-pointer text-xs text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3 mr-1.5" />
                                Eliminar Columna
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Cards Container */}
                      <div className="p-2 overflow-y-auto flex flex-col gap-2.5 flex-1">
                        {colSales.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-muted-foreground border-2 border-dashed rounded-lg">
                            Arrastra ventas aquí
                          </div>
                      ) : (
                        colSales.map((sale) => {
                          const isPaid = (sale.estado_pago || "").toLowerCase() === "pagado";
                          const isPartial = (sale.estado_pago || "").toLowerCase() === "parcial";
                          const isCompleted =
                            (sale.estado || "").toLowerCase() === "completada" ||
                            (sale.estado_instalacion || "").toLowerCase() === "completada";
                          const isCancelled = (sale.estado || "").toLowerCase() === "cancelada";
                          const isLocked = isCompleted || isCancelled;
                          const isDragging = draggedSaleId === sale.id;

                          const paymentColor = isPaid
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold"
                            : isPartial
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold";

                          return (
                            <Card
                              key={sale.id}
                              draggable={!isLocked}
                              onDragStart={() => !isLocked && handleDragStart(sale.id)}
                              onDragEnd={() => {
                                setDraggedSaleId(null);
                                setDragOverStage(null);
                              }}
                              className={`w-full shrink-0 p-3 bg-card transition-all border flex flex-col gap-2 text-xs select-none overflow-hidden ${
                                isLocked
                                  ? "cursor-default border-slate-300 dark:border-slate-700 bg-card/95 ring-1 ring-slate-400/20"
                                  : isDragging
                                  ? "opacity-50 border-dashed border-primary ring-2 ring-primary/40 cursor-grab active:cursor-grabbing"
                                  : "hover:shadow-md cursor-grab active:cursor-grabbing"
                              }`}
                            >
                              {/* 1. Top Header: N° Venta, Tipo Comprobante, Payment Badge & Action Menu */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold">
                                    {sale.numero_venta || `VEN-${sale.id}`}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300 uppercase">
                                    {sale.tipo_comprobante?.replace("_", " ") || "Nota Venta"}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${paymentColor}`}>
                                    {(sale.estado_pago || "Pendiente").toUpperCase()}
                                  </Badge>
                                  {isCompleted && (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 text-[9px] px-1.5 py-0 shadow-xs border-0">
                                      <Lock className="size-2.5" />
                                      INSTALADA (BLOQUEADA)
                                    </Badge>
                                  )}
                                  {isCancelled && (
                                    <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 text-[9px] px-1.5 py-0 shadow-xs border-0">
                                      <Lock className="size-2.5" />
                                      ANULADA (BLOQUEADA)
                                    </Badge>
                                  )}
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground">
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 text-xs">
                                    {isLocked ? (
                                      <>
                                        <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/60 rounded mb-1">
                                          <Lock className="size-3 text-amber-600 shrink-0" />
                                          <span className="font-semibold">Venta Bloqueada ({isCompleted ? "Instalada" : "Anulada"})</span>
                                        </div>
                                        <DropdownMenuItem
                                          onClick={() => setUnlockSale(sale)}
                                          className="cursor-pointer text-xs text-amber-600 font-medium"
                                        >
                                          <Unlock className="size-3 mr-1.5" />
                                          Desbloquear Venta
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    ) : (
                                      <>
                                        <DropdownMenuLabel>Mover a Etapa</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {stages.filter((st) => st.id !== stage.id).map((st) => (
                                          <DropdownMenuItem
                                            key={st.id}
                                            onClick={() => handleMoveStage(sale.id, st.id)}
                                            className="cursor-pointer text-xs"
                                          >
                                            <ArrowRight className="size-3 mr-1.5 text-muted-foreground" />
                                            {st.label}
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedVentaForActividad(sale);
                                        setActividadModalOpen(true);
                                      }}
                                      className="cursor-pointer text-xs text-blue-700 font-medium"
                                    >
                                      <CalendarClock className="size-3.5 mr-1.5 text-blue-600" />
                                      Programar Actividad / Instalación
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenView(sale)} className="cursor-pointer text-xs text-emerald-700 font-medium">
                                      <FileText className="size-3.5 mr-1.5" />
                                      Ver Comprobante
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenDocsModal(sale)} className="cursor-pointer text-xs text-sky-700 font-medium">
                                      <FolderArchive className="size-3.5 mr-1.5 text-sky-600" />
                                      Expediente Documental
                                    </DropdownMenuItem>
                                    {!isPaid && (
                                      <DropdownMenuItem onClick={() => handleOpenPay(sale)} className="cursor-pointer text-xs">
                                        <CreditCard className="size-3.5 mr-1.5 text-emerald-600" />
                                        Registrar Cobro
                                      </DropdownMenuItem>
                                    )}
                                    {!isLocked && (
                                      <DropdownMenuItem onClick={() => handleOpenCancel(sale)} className="text-destructive cursor-pointer text-xs">
                                        <Ban className="size-3.5 mr-1.5" />
                                        Anular Venta
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* 2. Client / Headline Title */}
                              <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                                {sale.cliente_nombre_completo || "Venta Directa"}
                              </h4>

                              {/* 3. Company & Key Contact Info Block */}
                              <div className="space-y-1 bg-muted/20 border border-border/50 rounded-md p-1.5">
                                {/* Cliente / Razón Social */}
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground truncate" title={sale.cliente_nombre_completo || "Cliente"}>
                                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{sale.cliente_nombre_completo || "Cliente General"}</span>
                                  {sale.numero_documento && (
                                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                      ({sale.numero_documento})
                                    </span>
                                  )}
                                </div>

                                {/* Dirección de entrega / Sede */}
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate" title={sale.direccion_entrega || "Recojo en sede / Directo"}>
                                  <MapPin className="size-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{sale.direccion_entrega || "Recojo en sede / Directo"}</span>
                                </div>

                                {/* Teléfono & WhatsApp Link */}
                                {sale.telefono_principal && (
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 border-t border-border/40">
                                    <span className="flex items-center gap-1 truncate font-mono">
                                      <Phone className="size-2.5 text-muted-foreground" />
                                      {sale.telefono_principal}
                                    </span>
                                    <a
                                      href={`https://wa.me/${sale.telefono_principal.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5 text-[10px] shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MessageSquare className="size-2.5" /> WhatsApp
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Asesor / Estructura Comercial */}
                              <div className="flex flex-col gap-1 text-[11px] bg-muted/40 border border-border/60 rounded p-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-foreground font-semibold truncate">
                                    <User className="size-3 text-indigo-600 shrink-0" />
                                    <span className="truncate">{sale.vendedor_nombre || "Sin Asesor Asignado"}</span>
                                  </span>
                                  {sale.vendedor_perfil && (
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400">
                                      {sale.vendedor_perfil}
                                    </Badge>
                                  )}
                                </div>
                                {(sale.equipo_nombre || (sale.supervisor_nombre && sale.supervisor_nombre !== "Sin Supervisor")) && (
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                    <span className="truncate flex items-center gap-1">
                                      <Building2 className="size-2.5 text-blue-500 shrink-0" />
                                      <span className="truncate">{sale.equipo_nombre || "Equipo Principal"}</span>
                                    </span>
                                    {sale.supervisor_nombre && sale.supervisor_nombre !== "Sin Supervisor" && (
                                      <span className="truncate text-amber-700 dark:text-amber-400 font-medium ml-1">
                                        Sup: {sale.supervisor_nombre.split(" ")[0]}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 3.1 Indicador Visual de Actividad / Instalación Programada */}
                              {(() => {
                                const hasAct = Boolean(sale.act_fecha_programada);
                                const nowIso = new Date().toISOString();
                                const isOverdue = hasAct && sale.act_estado === "Pendiente" && sale.act_fecha_programada! < nowIso;
                                const isPending = hasAct && sale.act_estado === "Pendiente" && !isOverdue;
                                const isDone = hasAct && sale.act_estado === "Completada";

                                const getTipoIcon = (t?: string | null) => {
                                  if (t === "Instalación" || t === "Visita Técnica") return "🛠️";
                                  if (t === "Despacho") return "🚚";
                                  if (t === "Llamada") return "📞";
                                  if (t === "WhatsApp") return "💬";
                                  if (t === "Cobranza") return "💰";
                                  return "📌";
                                };

                                const formatShortDate = (dStr?: string | null) => {
                                  if (!dStr) return "";
                                  try {
                                    const d = new Date(dStr);
                                    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                                  } catch {
                                    return dStr.substring(0, 16);
                                  }
                                };

                                return (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVentaForActividad(sale);
                                      setActividadModalOpen(true);
                                    }}
                                    className={`rounded-md p-1.5 border text-[11px] cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                                      isOverdue
                                        ? "bg-rose-50/90 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 hover:bg-rose-100"
                                        : isPending
                                        ? "bg-amber-50/90 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-100"
                                        : isDone
                                        ? "bg-emerald-50/90 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                                        : "bg-muted/20 border-dashed border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    }`}
                                    title={hasAct ? `${sale.act_asunto || sale.act_tipo} (${sale.act_estado}) - Clic para gestionar` : "Sin actividad / instalación programada - Clic para programar"}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      {hasAct ? (
                                        <>
                                          <span className="text-xs">{getTipoIcon(sale.act_tipo)}</span>
                                          <span className="truncate font-medium">
                                            <strong className={isOverdue ? "text-rose-700 font-bold" : ""}>
                                              {isOverdue ? "¡Vencida! " : isPending ? "Próx: " : "Hecha: "}
                                            </strong>
                                            {sale.act_asunto || sale.act_tipo}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <CalendarClock className="size-3 text-muted-foreground/70" />
                                          <span className="italic">Sin actividad / despacho</span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                      {hasAct ? (
                                        <>
                                          <span className="font-mono text-[9px] opacity-80">
                                            {formatShortDate(sale.act_fecha_programada)}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={`text-[8px] px-1 py-0 h-4 uppercase font-bold border-0 ${
                                              isOverdue
                                                ? "bg-rose-600 text-white"
                                                : isPending
                                                ? "bg-amber-600 text-white"
                                                : "bg-emerald-600 text-white"
                                            }`}
                                          >
                                            {isOverdue ? "Vencida" : sale.act_estado}
                                          </Badge>
                                        </>
                                      ) : (
                                        <span className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                                          + Agendar
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 4. Products / Services Preview Block */}
                              <div className="bg-muted/40 border border-border/70 rounded-md p-1.5 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                  <span className="flex items-center gap-1 text-primary font-semibold">
                                    <Package className="size-3" />
                                    {sale.productos_detalle ? `Productos (${sale.productos_detalle.split(",").length})` : "Servicios / Plan"}
                                  </span>
                                  {sale.oportunidad_id ? (
                                    <span className="bg-background px-1.5 py-0.2 rounded border text-[9px] font-medium text-blue-600 dark:text-blue-400">
                                      COT-{String(sale.oportunidad_id).padStart(4, "0")}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="space-y-0.5">
                                  {sale.productos_detalle ? (
                                    sale.productos_detalle.split(",").slice(0, 2).map((p: string, pIdx: number) => (
                                      <div key={pIdx} className="text-[11px] text-foreground truncate flex items-center justify-between">
                                        <span className="truncate">• {p.trim()}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[11px] text-muted-foreground italic">
                                      • Servicio de Telecomunicaciones / Venta Directa
                                    </div>
                                  )}
                                  {sale.productos_detalle && sale.productos_detalle.split(",").length > 2 && (
                                    <div className="text-[9px] text-muted-foreground italic">
                                      +{sale.productos_detalle.split(",").length - 2} ítem(s) adicional(es)...
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 5. Commercial Pricing Grid (Priorizando Base Imponible Sin IGV) */}
                              {(() => {
                                const totalVal = Number(sale.total || 0);
                                const subtotalVal = Number(sale.subtotal) || (totalVal > 0 ? totalVal / 1.18 : 0);
                                const pagadoVal = Number(sale.monto_pagado || 0);

                                return (
                                  <div className="grid grid-cols-2 gap-1.5 bg-muted/20 border border-border/50 rounded-md p-1.5 text-xs font-mono">
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold font-sans">
                                          Valor Venta
                                        </span>
                                        <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-1 rounded font-sans">
                                          Sin IGV
                                        </span>
                                      </div>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                                        S/ {subtotalVal.toFixed(2)}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground block font-sans">
                                        Total: S/ {totalVal.toFixed(2)} (inc. IGV)
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold font-sans">
                                          Amortizado
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-medium text-foreground">
                                        S/ {pagadoVal.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 5.1 Expediente Documental del Cliente */}
                              {(() => {
                                const docs = parseInstallationDocs(sale.documentos_instalacion);
                                const isApproved = (sale.estado_aprobacion || "").toLowerCase() === "aprobada";
                                const isComplete =
                                  (sale.estado_instalacion || "").toLowerCase() === "completada" ||
                                  (sale.estado || "").toLowerCase() === "completada";

                                // Identificar tipos de documentos subidos
                                const hasDni = docs.some(
                                  (d) =>
                                    (d.tipo || "").toLowerCase().includes("dni") ||
                                    (d.tipo || "").toLowerCase().includes("ruc") ||
                                    (d.nombre || "").toLowerCase().includes("dni")
                                );
                                const fotosDocs = docs.filter(
                                  (d) =>
                                    (d.tipo || "").toLowerCase().includes("foto") ||
                                    /\.(jpg|jpeg|png|webp)$/i.test(d.nombre || d.url || "")
                                );
                                const hasFotos = fotosDocs.length > 0;
                                const hasContrato = docs.some(
                                  (d) =>
                                    (d.tipo || "").toLowerCase().includes("contrato") ||
                                    (d.nombre || "").toLowerCase().includes("contrato")
                                );

                                return (
                                  <div className="space-y-1.5 p-2 rounded-md bg-muted/40 border border-border/70 text-xs">
                                    {/* Cabecera del Expediente */}
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                        <FolderArchive className="size-3.5 text-sky-600 shrink-0" />
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                          Expediente:
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-foreground">
                                          {docs.length} Doc(s)
                                        </span>
                                      </div>

                                      {/* Estado de Aprobación */}
                                      {isApproved ? (
                                        <Badge
                                          variant="outline"
                                          className="h-5 px-1.5 text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/50 font-bold shrink-0 flex items-center gap-1"
                                        >
                                          <CheckCircle2 className="size-2.5" />
                                          Aprobado
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="h-5 px-1.5 text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/50 font-semibold shrink-0 flex items-center gap-1"
                                        >
                                          <Clock className="size-2.5" />
                                          Por Aprobar
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Indicadores Visuales de Documentos Clave */}
                                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/50 text-[9px] text-center font-semibold">
                                      <div
                                        className={`py-0.5 px-1 rounded border flex items-center justify-center gap-1 ${
                                          hasDni
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "bg-muted/50 text-muted-foreground border-border/60"
                                        }`}
                                      >
                                        <span>DNI</span>
                                        {hasDni ? <Check className="size-2.5 text-emerald-600" /> : <span className="opacity-40">-</span>}
                                      </div>

                                      <div
                                        className={`py-0.5 px-1 rounded border flex items-center justify-center gap-1 ${
                                          hasFotos
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "bg-muted/50 text-muted-foreground border-border/60"
                                        }`}
                                      >
                                        <span>Fotos</span>
                                        {hasFotos ? (
                                          <span className="font-mono text-[9px] text-emerald-700 dark:text-emerald-400">
                                            ({fotosDocs.length})
                                          </span>
                                        ) : (
                                          <span className="opacity-40">-</span>
                                        )}
                                      </div>

                                      <div
                                        className={`py-0.5 px-1 rounded border flex items-center justify-center gap-1 ${
                                          hasContrato
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "bg-muted/50 text-muted-foreground border-border/60"
                                        }`}
                                      >
                                        <span>Contrato</span>
                                        {hasContrato ? <Check className="size-2.5 text-emerald-600" /> : <span className="opacity-40">-</span>}
                                      </div>
                                    </div>

                                    {/* Miniaturas de Fotos cargadas si existen */}
                                    {fotosDocs.length > 0 && (
                                      <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                                        {fotosDocs.slice(0, 3).map((f) => (
                                          <div
                                            key={f.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenDocsModal(sale);
                                            }}
                                            className="size-7 rounded border border-border/70 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-background"
                                            title={f.nombre}
                                          >
                                            <img
                                              src={f.url}
                                              alt={f.nombre}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = "none";
                                              }}
                                            />
                                          </div>
                                        ))}
                                        {fotosDocs.length > 3 && (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenDocsModal(sale);
                                            }}
                                            className="text-[9px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded border cursor-pointer"
                                          >
                                            +{fotosDocs.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Botón directo de Ver/Subir Expediente con efecto resaltado/tintineo si falta documentación */}
                                    <div className="pt-1 flex items-center justify-between gap-1 border-t border-border/40">
                                      {docs.length === 0 ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-6 px-2.5 text-[10px] w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold gap-1.5 cursor-pointer justify-center shadow-md shadow-amber-500/40 animate-pulse border border-amber-400 transition-all hover:scale-[1.02]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDocsModal(sale);
                                          }}
                                        >
                                          <span className="relative flex h-2 w-2 mr-0.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                          </span>
                                          <UploadCloud className="size-3" />
                                          <span>¡Subir Documentos Requeridos!</span>
                                        </Button>
                                      ) : !isApproved ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-5 px-2 text-[10px] w-full text-amber-800 dark:text-amber-300 border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 font-semibold gap-1.5 cursor-pointer justify-center"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDocsModal(sale);
                                          }}
                                        >
                                          <UploadCloud className="size-2.5" />
                                          <span>Ver Expediente ({docs.length}) • Por Aprobar</span>
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-5 px-2 text-[10px] w-full text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950 font-semibold gap-1.5 cursor-pointer justify-center"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDocsModal(sale);
                                          }}
                                        >
                                          <FolderArchive className="size-2.5" />
                                          <span>Ver Expediente ({docs.length})</span>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 5.2 Rastreador de las 4 Facturas (Permanencia & Cobranza) */}
                              {(() => {
                                const invoices = parse4Invoices(sale.facturas_seguimiento, sale.total, sale.estado_pago);
                                const paidCount = invoices.filter((i) => i.estado === "pagado").length;

                                return (
                                  <div
                                    className="space-y-1 p-1.5 rounded-md bg-muted/20 border border-border/50 text-[10px] cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenInvoicesModal(sale);
                                    }}
                                    title="Clic para gestionar cobro de las primeras 4 facturas"
                                  >
                                    <div className="flex items-center justify-between text-muted-foreground font-semibold text-[9px] uppercase">
                                      <span className="flex items-center gap-1">
                                        <CreditCard className="size-2.5 text-muted-foreground" />
                                        Cobranza (4 Facturas):
                                      </span>
                                      <span className="font-mono text-[9px] text-foreground font-bold">
                                        {paidCount}/4 Pagadas
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-center font-bold">
                                      {invoices.map((inv) => (
                                        <div
                                          key={inv.num}
                                          className={`py-0.5 rounded border text-[9px] flex items-center justify-center gap-0.5 transition-colors ${
                                            inv.estado === "pagado"
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                              : "bg-muted text-muted-foreground border-border/70"
                                          }`}
                                          title={`F${inv.num}: ${inv.estado === "pagado" ? `Pagada (${inv.fecha_pago || "OK"})` : "Pendiente"}`}
                                        >
                                          <span>F{inv.num}</span>
                                          {inv.estado === "pagado" ? (
                                            <CheckCircle2 className="size-2 text-emerald-600" />
                                          ) : (
                                            <Clock className="size-2 opacity-50" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 6. Notes Preview */}
                              {sale.notas && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/40 px-1.5 py-0.5 rounded">
                                  {sale.notas}
                                </p>
                              )}

                              {/* 7. Card Footer: Metadata (Payment Method & Date) + Actions */}
                              <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                                {/* Metadata: Método de Pago y Fecha */}
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <div className="flex items-center gap-1 min-w-0 truncate">
                                    <CreditCard className="size-3 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">Pago:</span>
                                    <span className="font-medium text-foreground capitalize truncate">
                                      {sale.metodo_pago || "Efectivo"}
                                    </span>
                                  </div>
                                  {sale.fecha_venta && (
                                    <span className="font-mono text-[10px] shrink-0 text-muted-foreground">
                                      {sale.fecha_venta.substring(0, 10)}
                                    </span>
                                  )}
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1 font-semibold cursor-pointer"
                                      onClick={() => handleOpenView(sale)}
                                      title="Ver Comprobante / Ticket"
                                    >
                                      <FileText className="size-3" />
                                      Ticket
                                    </Button>
                                    {(() => {
                                      const cardDocs = parseInstallationDocs(sale.documentos_instalacion);
                                      const isMissing = cardDocs.length === 0;
                                      return (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-6 text-[10px] px-2 gap-1 font-semibold cursor-pointer transition-all ${
                                            isMissing
                                              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-400 animate-pulse shadow-sm shadow-amber-500/30"
                                              : "text-sky-700 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950"
                                          }`}
                                          onClick={() => handleOpenDocsModal(sale)}
                                          title="Abrir expediente de documentos y fotos del cliente"
                                        >
                                          <FolderArchive className="size-3" />
                                          {isMissing ? "Subir Docs (!)" : `Expediente (${cardDocs.length})`}
                                        </Button>
                                      );
                                    })()}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 text-purple-700 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 gap-1 font-semibold cursor-pointer"
                                      onClick={() => handleOpenInvoicesModal(sale)}
                                      title="Gestionar las 4 facturas del cliente"
                                    >
                                      <CreditCard className="size-3" />
                                      Facturas (4)
                                    </Button>
                                  </div>

                                  {isPaid ? (
                                    <Badge
                                      variant="outline"
                                      className="h-6 text-[10px] px-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 font-semibold gap-1 shrink-0 flex items-center"
                                    >
                                      <CheckCircle2 className="size-3 text-emerald-600" />
                                      Pagado
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950 gap-1 font-semibold cursor-pointer shrink-0"
                                      onClick={() => handleOpenPay(sale)}
                                      title="Registrar Cobro de 1ra Factura"
                                    >
                                      <CreditCard className="size-3" />
                                      Cobrar
                                    </Button>
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

                {/* Botón rápido para Agregar Nueva Columna al Tablero */}
                <div className="shrink-0 w-80 pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenCreateCol}
                    className="w-full h-12 border-2 border-dashed border-border hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-600 transition-all cursor-pointer shadow-xs"
                    title="Crear una nueva columna para el tablero"
                  >
                    <Plus className="size-4 text-emerald-600" />
                    Nueva Etapa
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA LISTA / TABLA */
            <Card className="bg-card shadow-xs w-full max-w-full min-w-0 overflow-x-auto">
              {/* MOBILE STACKED CARDS VIEW (< md) */}
              <div className="block md:hidden divide-y divide-border/60">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs">Cargando ventas...</p>
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-medium text-xs text-foreground">No se encontraron ventas</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => {
                    const isPaid = (sale.estado_pago || "").toLowerCase() === "pagado";
                    const isCompleted =
                      (sale.estado || "").toLowerCase() === "completada" ||
                      (sale.estado_instalacion || "").toLowerCase() === "completada";

                    return (
                      <div key={sale.id} className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-primary">
                                {sale.numero_venta || `V-${String(sale.id).padStart(5, "0")}`}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase font-normal px-1.5 py-0">
                                {sale.tipo_comprobante?.replace("_", " ") || "Nota Venta"}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                              {sale.cliente_nombre_completo || "Cliente General"}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 block">
                              S/ {Number(sale.total || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {sale.fecha_venta ? String(sale.fecha_venta).substring(0, 10) : ""}
                            </span>
                          </div>
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <Badge
                            variant="outline"
                            className={`px-2 py-0.5 font-medium ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {isPaid ? "Pagado" : "Pendiente"}
                          </Badge>

                          {isCompleted ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 border-0">
                              Instalada
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              {sale.estado || "En Proceso"}
                            </Badge>
                          )}

                          {sale.vendedor_nombre && (
                            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
                              {sale.vendedor_nombre}
                            </span>
                          )}
                        </div>

                        {/* Quick Mobile Action Buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 px-2.5 min-h-[36px]"
                            onClick={() => handleOpenView(sale)}
                          >
                            <Eye className="size-3.5 text-blue-600" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 px-2.5 min-h-[36px]"
                            onClick={() => handleOpenDocsModal(sale)}
                          >
                            <FolderArchive className="size-3.5 text-sky-600" />
                            Docs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 px-2.5 min-h-[36px]"
                            onClick={() => handleOpenInvoicesModal(sale)}
                          >
                            <FileText className="size-3.5 text-amber-600" />
                            Facturas
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
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="font-semibold">N° Venta / Doc.</TableHead>
                      <TableHead className="font-semibold">Fecha Emisión</TableHead>
                      <TableHead className="font-semibold">Cliente / RUC</TableHead>
                      <TableHead className="font-semibold">Origen</TableHead>
                      <TableHead className="font-semibold">Asesor Comercial</TableHead>
                      <TableHead className="font-semibold">Productos / Servicios</TableHead>
                      <TableHead className="font-semibold text-right text-emerald-700 dark:text-emerald-400">Valor Venta (Sin IGV)</TableHead>
                      <TableHead className="font-semibold text-right">IGV (18%)</TableHead>
                      <TableHead className="font-semibold text-right">Total Facturado</TableHead>
                      <TableHead className="font-semibold text-center">Estado Pago</TableHead>
                      <TableHead className="font-semibold text-center">Operativo</TableHead>
                      <TableHead className="font-semibold text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                          Cargando historial de ventas...
                        </TableCell>
                      </TableRow>
                    ) : filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                          <ShoppingCart className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="font-medium text-foreground">No se encontraron ventas registradas</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Prueba ajustando los filtros del panel izquierdo.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSales.map((sale) => {
                        const isPaid = (sale.estado_pago || "").toLowerCase() === "pagado";
                        const isCompleted =
                          (sale.estado || "").toLowerCase() === "completada" ||
                          (sale.estado_instalacion || "").toLowerCase() === "completada";
                        const isCancelled = (sale.estado || "").toLowerCase() === "cancelada";
                        const isLocked = isCompleted || isCancelled;
                        const subtotalVal = Number(sale.subtotal) || (Number(sale.total) > 0 ? Number(sale.total) / 1.18 : 0);
                        const igvVal = Number(sale.igv) || (Number(sale.total) - subtotalVal);

                        return (
                          <TableRow key={sale.id} className="hover:bg-muted/40 transition-colors text-xs">
                            <TableCell className="font-mono font-bold text-primary">
                              <div className="flex flex-col">
                                <span>{sale.numero_venta || `V-${String(sale.id).padStart(5, "0")}`}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-sans font-medium">
                                  {sale.tipo_comprobante?.replace("_", " ") || "Nota Venta"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-muted-foreground font-mono">
                              {sale.fecha_venta ? String(sale.fecha_venta).replace("T", " ").substring(0, 16) : "-"}
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground max-w-[200px] truncate" title={sale.cliente_nombre_completo || "Cliente General"}>
                                  {sale.cliente_nombre_completo || "Cliente General"}
                                </span>
                                {sale.numero_documento && (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    Doc: {sale.numero_documento}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              {sale.oportunidad_id ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200">
                                  COT-{String(sale.oportunidad_id).padStart(4, "0")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                  Venta Directa
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-xs">
                              {sale.vendedor_nombre ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-foreground flex items-center gap-1">
                                    <User className="size-3 text-indigo-600 shrink-0" />
                                    {sale.vendedor_nombre}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    {sale.vendedor_perfil && (
                                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{sale.vendedor_perfil}</span>
                                    )}
                                    {sale.equipo_nombre && (
                                      <span>• {sale.equipo_nombre}</span>
                                    )}
                                  </div>
                                  {sale.supervisor_nombre && sale.supervisor_nombre !== "Sin Supervisor" && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                      Sup: {sale.supervisor_nombre}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                              )}
                            </TableCell>

                            <TableCell className="max-w-[240px] truncate text-muted-foreground" title={sale.productos_detalle || "Venta regular"}>
                              {sale.productos_detalle || "Venta regular"}
                            </TableCell>

                            <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              S/ {subtotalVal.toFixed(2)}
                            </TableCell>

                            <TableCell className="text-right font-mono text-muted-foreground">
                              S/ {igvVal.toFixed(2)}
                            </TableCell>

                            <TableCell className="text-right font-mono text-muted-foreground">
                              S/ {Number(sale.total || 0).toFixed(2)}
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                                }
                              >
                                {(sale.estado_pago || "Pendiente").toUpperCase()}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                              {isCompleted ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] flex items-center justify-center gap-1 px-2 py-0.5 mx-auto w-fit shadow-xs font-bold border-0">
                                  <Lock className="size-2.5" />
                                  INSTALADA (BLOQUEADA)
                                </Badge>
                              ) : isCancelled ? (
                                <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] flex items-center justify-center gap-1 px-2 py-0.5 mx-auto w-fit shadow-xs font-bold border-0">
                                  <Lock className="size-2.5" />
                                  ANULADA (BLOQUEADA)
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  {(sale.estado || "Pendiente").toUpperCase()}
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs w-48">
                                  <DropdownMenuLabel>Acciones de Venta</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedVentaForActividad(sale);
                                      setActividadModalOpen(true);
                                    }}
                                    className="gap-2 cursor-pointer text-blue-700 font-medium"
                                  >
                                    <CalendarClock className="size-3.5 text-blue-600" />
                                    Programar Actividad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenView(sale)} className="gap-2 cursor-pointer">
                                    <Eye className="size-3.5 text-blue-600" />
                                    Ver Comprobante
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenDocsModal(sale)} className="gap-2 text-sky-700 cursor-pointer">
                                    <FolderArchive className="size-3.5 text-sky-600" />
                                    Expediente Documental
                                  </DropdownMenuItem>
                                  {!isPaid && (
                                    <DropdownMenuItem onClick={() => handleOpenPay(sale)} className="gap-2 cursor-pointer">
                                      <CreditCard className="size-3.5 text-emerald-600" />
                                      Registrar Cobro
                                    </DropdownMenuItem>
                                  )}
                                  {isLocked ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setUnlockSale(sale)} className="gap-2 text-amber-600 cursor-pointer font-medium">
                                        <Unlock className="size-3.5" />
                                        Desbloquear Venta
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleOpenCancel(sale)} className="gap-2 text-destructive cursor-pointer">
                                        <Ban className="size-3.5" />
                                        Anular Venta
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* =============================================================== */}
      {/* MODAL 1: DETALLE DE COMPROBANTE / TICKET IMPRIMIBLE */}
      {/* =============================================================== */}
      <Dialog open={!!viewSale} onOpenChange={(open) => !open && setViewSale(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {viewSale && (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Comprobante de Venta</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {viewSale.tipo_comprobante?.toUpperCase().replace("_", " ") || "NOTA DE VENTA"}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Documento comercial generado en NextLead CRM.
                </DialogDescription>
              </DialogHeader>

              <div id="printable-ticket" className="border rounded-lg p-5 bg-card text-foreground flex flex-col gap-4 text-xs">
                <div className="text-center border-b pb-3">
                  <h3 className="font-extrabold text-base tracking-wide text-foreground">NEXTLEAD S.A.C.</h3>
                  <p className="text-[11px] text-muted-foreground">RUC: 20601245781 | Telecomunicaciones & CRM B2B</p>
                  <p className="text-[11px] text-muted-foreground">Av. Juan de Arona 151, San Isidro, Lima - Perú</p>
                  <div className="mt-2 inline-block px-3 py-1 bg-muted rounded font-mono font-bold text-sm text-primary">
                    {viewSale.numero_venta}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b pb-3">
                  <div>
                    <span className="text-muted-foreground font-medium">Cliente:</span>
                    <p className="font-semibold text-foreground">{viewSale.cliente_nombre_completo || "Cliente General"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">RUC / DNI:</span>
                    <p className="font-mono font-semibold">{viewSale.numero_documento || "Sin Documento"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Fecha Emisión:</span>
                    <p className="font-mono">{viewSale.fecha_venta ? String(viewSale.fecha_venta).replace("T", " ").substring(0, 16) : "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Método de Pago:</span>
                    <p className="font-semibold">{viewSale.metodo_pago || "Efectivo"}</p>
                  </div>
                  {viewSale.direccion_entrega && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Dirección / Sede:</span>
                      <p>{viewSale.direccion_entrega}</p>
                    </div>
                  )}
                  {viewSale.oportunidad_id && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Origen Comercial:</span>
                      <p className="text-primary font-medium">
                        Cotización COT-{String(viewSale.oportunidad_id).padStart(4, "0")}
                        {viewSale.oportunidad_titulo ? ` (${viewSale.oportunidad_titulo})` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" />
                    Detalle de Ítems
                  </h4>
                  {viewSale.items && viewSale.items.length > 0 ? (
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 text-[11px]">
                            <TableHead className="h-7">Producto</TableHead>
                            <TableHead className="h-7 text-center">Cant.</TableHead>
                            <TableHead className="h-7 text-right">P. Unit</TableHead>
                            <TableHead className="h-7 text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewSale.items.map((it) => (
                            <TableRow key={it.id} className="text-[11px]">
                              <TableCell className="font-medium">{it.producto_nombre || "Producto"}</TableCell>
                              <TableCell className="text-center font-mono">{it.cantidad}</TableCell>
                              <TableCell className="text-right font-mono">S/ {Number(it.precio_unitario || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-bold">S/ {Number(it.subtotal || 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/30 rounded border text-muted-foreground">
                      {viewSale.productos_detalle || "Venta regular de catálogo"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 border-t pt-3 ml-auto w-64 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>S/ {(Number(viewSale.subtotal) || (Number(viewSale.total) / 1.18)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGV (18%):</span>
                    <span>S/ {(Number(viewSale.igv) || (Number(viewSale.total) - Number(viewSale.total) / 1.18)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-foreground border-t pt-1">
                    <span>Total Facturado:</span>
                    <span className="text-primary">S/ {Number(viewSale.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold mt-1">
                    <span>Monto Amortizado:</span>
                    <span>S/ {Number(viewSale.monto_pagado || 0).toFixed(2)}</span>
                  </div>
                </div>

                {viewSale.notas && (
                  <div className="p-2.5 bg-muted/40 rounded border text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Observaciones:</strong> {viewSale.notas}
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                  <Printer className="size-4" />
                  Imprimir Comprobante
                </Button>
                <Button variant="default" size="sm" onClick={() => setViewSale(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 2: REGISTRAR / VALIDAR COBRO */}
      {/* =============================================================== */}
      <Dialog open={!!paySale} onOpenChange={(open) => !open && setPaySale(null)}>
        <DialogContent className="max-w-md">
          {paySale && (
            <form onSubmit={handleSavePay} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="size-5 text-emerald-600" />
                  Registrar Pago de Primera Factura / Cobro
                </DialogTitle>
                <DialogDescription>
                  Confirma el cobro de la 1ra factura o cuota inicial para la venta <strong className="font-mono text-primary">{paySale.numero_venta}</strong> ({paySale.cliente_nombre_completo || "Cliente"}).
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center">
                  <span className="text-muted-foreground">Total de la Venta:</span>
                  <span className="text-base font-bold text-primary font-mono">
                    S/ {Number(paySale.total || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="metodo_pago" className="text-xs font-semibold">
                    Método de Cobro
                  </Label>
                  <select
                    id="metodo_pago"
                    className="h-9 px-3 text-xs rounded-md border bg-background"
                    value={payForm.metodo_pago}
                    onChange={(e) => setPayForm({ ...payForm, metodo_pago: e.target.value })}
                  >
                    <option value="Transferencia">Transferencia Bancaria (BCP / BBVA / Interbank)</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="estado_pago" className="text-xs font-semibold">
                    Estado del Cobro
                  </Label>
                  <select
                    id="estado_pago"
                    className="h-9 px-3 text-xs rounded-md border bg-background"
                    value={payForm.estado_pago}
                    onChange={(e) => {
                      const est = e.target.value;
                      setPayForm({
                        ...payForm,
                        estado_pago: est,
                        monto_pagado: est === "pagado" ? Number(paySale.total) : payForm.monto_pagado,
                      });
                    }}
                  >
                    <option value="pagado">Pago Completo (100% Pagado)</option>
                    <option value="parcial">Pago Parcial (Abono)</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto_pagado" className="text-xs font-semibold">
                    Monto Cobrado (PEN)
                  </Label>
                  <Input
                    id="monto_pagado"
                    type="number"
                    step="0.01"
                    className="h-9 font-mono"
                    value={payForm.monto_pagado}
                    onChange={(e) => setPayForm({ ...payForm, monto_pagado: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPaySale(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPay}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                >
                  {savingPay ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Confirmar Cobro
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 3: ANULAR VENTA */}
      {/* =============================================================== */}
      <Dialog open={!!cancelSale} onOpenChange={(open) => !open && setCancelSale(null)}>
        <DialogContent className="sm:max-w-xl w-full">
          {cancelSale && (
            <form onSubmit={handleSaveCancel} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  Anular y Bloquear Venta
                </DialogTitle>
                <DialogDescription>
                  Esta acción anulará la venta {cancelSale.numero_venta}, quedará <strong>BLOQUEADA</strong> y no computará para comisiones ni facturación.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg space-y-1">
                  <div>
                    ¿Estás seguro de anular la venta de <strong>{cancelSale.cliente_nombre_completo || "Cliente"}</strong> por el total de <strong>S/ {Number(cancelSale.total || 0).toFixed(2)}</strong>?
                  </div>
                  <div className="text-[11px] font-semibold text-destructive/80 flex items-center gap-1 pt-1 border-t border-destructive/20">
                    <Lock className="size-3" /> La venta quedará fijada en la columna ANULADA y bloqueada para modificaciones.
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="motivo_anulacion" className="text-xs font-semibold">
                    Motivo de Anulación <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="motivo_anulacion"
                    placeholder="Ej: Pedido cancelado por el cliente, falta de cobertura técnica, error en comprobante o cambio de plan."
                    rows={3}
                    className="text-xs"
                    value={cancelMotivo}
                    onChange={(e) => setCancelMotivo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCancelSale(null)} disabled={cancelling}>
                  Regresar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={cancelling || !cancelMotivo.trim()}
                  className="gap-1.5 font-bold"
                >
                  {cancelling ? <RefreshCw className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  Confirmar Anulación y Bloquear
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 3.1: CONFIRMAR CIERRE E INSTALACIÓN DE LA VENTA */}
      {/* =============================================================== */}
      <Dialog open={!!installConfirmSale} onOpenChange={(open) => !open && setInstallConfirmSale(null)}>
        <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {installConfirmSale && (
            <div className="flex flex-col gap-5 py-1">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                      Confirmar Cierre e Instalación Técnica
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Estás a punto de certificar la instalación oficial de la venta <strong className="text-foreground">{installConfirmSale.numero_venta}</strong>.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Grid Resumen de la Venta (Amplio, claro y legible) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</span>
                  <p className="font-bold text-sm text-foreground break-words">
                    {installConfirmSale.cliente_nombre_completo || "Cliente Directo"}
                  </p>
                  {installConfirmSale.numero_documento && (
                    <span className="text-[11px] text-muted-foreground block font-mono">
                      Doc: {installConfirmSale.numero_documento}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Asesor Comercial</span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <User className="size-4 text-indigo-600 shrink-0" />
                    <span>{installConfirmSale.vendedor_nombre || "Sin Asesor Asignado"}</span>
                  </div>
                  {installConfirmSale.vendedor_perfil && (
                    <span className="text-[11px] text-muted-foreground block">
                      Perfil: {installConfirmSale.vendedor_perfil}
                    </span>
                  )}
                </div>

                <div className="space-y-1 border-t md:border-t-0 md:border-l border-emerald-500/20 pt-2.5 md:pt-0 md:pl-3.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">N° de Venta</span>
                  <p className="font-mono font-bold text-sm text-foreground">
                    {installConfirmSale.numero_venta}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    Tipo: {installConfirmSale.tipo_comprobante || "Venta Directa"}
                  </span>
                </div>

                <div className="space-y-1 border-t md:border-t-0 border-emerald-500/20 pt-2.5 md:pt-0 md:pl-3.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Monto Facturado</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                      S/ {Number(installConfirmSale.total || 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      (Neto sin IGV: S/ {(Number(installConfirmSale.total || 0) / 1.18).toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Consecuencias y Efectos */}
              <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-xl space-y-2.5 border border-border">
                <div className="font-bold text-xs text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                  Efectos contables y operativos al pasar a INSTALADA:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px]">
                      1. Alta Efectiva
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Se computa en <strong className="text-foreground">Rentabilidad Actual</strong> y activa las comisiones del Dealer y del Asesor.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px]">
                      2. Fecha Certificada
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Se registra la fecha y hora exacta del cierre técnico de instalación para auditoría.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px]">
                      3. Bloqueo de Tarjeta
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Quedará protegida como <strong className="text-foreground">🔒 INSTALADA</strong> y no podrá ser movida accidentalmente.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInstallConfirmSale(null)}
                  className="cursor-pointer"
                >
                  Cancelar (No Mover)
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-5 cursor-pointer shadow-sm"
                  onClick={() => {
                    const sale = installConfirmSale;
                    setInstallConfirmSale(null);
                    executeMoveStage(sale.id, "completada");
                  }}
                >
                  <Lock className="size-4" />
                  Confirmar Instalación y Bloquear
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 3.2: DESBLOQUEAR VENTA CERRADA / ANULADA */}
      {/* =============================================================== */}
      <Dialog open={!!unlockSale} onOpenChange={(open) => !open && setUnlockSale(null)}>
        <DialogContent className="sm:max-w-lg w-full">
          {unlockSale && (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <Unlock className="size-5 text-amber-600" />
                  ¿Desbloquear Venta?
                </DialogTitle>
                <DialogDescription>
                  Esta acción devolverá la venta <strong>{unlockSale.numero_venta}</strong> a la etapa de <strong>Programada / Instalación</strong> en trámite técnico.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1.5 text-muted-foreground">
                <p>
                  Si la venta estaba como <strong className="text-foreground">INSTALADA</strong>, al desbloquearla dejará de computar provisionalmente como Alta en Rentabilidad hasta que se vuelva a confirmar su instalación.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setUnlockSale(null)} disabled={unlocking}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-bold"
                  disabled={unlocking}
                  onClick={() => handleExecuteUnlock(unlockSale.id)}
                >
                  {unlocking ? <RefreshCw className="size-4 animate-spin" /> : <Unlock className="size-4" />}
                  Desbloquear y Trasladar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 4: GESTIONAR COLUMNAS / ETAPAS DE VENTAS */}
      {/* =============================================================== */}
      <Dialog open={showColModal} onOpenChange={setShowColModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="size-5 text-emerald-600" />
              Gestionar Columnas del Tablero
            </DialogTitle>
            <DialogDescription>
              Reordena las etapas de ventas hacia los costados o personaliza su nombre y color visual.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Lista ordenada de columnas con botones Arriba / Abajo, Editar y Eliminar */}
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border rounded-lg p-2 bg-muted/20">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Etapas del Tablero ({stages.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium cursor-pointer"
                  onClick={handleOpenCreateCol}
                >
                  <Plus className="size-3" />
                  Nueva Columna
                </Button>
              </div>

              {stages.map((st, idx) => (
                <div
                  key={st.id}
                  className={`flex items-center justify-between p-2 rounded-md border bg-card text-xs transition-colors ${
                    colForm.id === st.id ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {/* Botones de mover orden */}
                    <div className="flex items-center gap-0.5 bg-muted/60 rounded border p-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        disabled={idx === 0}
                        onClick={() => handleMoveColumnInModal(idx, "up")}
                        title="Mover a la izquierda / arriba"
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        disabled={idx === stages.length - 1}
                        onClick={() => handleMoveColumnInModal(idx, "down")}
                        title="Mover a la derecha / abajo"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </div>

                    {/* Color dot */}
                    <span
                      className="size-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: st.color }}
                    />

                    <span className="font-semibold truncate" title={st.label}>{st.label}</span>
                    {st.es_ganada && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px] px-1.5 py-0 shrink-0 border border-emerald-500/30 font-bold">
                        Ganada
                      </Badge>
                    )}
                    {st.es_perdida && (
                      <Badge className="bg-destructive/15 text-destructive text-[9px] px-1.5 py-0 shrink-0 border border-destructive/30 font-bold">
                        Perdida
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        setColForm({
                          id: st.id,
                          label: st.label,
                          color: st.color,
                          es_ganada: !!st.es_ganada,
                          es_perdida: !!st.es_perdida,
                        });
                      }}
                      title="Editar esta columna"
                    >
                      <Edit className="size-3" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => handleDeleteColumn(st.id)}
                      title="Eliminar columna del tablero"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario de Creación o Edición de Columna */}
            <form onSubmit={handleSaveColumn} className="flex flex-col gap-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Palette className="size-3.5 text-emerald-600" />
                  {colForm.id ? (
                    <span>Editar Etapa: <strong className="text-emerald-700">{colForm.label || colForm.id}</strong></span>
                  ) : (
                    <span>Crear Nueva Etapa</span>
                  )}
                </h4>

                <div className="flex items-center gap-2">
                  {colForm.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700"
                      onClick={handleOpenCreateCol}
                    >
                      <Plus className="size-3 mr-0.5" />
                      Crear nueva
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={handleResetStages}
                    title="Restablecer nombres y orden por defecto"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    Restablecer
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="col_label" className="text-xs font-medium">
                  Nombre de la Etapa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="col_label"
                  placeholder="Ej: EN REPARTO, EN PREPARACIÓN, FACTURADO..."
                  value={colForm.label}
                  onChange={(e) => setColForm({ ...colForm, label: e.target.value })}
                  className="h-8 text-xs font-medium uppercase"
                  required
                />
              </div>

              {/* Checkboxes: ¿Es Ganada? / ¿Es Perdida? */}
              <div className="flex items-center gap-4 text-xs p-2.5 rounded-lg bg-muted/40 border">
                <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
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
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 size-4"
                  />
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    ¿Es Etapa Ganada / Finalizada?
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
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
                    className="rounded border-gray-300 text-destructive focus:ring-destructive size-4"
                  />
                  <span className="flex items-center gap-1 text-destructive">
                    <Ban className="size-3.5" />
                    ¿Es Etapa Perdida / Anulada?
                  </span>
                </label>
              </div>

              {/* Selector de Color */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Color Distintivo</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.color}
                      type="button"
                      onClick={() => setColForm({ ...colForm, color: pc.color })}
                      className={`size-6 rounded-full border-2 transition-transform cursor-pointer ${
                        colForm.color.toLowerCase() === pc.color.toLowerCase()
                          ? "scale-115 border-foreground shadow-md ring-2 ring-emerald-500/40"
                          : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: pc.color }}
                      title={pc.name}
                    />
                  ))}
                  <Input
                    type="color"
                    value={colForm.color}
                    onChange={(e) => setColForm({ ...colForm, color: e.target.value })}
                    className="size-7 p-0.5 rounded cursor-pointer border ml-1"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColModal(false)}
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium cursor-pointer"
                >
                  <Check className="size-3.5" />
                  {colForm.id ? "Guardar Cambios" : "Crear y Añadir al Tablero"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL 5: EXPEDIENTE Y DOCUMENTACIÓN DEL CLIENTE (AMPLIADO) */}
      {/* =============================================================== */}
      <Dialog open={!!docsSale} onOpenChange={(open) => !open && setDocsSale(null)}>
        <DialogContent className="w-[96vw] sm:max-w-5xl md:max-w-6xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          {docsSale && (
            <div className="flex flex-col gap-5">
              <DialogHeader className="pb-2 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                    <FolderArchive className="size-6 text-sky-600 shrink-0" />
                    <span>Expediente Documental de la Venta</span>
                    <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-primary/40 text-primary bg-primary/5">
                      {docsSale.numero_venta}
                    </Badge>
                  </DialogTitle>
                  <span className="text-xs text-muted-foreground font-mono">
                    ID #{docsSale.id}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Centro de revisión, carga y validación de expedientes del cliente (DNI/RUC, fotos de predio, contratos y comprobantes).
                </DialogDescription>
              </DialogHeader>

              {/* Ficha Resumen del Cliente en 4 columnas */}
              <div className="bg-muted/40 border rounded-xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">
                    Cliente / Razón Social
                  </span>
                  <span className="font-bold text-foreground text-sm block truncate" title={docsSale.cliente_nombre_completo || "Cliente General"}>
                    {docsSale.cliente_nombre_completo || "Cliente General"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">
                    N° Documento (DNI/RUC)
                  </span>
                  <span className="font-mono font-semibold text-foreground text-xs block">
                    {docsSale.numero_documento || "No registrado"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">
                    Dirección del Cliente
                  </span>
                  <span className="text-foreground flex items-center gap-1 text-xs truncate" title={docsSale.direccion_entrega || "Recojo en sede"}>
                    <MapPin className="size-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{docsSale.direccion_entrega || "Recojo en sede / Directo"}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">
                    Teléfono de Contacto
                  </span>
                  <span className="text-muted-foreground font-mono font-medium text-xs block">
                    {docsSale.telefono_principal ? `📞 ${docsSale.telefono_principal}` : "Sin teléfono registrado"}
                  </span>
                </div>
              </div>

              {/* Banner de Estado de Aprobación */}
              {(docsSale.estado_aprobacion || "").toLowerCase() === "aprobada" ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200 block text-sm font-bold">
                        Expediente Aprobado y Validado
                      </strong>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        Validado por: <strong>{docsSale.aprobado_por || "Administración"}</strong>
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 shadow-sm">
                    ✓ APROBADO
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="size-6 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-200 block text-sm font-bold">
                        Pendiente de Aprobación Documental
                      </strong>
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        Revisa los archivos subidos (DNI, fotos, contratos) y haz clic en aprobar cuando el expediente esté conforme.
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApproveDocs(docsSale)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 px-4 py-2 shadow-sm cursor-pointer shrink-0"
                  >
                    <CheckCheck className="size-4" />
                    <span>Aprobar Expediente Ahora</span>
                  </Button>
                </div>
              )}

              {/* Zona de Carga de Archivos */}
              <div className="p-4 bg-muted/20 border border-dashed rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-500/10 text-sky-600 rounded-lg">
                      <UploadCloud className="size-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Adjuntar Nuevo Archivo al Expediente
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Admite imágenes JPG, PNG, WEBP y documentos PDF o Word.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      className="h-9 px-3 rounded-lg border bg-background text-xs font-medium flex-1 sm:flex-initial"
                      value={docTipoSelect}
                      onChange={(e) => setDocTipoSelect(e.target.value)}
                    >
                      <option value="DNI / RUC del Titular">📄 DNI / RUC del Titular</option>
                      <option value="Foto de Fachada / Predio">📷 Foto de Fachada / Predio</option>
                      <option value="Foto de Ubicación / Acceso">📷 Foto de Ubicación / Acceso</option>
                      <option value="Contrato Firmado">📝 Contrato Firmado</option>
                      <option value="Recibo de Servicios / Croquis">🧾 Recibo de Servicios / Croquis</option>
                      <option value="Acta de Conformidad">✅ Acta de Conformidad</option>
                      <option value="Otro Documento">📎 Otro Documento</option>
                    </select>

                    <Label
                      htmlFor="upload_doc_input"
                      className={`h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm shrink-0 ${
                        uploadingDoc ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {uploadingDoc ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      <span>{uploadingDoc ? "Subiendo..." : "Seleccionar Archivo"}</span>
                    </Label>
                    <input
                      id="upload_doc_input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      className="hidden"
                      disabled={uploadingDoc}
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Lista y Galería de Documentos Adjuntos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      Documentos y Fotos Adjuntas
                    </span>
                    <Badge variant="outline" className="text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300">
                      {docsList.length} archivo(s)
                    </Badge>
                  </div>
                  {docsList.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Haz clic en "Ver" para inspeccionar o descargar en tamaño completo.
                    </span>
                  )}
                </div>

                {docsList.length === 0 ? (
                  <div className="py-12 border border-dashed rounded-xl text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2 bg-muted/10">
                    <FolderArchive className="size-10 text-muted-foreground/30" />
                    <strong className="text-sm text-foreground/80">No hay documentos en este expediente aún</strong>
                    <span className="text-xs text-muted-foreground max-w-sm">
                      Sube las fotos del predio, DNI del titular o contrato firmado usando el selector de arriba.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[520px] overflow-y-auto pr-1">
                    {docsList.map((doc) => {
                      const isImg =
                        /\.(jpg|jpeg|png|webp)$/i.test(doc.nombre || doc.url || "") ||
                        (doc.tipo || "").toLowerCase().includes("foto");

                      if (isImg) {
                        return (
                          <div
                            key={doc.id}
                            className="flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all group border-border/80"
                          >
                            <div className="relative h-44 w-full bg-muted/50 overflow-hidden flex items-center justify-center">
                              <img
                                src={doc.url}
                                alt={doc.nombre}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <Badge
                                variant="outline"
                                className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-background/90 backdrop-blur font-semibold shadow-sm border"
                              >
                                {doc.tipo}
                              </Badge>
                            </div>

                            <div className="p-3 flex items-center justify-between gap-2 border-t bg-card">
                              <div className="flex flex-col truncate min-w-0">
                                <span className="font-semibold text-foreground truncate text-xs" title={doc.nombre}>
                                  {doc.nombre}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {doc.size ? `${(doc.size / 1024).toFixed(0)} KB • ` : ""}
                                  {doc.fecha.substring(0, 10)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                                  asChild
                                >
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="size-3" />
                                    Ver
                                  </a>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                  onClick={() => handleRemoveDoc(doc.id)}
                                  title="Quitar archivo"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={doc.id}
                          className="flex flex-col justify-between p-3.5 rounded-xl border bg-card hover:shadow-md transition-all gap-3 border-border/80"
                        >
                          <div className="flex items-start gap-3">
                            <div className="size-12 rounded-lg border flex items-center justify-center shrink-0 bg-sky-50 dark:bg-sky-950/40 text-sky-600">
                              <FileText className="size-6" />
                            </div>
                            <div className="flex flex-col truncate min-w-0 flex-1">
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px] px-2 py-0.5 bg-muted font-semibold mb-1"
                              >
                                {doc.tipo}
                              </Badge>
                              <span className="font-semibold text-foreground truncate text-xs" title={doc.nombre}>
                                {doc.nombre}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {doc.size ? `${(doc.size / 1024).toFixed(0)} KB • ` : ""}
                                {doc.fecha.substring(0, 10)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                              asChild
                            >
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="size-3" />
                                Abrir Archivo
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => handleRemoveDoc(doc.id)}
                              title="Quitar archivo"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Observaciones Generales */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="notas_docs" className="text-xs font-bold text-foreground">
                  Observaciones Generales del Expediente
                </Label>
                <Textarea
                  id="notas_docs"
                  placeholder="Detalles sobre las condiciones del cliente, validaciones de identidad, acuerdos particulares o notas internas..."
                  rows={2}
                  className="text-xs resize-none"
                  value={notasInstalacion}
                  onChange={(e) => setNotasInstalacion(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 pt-3 border-t flex-col sm:flex-row items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDocsSale(null)}
                  disabled={savingDocs}
                >
                  Cerrar
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingDocs || uploadingDoc}
                    onClick={handleSaveDocs}
                    className="bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-bold px-4 py-2 cursor-pointer shadow-sm"
                  >
                    {savingDocs ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Guardar Expediente
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Seguimiento de las 4 Facturas */}
      <Dialog open={!!invoicesSale} onOpenChange={(open) => !open && setInvoicesSale(null)}>
        <DialogContent className="max-w-xl text-xs">
          {invoicesSale && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CreditCard className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      Seguimiento de Primeras 4 Facturas
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        ({invoicesSale.numero_venta})
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Control de cobranza y fidelización de los primeros 4 meses para{" "}
                      <strong>{invoicesSale.cliente_nombre_completo || "Cliente"}</strong>.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Grid de las 4 Facturas */}
              <div className="space-y-2.5">
                {invoicesList.map((inv) => {
                  const isPaid = inv.estado === "pagado";
                  return (
                    <div
                      key={inv.num}
                      className={`p-3 rounded-lg border transition-all ${
                        isPaid
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-muted/30 border-border/70"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isPaid
                                ? "bg-emerald-500 text-white"
                                : "bg-muted-foreground/20 text-muted-foreground"
                            }`}
                          >
                            {inv.num}
                          </span>
                          <div>
                            <span className="font-bold text-foreground text-xs block">
                              {inv.label || `Factura ${inv.num}`}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Monto: S/ {Number(inv.monto || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Badge
                            className={`text-[10px] px-2 py-0.5 font-bold cursor-pointer transition-colors ${
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            }`}
                            onClick={() => handleToggleInvoice(inv.num)}
                            title="Haz clic para alternar entre Pagada y Pendiente"
                          >
                            {isPaid ? "● PAGADA" : "○ PENDIENTE"}
                          </Badge>

                          <Button
                            type="button"
                            variant={isPaid ? "outline" : "default"}
                            size="sm"
                            className={`h-6 text-[10px] px-2.5 font-semibold cursor-pointer ${
                              isPaid
                                ? "text-muted-foreground hover:text-foreground"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                            onClick={() => handleToggleInvoice(inv.num)}
                          >
                            {isPaid ? "Marcar Pendiente" : "Marcar Pagada"}
                          </Button>
                        </div>
                      </div>

                      {/* Inputs de Fecha y Comprobante si está pagada */}
                      {isPaid && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Fecha de Pago</Label>
                            <Input
                              type="date"
                              value={inv.fecha_pago || ""}
                              onChange={(e) => handleUpdateInvoiceField(inv.num, "fecha_pago", e.target.value)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">N° Comprobante / Operación</Label>
                            <Input
                              placeholder="Ej: F001-00234 o Op. 987654"
                              value={inv.comprobante || ""}
                              onChange={(e) => handleUpdateInvoiceField(inv.num, "comprobante", e.target.value)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicesSale(null)}
                  disabled={savingInvoices}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveInvoices}
                  disabled={savingInvoices}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                >
                  {savingInvoices ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCheck className="size-4" />}
                  Guardar Facturas
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Programar Actividad vinculado a la Venta */}
      {selectedVentaForActividad && (() => {
        const isEmpresa =
          (selectedVentaForActividad as any).contacto_tipo_persona?.toUpperCase() === "EMPRESA" ||
          Boolean(selectedVentaForActividad.cliente_nombre_completo?.match(/S\.A|S\.R\.L|E\.I\.R\.L|SAC|SRL|EIRL|COMPANY|CORP/i));

        const empId = isEmpresa
          ? (selectedVentaForActividad.contacto_id || (selectedVentaForActividad as any).empresa_id || null)
          : ((selectedVentaForActividad as any).empresa_id || null);

        const empNombre = isEmpresa
          ? (selectedVentaForActividad.cliente_nombre_completo || undefined)
          : undefined;

        const conId = isEmpresa
          ? null
          : (selectedVentaForActividad.contacto_id || null);

        const conNombre = isEmpresa
          ? undefined
          : (selectedVentaForActividad.cliente_nombre_completo || undefined);

        return (
          <ModalCrearActividad
            open={actividadModalOpen}
            onOpenChange={setActividadModalOpen}
            onSuccess={() => {
              toast.success(`Actividad programada para la venta #${selectedVentaForActividad.numero_venta || selectedVentaForActividad.id}`);
              fetchSales();
            }}
            initialData={{
              venta_id: selectedVentaForActividad.id,
              venta_numero: selectedVentaForActividad.numero_venta || `#${selectedVentaForActividad.id}`,
              empresa_id: empId,
              empresa_nombre: empNombre,
              contacto_id: conId,
              contacto_nombre: conNombre,
              asunto: `Instalación / Seguimiento: Venta #${selectedVentaForActividad.numero_venta || selectedVentaForActividad.id}`,
              tipo: "Instalación",
            }}
          />
        );
      })()}
    </div>
  );
}
