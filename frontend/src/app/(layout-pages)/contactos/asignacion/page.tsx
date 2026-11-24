"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Building2,
  Users,
  UserCheck,
  UserX,
  Target,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Phone,
  MessageSquare,
  Shuffle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserMinus,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";

interface Asesor {
  trabajador_id: number;
  usuario_id: number | null;
  asesor_nombre: string;
  rol_operativo: string;
  cuentas_asignadas: number;
  cuentas_verdes: number;
  cuentas_amarillas: number;
  cuentas_rojas: number;
}

interface CarteraStats {
  total_empresas: number;
  total_asignadas: number;
  total_sin_asignar: number;
  semaforo_verde: number;
  semaforo_amarillo: number;
  semaforo_rojo: number;
  semaforo_gris: number;
  oportunidades_vigentes: number;
  ventas_cerradas: number;
  monto_ventas: number;
  asesores: Asesor[];
}

interface EmpresaCuenta {
  id: number;
  tipoPersona: string;
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  telefonoPrincipal: string;
  email: string;
  cargo: string;
  semaforoExperian: string;
  scoreExperian: number;
  deudaSbs: number;
  calificacionSbs: string;
  rangoVentas: string;
  asignadoAId: number | null;
  asignadoANombre: string | null;
  trabajadorId: number | null;
  trabajadorNombre: string | null;
  fechaAsignacion: string | null;
  diasAsignados: number;
  oportunidadesVigentes: number;
  ventasCerradas: number;
  montoVentas: number;
}

export default function AsignacionCarteraPage() {
  const router = useRouter();

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<CarteraStats | null>(null);
  const [cuentas, setCuentas] = useState<EmpresaCuenta[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filtros y paginación
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [semaforoFilter, setSemaforoFilter] = useState("ALL");
  const [asignadoFilter, setAsignadoFilter] = useState("TODOS");
  const [selectedAsesorId, setSelectedAsesorId] = useState<number | "ALL">("ALL");
  const [diasMinFilter, setDiasMinFilter] = useState<number | "ALL">("ALL");
  const [conOportunidades, setConOportunidades] = useState(false);

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modales
  const [modalAssignOpen, setModalAssignOpen] = useState(false);
  const [modalBatchOpen, setModalBatchOpen] = useState(false);
  const [modalRoundRobinOpen, setModalRoundRobinOpen] = useState(false);
  const [modalUnassignOpen, setModalUnassignOpen] = useState(false);

  // Estado formularios modal
  const [targetAsesorId, setTargetAsesorId] = useState<number | null>(null);
  const [batchLimit, setBatchLimit] = useState<number>(50);
  const [batchSemaforo, setBatchSemaforo] = useState<string>("ALL");
  const [roundRobinLimit, setRoundRobinLimit] = useState<number>(100);
  const [roundRobinSemaforo, setRoundRobinSemaforo] = useState<string>("ALL");
  const [selectedRoundRobinAsesores, setSelectedRoundRobinAsesores] = useState<number[]>([]);

  // Individual assign
  const [singleContactToAssign, setSingleContactToAssign] = useState<EmpresaCuenta | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch("/api/contacts/cartera/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Error al cargar estadísticas:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Cargar cuentas paginadas
  const loadCuentas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("size", pageSize.toString());

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (semaforoFilter !== "ALL") params.set("semaforo", semaforoFilter);
      if (asignadoFilter !== "TODOS") params.set("asignadoFilter", asignadoFilter);
      if (selectedAsesorId !== "ALL") params.set("trabajadorId", selectedAsesorId.toString());
      if (diasMinFilter !== "ALL") params.set("diasMin", diasMinFilter.toString());
      if (conOportunidades) params.set("conOportunidades", "true");

      const res = await fetch(`/api/contacts/cartera?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCuentas(data.content || []);
        setTotalElements(data.totalElements || 0);
        setTotalPages(data.totalPages || 0);
      } else {
        toast.error("Error al cargar la cartera");
      }
    } catch (e) {
      console.error("Error fetching cartera:", e);
      toast.error("Error de conexión al cargar cuentas");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, semaforoFilter, asignadoFilter, selectedAsesorId, diasMinFilter, conOportunidades]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadCuentas();
  }, [loadCuentas]);

  // Manejo de Selección
  const isAllSelected = useMemo(() => {
    if (cuentas.length === 0) return false;
    return cuentas.every((c) => selectedIds.includes(c.id));
  }, [cuentas, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      const currentIds = new Set(cuentas.map((c) => c.id));
      setSelectedIds(selectedIds.filter((id) => !currentIds.has(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...cuentas.map((c) => c.id)]));
      setSelectedIds(combined);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Abrir modal de asignación individual
  const handleOpenSingleAssign = (cuenta: EmpresaCuenta) => {
    setSingleContactToAssign(cuenta);
    setTargetAsesorId(cuenta.trabajadorId || null);
    setModalAssignOpen(true);
  };

  // Confirmar Asignación (Múltiple o Individual)
  const handleConfirmAssign = async () => {
    if (!targetAsesorId) {
      toast.warning("Selecciona un asesor comercial");
      return;
    }
    const targetAsesor = stats?.asesores.find((a) => a.trabajador_id === targetAsesorId);
    const idsToAssign = singleContactToAssign ? [singleContactToAssign.id] : selectedIds;

    if (idsToAssign.length === 0) {
      toast.warning("No hay cuentas seleccionadas");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/contacts/cartera/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: idsToAssign,
          trabajadorId: targetAsesor?.trabajador_id || targetAsesorId,
          usuarioId: targetAsesor?.usuario_id || null,
        }),
      });

      if (res.ok) {
        toast.success(`Se asignaron ${idsToAssign.length} cuentas a ${targetAsesor?.asesor_nombre}`);
        setModalAssignOpen(false);
        setSingleContactToAssign(null);
        setSelectedIds([]);
        loadCuentas();
        loadStats();
      } else {
        toast.error("Error al asignar cuentas");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar Asignación por Lote
  const handleConfirmBatchAssign = async () => {
    if (!targetAsesorId) {
      toast.warning("Selecciona un asesor comercial");
      return;
    }
    if (batchLimit <= 0) {
      toast.warning("Ingresa una cantidad válida mayor a 0");
      return;
    }
    const targetAsesor = stats?.asesores.find((a) => a.trabajador_id === targetAsesorId);

    try {
      setActionLoading(true);
      const res = await fetch("/api/contacts/cartera/assign-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: batchLimit,
          semaforo: batchSemaforo !== "ALL" ? batchSemaforo : null,
          trabajadorId: targetAsesor?.trabajador_id || targetAsesorId,
          usuarioId: targetAsesor?.usuario_id || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`¡Éxito! Se asignaron ${data.updated} cuentas a ${targetAsesor?.asesor_nombre}`);
        setModalBatchOpen(false);
        loadCuentas();
        loadStats();
      } else {
        toast.error(data.message || "Error al asignar por lote");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar Reparto Equitativo Round-Robin
  const handleConfirmRoundRobin = async () => {
    if (selectedRoundRobinAsesores.length === 0) {
      toast.warning("Selecciona al menos un asesor para el reparto");
      return;
    }
    if (roundRobinLimit <= 0) {
      toast.warning("Ingresa una cantidad válida de cuentas a repartir");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/contacts/cartera/assign-round-robin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: roundRobinLimit,
          semaforo: roundRobinSemaforo !== "ALL" ? roundRobinSemaforo : null,
          trabajadorIds: selectedRoundRobinAsesores,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`¡Reparto completado! Se distribuyeron ${data.updated} cuentas equitativamente`);
        setModalRoundRobinOpen(false);
        loadCuentas();
        loadStats();
      } else {
        toast.error("Error en el reparto equitativo");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar Desasignar / Liberar Cuentas
  const handleConfirmUnassign = async () => {
    const idsToUnassign = singleContactToAssign ? [singleContactToAssign.id] : selectedIds;
    if (idsToUnassign.length === 0) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/contacts/cartera/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: idsToUnassign }),
      });

      if (res.ok) {
        toast.success(`Se liberaron ${idsToUnassign.length} cuentas a la bolsa general`);
        setModalUnassignOpen(false);
        setSingleContactToAssign(null);
        setSelectedIds([]);
        loadCuentas();
        loadStats();
      } else {
        toast.error("Error al desasignar cuentas");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Render Semáforo Badge
  const renderSemaforo = (semaforo: string, score: number | null) => {
    const s = (semaforo || "").toUpperCase();
    if (s === "VERDE") {
      return (
        <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
          🟢 Bajo Riesgo {score ? `(${score.toFixed(0)})` : ""}
        </Badge>
      );
    }
    if (s === "AMARILLO") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
          🟡 Riesgo Medio {score ? `(${score.toFixed(0)})` : ""}
        </Badge>
      );
    }
    if (s === "ROJO") {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-medium">
          🔴 Alto Riesgo {score ? `(${score.toFixed(0)})` : ""}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground border-dashed">
        ⚪ Sin Info
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      {/* Header y Acciones Globales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/contactos" className="hover:underline">Contactos</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Gestión de Cartera B2B</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="size-7 text-primary" />
            Asignación y Cartera de Cuentas B2B
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisa, distribuye prospectos y haz seguimiento a las oportunidades y ventas por asesor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadStats();
              loadCuentas();
            }}
            disabled={loading || statsLoading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (stats?.asesores) {
                setSelectedRoundRobinAsesores(stats.asesores.map((a) => a.trabajador_id));
              }
              setModalRoundRobinOpen(true);
            }}
            className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Shuffle className="size-4 mr-2" />
            Reparto Round-Robin
          </Button>

          <Button
            size="sm"
            onClick={() => setModalBatchOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Layers className="size-4 mr-2" />
            Asignar por Lote
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="size-3.5 text-blue-500" />
              Total Cuentas B2B
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {statsLoading ? "..." : (stats?.total_empresas ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Empresas registradas en base
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-3.5" />
              Asignadas a Equipo
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {statsLoading ? "..." : (stats?.total_asignadas ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {stats && stats.total_empresas > 0
              ? `${((stats.total_asignadas / stats.total_empresas) * 100).toFixed(1)}% de cobertura`
              : "0%"}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <UserX className="size-3.5" />
              Sin Asignar (Bolsa)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {statsLoading ? "..." : (stats?.total_sin_asignar ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Disponibles para distribución
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Target className="size-3.5" />
              Oportunidades Activas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {statsLoading ? "..." : (stats?.oportunidades_vigentes ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Negociaciones en curso
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-border col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <DollarSign className="size-3.5" />
              Ventas Cerradas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              S/. {statsLoading ? "..." : Number(stats?.monto_ventas || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {statsLoading ? "..." : stats?.ventas_cerradas ?? 0} ventas cerradas
          </CardContent>
        </Card>
      </div>

      {/* Carga por Asesor (Workload Widget) */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">Carga de Trabajo del Equipo Comercial</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Haz clic en un asesor para filtrar rápidamente sus cuentas
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats?.asesores.map((asesor) => {
              const isSelected = selectedAsesorId === asesor.trabajador_id;
              return (
                <div
                  key={asesor.trabajador_id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedAsesorId("ALL");
                    } else {
                      setSelectedAsesorId(asesor.trabajador_id);
                      setAsignadoFilter("TODOS");
                    }
                    setPage(0);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm line-clamp-1">{asesor.asesor_nombre}</p>
                      <p className="text-xs text-muted-foreground">{asesor.rol_operativo || "Asesor"}</p>
                    </div>
                    <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                      {asesor.cuentas_asignadas} ctas
                    </Badge>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="text-emerald-600 font-medium">🟢 {asesor.cuentas_verdes}</span>
                    <span>•</span>
                    <span className="text-amber-600 font-medium">🟡 {asesor.cuentas_amarillas}</span>
                    <span>•</span>
                    <span className="text-rose-600 font-medium">🔴 {asesor.cuentas_rojas}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtros */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUC, Razón Social, Teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Asignación */}
            <div>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={asignadoFilter}
                onChange={(e) => {
                  setAsignadoFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="TODOS">Todas las Cuentas</option>
                <option value="SIN_ASIGNAR">⚡ Sin Asignar (Bolsa)</option>
                <option value="ASIGNADOS">👤 Asignadas a Asesor</option>
              </select>
            </div>

            {/* Semáforo */}
            <div>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={semaforoFilter}
                onChange={(e) => {
                  setSemaforoFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="ALL">Todos los Semáforos</option>
                <option value="VERDE">🟢 Verde (Bajo Riesgo)</option>
                <option value="AMARILLO">🟡 Amarillo (Riesgo Medio)</option>
                <option value="ROJO">🔴 Rojo (Alto Riesgo)</option>
                <option value="GRIS">⚪ Sin Historial Experian</option>
              </select>
            </div>

            {/* Antigüedad de Asignación */}
            <div>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={diasMinFilter}
                onChange={(e) => {
                  setDiasMinFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value="ALL">Cualquier Antigüedad</option>
                <option value="15">&gt; 15 días asignado</option>
                <option value="30">&gt; 30 días asignado</option>
                <option value="60">&gt; 60 días asignado</option>
                <option value="90">&gt; 90 días asignado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={conOportunidades}
                  onChange={(e) => {
                    setConOportunidades(e.target.checked);
                    setPage(0);
                  }}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Solo cuentas con oportunidades vigentes
              </label>

              {selectedAsesorId !== "ALL" && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  Filtrando por: {stats?.asesores.find((a) => a.trabajador_id === selectedAsesorId)?.asesor_nombre}
                  <button
                    onClick={() => setSelectedAsesorId("ALL")}
                    className="hover:text-destructive font-bold ml-1"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{cuentas.length}</span> de{" "}
              <span className="font-semibold text-foreground">{totalElements.toLocaleString()}</span> cuentas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Bar cuando hay seleccionados */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-primary text-primary-foreground p-3 rounded-xl shadow-xl flex items-center justify-between flex-wrap gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-5" />
            <span className="font-bold text-sm">
              {selectedIds.length} cuenta{selectedIds.length > 1 ? "s" : ""} seleccionada{selectedIds.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSingleContactToAssign(null);
                setModalAssignOpen(true);
              }}
              className="text-xs font-semibold"
            >
              <UserCheck className="size-3.5 mr-1.5" />
              Asignar a Asesor
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setSingleContactToAssign(null);
                setModalUnassignOpen(true);
              }}
              className="text-xs font-semibold"
            >
              <UserMinus className="size-3.5 mr-1.5" />
              Liberar / Desasignar
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-xs text-primary-foreground hover:bg-primary-foreground/20"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de Cuentas */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[44px] text-center">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center p-1 hover:text-primary"
                    title={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="min-w-[260px]">Empresa / RUC</TableHead>
                <TableHead className="min-w-[140px]">Semáforo Experian</TableHead>
                <TableHead className="min-w-[180px]">Asesor Asignado</TableHead>
                <TableHead className="min-w-[140px]">Fecha / Días</TableHead>
                <TableHead className="min-w-[130px] text-center">Oportunidades</TableHead>
                <TableHead className="min-w-[140px]">Ventas Cerradas</TableHead>
                <TableHead className="w-[80px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Cargando cuentas empresariales...
                  </TableCell>
                </TableRow>
              ) : cuentas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground/60" />
                    No se encontraron cuentas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                cuentas.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const isAssigned = c.trabajadorId != null || c.asignadoAId != null;
                  const asesorName = c.trabajadorNombre || c.asignadoANombre;

                  return (
                    <TableRow
                      key={c.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleSelect(c.id)}
                          className="flex items-center justify-center p-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>

                      {/* Empresa */}
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/contactos/view?id=${c.id}`}
                            className="font-semibold text-sm hover:underline hover:text-primary transition-colors line-clamp-1"
                          >
                            {c.razonSocial || "Sin Razón Social"}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                              RUC: {c.numeroDocumento || "—"}
                            </span>
                            {c.cargo && (
                              <span className="truncate max-w-[150px]">
                                • {c.cargo}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Semáforo Experian */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {renderSemaforo(c.semaforoExperian, c.scoreExperian)}
                          {c.deudaSbs != null && c.deudaSbs > 0 && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Deuda SBS: S/. {Number(c.deudaSbs).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Asesor */}
                      <TableCell>
                        {isAssigned ? (
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {asesorName?.charAt(0) || "A"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs text-foreground">
                                {asesorName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Asesor Comercial
                              </span>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                            ⚡ Sin Asignar
                          </Badge>
                        )}
                      </TableCell>

                      {/* Fecha y Días Asignados */}
                      <TableCell>
                        {c.fechaAsignacion ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.fechaAsignacion).toLocaleDateString()}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] w-fit font-medium ${
                                c.diasAsignados > 60
                                  ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                  : c.diasAsignados > 30
                                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Clock className="size-3 mr-1" />
                              {c.diasAsignados === 0 ? "Hoy" : `${c.diasAsignados} días`}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Oportunidades Vigentes */}
                      <TableCell className="text-center">
                        {c.oportunidadesVigentes > 0 ? (
                          <Link
                            href={`/opportunities/view?search=${encodeURIComponent(c.razonSocial || c.numeroDocumento)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
                          >
                            <Target className="size-3" />
                            {c.oportunidadesVigentes} activa{c.oportunidadesVigentes > 1 ? "s" : ""}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>

                      {/* Ventas Cerradas */}
                      <TableCell>
                        {c.ventasCerradas > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                              S/. {Number(c.montoVentas).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.ventasCerradas} venta{c.ventasCerradas > 1 ? "s" : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Acciones de Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleOpenSingleAssign(c)}>
                              <UserCheck className="size-4 mr-2 text-primary" />
                              {isAssigned ? "Reasignar Asesor" : "Asignar Asesor"}
                            </DropdownMenuItem>

                            {isAssigned && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSingleContactToAssign(c);
                                  setModalUnassignOpen(true);
                                }}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <UserMinus className="size-4 mr-2" />
                                Liberar Cuenta
                              </DropdownMenuItem>
                            )}

                            {c.telefonoPrincipal && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const cleanPhone = c.telefonoPrincipal.replace(/\D/g, "");
                                  const text = encodeURIComponent(
                                    `Estimados ${c.razonSocial}, nos comunicamos desde NEXT LEVEL para coordinar los requerimientos de su empresa.`
                                  );
                                  window.open(`https://wa.me/51${cleanPhone}?text=${text}`, "_blank");
                                }}
                              >
                                <MessageSquare className="size-4 mr-2 text-emerald-600" />
                                Enviar WhatsApp
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/contactos/view?id=${c.id}`} className="cursor-pointer">
                                <ExternalLink className="size-4 mr-2" />
                                Ver Ficha Completa
                              </Link>
                            </DropdownMenuItem>
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

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 rounded border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
            >
              <option value={20}>20 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
            <span>de {totalElements.toLocaleString()} cuentas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="size-4 mr-1" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Página <span className="font-semibold text-foreground">{page + 1}</span> de{" "}
              <span className="font-semibold text-foreground">{Math.max(1, totalPages)}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="h-8 px-2.5 text-xs"
            >
              Siguiente
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL 1: ASIGNAR ASESOR (INDIVIDUAL O SELECCIONADOS) */}
      <Dialog open={modalAssignOpen} onOpenChange={setModalAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              Asignar Cuentas a Asesor Comercial
            </DialogTitle>
            <DialogDescription>
              {singleContactToAssign
                ? `Asignar ${singleContactToAssign.razonSocial}`
                : `Se asignarán las ${selectedIds.length} cuentas seleccionadas.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Selecciona el Asesor Responsable:
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary"
                value={targetAsesorId || ""}
                onChange={(e) => setTargetAsesorId(Number(e.target.value))}
              >
                <option value="">-- Selecciona un Asesor --</option>
                {stats?.asesores.map((a) => (
                  <option key={a.trabajador_id} value={a.trabajador_id}>
                    {a.asesor_nombre} ({a.cuentas_asignadas} cuentas asignadas actualmente)
                  </option>
                ))}
              </select>
            </div>

            {targetAsesorId && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <span className="font-medium text-foreground">Estado de asignación:</span>
                <p className="text-muted-foreground">
                  La fecha de asignación se fijará al momento actual y los días asignados iniciarán en 0.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAssignOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAssign} disabled={!targetAsesorId || actionLoading}>
              {actionLoading ? "Asignando..." : "Confirmar Asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ASIGNACIÓN POR LOTE */}
      <Dialog open={modalBatchOpen} onOpenChange={setModalBatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Asignación Rápida por Lote
            </DialogTitle>
            <DialogDescription>
              Asigna un paquete de cuentas disponibles (sin asignar) a un asesor específico.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Cantidad de Cuentas a Asignar:
              </label>
              <div className="flex gap-2 mb-2">
                {[20, 50, 100, 200, 500].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant={batchLimit === num ? "default" : "outline"}
                    onClick={() => setBatchLimit(num)}
                    className="flex-1 text-xs"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                max={5000}
                value={batchLimit}
                onChange={(e) => setBatchLimit(Number(e.target.value))}
                placeholder="O escribe una cantidad personalizada..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Filtro de Calificación Experian:
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={batchSemaforo}
                onChange={(e) => setBatchSemaforo(e.target.value)}
              >
                <option value="ALL">Cualquier Semáforo (Todas)</option>
                <option value="VERDE">🟢 Solo Verde (Bajo Riesgo)</option>
                <option value="AMARILLO">🟡 Solo Amarillo (Riesgo Medio)</option>
                <option value="ROJO">🔴 Solo Rojo (Alto Riesgo)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Asesor Destino:
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={targetAsesorId || ""}
                onChange={(e) => setTargetAsesorId(Number(e.target.value))}
              >
                <option value="">-- Selecciona Asesor --</option>
                {stats?.asesores.map((a) => (
                  <option key={a.trabajador_id} value={a.trabajador_id}>
                    {a.asesor_nombre} ({a.cuentas_asignadas} actuales)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalBatchOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmBatchAssign} disabled={!targetAsesorId || actionLoading}>
              {actionLoading ? "Asignando..." : `Asignar ${batchLimit} Cuentas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REPARTO EQUITATIVO ROUND-ROBIN */}
      <Dialog open={modalRoundRobinOpen} onOpenChange={setModalRoundRobinOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="size-5 text-indigo-500" />
              Reparto Equitativo Round-Robin
            </DialogTitle>
            <DialogDescription>
              Distribuye automáticamente y en partes iguales un bloque de cuentas sin asignar entre los asesores seleccionados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Total de cuentas a repartir:
              </label>
              <div className="flex gap-2 mb-2">
                {[50, 100, 200, 500, 1000].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant={roundRobinLimit === num ? "default" : "outline"}
                    onClick={() => setRoundRobinLimit(num)}
                    className="flex-1 text-xs"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                value={roundRobinLimit}
                onChange={(e) => setRoundRobinLimit(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Filtro de Semáforo:
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={roundRobinSemaforo}
                onChange={(e) => setRoundRobinSemaforo(e.target.value)}
              >
                <option value="ALL">Cualquier Semáforo</option>
                <option value="VERDE">🟢 Solo Verde (Bajo Riesgo)</option>
                <option value="AMARILLO">🟡 Solo Amarillo (Riesgo Medio)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                Asesores que participan en el reparto:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {stats?.asesores.map((a) => {
                  const isChecked = selectedRoundRobinAsesores.includes(a.trabajador_id);
                  return (
                    <label
                      key={a.trabajador_id}
                      className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoundRobinAsesores([...selectedRoundRobinAsesores, a.trabajador_id]);
                            } else {
                              setSelectedRoundRobinAsesores(selectedRoundRobinAsesores.filter((id) => id !== a.trabajador_id));
                            }
                          }}
                          className="rounded border-input text-primary"
                        />
                        <span className="font-medium text-foreground">{a.asesor_nombre}</span>
                      </div>
                      <span className="text-muted-foreground">({a.cuentas_asignadas} ctas actuales)</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedRoundRobinAsesores.length > 0 && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                ⚡ Cada uno de los {selectedRoundRobinAsesores.length} asesores recibirá aproximadamente{" "}
                <span className="font-bold">
                  {Math.floor(roundRobinLimit / selectedRoundRobinAsesores.length)}
                </span>{" "}
                cuentas.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRoundRobinOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRoundRobin}
              disabled={selectedRoundRobinAsesores.length === 0 || actionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {actionLoading ? "Distribuyendo..." : "Ejecutar Reparto Equitativo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: LIBERAR / DESASIGNAR */}
      <Dialog open={modalUnassignOpen} onOpenChange={setModalUnassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <UserMinus className="size-5" />
              Liberar Cuentas a la Bolsa General
            </DialogTitle>
            <DialogDescription>
              {singleContactToAssign
                ? `¿Estás seguro de desasignar la cuenta de ${singleContactToAssign.razonSocial}?`
                : `¿Estás seguro de liberar las ${selectedIds.length} cuentas seleccionadas?`}
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground py-2">
            Las cuentas quedarán en estado <strong>Sin Asignar</strong> para que puedan ser redistribuidas o reasignadas a otro asesor. Los datos de oportunidades y ventas históricas permanecerán intactos.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalUnassignOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmUnassign} disabled={actionLoading}>
              {actionLoading ? "Liberando..." : "Confirmar y Liberar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
