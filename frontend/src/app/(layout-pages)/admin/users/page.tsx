"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Briefcase,
  DollarSign,
  TrendingUp,
  Settings,
  Layers,
  ArrowRight,
  ExternalLink,
  UserPlus,
  KeyRound,
  FileSpreadsheet,
  Check,
  X,
  User as UserIcon,
} from "lucide-react";

// Tipos de datos
export interface AccessPermissions {
  sales_scope: "own" | "team" | "all"; // own = solo sus ventas, team = su equipo, all = todas
  can_view_finance: boolean; // acceso a caja y movimientos
  can_view_profitability: boolean; // acceso a costos y rentabilidad
  can_view_liquidations: boolean; // acceso a liquidación de comisiones
  can_install_sales: boolean; // permiso para cerrar/instalar ventas
  can_manage_users: boolean; // permiso para gestionar usuarios
  trabajador_id?: number | null;
  trabajador_nombre?: string | null;
  allowed_modules: string[];
}

export interface SystemUser {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  avatar?: string | null;
  modules?: string;
}

export interface WorkerItem {
  id: number;
  nombre: string;
  apellido: string;
  rol_operativo: string;
  equipo?: string;
  dni?: string;
  usuario_id?: number | null;
}

// Plantillas de permisos según el Rol
const ROLE_PRESETS: Record<string, AccessPermissions> = {
  ADMIN: {
    sales_scope: "all",
    can_view_finance: true,
    can_view_profitability: true,
    can_view_liquidations: true,
    can_install_sales: true,
    can_manage_users: true,
    allowed_modules: ["ventas", "finanzas", "rentabilidad", "payroll", "admin", "contactos", "agenda"],
  },
  SUPERVISOR: {
    sales_scope: "team",
    can_view_finance: false,
    can_view_profitability: true,
    can_view_liquidations: true,
    can_install_sales: true,
    can_manage_users: false,
    allowed_modules: ["ventas", "rentabilidad", "contactos", "agenda"],
  },
  VENDEDOR: {
    sales_scope: "own",
    can_view_finance: false,
    can_view_profitability: false,
    can_view_liquidations: false,
    can_install_sales: false,
    can_manage_users: false,
    allowed_modules: ["ventas", "contactos", "agenda"],
  },
  FINANZAS: {
    sales_scope: "all",
    can_view_finance: true,
    can_view_profitability: true,
    can_view_liquidations: true,
    can_install_sales: false,
    can_manage_users: false,
    allowed_modules: ["finanzas", "rentabilidad", "ventas"],
  },
  OPERACIONES: {
    sales_scope: "all",
    can_view_finance: false,
    can_view_profitability: false,
    can_view_liquidations: false,
    can_install_sales: true,
    can_manage_users: false,
    allowed_modules: ["ventas", "contactos"],
  },
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [staffList, setStaffList] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(25);
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState<"users" | "policies">("users");

  // Usuario activo en el navegador
  const [activeUserUsername, setActiveUserUsername] = useState<string>("admin");

  // Estado del modal de crear / editar usuario
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario de Usuario
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formRole, setFormRole] = useState("VENDEDOR");
  const [formTrabajadorId, setFormTrabajadorId] = useState<string>("none");

  // Permisos granulares del formulario
  const [formPermissions, setFormPermissions] = useState<AccessPermissions>(ROLE_PRESETS.VENDEDOR);

  // Modal para eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  // 1. Cargar Usuarios y Personal desde el backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, staffRes] = await Promise.all([
        api.get("/api/admin/users"),
        api.get("/api/payroll/staff").catch(() => ({ data: [] })),
      ]);

      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStaffList(Array.isArray(staffRes.data) ? staffRes.data : []);

      // Leer usuario activo en sesión
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_active_user");
        if (stored) {
          try {
            const u = JSON.parse(stored);
            setActiveUserUsername(u.username || "admin");
          } catch {}
        }
      }
    } catch (err: any) {
      console.error("Error al cargar usuarios:", err);
      toast.error("Error al cargar la lista de usuarios del sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Parsear permisos guardados en user.modules
  const parsePermissions = (modulesStr?: string, role = "VENDEDOR"): AccessPermissions => {
    if (!modulesStr) return ROLE_PRESETS[role] || ROLE_PRESETS.VENDEDOR;
    try {
      const parsed = JSON.parse(modulesStr);
      if (parsed && typeof parsed === "object") {
        return {
          sales_scope: parsed.sales_scope || ROLE_PRESETS[role]?.sales_scope || "own",
          can_view_finance: parsed.can_view_finance ?? ROLE_PRESETS[role]?.can_view_finance ?? false,
          can_view_profitability: parsed.can_view_profitability ?? ROLE_PRESETS[role]?.can_view_profitability ?? false,
          can_view_liquidations: parsed.can_view_liquidations ?? ROLE_PRESETS[role]?.can_view_liquidations ?? false,
          can_install_sales: parsed.can_install_sales ?? ROLE_PRESETS[role]?.can_install_sales ?? false,
          can_manage_users: parsed.can_manage_users ?? ROLE_PRESETS[role]?.can_manage_users ?? false,
          trabajador_id: parsed.trabajador_id ?? null,
          trabajador_nombre: parsed.trabajador_nombre ?? null,
          allowed_modules: parsed.allowed_modules || ROLE_PRESETS[role]?.allowed_modules || ["ventas"],
        };
      }
    } catch {
      // Si era string antiguo con comas
      return ROLE_PRESETS[role] || ROLE_PRESETS.VENDEDOR;
    }
    return ROLE_PRESETS[role] || ROLE_PRESETS.VENDEDOR;
  };

  // Abrir modal de Nuevo Usuario
  const handleOpenCreate = () => {
    setIsEdit(false);
    setShowPassword(false);
    setFormUsername("");
    setFormPassword("");
    setFormFirstName("");
    setFormLastName("");
    setFormPhone("");
    setFormLocation("Lima, Perú");
    setFormRole("VENDEDOR");
    setFormTrabajadorId("none");
    setFormPermissions(ROLE_PRESETS.VENDEDOR);
    setModalOpen(true);
  };

  // Abrir modal de Editar Usuario
  const handleOpenEdit = (user: SystemUser) => {
    setIsEdit(true);
    setShowPassword(false);
    setFormUsername(user.username);
    setFormPassword(""); // Vacía para no sobreescribir salvo que ingrese una nueva
    setFormFirstName(user.firstName || "");
    setFormLastName(user.lastName || "");
    setFormPhone(user.phone || "");
    setFormLocation(user.location || "");
    setFormRole(user.role || "USER");

    const perms = parsePermissions(user.modules, user.role);
    setFormPermissions(perms);
    setFormTrabajadorId(perms.trabajador_id ? String(perms.trabajador_id) : "none");
    setModalOpen(true);
  };

  // Al cambiar de rol en el modal, aplicar plantilla sugerida automáticamente
  const handleRoleChange = (newRole: string) => {
    setFormRole(newRole);
    const preset = ROLE_PRESETS[newRole] || ROLE_PRESETS.VENDEDOR;
    setFormPermissions((prev) => ({
      ...preset,
      trabajador_id: prev.trabajador_id,
      trabajador_nombre: prev.trabajador_nombre,
    }));
  };

  // Guardar (Crear o Actualizar)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      toast.warning("El nombre de usuario es obligatorio.");
      return;
    }

    if (!isEdit && !formPassword.trim()) {
      toast.warning("Debe ingresar una contraseña para el nuevo usuario.");
      return;
    }

    try {
      setSaving(true);

      // Obtener datos del trabajador seleccionado si aplica
      const selectedWorker =
        formTrabajadorId !== "none"
          ? staffList.find((w) => String(w.id) === formTrabajadorId)
          : null;

      const payloadModules: AccessPermissions = {
        ...formPermissions,
        trabajador_id: selectedWorker ? selectedWorker.id : null,
        trabajador_nombre: selectedWorker ? `${selectedWorker.nombre} ${selectedWorker.apellido}`.trim() : null,
      };

      const payload: any = {
        username: formUsername.trim(),
        role: formRole,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        phone: formPhone.trim(),
        location: formLocation.trim(),
        modules: JSON.stringify(payloadModules),
      };

      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      if (isEdit) {
        await api.put(`/api/admin/users/${encodeURIComponent(formUsername.trim())}`, payload);
        toast.success(`Usuario @${formUsername} actualizado con éxito.`);
      } else {
        await api.post("/api/admin/users", payload);
        toast.success(`Usuario @${formUsername} creado con éxito.`);
      }

      // Si el usuario editado es el activo en la sesión, actualizar de inmediato el header y storage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_active_user");
        if (stored) {
          try {
            const cur = JSON.parse(stored);
            if (cur.username === formUsername.trim()) {
              const updatedSession = { ...cur, ...payload };
              localStorage.setItem("crm_active_user", JSON.stringify(updatedSession));
              window.dispatchEvent(new CustomEvent("crm_user_switched", { detail: updatedSession }));
            }
          } catch {}
        }
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar usuario:", err);
      const msg = err.response?.data?.message || err.response?.data || "Ocurrió un error al procesar el usuario.";
      toast.error(typeof msg === "string" ? msg : "Error al guardar usuario.");
    } finally {
      setSaving(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/admin/users/${encodeURIComponent(userToDelete.username)}`);
      toast.success(`Usuario @${userToDelete.username} eliminado.`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error("Error al eliminar usuario:", err);
      toast.error("No se pudo eliminar el usuario seleccionado.");
    }
  };

  // Activar sesión inmediata en navegador (User Switcher rápido)
  const handleActivateUser = (u: SystemUser) => {
    setActiveUserUsername(u.username);
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_active_user", JSON.stringify(u));
      window.dispatchEvent(new CustomEvent("crm_user_switched", { detail: u }));
    }
    toast.success(`Sesión activa cambiada a @${u.username} (${u.role}). Revisa el menú superior derecho.`);
  };

  // Iniciales para avatar
  const getInitials = (first?: string, last?: string, username?: string) => {
    if (first || last) {
      return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U";
    }
    return (username?.slice(0, 2) || "US").toUpperCase();
  };

  // Badge de rol
  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">Administrador Total</Badge>;
      case "SUPERVISOR":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Supervisor de Equipo</Badge>;
      case "VENDEDOR":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Vendedor / Asesor</Badge>;
      case "FINANZAS":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">Finanzas & Caja</Badge>;
      case "OPERACIONES":
        return <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">Operaciones</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  // Badge de alcance de datos
  const getScopeBadge = (scope?: string) => {
    switch (scope) {
      case "own":
        return <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">Solo sus Ventas</Badge>;
      case "team":
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300">Ventas de su Equipo</Badge>;
      case "all":
      default:
        return <Badge variant="outline" className="text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-300">Todas las Ventas</Badge>;
    }
  };

  // Filtrado de usuarios en tiempo real
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === "all" || u.role?.toUpperCase() === filterRole.toUpperCase();
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        u.username?.toLowerCase().includes(term) ||
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term) ||
        u.phone?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }, [users, filterRole, searchTerm]);

  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * usersPageSize;
    return filteredUsers.slice(start, start + usersPageSize);
  }, [filteredUsers, usersPage, usersPageSize]);

  // Contadores
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const supervisores = users.filter((u) => u.role === "SUPERVISOR").length;
    const vendedores = users.filter((u) => u.role === "VENDEDOR").length;
    const finanzas = users.filter((u) => u.role === "FINANZAS").length;
    return { total, admins, supervisores, vendedores, finanzas };
  }, [users]);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            Gestión de Usuarios & Tipos de Acceso
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra usuarios del CRM, roles operativos y políticas granulares de acceso a la información comercial y financiera.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <UserPlus className="size-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* 2. Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Usuarios
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground">Cuentas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Vendedores / Asesores
            </CardTitle>
            <TrendingUp className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-emerald-600">{stats.vendedores}</div>
            <p className="text-[11px] text-muted-foreground">Solo ven sus propias ventas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Supervisores
            </CardTitle>
            <Briefcase className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-blue-600">{stats.supervisores}</div>
            <p className="text-[11px] text-muted-foreground">Supervisión de equipos</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administradores
            </CardTitle>
            <ShieldCheck className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-0">
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
            <p className="text-[11px] text-muted-foreground">Acceso total al sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navegación por Pestañas */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full sm:w-[480px] bg-muted p-1 rounded-lg">
          <TabsTrigger value="users" className="gap-2 font-medium">
            <Users className="size-4" />
            Directorio de Usuarios ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2 font-medium">
            <Shield className="size-4" />
            Políticas de Acceso a la Información
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            PESTAÑA 1: DIRECTORIO Y GESTIÓN DE USUARIOS
        ========================================================================= */}
        <TabsContent value="users" className="mt-4 flex flex-col gap-4">
          <Card className="bg-card shadow-sm border">
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Buscador */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, usuario, rol..."
                    className="pl-9 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtro por Rol */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="size-4 text-muted-foreground hidden sm:block" />
                  <select
                    className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="all">Todos los Roles ({users.length})</option>
                    <option value="ADMIN">Administradores ({stats.admins})</option>
                    <option value="SUPERVISOR">Supervisores ({stats.supervisores})</option>
                    <option value="VENDEDOR">Vendedores ({stats.vendedores})</option>
                    <option value="FINANZAS">Finanzas & Caja ({stats.finanzas})</option>
                    <option value="OPERACIONES">Operaciones</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterRole("all");
                    }}
                    className="text-xs shrink-0"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[280px]">Usuario / Nombre</TableHead>
                      <TableHead>Tipo de Acceso (Rol)</TableHead>
                      <TableHead>Alcance de Datos</TableHead>
                      <TableHead>Personal Vinculado</TableHead>
                      <TableHead>Permisos Especiales</TableHead>
                      <TableHead className="text-center">Sesión Activa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                          Cargando usuarios del sistema...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => {
                        const perms = parsePermissions(u.modules, u.role);
                        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username;
                        const isCurrentActive = activeUserUsername === u.username;

                        return (
                          <TableRow key={u.id || u.username} className={isCurrentActive ? "bg-primary/5" : ""}>
                            {/* Nombre y Usuario */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 ring-1 ring-border">
                                  {u.avatar ? <AvatarImage src={u.avatar} /> : null}
                                  <AvatarFallback className="bg-muted font-bold text-xs text-foreground">
                                    {getInitials(u.firstName, u.lastName, u.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground truncate">{fullName}</span>
                                    {isCurrentActive && (
                                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 text-[10px] px-1 py-0 font-bold">
                                        ACTIVO
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                                  {u.phone && <span className="text-[11px] text-muted-foreground">{u.phone}</span>}
                                </div>
                              </div>
                            </TableCell>

                            {/* Rol */}
                            <TableCell>{getRoleBadge(u.role)}</TableCell>

                            {/* Alcance de Datos */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getScopeBadge(perms.sales_scope)}
                                <span className="text-[10px] text-muted-foreground">
                                  {perms.sales_scope === "own" && "Restringido a sus ventas asignadas"}
                                  {perms.sales_scope === "team" && "Ventas de su equipo comercial"}
                                  {perms.sales_scope === "all" && "Visibilidad completa del negocio"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Personal Vinculado */}
                            <TableCell>
                              {perms.trabajador_nombre ? (
                                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                  <UserCheck className="size-3.5 text-emerald-600" />
                                  <span>{perms.trabajador_nombre}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin colaborador vinculado</span>
                              )}
                            </TableCell>

                            {/* Permisos Especiales */}
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {perms.can_view_finance && (
                                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 px-1.5 py-0.5 rounded">
                                    Caja
                                  </span>
                                )}
                                {perms.can_view_profitability && (
                                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    Rentabilidad
                                  </span>
                                )}
                                {perms.can_view_liquidations && (
                                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 px-1.5 py-0.5 rounded">
                                    Liquidaciones
                                  </span>
                                )}
                                {perms.can_install_sales && (
                                  <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 px-1.5 py-0.5 rounded">
                                    Instalar
                                  </span>
                                )}
                                {!perms.can_view_finance && !perms.can_view_profitability && !perms.can_view_liquidations && (
                                  <span className="text-[10px] text-muted-foreground">Estándar comercial</span>
                                )}
                              </div>
                            </TableCell>

                            {/* Switcher / Activar Sesión */}
                            <TableCell className="text-center">
                              {isCurrentActive ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                  <CheckCircle2 className="size-4" /> Conectado
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivateUser(u)}
                                  title="Simular vista con este usuario"
                                  className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                                >
                                  Usar sesión
                                </Button>
                              )}
                            </TableCell>

                            {/* Acciones */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleOpenEdit(u)}
                                  title="Editar usuario y permisos"
                                >
                                  <Edit className="size-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => {
                                    setUserToDelete(u);
                                    setDeleteModalOpen(true);
                                  }}
                                  title="Eliminar usuario"
                                  disabled={u.username === "admin"}
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
              <DataTablePagination
                currentPage={usersPage}
                pageSize={usersPageSize}
                totalItems={filteredUsers.length}
                onPageChange={setUsersPage}
                onPageSizeChange={setUsersPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                itemName="usuarios"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            PESTAÑA 2: POLÍTICAS DE ACCESO A LA INFORMACIÓN (REQUERIMIENTO CLAVE)
        ========================================================================= */}
        <TabsContent value="policies" className="mt-4 flex flex-col gap-6">
          <Card className="bg-card border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-6 text-primary" />
                <div>
                  <CardTitle className="text-lg">Políticas de Control de Acceso por Tipo de Usuario</CardTitle>
                  <CardDescription>
                    Define qué información puede consultar y operar cada perfil dentro del CRM NextLead.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Tarjeta Vendedor */}
              <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-200 dark:border-emerald-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-emerald-600 text-white font-bold">VENDEDOR / ASESOR</Badge>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Ámbito Restringido</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1">Control Estricto de Información</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Diseñado para la fuerza de ventas comercial directa y call center.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Solo ve sus propias ventas:</strong> Únicamente visualiza los leads y ventas vinculados a su ID de asesor.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Clientes & Agenda:</strong> Registro de oportunidades, seguimiento por WhatsApp y tareas.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin acceso a Rentabilidad:</strong> No puede ver costos de adquisición, márgenes brutos ni utilidades.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin acceso a Finanzas:</strong> No puede ver saldos en bancos, arqueos de caja ni egresos.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin liquidaciones globales:</strong> No ve pagos a otros compañeros.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-900/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => {
                      setFilterRole("VENDEDOR");
                      setActiveTab("users");
                    }}
                  >
                    Ver Vendedores ({stats.vendedores})
                  </Button>
                </div>
              </div>

              {/* 2. Tarjeta Supervisor */}
              <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-200 dark:border-blue-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-600 text-white font-bold">SUPERVISOR DE VENTAS</Badge>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Nivel Intermedio</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1">Gestión de Equipo & Aprobación</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Líderes de equipo, jefes de turno y validadores comerciales.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Ventas de su equipo:</strong> Supervisa a todos los asesores asignados a su grupo comercial.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Validación & Cierre:</strong> Permiso para pasar ventas a instaladas o auditadas.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Comisiones preliminares:</strong> Puede revisar liquidaciones del equipo a su cargo.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin configuración de usuarios:</strong> No puede alterar credenciales ni permisos de otros.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin acceso a cuentas bancarias:</strong> No puede autorizar transferencias de caja.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-900/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => {
                      setFilterRole("SUPERVISOR");
                      setActiveTab("users");
                    }}
                  >
                    Ver Supervisores ({stats.supervisores})
                  </Button>
                </div>
              </div>

              {/* 3. Tarjeta Finanzas */}
              <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-200 dark:border-amber-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-amber-600 text-white font-bold">FINANZAS & TESORERÍA</Badge>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Especializado</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1">Tesorería, Liquidaciones & Caja</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Encargados de tesorería, conciliación bancaria y nóminas.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Flujo de Caja Total:</strong> Control de ingresos, egresos, BCP, BBVA, Yape y efectivo.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Liquidaciones de Comisiones:</strong> Cálculo y dispersión de comisiones al personal.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Rentabilidad Real:</strong> Simulaciones y márgenes consolidados sin IGV.</span>
                    </div>
                    <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                      <X className="size-4 shrink-0 mt-0.5" />
                      <span><strong>Sin reasignación de clientes:</strong> No interviene en la negociación de oportunidades.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-900/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      setFilterRole("FINANZAS");
                      setActiveTab("users");
                    }}
                  >
                    Ver Finanzas ({stats.finanzas})
                  </Button>
                </div>
              </div>

              {/* 4. Tarjeta Administrador */}
              <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-200 dark:border-purple-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-purple-600 text-white font-bold">ADMINISTRADOR TOTAL</Badge>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Acceso Completo</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1">Superusuario & Seguridad</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Gerencia general, directores y administradores del sistema.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-purple-600 shrink-0 mt-0.5" />
                      <span><strong>Todas las Ventas:</strong> Visualiza y audita las ventas de todos los equipos y asesores.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-purple-600 shrink-0 mt-0.5" />
                      <span><strong>Gestión de Cuentas:</strong> Creación, modificación de roles y contraseñas.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-purple-600 shrink-0 mt-0.5" />
                      <span><strong>Finanzas & Costos:</strong> Arqueos, comisiones, anulaciones e inventario.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-purple-600 shrink-0 mt-0.5" />
                      <span><strong>Auditoría & Logs:</strong> Trazabilidad completa de operaciones.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-purple-200 dark:border-purple-900/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-purple-300 text-purple-700 hover:bg-purple-100"
                    onClick={() => {
                      setFilterRole("ADMIN");
                      setActiveTab("users");
                    }}
                  >
                    Ver Administradores ({stats.admins})
                  </Button>
                </div>
              </div>

              {/* 5. Matriz Comparativa Rápida */}
              <div className="p-4 rounded-xl border bg-muted/40 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground mb-1">Matriz Comparativa de Privacidad de Datos</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Cada usuario tiene su propio ámbito configurado en base de datos (`modules` JSON).
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-1.5 font-semibold">Rol</th>
                          <th className="py-1.5 font-semibold">Ver Ventas</th>
                          <th className="py-1.5 font-semibold">Flujo de Caja</th>
                          <th className="py-1.5 font-semibold">Rentabilidad</th>
                          <th className="py-1.5 font-semibold">Liquidaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-2 font-medium text-emerald-600">Vendedor</td>
                          <td className="py-2"><Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[10px]">Solo suyas</Badge></td>
                          <td className="py-2 text-rose-500 font-bold">Bloqueado</td>
                          <td className="py-2 text-rose-500 font-bold">Bloqueado</td>
                          <td className="py-2 text-rose-500 font-bold">Bloqueado</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-blue-600">Supervisor</td>
                          <td className="py-2"><Badge variant="outline" className="text-blue-700 bg-blue-50 text-[10px]">Su Equipo</Badge></td>
                          <td className="py-2 text-rose-500 font-bold">Bloqueado</td>
                          <td className="py-2 text-emerald-600 font-bold">Permitido</td>
                          <td className="py-2 text-emerald-600 font-bold">Su Equipo</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-amber-600">Finanzas</td>
                          <td className="py-2"><Badge variant="outline" className="text-amber-700 bg-amber-50 text-[10px]">Todas</Badge></td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-purple-600">Administrador</td>
                          <td className="py-2"><Badge variant="outline" className="text-purple-700 bg-purple-50 text-[10px]">Todas</Badge></td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                          <td className="py-2 text-emerald-600 font-bold">Acceso Total</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t">
                  <p className="text-[11px] text-muted-foreground">
                    * Al crear o editar cualquier usuario en la pestaña <strong>Directorio</strong>, puedes modificar los interruptores individuales para ajustar permisos caso a caso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL: CREAR / EDITAR USUARIO CON TIPO DE ACCESO Y PERMISOS
      ========================================================================= */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {isEdit ? <Edit className="size-5 text-blue-600" /> : <UserPlus className="size-5 text-emerald-600" />}
              {isEdit ? `Editar Usuario: @${formUsername}` : "Crear Nuevo Usuario por Tipo de Acceso"}
            </DialogTitle>
            <DialogDescription>
              Configura los datos personales, rol de acceso y restricciones de visualización de información para este usuario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Datos Principales de Cuenta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form_username" className="text-xs font-semibold">
                  Nombre de Usuario / Email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="form_username"
                  placeholder="ej: carlos.vendedor"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={isEdit}
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="form_password" className="text-xs font-semibold">
                    {isEdit ? "Nueva Contraseña (opcional)" : "Contraseña"} {!isEdit && <span className="text-rose-500">*</span>}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <Input
                  id="form_password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isEdit ? "Dejar en blanco para conservar actual" : "••••••••"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!isEdit}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form_firstName" className="text-xs font-semibold">Nombres</Label>
                <Input
                  id="form_firstName"
                  placeholder="ej: Carlos"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form_lastName" className="text-xs font-semibold">Apellidos</Label>
                <Input
                  id="form_lastName"
                  placeholder="ej: Benavides"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form_phone" className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                <Input
                  id="form_phone"
                  placeholder="ej: 987654321"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form_location" className="text-xs font-semibold">Ubicación / Sede</Label>
                <Input
                  id="form_location"
                  placeholder="ej: Lima, Perú"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* 2. Tipo de Acceso / Rol y Vinculación */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                Tipo de Acceso & Colaborador Asociado
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Selector de Rol */}
                <div className="space-y-1.5">
                  <Label htmlFor="form_role" className="text-xs font-semibold">
                    Rol / Tipo de Acceso <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="form_role"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <option value="VENDEDOR">Vendedor / Asesor (Solo sus ventas)</option>
                    <option value="SUPERVISOR">Supervisor (Ventas de su equipo)</option>
                    <option value="FINANZAS">Finanzas & Caja (Flujo de caja y comisiones)</option>
                    <option value="OPERACIONES">Operaciones (Instalaciones y logística)</option>
                    <option value="ADMIN">Administrador Total (Sin restricciones)</option>
                  </select>
                </div>

                {/* Vinculación con Personal / Trabajador */}
                <div className="space-y-1.5">
                  <Label htmlFor="form_worker" className="text-xs font-semibold">
                    Vincular a Colaborador de Planilla
                  </Label>
                  <select
                    id="form_worker"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary"
                    value={formTrabajadorId}
                    onChange={(e) => setFormTrabajadorId(e.target.value)}
                  >
                    <option value="none">-- Sin vincular a personal --</option>
                    {staffList.map((w) => (
                      <option key={w.id} value={String(w.id)}>
                        {w.nombre} {w.apellido} ({w.rol_operativo} {w.equipo ? `- ${w.equipo}` : ""})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Vincula las ventas y liquidaciones registradas a nombre de este asesor.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Permisos Granulares y Alcance de Datos */}
            <div className="p-4 rounded-xl border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="size-4 text-emerald-600" />
                    Restricciones de Información y Visibilidad
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Personaliza qué datos y módulos puede ver este usuario.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Plantilla: {formRole}
                </Badge>
              </div>

              {/* Alcance de Ventas */}
              <div className="space-y-2 pt-1 border-t">
                <Label className="text-xs font-semibold">Alcance de Visualización de Ventas:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formPermissions.sales_scope === "own"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-semibold text-emerald-700 dark:text-emerald-300"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sales_scope"
                      checked={formPermissions.sales_scope === "own"}
                      onChange={() => setFormPermissions((p) => ({ ...p, sales_scope: "own" }))}
                      className="text-emerald-600"
                    />
                    <div>
                      <div>Solo sus ventas</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Recomendado para Vendedor</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formPermissions.sales_scope === "team"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 font-semibold text-blue-700 dark:text-blue-300"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sales_scope"
                      checked={formPermissions.sales_scope === "team"}
                      onChange={() => setFormPermissions((p) => ({ ...p, sales_scope: "team" }))}
                      className="text-blue-600"
                    />
                    <div>
                      <div>Ventas de su equipo</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Para Supervisores</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formPermissions.sales_scope === "all"
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 font-semibold text-purple-700 dark:text-purple-300"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sales_scope"
                      checked={formPermissions.sales_scope === "all"}
                      onChange={() => setFormPermissions((p) => ({ ...p, sales_scope: "all" }))}
                      className="text-purple-600"
                    />
                    <div>
                      <div>Todas las ventas</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Para Administradores</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Switches de Módulos Sensibles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                {/* Flujo de Caja */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold cursor-pointer">Flujo de Caja & Bancos</Label>
                    <p className="text-[10px] text-muted-foreground">Ver ingresos, egresos y saldos de cuentas</p>
                  </div>
                  <Switch
                    checked={formPermissions.can_view_finance}
                    onCheckedChange={(checked) => setFormPermissions((p) => ({ ...p, can_view_finance: checked }))}
                  />
                </div>

                {/* Rentabilidad */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold cursor-pointer">Costos & Rentabilidad</Label>
                    <p className="text-[10px] text-muted-foreground">Ver utilidades, costos y margen sin IGV</p>
                  </div>
                  <Switch
                    checked={formPermissions.can_view_profitability}
                    onCheckedChange={(checked) => setFormPermissions((p) => ({ ...p, can_view_profitability: checked }))}
                  />
                </div>

                {/* Liquidaciones */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold cursor-pointer">Liquidaciones de Pagos</Label>
                    <p className="text-[10px] text-muted-foreground">Ver nómina y comisiones a pagar</p>
                  </div>
                  <Switch
                    checked={formPermissions.can_view_liquidations}
                    onCheckedChange={(checked) => setFormPermissions((p) => ({ ...p, can_view_liquidations: checked }))}
                  />
                </div>

                {/* Cerrar / Instalar ventas */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold cursor-pointer">Cerrar / Instalar Ventas</Label>
                    <p className="text-[10px] text-muted-foreground">Permiso de validación técnica y cierre</p>
                  </div>
                  <Switch
                    checked={formPermissions.can_install_sales}
                    onCheckedChange={(checked) => setFormPermissions((p) => ({ ...p, can_install_sales: checked }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {saving && <RefreshCw className="size-4 animate-spin" />}
                {isEdit ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO
      ========================================================================= */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5" />
              ¿Eliminar usuario @{userToDelete?.username}?
            </DialogTitle>
            <DialogDescription>
              Esta acción revocará inmediatamente las credenciales y el acceso a la plataforma. Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Sí, eliminar usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
