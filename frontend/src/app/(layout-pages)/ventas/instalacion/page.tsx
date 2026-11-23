"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  ArrowLeft,
  Search,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  Clock,
  UploadCloud,
  Upload,
  Paperclip,
  FileText,
  Building2,
  MapPin,
  Phone,
  MessageSquare,
  User,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCheck,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  File as FileIcon,
  HardDrive,
  Wifi,
  Radio,
  FileSignature,
  FileSpreadsheet,
} from "lucide-react";

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
  documentos_requeridos?: string | null;
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
  documentos_instalacion?: string | null;
  estado_instalacion?: string | null;
  fecha_instalacion?: string | null;
  tecnico_instalador?: string | null;
  notas_instalacion?: string | null;
  facturas_seguimiento?: string | null;
  estado_aprobacion?: string | null;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
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
    { num: 1, label: "Factura 1 (Activación)", estado: isPaidF1 ? "pagado" : "pendiente", monto: defaultMonthly, fecha_pago: isPaidF1 ? new Date().toISOString().substring(0, 10) : null, comprobante: isPaidF1 ? "F001" : null },
    { num: 2, label: "Factura 2 (Mes 2)", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
    { num: 3, label: "Factura 3 (Mes 3)", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
    { num: 4, label: "Factura 4 (Mes 4 - Fidelizado)", estado: "pendiente", monto: defaultMonthly, fecha_pago: null, comprobante: null },
  ];
}

const DOC_TYPES = [
  "Acta de Instalación y Conformidad",
  "Foto de Router / ONT / Equipamiento",
  "Foto de Fachada / Sede del Cliente",
  "DNI / RUC del Titular o Representante",
  "Recibo de Servicios / Factibilidad",
  "Contrato de Servicio Firmado",
  "Reporte de Test de Velocidad / Potencia",
  "Croquis de Cableado / Red Interna",
  "Otro Documento Técnico",
];

function InstallationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleIdParam = searchParams.get("id");

  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string>(saleIdParam || "");
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  // Installation Data State
  const [docsList, setDocsList] = useState<InstalledDocItem[]>([]);
  const [tecnicoInstalador, setTecnicoInstalador] = useState("");
  const [fechaInstalacion, setFechaInstalacion] = useState("");
  const [estadoInstalacion, setEstadoInstalacion] = useState("pendiente");
  const [notasInstalacion, setNotasInstalacion] = useState("");

  // Technical Fields (persisted inside notas_instalacion or structured notes)
  const [serieOnt, setSerieOnt] = useState("");
  const [potenciaOptica, setPotenciaOptica] = useState("");
  const [puertoNap, setPuertoNap] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");

  // Upload State
  const [docTipoSelect, setDocTipoSelect] = useState(DOC_TYPES[0]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);

  // Approval & 4 Invoices State
  const [estadoAprobacion, setEstadoAprobacion] = useState("pendiente");
  const [aprobadoPor, setAprobadoPor] = useState("");
  const [approvingDocs, setApprovingDocs] = useState(false);
  const [invoicesList, setInvoicesList] = useState<FacturaTrackingItem[]>([]);
  const [savingInvoices, setSavingInvoices] = useState(false);

  // Helper: parse installation docs JSON
  const parseInstallationDocs = (jsonStr?: string | null): InstalledDocItem[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 1. Load Sales List for dropdown switcher
  useEffect(() => {
    const fetchSales = async () => {
      setLoadingList(true);
      try {
        const res = await api.get("/api/sales");
        const list = Array.isArray(res.data) ? res.data : [];
        setSalesList(list);

        // If no ID param provided, select the first available sale
        if (!selectedSaleId && list.length > 0) {
          const defaultTarget = list.find((s) => (s.estado_instalacion || "").toLowerCase() !== "completada") || list[0];
          setSelectedSaleId(String(defaultTarget.id));
        }
      } catch (err) {
        console.error("Error al cargar lista de ventas:", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchSales();
  }, []);

  // 2. Load Single Sale Details
  const loadSaleDetails = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/sales/${id}`);
      const data: Sale = res.data;
      setSale(data);

      // Populate installation fields
      setDocsList(parseInstallationDocs(data.documentos_instalacion));
      setTecnicoInstalador(data.tecnico_instalador || "");
      setEstadoInstalacion(data.estado_instalacion || "pendiente");
      setEstadoAprobacion(data.estado_aprobacion || "pendiente");
      setAprobadoPor(data.aprobado_por || "");
      setInvoicesList(parse4Invoices(data.facturas_seguimiento, data.total, data.estado_pago));
      setFechaInstalacion(
        data.fecha_instalacion ? String(data.fecha_instalacion).substring(0, 10) : new Date().toISOString().substring(0, 10)
      );

      // Parse technical notes if formatted
      const rawNotes = data.notas_instalacion || "";
      setNotasInstalacion(rawNotes);

      // Extract structured tags from notes if present
      const serieMatch = rawNotes.match(/\[SERIE_ONT:\s*([^\]]+)\]/i);
      const potMatch = rawNotes.match(/\[POTENCIA:\s*([^\]]+)\]/i);
      const napMatch = rawNotes.match(/\[PUERTO_NAP:\s*([^\]]+)\]/i);
      const wifiMatch = rawNotes.match(/\[WIFI:\s*([^\]]+)\]/i);

      if (serieMatch) setSerieOnt(serieMatch[1].trim());
      if (potMatch) setPotenciaOptica(potMatch[1].trim());
      if (napMatch) setPuertoNap(napMatch[1].trim());
      if (wifiMatch) setWifiSsid(wifiMatch[1].trim());
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo cargar la información de la venta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSaleId) {
      loadSaleDetails(selectedSaleId);
      // Keep URL synced
      router.replace(`/ventas/instalacion?id=${selectedSaleId}`);
    }
  }, [selectedSaleId]);

  // Extract catalog required documents from items
  const catalogRequiredDocs = useMemo(() => {
    if (!sale || !sale.items || sale.items.length === 0) return [];
    const set = new Set<string>();
    sale.items.forEach((it) => {
      if (it.documentos_requeridos) {
        it.documentos_requeridos
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((d) => set.add(d));
      }
    });
    return Array.from(set);
  }, [sale]);

  // File Upload Handler
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
      toast.success(`Archivo "${file.name}" cargado correctamente.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al subir el documento.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  // Remove Document
  const handleRemoveDoc = (docId: string) => {
    if (!confirm("¿Deseas remover este documento del registro?")) return;
    setDocsList((prev) => prev.filter((d) => d.id !== docId));
    toast.info("Documento removido.");
  };

  // Compile Structured Notes
  const buildNotesPayload = () => {
    let cleanNotes = notasInstalacion
      .replace(/\[SERIE_ONT:\s*[^\]]+\]/gi, "")
      .replace(/\[POTENCIA:\s*[^\]]+\]/gi, "")
      .replace(/\[PUERTO_NAP:\s*[^\]]+\]/gi, "")
      .replace(/\[WIFI:\s*[^\]]+\]/gi, "")
      .trim();

    const tags: string[] = [];
    if (serieOnt.trim()) tags.push(`[SERIE_ONT: ${serieOnt.trim()}]`);
    if (potenciaOptica.trim()) tags.push(`[POTENCIA: ${potenciaOptica.trim()}]`);
    if (puertoNap.trim()) tags.push(`[PUERTO_NAP: ${puertoNap.trim()}]`);
    if (wifiSsid.trim()) tags.push(`[WIFI: ${wifiSsid.trim()}]`);

    return tags.length > 0 ? `${cleanNotes} ${tags.join(" ")}`.trim() : cleanNotes;
  };

  // Save Documentation / Complete Installation
  const handleSave = async (completarVenta: boolean = false) => {
    if (!sale) return;

    if (completarVenta && docsList.length === 0) {
      const proceed = confirm(
        "Aún no has adjuntado ningún documento (acta o fotos). ¿Deseas certificar y completar la instalación de todas formas?"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const finalEstadoInstalacion = completarVenta ? "completada" : estadoInstalacion;
      const finalNotes = buildNotesPayload();

      await api.post("/api/sales/save-docs", {
        id: sale.id,
        documentos: JSON.stringify(docsList),
        estado_instalacion: finalEstadoInstalacion,
        tecnico_instalador: tecnicoInstalador.trim(),
        notas_instalacion: finalNotes,
        completar_venta: completarVenta,
      });

      toast.success(
        completarVenta
          ? `¡Instalación Certificada! La venta ${sale.numero_venta} ha sido marcada como Completada y Ganada.`
          : `Registro y documentación de ${sale.numero_venta} guardados con éxito.`
      );

      // Reload updated details
      loadSaleDetails(String(sale.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar información.");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDocs = async () => {
    if (!sale) return;
    setApprovingDocs(true);
    try {
      await api.post("/api/sales/approve-docs", {
        id: sale.id,
        estado_aprobacion: "aprobada",
        aprobado_por: "Administración",
        nuevo_estado: "en_proceso",
      });
      toast.success("¡Documentación Aprobada! El servicio ha sido validado y movido a Programación / Instalación.");
      setEstadoAprobacion("aprobada");
      setAprobadoPor("Administración");
      loadSaleDetails(String(sale.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al aprobar documentación.");
    } finally {
      setApprovingDocs(false);
    }
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
    if (!sale) return;
    setSavingInvoices(true);
    try {
      const f1Paid = invoicesList[0]?.estado === "pagado";
      await api.post("/api/sales/update-invoices", {
        id: sale.id,
        facturas_seguimiento: invoicesList,
        f1_pagada: f1Paid,
      });
      toast.success("Seguimiento de las 4 facturas guardado con éxito.");
      loadSaleDetails(String(sale.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar facturas.");
    } finally {
      setSavingInvoices(false);
    }
  };

  const isCompleted = (sale?.estado_instalacion || "").toLowerCase() === "completada";
  const isApproved = (estadoAprobacion || "").toLowerCase() === "aprobada";

  return (
    <div className="flex flex-col gap-5 w-full pb-16">
      {/* 1. Header Toolbar & Breadcrumb */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/ventas/view" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ShoppingCart className="size-3.5" />
              Ventas
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium">Instalación & Documentación</span>
            {sale && (
              <>
                <ChevronRight className="size-3" />
                <span className="font-mono font-semibold text-primary">{sale.numero_venta}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck className="size-6 text-emerald-600" />
            Centro de Documentación e Instalación
          </h1>
          <p className="text-xs text-muted-foreground">
            Expediente digital, verificación técnica de cuadrilla, fotos de equipamiento y actas de conformidad.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <Link href="/ventas/view">
              <ArrowLeft className="size-3.5" />
              Volver al Tablero
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs"
            title="Imprimir Ficha Técnica de Instalación"
          >
            <Printer className="size-3.5 text-muted-foreground" />
            Imprimir Ficha
          </Button>

          {!isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveDocs}
              disabled={approvingDocs || !sale}
              className="h-8 gap-1.5 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 font-semibold cursor-pointer"
              title="Aprobar documentación del cliente y pasar a Programación / Instalación"
            >
              {approvingDocs ? <RefreshCw className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              Aprobar Documentación
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving || !sale}
            className="h-8 gap-1.5 text-xs"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : null}
            Guardar Cambios
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving || !sale}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm cursor-pointer"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCheck className="size-4" />}
            Completar Instalación & Certificar
          </Button>
        </div>
      </div>

      {/* 2. Top Service Switcher & Quick KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Selector de Venta */}
        <Card className="lg:col-span-2 bg-card shadow-xs">
          <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <FileSignature className="size-4 text-emerald-600" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Expediente de Venta Activo:</span>
                <span className="font-bold text-xs text-foreground truncate">
                  {sale ? `${sale.numero_venta} - ${sale.cliente_nombre_completo || "Cliente"}` : "Selecciona una venta..."}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                id="sale_switcher"
                className="h-7 px-2 rounded-md border bg-background text-xs font-medium w-full sm:w-48"
                value={selectedSaleId}
                onChange={(e) => setSelectedSaleId(e.target.value)}
                disabled={loadingList}
              >
                {salesList.map((s) => {
                  const isDone = (s.estado_instalacion || "").toLowerCase() === "completada";
                  return (
                    <option key={s.id} value={s.id}>
                      {s.numero_venta} - {s.cliente_nombre_completo || "Cliente"} ({isDone ? "Completada" : "Pendiente"})
                    </option>
                  );
                })}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Aprobación Documental */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Aprobación Documental:</span>
              <span className="font-bold text-xs mt-0.5 text-foreground">
                {isApproved ? "Documentos Aprobados" : "Pendiente de Aprobación"}
              </span>
            </div>
            {isApproved ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-bold px-2 py-0.5 text-[10px] gap-1">
                <ShieldCheck className="size-3" />
                Aprobada
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 text-purple-700 border-purple-300 hover:bg-purple-50 font-semibold gap-1 cursor-pointer"
                onClick={handleApproveDocs}
                disabled={approvingDocs}
              >
                {approvingDocs ? <RefreshCw className="size-2.5 animate-spin" /> : <ShieldCheck className="size-2.5" />}
                Aprobar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Estado de Instalación */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Fase Operativa:</span>
              <span className="font-bold text-xs mt-0.5 capitalize text-foreground">
                {sale?.estado_instalacion || "Pendiente"}
              </span>
            </div>
            {isCompleted ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-bold px-2 py-0.5 text-[10px] gap-1">
                <CheckCircle2 className="size-3" />
                Instalada
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold px-2 py-0.5 text-[10px] gap-1">
                <Clock className="size-3" />
                Por Instalar
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <p className="font-medium text-sm">Cargando expediente digital y documentos de instalación...</p>
        </div>
      ) : !sale ? (
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border rounded-xl bg-card">
          <AlertTriangle className="size-8 text-amber-500" />
          <p className="font-semibold text-foreground">No se encontró el registro de la venta solicitada.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ventas/view">Regresar al Tablero de Ventas</Link>
          </Button>
        </div>
      ) : (
        /* 3. Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* =============================================================== */}
          {/* COLUMNA IZQUIERDA Y CENTRAL: FICHA, DOCUMENTOS & CHECKLIST */}
          {/* =============================================================== */}
          <div className="lg:col-span-2 space-y-6">
            {/* A. Ficha del Cliente & Servicio */}
            <Card className="bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold">Información del Cliente y Sede de Instalación</CardTitle>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    ID Venta: #{sale.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Cliente & Documento */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Cliente / Razón Social:</span>
                  <p className="font-bold text-foreground text-sm leading-snug">
                    {sale.cliente_nombre_completo || "Cliente General"}
                  </p>
                  {sale.numero_documento && (
                    <span className="font-mono text-muted-foreground text-xs block">
                      RUC / DNI: <strong>{sale.numero_documento}</strong>
                    </span>
                  )}
                </div>

                {/* Contacto & WhatsApp */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Teléfono & Comunicación:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">
                      {sale.telefono_principal || "Sin teléfono"}
                    </span>
                    {sale.telefono_principal && (
                      <a
                        href={`https://wa.me/${sale.telefono_principal.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 transition-colors"
                      >
                        <MessageSquare className="size-3" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                  {sale.email && (
                    <span className="text-muted-foreground block text-xs truncate">
                      {sale.email}
                    </span>
                  )}
                </div>

                {/* Dirección de Instalación */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-1 bg-muted/20 border rounded-lg p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Dirección de Instalación / Sede:
                  </span>
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="size-4 text-emerald-600 shrink-0" />
                    <span>{sale.direccion_entrega || "No especificada (Recojo en sede)"}</span>
                  </p>
                </div>

                {/* Plan y Equipos Contratados */}
                <div className="sm:col-span-2 lg:col-span-3 space-y-2 pt-2 border-t">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Servicio / Plan de Internet & Equipamiento Contratado:
                  </span>
                  <div className="space-y-1.5">
                    {sale.items && sale.items.length > 0 ? (
                      sale.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                              {it.codigo || "PLAN"}
                            </Badge>
                            <span className="font-semibold text-foreground truncate">{it.producto_nombre}</span>
                            <span className="text-muted-foreground">x{it.cantidad}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            S/ {Number(it.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic text-xs">Venta directa sin detalle de plan.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* B. Checklist de Documentos Requeridos por el Plan */}
            {catalogRequiredDocs.length > 0 && (
              <Card className="bg-card shadow-2xs border-blue-200 dark:border-blue-900/50">
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                      <ShieldCheck className="size-4" />
                      Documentación Exigida por el Plan Comercial ({catalogRequiredDocs.length})
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground">
                      Conforme al catálogo de servicios contratados
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {catalogRequiredDocs.map((reqDoc, idx) => {
                      const isAttached = docsList.some(
                        (d) =>
                          d.tipo.toLowerCase().includes(reqDoc.toLowerCase()) ||
                          d.nombre.toLowerCase().includes(reqDoc.toLowerCase())
                      );

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs ${
                            isAttached
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                              : "bg-muted/40 border-border/80 text-foreground"
                          }`}
                        >
                          <span className="font-medium flex items-center gap-1.5 truncate">
                            {isAttached ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="size-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate">{reqDoc}</span>
                          </span>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${isAttached ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 border-emerald-300" : "text-amber-700 bg-amber-50"}`}>
                            {isAttached ? "Adjuntado" : "Pendiente"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* C. Gestor de Archivos & Carga de Documentos */}
            <Card className="bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <UploadCloud className="size-4 text-emerald-600" />
                      Expediente Digital de Documentos ({docsList.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sube y gestiona actas de entrega, fotos del router instalado y documentos del cliente.
                    </CardDescription>
                  </div>

                  {docsList.length > 0 && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-bold text-xs px-2 py-0.5">
                      {docsList.length} documento(s) cargado(s)
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Zona de Subida */}
                <div className="p-4 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Paperclip className="size-4 text-primary" />
                      Subir Documento de Instalación
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Soporta actas firmadas, fotos de equipos o contratos en formato PDF, PNG, JPG, JPEG o DOCX.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <select
                      className="h-9 px-2.5 rounded-md border bg-background text-xs font-medium w-full sm:w-56"
                      value={docTipoSelect}
                      onChange={(e) => setDocTipoSelect(e.target.value)}
                    >
                      {DOC_TYPES.map((dt) => (
                        <option key={dt} value={dt}>
                          {dt}
                        </option>
                      ))}
                    </select>

                    <Label
                      htmlFor="page_upload_input"
                      className={`h-9 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0 ${
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
                      id="page_upload_input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                      disabled={uploadingDoc}
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {/* Galería / Listado de Documentos Adjuntos */}
                {docsList.length === 0 ? (
                  <div className="py-12 border border-dashed rounded-xl text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2 bg-muted/10">
                    <FileIcon className="size-8 text-muted-foreground/30" />
                    <p className="font-semibold text-foreground text-sm">No hay documentos registrados para esta venta.</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Utiliza el selector de arriba para adjuntar el acta de entrega y las fotos del router para certificar la instalación.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {docsList.map((doc) => {
                      const isImage = /\.(png|jpe?g|webp)$/i.test(doc.url || doc.nombre);
                      const isPdf = /\.pdf$/i.test(doc.url || doc.nombre);

                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all text-xs gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                            <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              {isPdf ? (
                                <FileText className="size-4 text-red-500" />
                              ) : isImage ? (
                                <FileCheck className="size-4 text-blue-500" />
                              ) : (
                                <Paperclip className="size-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="font-semibold text-foreground truncate" title={doc.nombre}>
                                {doc.nombre}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted font-normal">
                                  {doc.tipo}
                                </Badge>
                                {doc.size ? <span>{(doc.size / 1024).toFixed(1)} KB</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer font-medium"
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
                              title="Eliminar documento"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* D. Línea de Tiempo / Historial de Registros */}
            <Card className="bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="size-4 text-emerald-600" />
                  Historial y Cronología del Servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {/* Evento 1: Venta Registrada */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1 size-3 rounded-full bg-blue-500 ring-4 ring-background" />
                    <div className="text-xs">
                      <span className="font-bold text-foreground">Venta Generada / Facturada</span>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {sale.fecha_venta ? String(sale.fecha_venta).replace("T", " ").substring(0, 16) : "-"}
                      </p>
                      {sale.oportunidad_id && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Originada desde Cotización <strong>COT-{String(sale.oportunidad_id).padStart(4, "0")}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Evento 2: Cuadrilla Asignada */}
                  <div className="relative">
                    <span className={`absolute -left-6 top-1 size-3 rounded-full ring-4 ring-background ${tecnicoInstalador ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    <div className="text-xs">
                      <span className="font-bold text-foreground">Cuadrilla / Técnico en Campo</span>
                      <p className="text-[11px] text-muted-foreground">
                        {tecnicoInstalador ? `Asignado a: ${tecnicoInstalador}` : "Sin técnico asignado aún"}
                      </p>
                    </div>
                  </div>

                  {/* Evento 3: Documentación Cargada */}
                  <div className="relative">
                    <span className={`absolute -left-6 top-1 size-3 rounded-full ring-4 ring-background ${docsList.length > 0 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    <div className="text-xs">
                      <span className="font-bold text-foreground">Documentación de Respaldo</span>
                      <p className="text-[11px] text-muted-foreground">
                        {docsList.length > 0 ? `${docsList.length} archivo(s) digital(es) cargado(s)` : "Pendiente de adjuntar actas y fotos"}
                      </p>
                    </div>
                  </div>

                  {/* Evento 4: Certificación Final */}
                  <div className="relative">
                    <span className={`absolute -left-6 top-1 size-3 rounded-full ring-4 ring-background ${isCompleted ? "bg-emerald-600" : "bg-amber-500"}`} />
                    <div className="text-xs">
                      <span className="font-bold text-foreground">
                        {isCompleted ? "Instalación Certificada & Conforme" : "Estado: En Proceso / Pendiente"}
                      </span>
                      {sale.fecha_instalacion && (
                        <p className="text-[11px] text-emerald-600 font-mono">
                          Certificado el: {String(sale.fecha_instalacion).replace("T", " ").substring(0, 16)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* =============================================================== */}
          {/* COLUMNA DERECHA: REGISTRO TÉCNICO, PARÁMETROS & CERTIFICACIÓN */}
          {/* =============================================================== */}
          <div className="space-y-6">
            {/* Registro de Cuadrilla & Parámetros Técnicos */}
            <Card className="bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HardDrive className="size-4 text-emerald-600" />
                  Parámetros Técnicos de Conexión
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro de equipos de red y valores de fibra óptica.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-3.5 text-xs">
                {/* Técnico Responsable */}
                <div className="space-y-1.5">
                  <Label htmlFor="tecnico_input" className="text-xs font-semibold flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    Técnico / Cuadrilla Instaladora
                  </Label>
                  <Input
                    id="tecnico_input"
                    placeholder="Ej: Ing. Marco Díaz / Cuadrilla 02"
                    value={tecnicoInstalador}
                    onChange={(e) => setTecnicoInstalador(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                {/* Parámetros en grid de 2 columnas para pantalla completa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Fecha de Instalación */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha_input" className="text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      Fecha de Instalación
                    </Label>
                    <Input
                      id="fecha_input"
                      type="date"
                      value={fechaInstalacion}
                      onChange={(e) => setFechaInstalacion(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Estado de la Instalación */}
                  <div className="space-y-1.5">
                    <Label htmlFor="estado_inst_select" className="text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      Fase Operativa
                    </Label>
                    <select
                      id="estado_inst_select"
                      className="h-8 px-2.5 rounded-md border bg-background text-xs font-semibold w-full"
                      value={estadoInstalacion}
                      onChange={(e) => setEstadoInstalacion(e.target.value)}
                    >
                      <option value="pendiente">○ Pendiente</option>
                      <option value="en_proceso">◐ En Proceso</option>
                      <option value="completada">● Completada</option>
                    </select>
                  </div>

                  {/* N° de Serie Router / ONT */}
                  <div className="space-y-1.5">
                    <Label htmlFor="serie_ont" className="text-xs font-semibold flex items-center gap-1.5">
                      <Radio className="size-3.5 text-muted-foreground" />
                      N° Serie ONT / Router
                    </Label>
                    <Input
                      id="serie_ont"
                      placeholder="Ej: HWTC12345678"
                      value={serieOnt}
                      onChange={(e) => setSerieOnt(e.target.value)}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>

                  {/* Potencia Óptica (dBm) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="potencia_optica" className="text-xs font-semibold flex items-center gap-1.5">
                      <Wifi className="size-3.5 text-muted-foreground" />
                      Potencia Óptica (dBm)
                    </Label>
                    <Input
                      id="potencia_optica"
                      placeholder="Ej: -18.5 dBm"
                      value={potenciaOptica}
                      onChange={(e) => setPotenciaOptica(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Puerto NAP / Caja de Distribución */}
                  <div className="space-y-1.5">
                    <Label htmlFor="puerto_nap" className="text-xs font-semibold">
                      Caja NAP & Puerto
                    </Label>
                    <Input
                      id="puerto_nap"
                      placeholder="Ej: NAP-ARONA-03 / P6"
                      value={puertoNap}
                      onChange={(e) => setPuertoNap(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Red WiFi & Clave Entregada */}
                  <div className="space-y-1.5">
                    <Label htmlFor="wifi_ssid" className="text-xs font-semibold">
                      SSID WiFi Entregada
                    </Label>
                    <Input
                      id="wifi_ssid"
                      placeholder="Ej: NextLevel_5G"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Notas u Observaciones */}
                <div className="space-y-1.5">
                  <Label htmlFor="notas_textarea" className="text-xs font-semibold">
                    Observaciones Generales de Campo
                  </Label>
                  <Textarea
                    id="notas_textarea"
                    placeholder="Detalles sobre facilidades de acceso, ductería, cableado interior..."
                    rows={3}
                    value={notasInstalacion}
                    onChange={(e) => setNotasInstalacion(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* E. Seguimiento de las 4 Facturas (Permanencia & Fidelización) */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                      <FileSpreadsheet className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">
                        E. Seguimiento de Primeras 4 Facturas
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ciclo de fidelización y cobranza post-instalación
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-blue-700 bg-blue-50 border-blue-200">
                    {invoicesList.filter((i) => i.estado === "pagado").length}/4 Pagadas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-2.5">
                  {invoicesList.map((inv) => {
                    const isPaid = inv.estado === "pagado";
                    return (
                      <div
                        key={inv.num}
                        className={`p-2.5 rounded-lg border transition-all text-xs ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-300"
                            : "bg-muted/30 border-dashed border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {inv.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {isPaid ? "● PAGADA" : "○ PENDIENTE"}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isPaid ? "outline" : "default"}
                            onClick={() => handleToggleInvoice(inv.num)}
                            className={`h-6 text-[11px] px-2.5 cursor-pointer ${
                              isPaid
                                ? "text-muted-foreground hover:bg-muted"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isPaid ? "Desmarcar" : "Marcar Pagada"}
                          </Button>
                        </div>

                        {/* Campos de Comprobante y Fecha si está pagada o editable */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Fecha de Pago:</span>
                            <Input
                              type="date"
                              disabled={!isPaid}
                              value={inv.fecha_pago || ""}
                              onChange={(e) => handleUpdateInvoiceField(inv.num, "fecha_pago", e.target.value)}
                              className="h-7 text-[11px] px-2 bg-background"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">N° Comprobante / Op.:</span>
                            <Input
                              placeholder="Ej: F001-000492"
                              disabled={!isPaid}
                              value={inv.comprobante || ""}
                              onChange={(e) => handleUpdateInvoiceField(inv.num, "comprobante", e.target.value)}
                              className="h-7 text-[11px] px-2 uppercase font-mono bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveInvoices}
                  disabled={savingInvoices}
                  className="w-full text-xs font-semibold h-8 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  {savingInvoices ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>Guardar Estado de Facturas (1 a 4)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Certificación & Acción Principal */}
            <Card className={`border-2 shadow-sm ${isCompleted ? "border-emerald-500 bg-emerald-500/5" : "border-emerald-600 bg-card"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCheck className="size-5 text-emerald-600" />
                  Certificación Final de la Venta
                </CardTitle>
                <CardDescription className="text-xs">
                  Valida la instalación para dar inicio a la facturación formal del servicio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="text-xs space-y-1 text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                  <div className="flex justify-between">
                    <span>Documentos cargados:</span>
                    <strong className="text-foreground">{docsList.length} archivo(s)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Técnico asignado:</span>
                    <strong className="text-foreground">{tecnicoInstalador || "Pendiente"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado actual:</span>
                    <strong className="text-foreground capitalize">{sale.estado_instalacion || "Pendiente"}</strong>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-5 gap-2 shadow-md cursor-pointer"
                >
                  {saving ? <RefreshCw className="size-4 animate-spin" /> : <CheckCheck className="size-5" />}
                  <span>{isCompleted ? "Actualizar Certificación" : "Certificar & Completar Instalación"}</span>
                </Button>

                <p className="text-[10px] text-muted-foreground text-center italic">
                  Al completar, la venta pasará automáticamente a la etapa "Completada" en el tablero general de ventas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InstallationFullPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <p className="font-medium text-sm">Cargando Centro de Documentación...</p>
        </div>
      }
    >
      <InstallationPageContent />
    </Suspense>
  );
}
