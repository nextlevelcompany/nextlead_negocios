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
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  Star,
  Bot,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ImportContactsExcelModal } from "@/components/contactos/ImportContactsExcelModal";

interface Direccion {
  idDireccion?: number;
  nombreUbicacion?: string;
  codigoUbigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccionCompleta?: string;
  referencia?: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface Contact {
  id: number;
  tipoPersona: "NATURAL" | "EMPRESA";
  tipoDocumento: string;
  numeroDocumento: string;
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  nombreDisplay?: string;
  telefonoPrincipal: string;
  telefonoSecundario?: string | null;
  email?: string | null;
  empresaId?: number | null;
  empresaNombre?: string | null;
  starred?: boolean;
  aiActive?: boolean;
  dateCreated?: string;
  referencia?: string | null;
  status?: string;
  nroEntidades?: number | null;
  scoreExperian?: number | null;
  semaforoExperian?: string | null;
  deudaSbs?: number | null;
  calificacionSbs?: string | null;
  rangoVentas?: string | null;
  cargo?: string | null;
  direcciones?: Direccion[];
}

export default function ContactsDirectoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "NATURAL" | "EMPRESA">("ALL");
  const [filterSemaforo, setFilterSemaforo] = useState<string>("ALL");
  const [filterStarred, setFilterStarred] = useState(false);
  const [filterAi, setFilterAi] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Global KPI Stats
  const [stats, setStats] = useState({
    total: 0,
    empresas: 0,
    naturales: 0,
    ai_active: 0,
    semaforo_verde: 0,
    semaforo_amarillo: 0,
    semaforo_rojo: 0,
    semaforo_gris: 0,
  });

  // Detail Modal State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [contactOrders, setContactOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Usuario activo y permisos de alcance
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crm_active_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          if (u.modules) {
            setUserPermissions(typeof u.modules === "string" ? JSON.parse(u.modules) : u.modules);
          }
        } catch {}
      }
    }
  }, []);

  const isRestricted = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || "").toUpperCase();
    if (role === "ADMIN") return false;
    if (role === "VENDEDOR") return true;
    if (userPermissions?.sales_scope === "own") return true;
    if (userPermissions?.clientes?.ver_todos === false) return true;
    return false;
  }, [currentUser, userPermissions]);

  // Load KPI Stats from Backend
  const loadStats = async () => {
    try {
      const params: any = {};
      if (isRestricted && currentUser) {
        params.usuarioId = currentUser.id;
        params.scope = "own";
        if (userPermissions?.trabajador_id) params.trabajadorId = userPermissions.trabajador_id;
      }
      const res = await api.get("/api/contacts/stats", { params });
      if (res.data) setStats(res.data);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  // Load Contacts from Paginated API
  const loadContacts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
        search: searchTerm.trim() || undefined,
        tipoPersona: filterType !== "ALL" ? filterType : undefined,
        semaforo: filterSemaforo !== "ALL" ? filterSemaforo : undefined,
      };
      if (isRestricted && currentUser) {
        params.usuarioId = currentUser.id;
        params.scope = "own";
        if (userPermissions?.trabajador_id) params.trabajadorId = userPermissions.trabajador_id;
      }
      const res = await api.get("/api/contacts/paginated", { params });
      if (res.data && res.data.content) {
        setContacts(res.data.content);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 0);
      } else if (Array.isArray(res.data)) {
        setContacts(res.data);
        setTotalElements(res.data.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error("Error loading contacts:", err);
      toast.error(err.response?.data?.message || "Error al cargar la lista de contactos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterType, filterSemaforo]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadContacts();
    }, 200);
    return () => clearTimeout(handler);
  }, [page, pageSize, searchTerm, filterType, filterSemaforo, currentUser, isRestricted]);

  useEffect(() => {
    loadStats();
  }, [currentUser, isRestricted]);

  // Filter Contacts for Client-side Toggles (Starred / AI)
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchStarred = !filterStarred || !!c.starred;
      const matchAi = !filterAi || !!c.aiActive;
      return matchStarred && matchAi;
    });
  }, [contacts, filterStarred, filterAi]);

  // Star Toggle
  const handleToggleStar = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/contacts/${contact.id}/star`);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, starred: !c.starred } : c))
      );
      toast.success(
        contact.starred ? "Removido de favoritos" : "Agregado a favoritos"
      );
    } catch (err) {
      toast.error("No se pudo cambiar estado de favorito.");
    }
  };

  // AI Toggle
  const handleToggleAi = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/contacts/${contact.id}/toggle-ai`);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, aiActive: !c.aiActive } : c))
      );
      toast.success(
        contact.aiActive
          ? "Bot IA desactivado para este contacto"
          : "Bot IA activado para este contacto"
      );
    } catch (err) {
      toast.error("No se pudo cambiar estado de IA.");
    }
  };

  // Delete Contact
  const handleDeleteContact = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const name = contact.nombreDisplay || contact.razonSocial || "este contacto";
    if (!confirm(`¿Estás seguro de eliminar a "${name}"?`)) return;

    try {
      await api.delete(`/api/contacts/${contact.id}`);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success("Contacto eliminado con éxito.");
      if (selectedContact?.id === contact.id) {
        setShowDetailModal(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo eliminar el contacto.");
    }
  };

  // Open Contact Details
  const handleOpenDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
    setLoadingOrders(true);
    try {
      const res = await api.get(`/api/contacts/${contact.id}/pedidos`);
      setContactOrders(res.data?.pedidos || res.data || []);
    } catch (err) {
      setContactOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Open WhatsApp Link
  const openWhatsApp = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.startsWith("51") ? clean : `51${clean}`;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  // Helper render Semáforo Experian
  const renderSemaforoBadge = (semaforo?: string | null, score?: number | null) => {
    if (!semaforo) return null;
    const s = semaforo.toUpperCase();
    let bg = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    let dot = "bg-slate-400";
    let label = "Gris";

    if (s === "VERDE") {
      bg = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
      dot = "bg-emerald-500";
      label = "Verde";
    } else if (s === "AMARILLO") {
      bg = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700";
      dot = "bg-amber-500";
      label = "Amarillo";
    } else if (s === "ROJO") {
      bg = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700";
      dot = "bg-rose-500";
      label = "Rojo";
    }

    return (
      <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 gap-1.5 border shrink-0 ${bg}`}>
        <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
        <span>{label}</span>
        {score !== undefined && score !== null && (
          <span className="opacity-75 font-mono text-[9px]">({score.toFixed(3)})</span>
        )}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-5 sm:size-6 text-emerald-600 shrink-0" />
            Directorio de Contactos & Clientes
            {isRestricted && (
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-semibold text-[11px] ml-1">
                Cartera Asignada
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isRestricted
              ? "Visualizando únicamente los clientes y contactos asignados a tu cartera comercial."
              : "Gestión centralizada de personas, empresas, direcciones registradas y configuración de IA."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-3.5" />
              Tarjetas
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="size-3.5" />
              Tabla
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={loadContacts}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {!isRestricted && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => setImportModalOpen(true)}
            >
              <FileSpreadsheet className="size-3.5" />
              Importar Excel
            </Button>
          )}

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            asChild
          >
            <Link href="/contactos/create">
              <UserPlus className="size-3.5" />
              Nuevo Contacto
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full min-w-0">
        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Contactos</span>
            <Users className="size-4 sm:size-5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
            {stats.total > 0 ? stats.total.toLocaleString() : totalElements.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRestricted ? "Asignados en tu cartera" : "Base global de clientes"}
          </p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Empresas (RUC)</span>
            <Building className="size-4 sm:size-5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-blue-600">
            {stats.empresas > 0 ? stats.empresas.toLocaleString() : "-"}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Cuentas corporativas</p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Personas Naturales</span>
            <User className="size-4 sm:size-5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600">
            {stats.naturales > 0 ? stats.naturales.toLocaleString() : "-"}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Representantes & contactos</p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Con IA Activa</span>
            <Bot className="size-4 sm:size-5 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-indigo-600">
            {stats.ai_active}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-respuesta WhatsApp</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-card p-3 shadow-xs w-full max-w-full min-w-0 flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por RUC, razón social, nombre RL, teléfono o email..."
              className="pl-9 h-9 text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={filterType === "ALL" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("ALL")}
            >
              Todos
            </Button>
            <Button
              variant={filterType === "NATURAL" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("NATURAL")}
            >
              Naturales
            </Button>
            <Button
              variant={filterType === "EMPRESA" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("EMPRESA")}
            >
              Empresas
            </Button>

            <Button
              variant={filterStarred ? "secondary" : "outline"}
              size="sm"
              className={`h-9 text-xs sm:text-sm gap-1.5 px-3 ${filterStarred ? "text-amber-500 font-bold" : ""}`}
              onClick={() => setFilterStarred(!filterStarred)}
            >
              <Star className={`size-4 ${filterStarred ? "fill-amber-500 text-amber-500" : ""}`} />
              Favoritos
            </Button>

            <Button
              variant={filterAi ? "secondary" : "outline"}
              size="sm"
              className={`h-9 text-xs sm:text-sm gap-1.5 px-3 ${filterAi ? "text-indigo-600 font-bold" : ""}`}
              onClick={() => setFilterAi(!filterAi)}
            >
              <Bot className="size-4 text-indigo-600" />
              IA Activa
            </Button>
          </div>
        </div>

        {/* Semáforo Experian Filter Bar */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t">
          <span className="text-xs font-medium text-muted-foreground mr-1">Riesgo Experian:</span>
          <Button
            variant={filterSemaforo === "ALL" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setFilterSemaforo("ALL")}
          >
            Todos
          </Button>
          <Button
            variant={filterSemaforo === "VERDE" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs px-2.5 gap-1.5 ${filterSemaforo === "VERDE" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"}`}
            onClick={() => setFilterSemaforo("VERDE")}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            Verde ({stats.semaforo_verde ? stats.semaforo_verde.toLocaleString() : 0})
          </Button>
          <Button
            variant={filterSemaforo === "AMARILLO" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs px-2.5 gap-1.5 ${filterSemaforo === "AMARILLO" ? "bg-amber-500 text-white hover:bg-amber-600" : "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"}`}
            onClick={() => setFilterSemaforo("AMARILLO")}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            Amarillo ({stats.semaforo_amarillo ? stats.semaforo_amarillo.toLocaleString() : 0})
          </Button>
          <Button
            variant={filterSemaforo === "ROJO" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs px-2.5 gap-1.5 ${filterSemaforo === "ROJO" ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800"}`}
            onClick={() => setFilterSemaforo("ROJO")}
          >
            <span className="size-2 rounded-full bg-rose-500" />
            Rojo ({stats.semaforo_rojo ? stats.semaforo_rojo.toLocaleString() : 0})
          </Button>
          <Button
            variant={filterSemaforo === "GRIS" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs px-2.5 gap-1.5 ${filterSemaforo === "GRIS" ? "bg-slate-600 text-white hover:bg-slate-700" : "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"}`}
            onClick={() => setFilterSemaforo("GRIS")}
          >
            <span className="size-2 rounded-full bg-slate-400" />
            Gris ({stats.semaforo_gris ? stats.semaforo_gris.toLocaleString() : 0})
          </Button>
        </div>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-medium">Cargando contactos...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="bg-card p-12 text-center text-muted-foreground">
          <Users className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-foreground text-sm">
            {isRestricted ? "No tienes contactos asignados en tu cartera" : "No se encontraron contactos"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isRestricted
              ? "Actualmente no tienes cuentas asignadas a tu nombre. Tu supervisor o administrador puede asignarte clientes desde 'Asignación de Cartera'."
              : "Prueba ajustando los filtros o registra un nuevo contacto."}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            asChild
          >
            <Link href="/contactos/create">
              <UserPlus className="size-3.5" />
              Crear Nuevo Contacto
            </Link>
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 w-full min-w-0">
          {filteredContacts.map((contact) => {
            const isEmpresa = contact.tipoPersona === "EMPRESA";
            const name =
              contact.nombreDisplay ||
              (isEmpresa
                ? contact.razonSocial
                : `${contact.nombres || ""} ${contact.apellidos || ""}`.trim()) ||
              "Sin Nombre";

            const primaryAddress = contact.direcciones?.[0];

            return (
              <Card
                key={contact.id}
                onClick={() => router.push(`/contactos/view?id=${contact.id}`)}
                className="bg-card hover:shadow-md transition-all border p-4 flex flex-col justify-between gap-3 cursor-pointer group"
              >
                {/* Top: Avatar, Name & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isEmpresa
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isEmpresa ? <Building className="size-5" /> : <User className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-emerald-600 transition-colors">
                        {name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal uppercase"
                        >
                          {contact.tipoDocumento || (isEmpresa ? "RUC" : "DNI")}
                        </Badge>
                        <span className="truncate font-mono">{contact.numeroDocumento || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleToggleStar(contact, e)}
                    >
                      <Star
                        className={`size-4 ${
                          contact.starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
                        }`}
                      />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs sm:text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/contactos/view?id=${contact.id}`}>
                            <ExternalLink className="size-4 mr-2 text-emerald-600" />
                            Ver Ficha
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/contactos/create?edit_id=${contact.id}`}>
                            <Edit className="size-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleToggleAi(contact, e)}>
                          <Bot className="size-4 mr-2 text-indigo-600" />
                          {contact.aiActive ? "Desactivar IA" : "Activar IA"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteContact(contact, e)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Middle: Details */}
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground py-1.5 border-y">
                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-xs sm:text-sm font-medium text-foreground">{contact.telefonoPrincipal}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 gap-1 font-medium"
                      onClick={(e) => openWhatsApp(contact.telefonoPrincipal, e)}
                    >
                      <MessageSquare className="size-3.5" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Address */}
                  {primaryAddress ? (
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <MapPin className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="truncate">
                        {primaryAddress.direccionCompleta}
                        {primaryAddress.distrito ? ` (${primaryAddress.distrito})` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs italic text-muted-foreground/70">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>Sin dirección registrada</span>
                    </div>
                  )}

                  {/* Company link if person */}
                  {contact.empresaNombre && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Building className="size-3.5 text-blue-500 shrink-0" />
                      <span className="truncate text-foreground font-medium">{contact.empresaNombre}</span>
                    </div>
                  )}

                  {/* Experian Risk Info & Cargo */}
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                    {isEmpresa && contact.semaforoExperian && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderSemaforoBadge(contact.semaforoExperian, contact.scoreExperian)}
                        {contact.deudaSbs != null && contact.deudaSbs > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Deuda: S/ {contact.deudaSbs.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {!isEmpresa && contact.cargo && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                        {contact.cargo}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Footer: Tags & Badges */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[11px] px-2 py-0.5 font-medium ${
                        isEmpresa
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {isEmpresa ? "Empresa" : "Persona"}
                    </Badge>
                    {contact.aiActive && (
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1 font-medium"
                      >
                        <Bot className="size-3" />
                        IA
                      </Badge>
                    )}
                  </div>

                  {contact.direcciones && contact.direcciones.length > 1 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      +{contact.direcciones.length - 1} dir.
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="bg-card shadow-xs w-full max-w-full min-w-0 overflow-x-auto smooth-scroll">
          <CardContent className="p-0">
            <div className="min-w-[760px]">
              <Table>
              <TableHeader>
                <TableRow className="text-xs sm:text-sm font-semibold">
                  <TableHead className="w-10 text-center"></TableHead>
                  <TableHead className="text-xs sm:text-sm">Nombre / Razón Social</TableHead>
                  <TableHead className="text-xs sm:text-sm">Tipo / Documento</TableHead>
                  <TableHead className="text-xs sm:text-sm">Riesgo / Cargo</TableHead>
                  <TableHead className="text-xs sm:text-sm">Teléfono</TableHead>
                  <TableHead className="text-xs sm:text-sm">Dirección Principal</TableHead>
                  <TableHead className="text-xs sm:text-sm">IA Bot</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const isEmpresa = contact.tipoPersona === "EMPRESA";
                  const name =
                    contact.nombreDisplay ||
                    (isEmpresa
                      ? contact.razonSocial
                      : `${contact.nombres || ""} ${contact.apellidos || ""}`.trim()) ||
                    "Sin Nombre";
                  const primaryAddress = contact.direcciones?.[0];

                  return (
                    <TableRow
                      key={contact.id}
                      className="text-xs sm:text-sm cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/contactos/view?id=${contact.id}`)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleToggleStar(contact, e)}
                        >
                          <Star
                            className={`size-4 ${
                              contact.starred
                                ? "fill-amber-400 text-amber-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm">{name}</span>
                          {contact.empresaNombre && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {contact.empresaNombre}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] px-1.5 py-0.5 font-medium ${
                              isEmpresa
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {contact.tipoDocumento || (isEmpresa ? "RUC" : "DNI")}
                          </Badge>
                          <span className="font-mono text-xs sm:text-sm">{contact.numeroDocumento || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEmpresa && contact.semaforoExperian ? (
                          renderSemaforoBadge(contact.semaforoExperian, contact.scoreExperian)
                        ) : !isEmpresa && contact.cargo ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                            {contact.cargo}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm">
                          <span>{contact.telefonoPrincipal}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-emerald-600"
                            onClick={(e) => openWhatsApp(contact.telefonoPrincipal, e)}
                          >
                            <MessageSquare className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-xs sm:text-sm">
                        {primaryAddress
                          ? `${primaryAddress.direccionCompleta} ${
                              primaryAddress.distrito ? `(${primaryAddress.distrito})` : ""
                            }`
                          : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={contact.aiActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`h-6 text-xs px-2.5 gap-1 font-medium ${
                            contact.aiActive
                              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                              : "text-muted-foreground"
                          }`}
                          onClick={(e) => handleToggleAi(contact, e)}
                        >
                          <Bot className="size-3.5" />
                          {contact.aiActive ? "Activo" : "Off"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" asChild title="Ver Ficha">
                            <Link href={`/contactos/view?id=${contact.id}`}>
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Editar">
                            <Link href={`/contactos/create?edit_id=${contact.id}`}>
                              <Edit className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => handleDeleteContact(contact, e)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination Bar */}
      {!loading && totalElements > 0 && (
        <Card className="bg-card p-3 shadow-xs w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{page * pageSize + 1}</span> a{" "}
              <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements).toLocaleString()}</span> de{" "}
              <span className="font-semibold text-foreground">{totalElements.toLocaleString()}</span> contactos
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                Anterior
              </Button>

              <div className="text-xs text-muted-foreground px-2">
                Pág. <span className="font-semibold text-foreground">{page + 1}</span> de{" "}
                <span className="font-semibold text-foreground">{totalPages || 1}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages || loading}
              >
                Siguiente
              </Button>

              <select
                className="h-8 text-xs border rounded-md px-2 bg-background text-foreground ml-2"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value={12}>12 por pág.</option>
                <option value={24}>24 por pág.</option>
                <option value={48}>48 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* DETAIL MODAL */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedContact && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase ${
                      selectedContact.tipoPersona === "EMPRESA"
                        ? "bg-blue-500/15 text-blue-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {selectedContact.tipoPersona} • {selectedContact.tipoDocumento}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-emerald-600 gap-1"
                    onClick={() => openWhatsApp(selectedContact.telefonoPrincipal)}
                  >
                    <MessageSquare className="size-3.5" />
                    Abrir WhatsApp
                  </Button>
                </div>
                <DialogTitle className="text-lg">
                  {selectedContact.nombreDisplay ||
                    selectedContact.razonSocial ||
                    `${selectedContact.nombres || ""} ${selectedContact.apellidos || ""}`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedContact.tipoDocumento}: {selectedContact.numeroDocumento} • Registrado{" "}
                  {selectedContact.dateCreated?.substring(0, 10)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2 text-xs">
                {/* Contact info grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border rounded-lg">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Teléfono Principal:</span>
                    <span className="font-mono font-medium">{selectedContact.telefonoPrincipal}</span>
                  </div>
                  {selectedContact.telefonoSecundario && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Teléfono Secundario:</span>
                      <span className="font-mono font-medium">{selectedContact.telefonoSecundario}</span>
                    </div>
                  )}
                  {selectedContact.email && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Correo Electrónico:</span>
                      <span className="font-medium truncate">{selectedContact.email}</span>
                    </div>
                  )}
                  {selectedContact.empresaNombre && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Empresa Vinculada:</span>
                      <span className="font-medium">{selectedContact.empresaNombre}</span>
                    </div>
                  )}
                </div>

                {/* Direcciones registradas */}
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-600" />
                    Direcciones de Entrega Registradas ({selectedContact.direcciones?.length || 0})
                  </span>

                  {(!selectedContact.direcciones || selectedContact.direcciones.length === 0) ? (
                    <div className="p-3 border rounded text-muted-foreground text-center">
                      No hay direcciones registradas para este contacto.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedContact.direcciones.map((d, i) => (
                        <div key={i} className="p-2.5 bg-card border rounded flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {d.nombreUbicacion || `Dirección #${i + 1}`}
                            </span>
                            {d.latitud && d.longitud && (
                              <a
                                href={`https://www.google.com/maps?q=${d.latitud},${d.longitud}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Ver Mapa
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-muted-foreground">{d.direccionCompleta}</p>
                          {(d.distrito || d.provincia) && (
                            <span className="text-[10px] text-muted-foreground">
                              Ubigeo: {d.distrito ? `${d.distrito}, ` : ""}{d.provincia || ""}
                            </span>
                          )}
                          {d.referencia && (
                            <span className="text-[10px] text-muted-foreground italic">
                              Ref: {d.referencia}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de pedidos y compras */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShoppingBag className="size-3.5 text-emerald-600" />
                    Historial de Pedidos y Despachos
                  </span>

                  {loadingOrders ? (
                    <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>Cargando historial...</span>
                    </div>
                  ) : contactOrders.length === 0 ? (
                    <div className="p-3 border rounded text-muted-foreground text-center">
                      Este contacto aún no registra pedidos ni compras en el sistema.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {contactOrders.map((ord: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded border bg-card text-[11px]"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {ord.numero_pedido || `PEDIDO #${ord.id}`}
                            </span>
                            <span className="text-muted-foreground">
                              {ord.fecha_entrega || ord.created_at?.substring(0, 10)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">
                              {ord.estado_pago || ord.etapa_nombre || "Despacho"}
                            </Badge>
                            <span className="font-bold text-emerald-600">
                              S/ {Number(ord.total || ord.monto || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive text-xs"
                  onClick={() => handleDeleteContact(selectedContact)}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Eliminar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    asChild
                  >
                    <Link href={`/contactos/create?edit_id=${selectedContact.id}`}>
                      <Edit className="size-3.5 mr-1" />
                      Editar Contacto
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal de Importación Masiva Excel */}
      <ImportContactsExcelModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          loadStats();
          loadContacts();
        }}
      />
    </div>
  );
}
