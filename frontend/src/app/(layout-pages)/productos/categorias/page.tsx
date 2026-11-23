"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tag,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Boxes,
  ArrowLeft,
  X,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export default function CategoriasProductoPage() {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    id?: number;
    nombre: string;
    descripcion: string;
    activo: boolean;
  }>({
    nombre: "",
    descripcion: "",
    activo: true,
  });

  // Modal State (Delete Confirmation)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoriaProducto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategorias = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get("/api/categorias-producto");
      setCategorias(Array.isArray(res.data) ? res.data : []);
      if (isManual) toast.success("Categorías actualizadas.");
    } catch (err) {
      console.error("Error loading categories:", err);
      toast.error("Error al cargar las categorías.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const filteredCategorias = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return categorias;
    return categorias.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(term))
    );
  }, [categorias, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = categorias.length;
    const activas = categorias.filter((c) => c.activo !== false).length;
    const inactivas = total - activas;
    return { total, activas, inactivas };
  }, [categorias]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      nombre: "",
      descripcion: "",
      activo: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: CategoriaProducto) => {
    setModalMode("edit");
    setFormData({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion || "",
      activo: c.activo !== false,
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (c: CategoriaProducto) => {
    setCategoryToDelete(c);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/categorias-producto/${categoryToDelete.id}`);
      setCategorias((prev) => prev.filter((item) => item.id !== categoryToDelete.id));
      toast.success(`Categoría "${categoryToDelete.nombre}" eliminada con éxito.`);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      console.error("Error deleting category:", err);
      toast.error(err.response?.data?.message || "No se pudo eliminar la categoría.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("El nombre de la categoría es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        activo: formData.activo,
      };

      if (modalMode === "create") {
        await api.post("/api/categorias-producto", payload);
        toast.success("Categoría creada con éxito.");
      } else if (formData.id) {
        await api.put(`/api/categorias-producto/${formData.id}`, payload);
        toast.success("Categoría actualizada con éxito.");
      }

      setModalOpen(false);
      fetchCategorias();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar categoría.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border rounded-lg px-4 py-3 shadow-2xs w-full">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Categorías
            </h1>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
              {categorias.length} Categorías
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Clasificación y organización de productos y servicios por líneas comerciales.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs sm:text-sm gap-1.5"
            onClick={() => fetchCategorias(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs sm:text-sm gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            onClick={handleOpenCreate}
          >
            <Plus className="size-4" />
            <span>Nueva Categoría</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Categorías
            </span>
            <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Tag className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-foreground">{stats.total}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">registradas</span>
          </div>
        </Card>

        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Activas
            </span>
            <div className="size-6 rounded-md bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-blue-600">{stats.activas}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">en uso</span>
          </div>
        </Card>

        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Inactivas
            </span>
            <div className="size-6 rounded-md bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Boxes className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-amber-600">{stats.inactivas}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">deshabilitadas</span>
          </div>
        </Card>
      </div>

      {/* 3. Main Table Card Ajustada a la Pantalla */}
      <Card className="bg-card border rounded-lg shadow-2xs w-full max-w-full overflow-hidden">
        <CardHeader className="p-3 border-b bg-card">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoría por nombre o descripción..."
              className="pl-9 h-8 text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 w-full overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="size-6 animate-spin text-emerald-600" />
              <p className="text-xs">Cargando categorías...</p>
            </div>
          ) : filteredCategorias.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Tag className="size-8 text-muted-foreground/30" />
              <p className="text-xs sm:text-sm font-medium">No se encontraron categorías.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs font-semibold">
                    <TableHead className="w-14 text-center py-2.5">ID</TableHead>
                    <TableHead className="w-48 sm:w-60 py-2.5">Nombre</TableHead>
                    <TableHead className="py-2.5 min-w-0">Descripción</TableHead>
                    <TableHead className="w-24 text-center py-2.5">Estado</TableHead>
                    <TableHead className="w-24 text-right py-2.5 pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategorias.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* ID */}
                      <TableCell className="w-14 text-center font-mono text-xs text-muted-foreground py-2.5">
                        #{c.id}
                      </TableCell>

                      {/* Nombre */}
                      <TableCell className="w-48 sm:w-60 py-2.5 font-semibold text-foreground text-xs sm:text-sm truncate">
                        <div className="flex items-center gap-2 truncate">
                          <Tag className="size-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate" title={c.nombre}>{c.nombre}</span>
                        </div>
                      </TableCell>

                      {/* Descripción (Ajustada con line-clamp para no desbordar a la derecha) */}
                      <TableCell className="py-2.5 min-w-0 max-w-0 overflow-hidden text-muted-foreground text-xs leading-relaxed">
                        <p className="line-clamp-2" title={c.descripcion || "Sin descripción"}>
                          {c.descripcion || "Sin descripción"}
                        </p>
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="w-24 text-center py-2.5 shrink-0">
                        <Badge
                          variant={c.activo !== false ? "default" : "secondary"}
                          className={`text-[9px] px-2 py-0.5 ${
                            c.activo !== false ? "bg-emerald-600 text-white" : ""
                          }`}
                        >
                          {c.activo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="w-24 text-right py-2.5 pr-4 shrink-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-600 hover:text-emerald-600"
                            title="Editar categoría"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit2 className="size-3.5 text-emerald-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Eliminar categoría"
                            onClick={() => handleOpenDelete(c)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Modal Crear / Editar Categoría */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                {modalMode === "create" ? "Nueva Categoría" : "Editar Categoría"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="p-4 flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium">Nombre de la Categoría *</Label>
                <Input
                  placeholder="Ej: Servicios Cloud, Equipamiento, etc."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="h-8 text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium">Descripción</Label>
                <Textarea
                  placeholder="Descripción de la línea de productos o servicios..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                <span className="text-xs font-medium">Estado Activo</span>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {modalMode === "create" ? "Crear Categoría" : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Confirmación de Eliminación */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">¿Eliminar categoría?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ¿Estás seguro de que deseas eliminar permanentemente la categoría{" "}
                  <span className="font-semibold text-foreground">"{categoryToDelete.nombre}"</span>?
                  Si tiene productos o servicios vinculados, el sistema no permitirá su eliminación.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCategoryToDelete(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                <Trash2 className="size-3.5" />
                <span>{deleting ? "Eliminando..." : "Sí, Eliminar"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
