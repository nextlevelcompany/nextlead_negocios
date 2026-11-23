"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  ShoppingBag,
  ExternalLink,
  Receipt,
  MessageCircle,
} from "lucide-react";

interface ProveedorItem {
  id: number;
  ruc?: string | null;
  razon_social: string;
  contacto_nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo: boolean;
  total_compras?: number;
  total_gastos?: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<ProveedorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Save Modal (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ruc: "",
    razon_social: "",
    contacto_nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/proveedores");
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error al cargar proveedores:", err);
      toast.error("Error al cargar proveedores. Verifique la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ruc: "",
      razon_social: "",
      contacto_nombre: "",
      telefono: "",
      email: "",
      direccion: "",
      activo: true,
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (sup: ProveedorItem) => {
    setEditingId(sup.id);
    setFormData({
      ruc: sup.ruc || "",
      razon_social: sup.razon_social || "",
      contacto_nombre: sup.contacto_nombre || "",
      telefono: sup.telefono || "",
      email: sup.email || "",
      direccion: sup.direccion || "",
      activo: sup.activo ?? true,
    });
    setModalOpen(true);
  };

  // Save supplier
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razon_social.trim()) {
      toast.error("La Razón Social o Nombre del Proveedor es obligatorio.");
      return;
    }

    if (formData.ruc && formData.ruc.trim().length > 0 && formData.ruc.trim().length !== 11) {
      toast.warning("El RUC en Perú generalmente tiene 11 dígitos numéricos.");
    }

    try {
      setSaving(true);
      const payload: any = {
        ruc: formData.ruc.trim() || null,
        razon_social: formData.razon_social.trim(),
        contacto_nombre: formData.contacto_nombre.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null,
        activo: formData.activo,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const res = await api.post("/api/proveedores/save", payload);
      toast.success(res.data.message || (editingId ? "Proveedor actualizado con éxito." : "Proveedor registrado con éxito."));
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  // Delete supplier
  const handleDelete = async (sup: ProveedorItem) => {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${sup.razon_social}"?`)) return;
    try {
      const res = await api.delete(`/api/proveedores/${sup.id}`);
      toast.success(res.data.message || "Proveedor eliminado con éxito.");
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se puede eliminar el proveedor.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast.error("No hay proveedores para exportar.");
      return;
    }

    const dataToExport = filteredSuppliers.map((s) => ({
      "ID": s.id,
      "RUC": s.ruc || "S.N.",
      "Razón Social": s.razon_social,
      "Contacto Principal": s.contacto_nombre || "",
      "Teléfono": s.telefono || "",
      "Email": s.email || "",
      "Dirección": s.direccion || "",
      "Compras Asociadas": s.total_compras || 0,
      "Gastos Asociados": s.total_gastos || 0,
      "Estado": s.activo ? "Activo" : "Inactivo",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores");
    XLSX.writeFile(workbook, `Directorio_Proveedores_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Directorio de proveedores exportado con éxito.");
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        searchTerm === "" ||
        (s.razon_social && s.razon_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.ruc && s.ruc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.contacto_nombre && s.contacto_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.telefono && s.telefono.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.direccion && s.direccion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && s.activo) ||
        (filterStatus === "inactive" && !s.activo);

      return matchSearch && matchStatus;
    });
  }, [suppliers, searchTerm, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = suppliers.length;
    const activos = suppliers.filter((s) => s.activo).length;
    const inactivos = total - activos;
    const conRuc = suppliers.filter((s) => s.ruc && s.ruc.trim().length > 0).length;

    return { total, activos, inactivos, conRuc };
  }, [suppliers]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            Directorio de Proveedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión centralizada de proveedores comerciales, datos de contacto, RUC y vinculación con Compras y Gastos.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchSuppliers} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="size-4" />
            Exportar Excel
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <Plus className="size-4" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean without colored stripe borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Proveedores</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Directorio consolidado</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proveedores Activos</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.activos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Habilitados para compras y gastos</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con RUC Formal</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis.conRuc}</div>
            <p className="text-xs text-muted-foreground mt-1">Documentados para comprobantes fiscales</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos / Suspendidos</CardTitle>
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              <XCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{kpis.inactivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Deshabilitados de selección</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUC, razón social, contacto, teléfono..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                <span>Estado:</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todos los proveedores</option>
                <option value="active">Solo Activos</option>
                <option value="inactive">Solo Inactivos</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-xs">Razón Social</TableHead>
                  <TableHead className="font-semibold text-xs">RUC / Identificación</TableHead>
                  <TableHead className="font-semibold text-xs">Contacto</TableHead>
                  <TableHead className="font-semibold text-xs">Teléfono / WhatsApp</TableHead>
                  <TableHead className="font-semibold text-xs">Email</TableHead>
                  <TableHead className="font-semibold text-xs">Dirección</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Operaciones</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-xs text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                      Cargando directorio de proveedores...
                    </TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Building2 className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      No se encontraron proveedores registrados.
                      <div className="mt-2">
                        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
                          <Plus className="size-4" />
                          Registrar Proveedor
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((sup) => {
                    const cleanPhone = sup.telefono ? sup.telefono.replace(/\D/g, "") : "";
                    const hasTransactions = (sup.total_compras || 0) > 0 || (sup.total_gastos || 0) > 0;

                    return (
                      <TableRow key={sup.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                              <Building2 className="size-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{sup.razon_social}</div>
                              <div className="text-[11px] text-muted-foreground">ID #{sup.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {sup.ruc ? (
                            <Badge variant="outline" className="font-mono text-xs font-medium">
                              {sup.ruc}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Sin RUC</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sup.contacto_nombre ? (
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                              <User className="size-3 text-muted-foreground" />
                              <span>{sup.contacto_nombre}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sup.telefono ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${sup.telefono}`}
                                className="flex items-center gap-1 text-foreground hover:text-primary hover:underline font-mono"
                              >
                                <Phone className="size-3 text-muted-foreground" />
                                <span>{sup.telefono}</span>
                              </a>
                              {cleanPhone.length >= 9 && (
                                <a
                                  href={`https://wa.me/51${cleanPhone.startsWith("51") ? cleanPhone.substring(2) : cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle className="size-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sup.email ? (
                            <a
                              href={`mailto:${sup.email}`}
                              className="flex items-center gap-1 text-primary hover:underline truncate max-w-[180px]"
                              title={sup.email}
                            >
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate">{sup.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={sup.direccion || ""}>
                          {sup.direccion ? (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{sup.direccion}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono" title="Compras registradas">
                              {sup.total_compras || 0} comp.
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono" title="Gastos registrados">
                              {sup.total_gastos || 0} gast.
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={
                              sup.activo
                                ? "bg-emerald-500/15 text-emerald-600 font-semibold dark:bg-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {sup.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              title="Editar Proveedor"
                              onClick={() => handleOpenEdit(sup)}
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            {!hasTransactions && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                title="Eliminar Proveedor"
                                onClick={() => handleDelete(sup)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
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
      </Card>

      {/* Modal: Crear / Editar Proveedor (Spacious and Wide) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-w-2xl w-[95vw] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="size-5 text-primary" />
              {editingId ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete los datos del proveedor comercial para asociarlo a compras de mercadería, equipos y gastos operativos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Razón Social / Nombre Comercial *</Label>
              <Input
                placeholder="Ej: Distribuidora de Fibra Óptica & Hardware S.A.C."
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                className="h-10 text-sm font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">RUC / Identificación Fiscal (11 dígitos)</Label>
                <Input
                  placeholder="Ej: 20601234567"
                  maxLength={15}
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Persona de Contacto</Label>
                <Input
                  placeholder="Ej: Ing. Carlos Mendoza"
                  value={formData.contacto_nombre}
                  onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                <Input
                  placeholder="Ej: 987654321"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Correo Electrónico</Label>
                <Input
                  type="email"
                  placeholder="ventas@proveedor.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dirección Comercial / Fiscal</Label>
              <Input
                placeholder="Ej: Av. República de Panamá 3545, San Isidro, Lima"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="h-10 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 p-3 bg-muted/30 rounded-xl border">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
              />
              <Label htmlFor="activo" className="text-xs sm:text-sm font-medium cursor-pointer">
                Proveedor Activo (Habilitado para selección en órdenes de compra y gastos operativos)
              </Label>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-xs"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar Proveedor" : "Registrar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
