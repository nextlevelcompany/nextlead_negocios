"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { saveRolePermissionsCache } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Save,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Settings,
  ChevronRight,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  Copy,
  Info,
  MessageSquare,
  Boxes,
  Truck,
  Target,
  LayoutDashboard,
  ShoppingCart,
  CalendarCheck,
} from "lucide-react";

// Estructura completa de permisos por módulo
export interface ModulePermissions {
  dashboard: {
    ver_analitica: boolean;
    ver_metricas: boolean;
  };
  whatsapp: {
    chat: boolean;
    integraciones_ia: boolean;
  };
  clientes: {
    ver_todos: boolean;
    crear: boolean;
    chatear_whatsapp: boolean;
    exportar: boolean;
    asignar_cartera: boolean;
  };
  oportunidades: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    exportar: boolean;
    configurar: boolean;
  };
  ventas: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    instalar: boolean; // Pase a instaladas y validación
    anular: boolean;
    reasignar: boolean;
    exportar: boolean;
  };
  pedidos: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    anular: boolean;
    despachar: boolean;
  };
  productos: {
    ver_catalogo: boolean;
    gestionar_productos: boolean;
    gestionar_categorias: boolean;
  };
  finanzas: {
    ver_flujo: boolean;
    registrar_movimiento: boolean;
    ver_cuentas_bancarias: boolean;
    anular_movimiento: boolean;
    compras: boolean;
    gastos: boolean;
    deudas: boolean;
  };
  rentabilidad: {
    ver_margenes: boolean;
    ver_costos: boolean;
    simulador: boolean;
    configurar_perfiles: boolean;
  };
  payroll: {
    ver_personal: boolean;
    gestionar_personal: boolean;
    asistencia: boolean;
    ver_liquidaciones: boolean;
    pagar_comisiones: boolean;
  };
  admin: {
    gestionar_usuarios: boolean;
    gestionar_roles: boolean;
    ajustes_sistema: boolean;
  };
}

export interface RoleData {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  color?: string;
  badge_color?: string;
  es_sistema: boolean;
  sales_scope: "own" | "team" | "all";
  permisos: ModulePermissions;
  usuarios_count: number;
}

const DEFAULT_EMPTY_PERMS: ModulePermissions = {
  dashboard: { ver_analitica: true, ver_metricas: false },
  whatsapp: { chat: true, integraciones_ia: false },
  clientes: { ver_todos: false, crear: true, chatear_whatsapp: true, exportar: false, asignar_cartera: false },
  oportunidades: { ver: true, crear: true, editar: true, eliminar: false, exportar: false, configurar: false },
  ventas: { ver: true, crear: true, editar: true, instalar: false, anular: false, reasignar: false, exportar: false },
  pedidos: { ver: true, crear: true, editar: false, anular: false, despachar: false },
  productos: { ver_catalogo: true, gestionar_productos: false, gestionar_categorias: false },
  finanzas: { ver_flujo: false, registrar_movimiento: false, ver_cuentas_bancarias: false, anular_movimiento: false, compras: false, gastos: false, deudas: false },
  rentabilidad: { ver_margenes: false, ver_costos: false, simulador: false, configurar_perfiles: false },
  payroll: { ver_personal: false, gestionar_personal: false, asistencia: false, ver_liquidaciones: false, pagar_comisiones: false },
  admin: { gestionar_usuarios: false, gestionar_roles: false, ajustes_sistema: false },
};

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleCodigo, setSelectedRoleCodigo] = useState<string>("ADMIN");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado de edición del rol seleccionado
  const [activePerms, setActivePerms] = useState<ModulePermissions>(DEFAULT_EMPTY_PERMS);
  const [activeSalesScope, setActiveSalesScope] = useState<"own" | "team" | "all">("all");
  const [activeNombre, setActiveNombre] = useState<string>("");
  const [activeDescripcion, setActiveDescripcion] = useState<string>("");

  // Modal para Nuevo Rol Personalizado
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleCodigo, setNewRoleCodigo] = useState("");
  const [newRoleNombre, setNewRoleNombre] = useState("");
  const [newRoleDescripcion, setNewRoleDescripcion] = useState("");
  const [newRoleBase, setNewRoleBase] = useState("VENDEDOR");
  const [creating, setCreating] = useState(false);

  // Modal de Confirmación de Eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleData | null>(null);

  // Cargar lista de roles desde la API
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/roles");
      const list: RoleData[] = (Array.isArray(res.data) ? res.data : []).map((r: any) => {
        let permsParsed: ModulePermissions = { ...DEFAULT_EMPTY_PERMS };
        try {
          let incoming: any = {};
          if (typeof r.permisos === "string") {
            incoming = JSON.parse(r.permisos);
          } else if (r.permisos && typeof r.permisos === "object") {
            incoming = r.permisos;
          }
          permsParsed = {
            dashboard: { ...DEFAULT_EMPTY_PERMS.dashboard, ...(incoming.dashboard || {}) },
            whatsapp: { ...DEFAULT_EMPTY_PERMS.whatsapp, ...(incoming.whatsapp || {}) },
            clientes: { ...DEFAULT_EMPTY_PERMS.clientes, ...(incoming.clientes || {}) },
            oportunidades: { ...DEFAULT_EMPTY_PERMS.oportunidades, ...(incoming.oportunidades || {}) },
            ventas: { ...DEFAULT_EMPTY_PERMS.ventas, ...(incoming.ventas || {}) },
            pedidos: { ...DEFAULT_EMPTY_PERMS.pedidos, ...(incoming.pedidos || {}) },
            productos: { ...DEFAULT_EMPTY_PERMS.productos, ...(incoming.productos || {}) },
            finanzas: { ...DEFAULT_EMPTY_PERMS.finanzas, ...(incoming.finanzas || {}) },
            rentabilidad: { ...DEFAULT_EMPTY_PERMS.rentabilidad, ...(incoming.rentabilidad || {}) },
            payroll: { ...DEFAULT_EMPTY_PERMS.payroll, ...(incoming.payroll || {}) },
            admin: { ...DEFAULT_EMPTY_PERMS.admin, ...(incoming.admin || {}) },
          };
        } catch {
          // ignore
        }

        return {
          id: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          descripcion: r.descripcion || "",
          color: r.color || "#3b82f6",
          badge_color: r.badge_color || "bg-blue-600",
          es_sistema: Boolean(r.es_sistema),
          sales_scope: r.sales_scope || "own",
          permisos: permsParsed,
          usuarios_count: Number(r.usuarios_count || 0),
        };
      });

      setRoles(list);

      // Si el rol seleccionado no existe, seleccionar el primero
      if (list.length > 0) {
        const found = list.find((item) => item.codigo === selectedRoleCodigo) || list[0];
        setSelectedRoleCodigo(found.codigo);
        setActivePerms(found.permisos);
        setActiveSalesScope(found.sales_scope);
        setActiveNombre(found.nombre);
        setActiveDescripcion(found.descripcion);
      }
    } catch (err: any) {
      console.error("Error al cargar roles:", err);
      toast.error("Error al consultar roles y niveles de acceso.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Al cambiar el rol seleccionado en la barra lateral
  const handleSelectRole = (r: RoleData) => {
    setSelectedRoleCodigo(r.codigo);
    setActivePerms(r.permisos);
    setActiveSalesScope(r.sales_scope);
    setActiveNombre(r.nombre);
    setActiveDescripcion(r.descripcion);
  };

  // Rol activo actual
  const currentRole = useMemo(() => {
    return roles.find((r) => r.codigo === selectedRoleCodigo) || roles[0];
  }, [roles, selectedRoleCodigo]);

  // Actualizar un permiso específico dentro de un módulo
  const togglePermission = (moduleName: keyof ModulePermissions, permKey: string) => {
    setActivePerms((prev) => {
      const moduleObj = { ...(prev[moduleName] as any) };
      moduleObj[permKey] = !moduleObj[permKey];
      return {
        ...prev,
        [moduleName]: moduleObj,
      };
    });
  };

  // Conceder todos los permisos del módulo
  const setModuleAll = (moduleName: keyof ModulePermissions, value: boolean) => {
    setActivePerms((prev) => {
      const moduleObj = { ...(prev[moduleName] as any) };
      Object.keys(moduleObj).forEach((k) => {
        moduleObj[k] = value;
      });
      return {
        ...prev,
        [moduleName]: moduleObj,
      };
    });
  };

  // Guardar Cambios del Rol Activo
  const handleSaveRole = async () => {
    if (!currentRole) return;
    try {
      setSaving(true);
      const payload = {
        nombre: activeNombre.trim(),
        descripcion: activeDescripcion.trim(),
        sales_scope: activeSalesScope,
        permisos: JSON.stringify(activePerms),
      };

      await api.put(`/api/admin/roles/${currentRole.codigo}`, payload);
      saveRolePermissionsCache(currentRole.codigo, activePerms);
      toast.success(`Permisos del rol [${currentRole.codigo}] guardados con éxito.`);

      // Actualizar estado local
      setRoles((prev) =>
        prev.map((r) =>
          r.codigo === currentRole.codigo
            ? {
                ...r,
                nombre: activeNombre.trim(),
                descripcion: activeDescripcion.trim(),
                sales_scope: activeSalesScope,
                permisos: activePerms,
              }
            : r
        )
      );
    } catch (err: any) {
      console.error("Error al guardar rol:", err);
      toast.error("No se pudieron guardar las modificaciones del rol.");
    } finally {
      setSaving(false);
    }
  };

  // Crear Nuevo Rol Personalizado
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCodigo.trim() || !newRoleNombre.trim()) {
      toast.warning("Debe ingresar un código y un nombre para el nuevo rol.");
      return;
    }

    const cleanCodigo = newRoleCodigo.trim().toUpperCase().replace(/\s+/g, "_");

    try {
      setCreating(true);

      // Copiar plantilla de permisos del rol base elegido
      const baseRole = roles.find((r) => r.codigo === newRoleBase);
      const basePerms = baseRole ? baseRole.permisos : DEFAULT_EMPTY_PERMS;
      const baseScope = baseRole ? baseRole.sales_scope : "own";

      const payload = {
        codigo: cleanCodigo,
        nombre: newRoleNombre.trim(),
        descripcion: newRoleDescripcion.trim() || `Rol personalizado basado en ${newRoleBase}`,
        color: "#6366f1",
        badge_color: "bg-indigo-600",
        sales_scope: baseScope,
        permisos: JSON.stringify(basePerms),
      };

      await api.post("/api/admin/roles", payload);
      toast.success(`Rol personalizado [${cleanCodigo}] creado con éxito.`);

      setCreateModalOpen(false);
      setNewRoleCodigo("");
      setNewRoleNombre("");
      setNewRoleDescripcion("");

      await fetchRoles();
      setSelectedRoleCodigo(cleanCodigo);
    } catch (err: any) {
      console.error("Error al crear rol:", err);
      const msg = err.response?.data?.message || "No se pudo crear el rol personalizado.";
      toast.error(typeof msg === "string" ? msg : "Error al crear rol.");
    } finally {
      setCreating(false);
    }
  };

  // Eliminar Rol Personalizado
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/api/admin/roles/${roleToDelete.codigo}`);
      toast.success(`Rol [${roleToDelete.codigo}] eliminado con éxito.`);
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      await fetchRoles();
    } catch (err: any) {
      console.error("Error al eliminar rol:", err);
      const msg = err.response?.data?.message || "No se pudo eliminar el rol.";
      toast.error(typeof msg === "string" ? msg : "Error al eliminar rol.");
    }
  };

  // Filtrado de roles para el buscador
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(
      (r) =>
        r.codigo.toLowerCase().includes(term) ||
        r.nombre.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  // Badge visual por código de rol
  const getRoleBadge = (r: RoleData) => {
    switch (r.codigo) {
      case "ADMIN":
        return <Badge className="bg-purple-600 text-white font-bold">{r.codigo}</Badge>;
      case "SUPERVISOR":
        return <Badge className="bg-blue-600 text-white font-bold">{r.codigo}</Badge>;
      case "VENDEDOR":
        return <Badge className="bg-emerald-600 text-white font-bold">{r.codigo}</Badge>;
      case "FINANZAS":
        return <Badge className="bg-amber-600 text-white font-bold">{r.codigo}</Badge>;
      case "OPERACIONES":
        return <Badge className="bg-cyan-600 text-white font-bold">{r.codigo}</Badge>;
      default:
        return <Badge className="bg-indigo-600 text-white font-bold">{r.codigo}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            Roles & Niveles de Acceso a la Información
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configura qué módulos, datos confidenciales y acciones operativas puede realizar cada perfil de usuario en el CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRoles} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <Plus className="size-4" />
            Nuevo Rol Personalizado
          </Button>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen Superior */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roles Configurados
            </CardTitle>
            <Shield className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-[11px] text-muted-foreground">Perfiles de autorización</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roles del Sistema
            </CardTitle>
            <Lock className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-purple-600">
              {roles.filter((r) => r.es_sistema).length}
            </div>
            <p className="text-[11px] text-muted-foreground">Base oficial del CRM</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roles Personalizados
            </CardTitle>
            <Users className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-indigo-600">
              {roles.filter((r) => !r.es_sistema).length}
            </div>
            <p className="text-[11px] text-muted-foreground">Creados por la empresa</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Directorio de Cuentas
            </CardTitle>
            <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
              Ver Usuarios <ChevronRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {roles.reduce((acc, curr) => acc + curr.usuarios_count, 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">Usuarios con rol asignado</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Panel de Dos Columnas: Lista de Roles (Izq) & Matriz de Accesos (Der) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Lista de Roles */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          <Card className="bg-card border shadow-sm">
            <CardHeader className="p-3.5 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar perfil..."
                  className="pl-8 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Cargando roles...
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron roles coincidentes.
                </div>
              ) : (
                filteredRoles.map((r) => {
                  const isSelected = r.codigo === selectedRoleCodigo;

                  return (
                    <div
                      key={r.codigo}
                      onClick={() => handleSelectRole(r)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary/30 shadow-sm"
                          : "hover:bg-muted/50 border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {getRoleBadge(r)}
                          <span className="font-bold text-sm text-foreground truncate">{r.nombre}</span>
                        </div>
                        {r.es_sistema ? (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground uppercase px-1 py-0">
                            Base
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] text-indigo-600 bg-indigo-50 border-indigo-200 px-1 py-0">
                              Custom
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoleToDelete(r);
                                setDeleteModalOpen(true);
                              }}
                              title="Eliminar rol personalizado"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {r.descripcion}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/50 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          <strong>{r.usuarios_count}</strong> {r.usuarios_count === 1 ? "usuario" : "usuarios"}
                        </span>
                        <span className="font-medium text-foreground">
                          {r.sales_scope === "own" && "Alcance: Solo suyas"}
                          {r.sales_scope === "team" && "Alcance: Su equipo"}
                          {r.sales_scope === "all" && "Alcance: Total"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Matriz Detallada de Configuración de Accesos */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          {currentRole ? (
            <Card className="bg-card border shadow-sm">
              {/* Encabezado del Perfil Activo */}
              <CardHeader className="p-5 border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(currentRole)}
                      <h2 className="text-lg font-bold text-foreground">{activeNombre || currentRole.nombre}</h2>
                      {currentRole.es_sistema && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                          Código: {currentRole.codigo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeDescripcion || currentRole.descripcion}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleSaveRole}
                      disabled={saving}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm w-full sm:w-auto"
                    >
                      {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Guardar Permisos
                    </Button>
                  </div>
                </div>

                {/* Edición de Nombre y Descripción para roles personalizados */}
                {!currentRole.es_sistema && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t">
                    <div>
                      <Label className="text-xs font-semibold">Nombre del Perfil</Label>
                      <Input
                        value={activeNombre}
                        onChange={(e) => setActiveNombre(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Descripción</Label>
                      <Input
                        value={activeDescripcion}
                        onChange={(e) => setActiveDescripcion(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {/* 1. SECCIÓN: ÁMBITO Y VISIBILIDAD DE VENTAS (REQUERIMIENTO CLAVE) */}
                <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="size-4 text-primary" />
                        Ámbito de Visibilidad de Ventas & Clientes
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define si este perfil puede ver únicamente sus ventas, las de todo su equipo comercial o todas las ventas de la empresa.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        activeSalesScope === "own"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-semibold"
                          : "hover:bg-muted bg-card"
                      }`}
                    >
                      <input
                        type="radio"
                        name="active_scope"
                        checked={activeSalesScope === "own"}
                        onChange={() => setActiveSalesScope("own")}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <div className="font-bold">Solo sus propias ventas</div>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Estricto para Vendedores. No tiene acceso a ventas de otros compañeros ni equipos.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        activeSalesScope === "team"
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-800 dark:text-blue-200 font-semibold"
                          : "hover:bg-muted bg-card"
                      }`}
                    >
                      <input
                        type="radio"
                        name="active_scope"
                        checked={activeSalesScope === "team"}
                        onChange={() => setActiveSalesScope("team")}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <div className="font-bold">Ventas de su equipo</div>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Para Supervisores. Visualiza y audita las ventas de los asesores asignados a su grupo.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        activeSalesScope === "all"
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-200 font-semibold"
                          : "hover:bg-muted bg-card"
                      }`}
                    >
                      <input
                        type="radio"
                        name="active_scope"
                        checked={activeSalesScope === "all"}
                        onChange={() => setActiveSalesScope("all")}
                        className="mt-0.5 text-purple-600"
                      />
                      <div>
                        <div className="font-bold">Todas las ventas (Empresa)</div>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Para Administradores, Gerencia y Finanzas. Visibilidad global de todo el negocio.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 2. MATRIZ DE PERMISOS POR MÓDULOS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                    <Layers className="size-4 text-primary" />
                    Permisos de Operación por Módulo (Menú Lateral Completo)
                  </h3>

                  {/* 1. Módulo Dashboard */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="size-4 text-indigo-600" />
                        <span className="font-bold text-sm">Dashboard & Métricas Principales</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("dashboard", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("dashboard", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Analítica</span>
                          <p className="text-[10px] text-muted-foreground">Acceso al panel /dashboard/analytics</p>
                        </div>
                        <Switch
                          checked={activePerms.dashboard?.ver_analitica ?? true}
                          onCheckedChange={() => togglePermission("dashboard", "ver_analitica")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Métricas de Negocio</span>
                          <p className="text-[10px] text-muted-foreground">Acceso a KPIs y /dashboard/eCommerce</p>
                        </div>
                        <Switch
                          checked={activePerms.dashboard?.ver_metricas ?? false}
                          onCheckedChange={() => togglePermission("dashboard", "ver_metricas")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Módulo WhatsApp */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-emerald-600" />
                        <span className="font-bold text-sm">Módulo WhatsApp & Conversaciones</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("whatsapp", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("whatsapp", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Chatbox WhatsApp</span>
                          <p className="text-[10px] text-muted-foreground">Bandeja de chats y respuestas directas</p>
                        </div>
                        <Switch
                          checked={activePerms.whatsapp?.chat ?? true}
                          onCheckedChange={() => togglePermission("whatsapp", "chat")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Integraciones & Respuestas IA</span>
                          <p className="text-[10px] text-muted-foreground">Configuración de agentes y prompts IA</p>
                        </div>
                        <Switch
                          checked={activePerms.whatsapp?.integraciones_ia ?? false}
                          onCheckedChange={() => togglePermission("whatsapp", "integraciones_ia")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Módulo Contactos & Clientes */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-cyan-600" />
                        <span className="font-bold text-sm">Módulo Contactos & Clientes</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("clientes", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("clientes", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Todos los Contactos</span>
                          <p className="text-[10px] text-muted-foreground">Si está inactivo, solo ve asignados</p>
                        </div>
                        <Switch
                          checked={activePerms.clientes?.ver_todos ?? false}
                          onCheckedChange={() => togglePermission("clientes", "ver_todos")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Crear contactos</span>
                        <Switch
                          checked={activePerms.clientes?.crear ?? true}
                          onCheckedChange={() => togglePermission("clientes", "crear")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Chatear por WhatsApp</span>
                        <Switch
                          checked={activePerms.clientes?.chatear_whatsapp ?? true}
                          onCheckedChange={() => togglePermission("clientes", "chatear_whatsapp")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Exportar contactos</span>
                        <Switch
                          checked={activePerms.clientes?.exportar ?? false}
                          onCheckedChange={() => togglePermission("clientes", "exportar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Asignación de Cartera</span>
                          <p className="text-[10px] text-muted-foreground">Reasignación masiva de clientes</p>
                        </div>
                        <Switch
                          checked={activePerms.clientes?.asignar_cartera ?? false}
                          onCheckedChange={() => togglePermission("clientes", "asignar_cartera")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Módulo Oportunidades & Cotizaciones */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-amber-600" />
                        <span className="font-bold text-sm">Módulo Oportunidades & Pipeline</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("oportunidades", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("oportunidades", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Consultar Oportunidades</span>
                          <p className="text-[10px] text-muted-foreground">Acceso a Kanban y vista lista</p>
                        </div>
                        <Switch
                          checked={activePerms.oportunidades?.ver ?? true}
                          onCheckedChange={() => togglePermission("oportunidades", "ver")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Crear oportunidad</span>
                        <Switch
                          checked={activePerms.oportunidades?.crear ?? true}
                          onCheckedChange={() => togglePermission("oportunidades", "crear")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Editar oportunidad</span>
                        <Switch
                          checked={activePerms.oportunidades?.editar ?? true}
                          onCheckedChange={() => togglePermission("oportunidades", "editar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold text-rose-600">Eliminar oportunidad</span>
                          <p className="text-[10px] text-muted-foreground">Borrar fichas comerciales</p>
                        </div>
                        <Switch
                          checked={activePerms.oportunidades?.eliminar ?? false}
                          onCheckedChange={() => togglePermission("oportunidades", "eliminar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Exportar reportes</span>
                        <Switch
                          checked={activePerms.oportunidades?.exportar ?? false}
                          onCheckedChange={() => togglePermission("oportunidades", "exportar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Configurar Embudos</span>
                          <p className="text-[10px] text-muted-foreground">Etapas, columnas y etiquetas</p>
                        </div>
                        <Switch
                          checked={activePerms.oportunidades?.configurar ?? false}
                          onCheckedChange={() => togglePermission("oportunidades", "configurar")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Módulo Ventas */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-emerald-600" />
                        <span className="font-bold text-sm">Módulo Ventas & Facturación</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("ventas", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("ventas", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Consultar ventas</span>
                        <Switch
                          checked={activePerms.ventas?.ver ?? true}
                          onCheckedChange={() => togglePermission("ventas", "ver")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Registrar ventas</span>
                        <Switch
                          checked={activePerms.ventas?.crear ?? true}
                          onCheckedChange={() => togglePermission("ventas", "crear")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Editar ventas</span>
                        <Switch
                          checked={activePerms.ventas?.editar ?? true}
                          onCheckedChange={() => togglePermission("ventas", "editar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Cerrar / Instalar</span>
                          <p className="text-[10px] text-muted-foreground">Validar instalación y entrega</p>
                        </div>
                        <Switch
                          checked={activePerms.ventas?.instalar ?? false}
                          onCheckedChange={() => togglePermission("ventas", "instalar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold text-rose-600">Anular ventas</span>
                          <p className="text-[10px] text-muted-foreground">Marcar como cancelada</p>
                        </div>
                        <Switch
                          checked={activePerms.ventas?.anular ?? false}
                          onCheckedChange={() => togglePermission("ventas", "anular")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Reasignar asesor</span>
                        <Switch
                          checked={activePerms.ventas?.reasignar ?? false}
                          onCheckedChange={() => togglePermission("ventas", "reasignar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Exportar ventas</span>
                        <Switch
                          checked={activePerms.ventas?.exportar ?? false}
                          onCheckedChange={() => togglePermission("ventas", "exportar")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Módulo Pedidos & Despachos */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-blue-600" />
                        <span className="font-bold text-sm">Módulo Pedidos & Operaciones</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("pedidos", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("pedidos", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Consultar pedidos</span>
                        <Switch
                          checked={activePerms.pedidos?.ver ?? true}
                          onCheckedChange={() => togglePermission("pedidos", "ver")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Crear pedidos</span>
                        <Switch
                          checked={activePerms.pedidos?.crear ?? true}
                          onCheckedChange={() => togglePermission("pedidos", "crear")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <span className="text-xs">Editar pedidos</span>
                        <Switch
                          checked={activePerms.pedidos?.editar ?? false}
                          onCheckedChange={() => togglePermission("pedidos", "editar")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold text-rose-600">Anular pedidos</span>
                          <p className="text-[10px] text-muted-foreground">Cancelar orden</p>
                        </div>
                        <Switch
                          checked={activePerms.pedidos?.anular ?? false}
                          onCheckedChange={() => togglePermission("pedidos", "anular")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Despachar / Entregar</span>
                          <p className="text-[10px] text-muted-foreground">Asignar chofer y marcar entrega</p>
                        </div>
                        <Switch
                          checked={activePerms.pedidos?.despachar ?? false}
                          onCheckedChange={() => togglePermission("pedidos", "despachar")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. Módulo Productos & Catálogo */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Boxes className="size-4 text-teal-600" />
                        <span className="font-bold text-sm">Módulo Productos & Catálogo</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("productos", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("productos", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Catálogo</span>
                          <p className="text-[10px] text-muted-foreground">Consultar productos y precios</p>
                        </div>
                        <Switch
                          checked={activePerms.productos?.ver_catalogo ?? true}
                          onCheckedChange={() => togglePermission("productos", "ver_catalogo")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Gestionar Productos</span>
                          <p className="text-[10px] text-muted-foreground">Crear, editar precios y stock</p>
                        </div>
                        <Switch
                          checked={activePerms.productos?.gestionar_productos ?? false}
                          onCheckedChange={() => togglePermission("productos", "gestionar_productos")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Gestionar Categorías</span>
                          <p className="text-[10px] text-muted-foreground">Crear y organizar categorías</p>
                        </div>
                        <Switch
                          checked={activePerms.productos?.gestionar_categorias ?? false}
                          onCheckedChange={() => togglePermission("productos", "gestionar_categorias")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 8. Módulo Finanzas & Caja */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="size-4 text-amber-600" />
                        <span className="font-bold text-sm">Módulo Finanzas & Caja</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("finanzas", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("finanzas", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Flujo de Caja</span>
                          <p className="text-[10px] text-muted-foreground">Acceso a /finanzas/cash-flow</p>
                        </div>
                        <Switch
                          checked={activePerms.finanzas?.ver_flujo ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "ver_flujo")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Registrar Movimientos</span>
                          <p className="text-[10px] text-muted-foreground">Ingresos y egresos</p>
                        </div>
                        <Switch
                          checked={activePerms.finanzas?.registrar_movimiento ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "registrar_movimiento")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Cuentas Bancarias</span>
                          <p className="text-[10px] text-muted-foreground">Saldos BCP, BBVA, billeteras</p>
                        </div>
                        <Switch
                          checked={activePerms.finanzas?.ver_cuentas_bancarias ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "ver_cuentas_bancarias")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold text-rose-600">Eliminar / Anular Pagos</span>
                          <p className="text-[10px] text-muted-foreground">Borrar asientos contables</p>
                        </div>
                        <Switch
                          checked={activePerms.finanzas?.anular_movimiento ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "anular_movimiento")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs">Compras & Proveedores</span>
                        <Switch
                          checked={activePerms.finanzas?.compras ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "compras")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs">Gastos Operativos</span>
                        <Switch
                          checked={activePerms.finanzas?.gastos ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "gastos")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs">Deudas & Cobranzas</span>
                        <Switch
                          checked={activePerms.finanzas?.deudas ?? false}
                          onCheckedChange={() => togglePermission("finanzas", "deudas")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 9. Módulo Rentabilidad & Costos */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-emerald-600" />
                        <span className="font-bold text-sm">Módulo Rentabilidad & Costos</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("rentabilidad", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("rentabilidad", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Márgenes y Ganancia Neta</span>
                          <p className="text-[10px] text-muted-foreground">Rentabilidad sin IGV</p>
                        </div>
                        <Switch
                          checked={activePerms.rentabilidad?.ver_margenes ?? false}
                          onCheckedChange={() => togglePermission("rentabilidad", "ver_margenes")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Costos y Gastos Operativos</span>
                          <p className="text-[10px] text-muted-foreground">Estructura de costos</p>
                        </div>
                        <Switch
                          checked={activePerms.rentabilidad?.ver_costos ?? false}
                          onCheckedChange={() => togglePermission("rentabilidad", "ver_costos")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Simulador de Rentabilidad</span>
                          <p className="text-[10px] text-muted-foreground">Acceso a /rentabilidad/simulador</p>
                        </div>
                        <Switch
                          checked={activePerms.rentabilidad?.simulador ?? false}
                          onCheckedChange={() => togglePermission("rentabilidad", "simulador")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Configuración de Perfiles</span>
                          <p className="text-[10px] text-muted-foreground">Ajuste de comisiones y escalas</p>
                        </div>
                        <Switch
                          checked={activePerms.rentabilidad?.configurar_perfiles ?? false}
                          onCheckedChange={() => togglePermission("rentabilidad", "configurar_perfiles")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 10. Módulo Nómina & Personal */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="size-4 text-blue-600" />
                        <span className="font-bold text-sm">Módulo Nómina & Personal</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("payroll", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("payroll", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Directorio de Personal</span>
                          <p className="text-[10px] text-muted-foreground">Lista de colaboradores y cargos</p>
                        </div>
                        <Switch
                          checked={activePerms.payroll?.ver_personal ?? false}
                          onCheckedChange={() => togglePermission("payroll", "ver_personal")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Gestionar Personal / Crear</span>
                          <p className="text-[10px] text-muted-foreground">Editar sueldos y datos de contrato</p>
                        </div>
                        <Switch
                          checked={activePerms.payroll?.gestionar_personal ?? false}
                          onCheckedChange={() => togglePermission("payroll", "gestionar_personal")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Registro de Asistencia</span>
                          <p className="text-[10px] text-muted-foreground">Asistencia diaria y mensual</p>
                        </div>
                        <Switch
                          checked={activePerms.payroll?.asistencia ?? false}
                          onCheckedChange={() => togglePermission("payroll", "asistencia")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ver Liquidaciones</span>
                          <p className="text-[10px] text-muted-foreground">Acceso a liquidaciones de comisión</p>
                        </div>
                        <Switch
                          checked={activePerms.payroll?.ver_liquidaciones ?? false}
                          onCheckedChange={() => togglePermission("payroll", "ver_liquidaciones")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold text-emerald-600">Dispersar / Pagar Comisiones</span>
                          <p className="text-[10px] text-muted-foreground">Generar egreso en caja por comisiones</p>
                        </div>
                        <Switch
                          checked={activePerms.payroll?.pagar_comisiones ?? false}
                          onCheckedChange={() => togglePermission("payroll", "pagar_comisiones")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 11. Módulo Administración & Configuración */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Settings className="size-4 text-purple-600" />
                        <span className="font-bold text-sm">Módulo Administración & Ajustes del Sistema</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setModuleAll("admin", true)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Marcar todos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setModuleAll("admin", false)}
                          className="text-muted-foreground hover:underline text-[11px]"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Gestionar Usuarios</span>
                          <p className="text-[10px] text-muted-foreground">Crear y vincular usuarios</p>
                        </div>
                        <Switch
                          checked={activePerms.admin?.gestionar_usuarios ?? false}
                          onCheckedChange={() => togglePermission("admin", "gestionar_usuarios")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Configurar Roles</span>
                          <p className="text-[10px] text-muted-foreground">Editar permisos de perfiles</p>
                        </div>
                        <Switch
                          checked={activePerms.admin?.gestionar_roles ?? false}
                          onCheckedChange={() => togglePermission("admin", "gestionar_roles")}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                        <div>
                          <span className="text-xs font-semibold">Ajustes del Negocio</span>
                          <p className="text-[10px] text-muted-foreground">Configuración global y parámetros</p>
                        </div>
                        <Switch
                          checked={activePerms.admin?.ajustes_sistema ?? false}
                          onCheckedChange={() => togglePermission("admin", "ajustes_sistema")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/30 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Los cambios en los permisos se aplicarán a todos los usuarios con el rol <strong>{currentRole.codigo}</strong>.
                </span>
                <Button
                  onClick={handleSaveRole}
                  disabled={saving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {saving && <RefreshCw className="size-4 animate-spin" />}
                  Guardar Permisos
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="bg-card border p-8 text-center text-muted-foreground">
              Selecciona un rol a la izquierda para visualizar y configurar sus permisos.
            </Card>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: CREAR NUEVO ROL PERSONALIZADO
      ========================================================================= */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              Crear Nuevo Rol Personalizado
            </DialogTitle>
            <DialogDescription>
              Define un nuevo perfil de acceso para tu equipo. Puedes basar sus permisos en un rol existente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new_codigo" className="text-xs font-semibold">
                Código del Rol (Mayúsculas sin espacios) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="new_codigo"
                placeholder="ej: CALL_CENTER, AUDITOR, DESPACHO"
                value={newRoleCodigo}
                onChange={(e) => setNewRoleCodigo(e.target.value.toUpperCase())}
                required
                className="h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_nombre" className="text-xs font-semibold">
                Nombre Legible <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="new_nombre"
                placeholder="ej: Asesor Call Center, Auditor Financiero"
                value={newRoleNombre}
                onChange={(e) => setNewRoleNombre(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_desc" className="text-xs font-semibold">Descripción</Label>
              <Input
                id="new_desc"
                placeholder="ej: Atención de leads entrantes y seguimiento"
                value={newRoleDescripcion}
                onChange={(e) => setNewRoleDescripcion(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_base" className="text-xs font-semibold">
                Copiar Permisos Iniciales Desde:
              </Label>
              <select
                id="new_base"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                value={newRoleBase}
                onChange={(e) => setNewRoleBase(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.nombre} ({r.codigo})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                El nuevo rol heredará la plantilla de permisos del perfil seleccionado y podrás ajustarlo luego.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {creating && <RefreshCw className="size-4 animate-spin" />}
                Crear Rol
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CONFIRMAR ELIMINACIÓN DE ROL
      ========================================================================= */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5" />
              ¿Eliminar rol [{roleToDelete?.codigo}]?
            </DialogTitle>
            <DialogDescription>
              Se eliminará este perfil personalizado. Solo se permite si no tiene usuarios asociados.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole}>
              Sí, eliminar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
