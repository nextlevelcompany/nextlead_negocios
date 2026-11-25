"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Award,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  UserPlus,
  UserCheck,
  Shield,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

interface Worker {
  id?: number;
  usuario_id?: number | null;
  usuario_username?: string | null;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  rol_operativo: string;
  sueldo_base: number;
  frecuencia_pago?: string;
  paga_comision?: boolean;
  perfil_comision_id?: number | null;
  perfil_nombre?: string;
  gastos_adicionales?: number;
  estado?: string;
  fecha_ingreso?: string;
  regimen_pension?: string;
}

export default function StaffPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(25);
  const [filterRole, setFilterRole] = useState("all");
  const [filterComision, setFilterComision] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Worker>({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    rol_operativo: "Full Time",
    sueldo_base: 1500,
    frecuencia_pago: "Mensual",
    paga_comision: true,
    perfil_comision_id: 1,
    gastos_adicionales: 50,
    estado: "Activo",
    regimen_pension: "ONP",
  });

  // CRM User Creation State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userWorker, setUserWorker] = useState<Worker | null>(null);
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("admin123");
  const [userRole, setUserRole] = useState("VENDEDOR");
  const [userSaving, setUserSaving] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  const handleOpenCreateUser = (w: Worker) => {
    setUserWorker(w);
    if (w.usuario_username) {
      setUserUsername(w.usuario_username);
    } else {
      const cleanN = (w.nombre || "").trim().toLowerCase().split(" ")[0];
      const cleanA = (w.apellido || "").trim().toLowerCase().split(" ")[0];
      setUserUsername(cleanN && cleanA ? `${cleanN}.${cleanA}`.replace(/[^a-z0-9.]/g, "") : `user.${w.dni || w.id}`);
    }
    setUserPassword("admin123");
    const op = (w.rol_operativo || "").toLowerCase();
    if (op.includes("vendedor") || op.includes("asesor") || op.includes("comercial") || op.includes("ventas")) {
      setUserRole("VENDEDOR");
    } else if (op.includes("supervis") || op.includes("jefe") || op.includes("lider")) {
      setUserRole("SUPERVISOR");
    } else if (op.includes("finan") || op.includes("caja") || op.includes("conta")) {
      setUserRole("FINANZAS");
    } else if (op.includes("opera") || op.includes("logist") || op.includes("chofer") || op.includes("almacen")) {
      setUserRole("OPERACIONES");
    } else {
      setUserRole("VENDEDOR");
    }
    setUserModalOpen(true);
  };

  const handleSaveCrmUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userWorker) return;
    if (!userUsername.trim()) {
      toast.warning("El nombre de usuario es obligatorio.");
      return;
    }
    if (!userPassword.trim()) {
      toast.warning("Debe ingresar una contraseña.");
      return;
    }
    try {
      setUserSaving(true);
      const modulesPayload = {
        dashboard: true,
        chat: true,
        contactos: true,
        oportunidades: true,
        pedidos: true,
        ventas: true,
        productos: true,
        inventarios: userRole === "OPERACIONES" || userRole === "ADMIN",
        finanzas: userRole === "FINANZAS" || userRole === "ADMIN",
        personal: userRole === "ADMIN",
        admin: userRole === "ADMIN",
        sales_scope: userRole === "VENDEDOR" ? "own" : userRole === "SUPERVISOR" ? "team" : "all",
        trabajador_id: userWorker.id,
        trabajador_nombre: `${userWorker.nombre} ${userWorker.apellido}`.trim(),
      };

      const payload = {
        username: userUsername.trim(),
        password: userPassword.trim(),
        firstName: userWorker.nombre,
        lastName: userWorker.apellido,
        phone: userWorker.telefono || "",
        role: userRole,
        modules: JSON.stringify(modulesPayload),
      };

      const res = await api.post("/api/users", payload);
      if (res.status === 200 || res.status === 201) {
        toast.success(`¡Usuario @${userUsername.trim()} creado y vinculado con éxito a ${userWorker.nombre}!`);
        setUserModalOpen(false);
        fetchData();
      } else {
        toast.error("No se pudo crear el usuario.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data || "Error al crear el usuario.");
    } finally {
      setUserSaving(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, configRes] = await Promise.all([
        api.get("/api/payroll/staff"),
        api.get("/api/rentabilidad/config").catch(() => ({ data: { perfiles: [] } })),
      ]);
      setWorkers(staffRes.data || []);
      setPerfiles(configRes.data?.perfiles || []);
    } catch (err: any) {
      console.error("Error al cargar personal:", err);
      toast.error("Error al cargar la lista de colaboradores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setFormData({
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      rol_operativo: "Full Time",
      sueldo_base: 1500,
      frecuencia_pago: "Mensual",
      paga_comision: true,
      perfil_comision_id: perfiles[0]?.id || 1,
      gastos_adicionales: 50,
      estado: "Activo",
      regimen_pension: "ONP",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (w: Worker) => {
    setIsEdit(true);
    setFormData({
      id: w.id,
      nombre: w.nombre || "",
      apellido: w.apellido || "",
      dni: w.dni || "",
      telefono: w.telefono || "",
      rol_operativo: w.rol_operativo || "Full Time",
      sueldo_base: Number(w.sueldo_base) || 0,
      frecuencia_pago: w.frecuencia_pago || "Mensual",
      paga_comision: Boolean(w.paga_comision),
      perfil_comision_id: w.perfil_comision_id || perfiles[0]?.id || null,
      gastos_adicionales: Number(w.gastos_adicionales) || 0,
      estado: w.estado || "Activo",
      regimen_pension: w.regimen_pension || "ONP",
      fecha_ingreso: w.fecha_ingreso,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.dni.trim()) {
      toast.error("Nombre, apellido y DNI son campos obligatorios.");
      return;
    }
    try {
      setSaving(true);
      await api.post("/api/payroll/staff/save", formData);
      toast.success(isEdit ? "Colaborador actualizado con éxito." : "Colaborador registrado con éxito.");
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar colaborador:", err);
      toast.error(err.response?.data?.message || "Error al guardar colaborador.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Está seguro de eliminar a ${name}?`)) return;
    try {
      await api.delete(`/api/payroll/staff/${id}`);
      toast.success("Colaborador eliminado.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar colaborador.");
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const full = `${w.nombre} ${w.apellido} ${w.dni} ${w.telefono || ""}`.toLowerCase();
      const matchSearch = full.includes(searchTerm.toLowerCase());
      const matchRole = filterRole === "all" || w.rol_operativo.toLowerCase() === filterRole.toLowerCase();
      const matchCom =
        filterComision === "all" ||
        (filterComision === "con" && w.paga_comision) ||
        (filterComision === "sin" && !w.paga_comision);

      return matchSearch && matchRole && matchCom;
    });
  }, [workers, searchTerm, filterRole, filterComision]);

  const paginatedWorkers = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredWorkers.slice(start, start + staffPageSize);
  }, [filteredWorkers, staffPage, staffPageSize]);

  // KPIs
  const totalActivos = workers.filter((w) => w.estado === "Activo").length;
  const conComision = workers.filter((w) => w.paga_comision).length;
  const planillaBaseTotal = workers
    .filter((w) => w.estado === "Activo")
    .reduce((acc, curr) => acc + (Number(curr.sueldo_base) || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/payroll/staff" className="hover:text-primary transition-colors">
              Personal
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Empleados y Colaboradores</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-7 text-primary" />
            Personal y Colaboradores
          </h1>
          <p className="text-sm text-muted-foreground">
            Ficha de empleados, contratos, sueldos base y perfiles comisionales vinculados al Dealer ON Negocios.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/payroll/commissions">
              <Award className="size-4 text-emerald-600" />
              <span>Ver Comisiones</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/rentabilidad/comisiones">
              <TrendingUp className="size-4 text-indigo-600" />
              <span>Liquidaciones Dealer</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 shadow-xs">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
            <Plus className="size-4" />
            <span>Nuevo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Colaboradores</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{totalActivos} colaboradores activos</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Fuerza de Ventas / Comisionistas</CardTitle>
            <Award className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{conComision}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Habilitados para comisiones por altas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Planilla Base Mensual</CardTitle>
            <DollarSign className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              S/ {planillaBaseTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Sueldos base fijos contratados</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Módulo Vinculado</CardTitle>
            <ShieldCheck className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 font-semibold text-xs">
                CONECTADO
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Sincronizado con Rentabilidad Dealer</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI, teléfono..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-9 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer shadow-2xs"
              >
                <option value="all">Todos los Roles</option>
                <option value="Full Time">Full Time</option>
                <option value="Medio Tiempo">Medio Tiempo</option>
                <option value="Freelance">Freelance</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Administrador">Administrador</option>
                <option value="Repartidor">Repartidor</option>
              </select>

              {/* Commission filter */}
              <select
                value={filterComision}
                onChange={(e) => setFilterComision(e.target.value)}
                className="h-9 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer shadow-2xs"
              >
                <option value="all">Todas las Comisiones</option>
                <option value="con">Con Comisión</option>
                <option value="sin">Solo Sueldo Fijo</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="font-semibold">Colaborador</TableHead>
                  <TableHead className="font-semibold">DNI</TableHead>
                  <TableHead className="font-semibold">Rol Operativo</TableHead>
                  <TableHead className="font-semibold">Sueldo Base (S/)</TableHead>
                  <TableHead className="font-semibold">¿Paga Comisión?</TableHead>
                  <TableHead className="font-semibold">Perfil Comisional</TableHead>
                  <TableHead className="font-semibold">Gastos Adic. (S/)</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedWorkers.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span>{w.nombre} {w.apellido}</span>
                        {w.telefono && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            Tel: {w.telefono}
                          </span>
                        )}
                        {w.usuario_username ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 w-fit mt-1">
                            <UserCheck className="size-3 text-emerald-600" />
                            @{w.usuario_username}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateUser(w)}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-600 hover:underline mt-1 w-fit"
                          >
                            <UserPlus className="size-3 text-emerald-500" />
                            + Crear usuario CRM
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{w.dni}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs">
                        {w.rol_operativo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      S/ {Number(w.sueldo_base).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {w.paga_comision ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                          Sí comisiona
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground bg-muted font-normal">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {w.paga_comision && (w.perfil_nombre || w.rol_operativo) ? (
                        <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-300 font-medium">
                          {w.perfil_nombre || w.rol_operativo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground font-mono">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      S/ {Number(w.gastos_adicionales || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          w.estado === "Activo"
                            ? "bg-emerald-500/10 text-emerald-600 font-semibold"
                            : "bg-rose-500/10 text-rose-600 font-semibold"
                        }
                      >
                        {w.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCreateUser(w)}
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title={w.usuario_username ? `Usuario CRM: @${w.usuario_username}` : "Crear usuario de acceso al CRM"}
                        >
                          <UserPlus className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(w)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Editar colaborador"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(w.id!, `${w.nombre} ${w.apellido}`)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar colaborador"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                      No se encontraron colaboradores con los criterios seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            currentPage={staffPage}
            pageSize={staffPageSize}
            totalItems={filteredWorkers.length}
            onPageChange={setStaffPage}
            onPageSizeChange={setStaffPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemName="colaboradores"
          />
        </CardContent>
      </Card>

      {/* Modal Add / Edit Worker */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              {isEdit ? "Editar Colaborador" : "Registrar Nuevo Colaborador"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete los datos del empleado. Al marcar comisión, se vinculará con la escala de rentabilidad del Dealer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nombres *</Label>
                <Input
                  className="h-8 text-xs font-medium"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Marcos"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Apellidos *</Label>
                <Input
                  className="h-8 text-xs font-medium"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Ej: Quispe Paredes"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">DNI / Documento *</Label>
                <Input
                  className="h-8 text-xs font-mono font-medium"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  placeholder="8 dígitos"
                  maxLength={12}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                <Input
                  className="h-8 text-xs font-medium"
                  value={formData.telefono || ""}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej: 987654321"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Rol Operativo</Label>
                <select
                  value={formData.rol_operativo}
                  onChange={(e) => {
                    const rol = e.target.value;
                    const matchedPerfil = perfiles.find((p) => p.nombre.toLowerCase() === rol.toLowerCase());
                    setFormData({
                      ...formData,
                      rol_operativo: rol,
                      perfil_comision_id: matchedPerfil ? matchedPerfil.id : formData.perfil_comision_id,
                      sueldo_base: matchedPerfil ? matchedPerfil.sueldo_base : formData.sueldo_base,
                      gastos_adicionales: matchedPerfil ? matchedPerfil.gastos_adicionales_defecto : formData.gastos_adicionales,
                    });
                  }}
                  className="h-8 text-xs bg-card border rounded-md px-2.5 w-full font-medium cursor-pointer"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Medio Tiempo">Medio Tiempo</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Repartidor">Repartidor</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sueldo Base Mensual (S/)</Label>
                <Input
                  type="number"
                  step="50"
                  min="0"
                  className="h-8 text-xs font-semibold"
                  value={formData.sueldo_base}
                  onChange={(e) => setFormData({ ...formData, sueldo_base: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Commission Settings Box */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">¿Calcula y Cobra Comisiones?</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Habilita las metas de ventas y comisiones del Dealer ON Negocios.
                  </p>
                </div>
                <Switch
                  checked={Boolean(formData.paga_comision)}
                  onCheckedChange={(checked) => setFormData({ ...formData, paga_comision: checked })}
                />
              </div>

              {formData.paga_comision && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Perfil Comisional Dealer</Label>
                    <select
                      value={formData.perfil_comision_id || ""}
                      onChange={(e) => setFormData({ ...formData, perfil_comision_id: Number(e.target.value) || null })}
                      className="h-8 text-xs bg-card border rounded-md px-2.5 w-full font-medium cursor-pointer"
                    >
                      {perfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Gastos Adicionales (S/)</Label>
                    <Input
                      type="number"
                      step="10"
                      min="0"
                      className="h-8 text-xs font-semibold"
                      value={formData.gastos_adicionales}
                      onChange={(e) => setFormData({ ...formData, gastos_adicionales: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Frecuencia de Pago</Label>
                <select
                  value={formData.frecuencia_pago || "Mensual"}
                  onChange={(e) => setFormData({ ...formData, frecuencia_pago: e.target.value })}
                  className="h-8 text-xs bg-card border rounded-md px-2.5 w-full font-medium cursor-pointer"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Semanal">Semanal</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estado</Label>
                <select
                  value={formData.estado || "Activo"}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="h-8 text-xs bg-card border rounded-md px-2.5 w-full font-medium cursor-pointer"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Guardando..." : isEdit ? "Actualizar Colaborador" : "Registrar Colaborador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CREAR O VINCULAR USUARIO CRM DESDE COLABORADOR
      ========================================================================= */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-5 text-emerald-600" />
              Crear Usuario CRM para Colaborador
            </DialogTitle>
            <DialogDescription className="text-xs">
              Genera una cuenta de acceso al sistema vinculada a{" "}
              <strong className="text-foreground">
                {userWorker?.nombre} {userWorker?.apellido}
              </strong>{" "}
              (DNI: {userWorker?.dni}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCrmUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="crm_username" className="text-xs font-semibold">
                Nombre de Usuario <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="crm_username"
                value={userUsername}
                onChange={(e) => setUserUsername(e.target.value)}
                placeholder="ej: carlos.benavides"
                required
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Se usará para iniciar sesión en la plataforma CRM.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="crm_password" className="text-xs font-semibold">
                  Contraseña Inicial <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showUserPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  {showUserPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <Input
                id="crm_password"
                type={showUserPassword ? "text" : "password"}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crm_role" className="text-xs font-semibold">
                Rol de Acceso en CRM <span className="text-rose-500">*</span>
              </Label>
              <select
                id="crm_role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="VENDEDOR">Vendedor / Asesor (Solo sus propias ventas)</option>
                <option value="SUPERVISOR">Supervisor (Ventas de todo su equipo)</option>
                <option value="OPERACIONES">Operaciones / Logística (Pedidos y entregas)</option>
                <option value="FINANZAS">Finanzas & Caja (Flujo de caja y comisiones)</option>
                <option value="ADMIN">Administrador Total (Acceso global)</option>
              </select>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border text-[11px] space-y-1 text-muted-foreground">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-600" />
                Vinculación Automática
              </div>
              <p>
                Al crear la cuenta, las ventas, oportunidades y comisiones que registre este usuario
                se asociarán automáticamente a su ficha de colaborador en planilla.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={userSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {userSaving ? "Creando..." : "Crear y Vincular Cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
