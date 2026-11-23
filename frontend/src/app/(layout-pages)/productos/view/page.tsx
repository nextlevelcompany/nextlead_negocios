"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  List as ListIcon,
  X,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Tag,
  AlertTriangle,
  Camera,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ProductoComponente {
  productoPadreId?: number;
  productoHijoId: number;
  nombre?: string;
  cantidad: number;
  requiereRetorno?: boolean;
  categoriaId?: number;
}

export interface Producto {
  id: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  categoriaNombre?: string;
  precioVenta: number;
  stockActual: number;
  imagen?: string | null;
  esPack?: boolean;
  requiereRetorno?: boolean;
  activo?: boolean;
  components?: ProductoComponente[];
  tipoProducto?: string;
  subcategoria?: string;
  velocidadMbps?: number;
  equipamientoIncluido?: string;
  telefoniaIncluida?: string;
  requiereRuc20?: boolean;
  permiteHardphone?: boolean;
  centralVirtualCosto?: number;
  esMultisede?: boolean;
  preciosEscalonadosJson?: string;
  distritosPermitidos?: string;
  provinciasExcluidas?: string;
  limiteMaxCantidad?: number;
  documentosRequeridos?: string;
}

export interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export default function ProductosCatalogPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Grid Columns Selector (4, 6, 8 por fila - default 6)
  const [gridColumns, setGridColumns] = useState<4 | 6 | 8>(6);

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    id?: number;
    codigo: string;
    nombre: string;
    descripcion: string;
    categoriaId: string;
    precioVenta: string;
    stockActual: string;
    imagen: string;
    esPack: boolean;
    requiereRetorno: boolean;
    activo: boolean;
  }>({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoriaId: "",
    precioVenta: "0.00",
    stockActual: "0",
    imagen: "",
    esPack: false,
    requiereRetorno: false,
    activo: true,
  });

  // Modal State (Delete Confirmation)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State (Quick Image Edit)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageProduct, setImageProduct] = useState<Producto | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [savingImage, setSavingImage] = useState(false);

  // Normalizes image source (base64, URL or local path)
  const getImageSrc = (imagen?: string | null): string | null => {
    if (!imagen) return null;
    const img = imagen.trim();
    if (img.startsWith("data:image") || img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")) {
      return img;
    }
    if (img.length > 50 && !img.includes(" ") && !img.includes("\n")) {
      return `data:image/jpeg;base64,${img}`;
    }
    return null;
  };

  // Resizes and compresses image via HTML5 Canvas before uploading
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("El archivo seleccionado no es una imagen válida."));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDimension = 900;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          resolve(compressed);
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsDataURL(file);
    });
  };

  const handleOpenImageEdit = (p: Producto) => {
    setImageProduct(p);
    setImagePreview(p.imagen || "");
    setImageUrlInput(p.imagen && !p.imagen.startsWith("data:") ? p.imagen : "");
    setImageModalOpen(true);
  };

  const handleSaveImageOnly = async () => {
    if (!imageProduct) return;
    setSavingImage(true);
    try {
      const newImg = imagePreview.trim() || null;
      await api.patch(`/api/productos/${imageProduct.id}/imagen`, { imagen: newImg });

      setProductos((prev) =>
        prev.map((item) => (item.id === imageProduct.id ? { ...item, imagen: newImg || undefined } : item))
      );
      toast.success(`Foto de "${imageProduct.nombre}" actualizada.`);
      setImageModalOpen(false);
      setImageProduct(null);
    } catch (err: any) {
      console.error("Error saving image:", err);
      // Fallback: try full product PUT if PATCH isn't supported
      try {
        const updated = { ...imageProduct, imagen: imagePreview.trim() || null };
        await api.put(`/api/productos/${imageProduct.id}`, updated);
        setProductos((prev) =>
          prev.map((item) => (item.id === imageProduct.id ? updated : item))
        );
        toast.success(`Foto de "${imageProduct.nombre}" actualizada.`);
        setImageModalOpen(false);
        setImageProduct(null);
      } catch (fallbackErr: any) {
        toast.error("No se pudo actualizar la imagen del producto.");
      }
    } finally {
      setSavingImage(false);
    }
  };

  // Fetch Products and Categories from Backend
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/api/productos"),
        api.get("/api/categorias-producto"),
      ]);

      setProductos(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCategorias(Array.isArray(catRes.data) ? catRes.data : []);

      if (isManual) toast.success("Catálogo actualizado desde la base de datos.");
    } catch (err: any) {
      console.error("Error al cargar productos:", err);
      toast.error("Error al cargar productos y categorías.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      // Category filter
      if (selectedCategoria !== "all" && String(p.categoriaId) !== selectedCategoria) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchesName = (p.nombre || "").toLowerCase().includes(term);
        const matchesCode = (p.codigo || "").toLowerCase().includes(term);
        const matchesCat = (p.categoriaNombre || "").toLowerCase().includes(term);
        const matchesDesc = (p.descripcion || "").toLowerCase().includes(term);
        const matchesSubcat = (p.subcategoria || "").toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesCat && !matchesDesc && !matchesSubcat) {
          return false;
        }
      }
      return true;
    });
  }, [productos, selectedCategoria, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = productos.length;
    const catsCount = categorias.length;
    const activos = productos.filter((p) => p.activo !== false).length;
    const conStock = productos.filter((p) => (p.stockActual || 0) > 0).length;
    return { total, catsCount, activos, conStock };
  }, [productos, categorias]);

  // Modal Open Create
  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      categoriaId: categorias[0] ? String(categorias[0].id) : "",
      precioVenta: "0.00",
      stockActual: "999",
      imagen: "",
      esPack: false,
      requiereRetorno: false,
      activo: true,
    });
    setModalOpen(true);
  };

  // Modal Open Edit
  const handleOpenEdit = (p: Producto) => {
    setModalMode("edit");
    setFormData({
      id: p.id,
      codigo: p.codigo || "",
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      categoriaId: p.categoriaId ? String(p.categoriaId) : "",
      precioVenta: p.precioVenta != null ? String(p.precioVenta) : "0.00",
      stockActual: p.stockActual != null ? String(p.stockActual) : "0",
      imagen: p.imagen || "",
      esPack: !!p.esPack,
      requiereRetorno: !!p.requiereRetorno,
      activo: p.activo !== false,
    });
    setModalOpen(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (p: Producto) => {
    setProductToDelete(p);
    setDeleteModalOpen(true);
  };

  // Confirm Delete Product
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/productos/${productToDelete.id}`);
      setProductos((prev) => prev.filter((item) => item.id !== productToDelete.id));
      toast.success(`Producto "${productToDelete.nombre}" eliminado correctamente.`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      console.error("Error al eliminar producto:", err);
      toast.error(err.response?.data?.message || "Error al eliminar el producto.");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle Activo
  const handleToggleActivo = async (p: Producto) => {
    try {
      const updated = { ...p, activo: !p.activo };
      await api.put(`/api/productos/${p.id}`, updated);
      setProductos((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      toast.success(`Producto "${p.nombre}" ${!p.activo ? "activado" : "desactivado"}.`);
    } catch (err: any) {
      toast.error("Error al cambiar el estado del producto.");
    }
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("El nombre del producto es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const existingProd = formData.id ? productos.find((p) => p.id === formData.id) : null;
      const payload: any = {
        ...(existingProd || {}),
        codigo: formData.codigo.trim() || null,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        categoriaId: formData.categoriaId ? Number(formData.categoriaId) : null,
        precioVenta: parseFloat(formData.precioVenta) || 0,
        stockActual: parseInt(formData.stockActual) || 0,
        imagen: formData.imagen ? formData.imagen.trim() : null,
        esPack: formData.esPack,
        requiereRetorno: formData.requiereRetorno,
        activo: formData.activo,
      };

      if (modalMode === "create") {
        await api.post("/api/productos", payload);
        toast.success("Producto creado exitosamente.");
        setModalOpen(false);
        fetchData();
      } else if (modalMode === "edit" && formData.id) {
        await api.put(`/api/productos/${formData.id}`, payload);
        toast.success("Producto actualizado exitosamente.");
        setModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error("Error saving product:", err);
      toast.error(err.response?.data?.message || "Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  // Dynamic grid column class based on state (4, 6, 8)
  const gridColsClass = useMemo(() => {
    if (gridColumns === 4) {
      return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4";
    }
    if (gridColumns === 8) {
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-2.5";
    }
    // Default 6
    return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2.5 sm:gap-3";
  }, [gridColumns]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 pb-12">
      {/* --------------------------------------------------------------------- */}
      {/* 1. HEADER DE ACCIONES Y TÍTULO */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border rounded-lg px-4 py-3 shadow-2xs w-full">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="size-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Catálogo
            </h1>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
              {productos.length} Registros
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gestión general de productos, servicios, precios de venta y categorías comerciales.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs sm:text-sm gap-1.5"
            onClick={() => fetchData(true)}
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
            <span>Nuevo Producto</span>
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. STATS KPI CARDS */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Catálogo
            </span>
            <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Boxes className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-foreground">{stats.total}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">registros</span>
          </div>
        </Card>

        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Categorías
            </span>
            <div className="size-6 rounded-md bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <Tag className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-blue-600">{stats.catsCount}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">activas</span>
          </div>
        </Card>

        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Ítems Activos
            </span>
            <div className="size-6 rounded-md bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-purple-600">{stats.activos}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">habilitados</span>
          </div>
        </Card>

        <Card className="bg-card p-3 border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Con Disponibilidad
            </span>
            <div className="size-6 rounded-md bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold text-amber-600">{stats.conStock}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">en stock</span>
          </div>
        </Card>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. BARRA DE FILTROS, CATEGORÍAS, SELECTOR DE COLUMNAS Y BÚSQUEDA */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-card border rounded-lg p-2.5 shadow-2xs w-full">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o categoría..."
            className="pl-9 h-9 text-xs sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categorías y Controles de Vista */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 px-2.5 rounded-md border bg-background text-xs sm:text-sm font-medium"
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
          >
            <option value="all">Todas las Categorías ({productos.length})</option>
            {categorias.map((c) => {
              const count = productos.filter((p) => p.categoriaId === c.id).length;
              return (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre} ({count})
                </option>
              );
            })}
          </select>

          {/* Selector de Columnas (4, 6, 8) - Visible en modo Cuadrícula */}
          {viewMode === "grid" && (
            <div className="flex items-center border rounded-md p-0.5 bg-muted/40 gap-0.5">
              <span className="text-[10px] font-bold text-muted-foreground px-1.5 select-none">
                Filas:
              </span>
              {([4, 6, 8] as const).map((cols) => (
                <Button
                  key={cols}
                  variant={gridColumns === cols ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 text-xs font-bold ${
                    gridColumns === cols
                      ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setGridColumns(cols)}
                  title={`Mostrar ${cols} productos por fila`}
                >
                  {cols}
                </Button>
              ))}
            </div>
          )}

          {/* Toggle Vista Grid / Tabla */}
          <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
              title="Vista de Cuadrícula"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("table")}
              title="Vista de Lista / Tabla"
            >
              <ListIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. CONTENIDO PRINCIPAL: CATÁLOGO EN CUADRÍCULA O LISTA */}
      {/* --------------------------------------------------------------------- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border rounded-lg w-full">
          <RefreshCw className="size-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">Cargando catálogo...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border rounded-lg text-center w-full">
          <Boxes className="size-12 text-muted-foreground mb-3 stroke-[1.2]" />
          <h3 className="text-base font-semibold">No se encontraron productos</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            No hay productos o servicios que coincidan con los filtros aplicados.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategoria("all");
            }}
          >
            Limpiar Filtros
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* VISTA CUADRÍCULA (GRID CONFIGURABLE: 4, 6 o 8 POR FILA) */
        <div className={`grid ${gridColsClass} items-stretch w-full`}>
          {filteredProducts.map((p) => (
            <Card
              key={p.id}
              className={`h-full flex flex-col justify-between overflow-hidden bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border shadow-2xs hover:shadow-md transition-all duration-200 ${
                !p.activo ? "opacity-60 bg-muted/10" : ""
              }`}
            >
              {/* 1. Contenedor de la Imagen Full-Bleed (Proporción fija cuadrada de borde a borde) */}
              <div className="aspect-square w-full relative overflow-hidden bg-gray-100 dark:bg-muted/40 group">
                {getImageSrc(p.imagen) ? (
                  <img
                    src={getImageSrc(p.imagen)!}
                    alt={p.nombre}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 select-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground gap-1.5 p-3 text-center">
                    <Boxes className="size-9 stroke-[1.2]" />
                    <span className="text-[10px] font-medium">Sin imagen</span>
                  </div>
                )}

                {/* Botón rápido para cambiar / editar imagen */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenImageEdit(p);
                  }}
                  className="absolute bottom-2 left-2 z-10 bg-black/75 hover:bg-black text-white rounded-md px-2 py-1 text-[10px] font-medium backdrop-blur-xs flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                  title="Cambiar o subir foto de este producto"
                >
                  <Camera className="size-3" />
                  <span>Editar Foto</span>
                </button>

                {/* Badge de estado de stock en la esquina superior derecha */}
                <div className="absolute top-2 right-2 z-10 shadow-2xs">
                  <Badge
                    variant={p.stockActual > 0 ? "secondary" : "destructive"}
                    className={`text-[9px] px-1.5 py-0.5 font-bold shadow-2xs ${
                      p.stockActual > 0
                        ? "bg-white/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-destructive text-white"
                    }`}
                  >
                    {p.stockActual > 0 ? `Stock: ${p.stockActual}` : "Agotado"}
                  </Badge>
                </div>
              </div>

              {/* 2. Cuerpo de la tarjeta (contenido compacto debajo de la imagen) */}
              <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-2">
                <div className="flex flex-col gap-1">
                  {/* Categoría a la izquierda y SKU en pill a la derecha */}
                  <div className="flex items-center justify-between text-xs gap-1">
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 truncate max-w-[100px]">
                      {p.categoriaNombre || "General"}
                    </span>
                    <span className="text-[9px] font-mono bg-gray-100 dark:bg-muted px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-medium shrink-0">
                      {p.codigo || `#${p.id}`}
                    </span>
                  </div>

                  {/* Título en negrita y line-clamp-1 */}
                  <h3 className="font-semibold text-gray-900 dark:text-foreground text-xs sm:text-sm line-clamp-1 leading-snug" title={p.nombre}>
                    {p.nombre}
                  </h3>

                  {/* Descripción corta debajo */}
                  {p.descripcion ? (
                    <p className="text-[11px] text-gray-500 dark:text-muted-foreground line-clamp-2 leading-relaxed min-h-[1.75rem]">
                      {p.descripcion}
                    </p>
                  ) : (
                    <p className="text-[11px] text-transparent select-none line-clamp-2 min-h-[1.75rem]">
                      -
                    </p>
                  )}
                </div>

                {/* 3. Pie de tarjeta: precio y botones de acción */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border/60 mt-auto gap-1">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">S/</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      {Number(p.precioVenta || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Botones de acción: Editar, Eliminar y Switch Activo */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 border-gray-200 dark:border-border"
                      title="Editar producto"
                      onClick={() => handleOpenEdit(p)}
                    >
                      <Edit2 className="size-3 text-emerald-600" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/40 border-gray-200 dark:border-border"
                      title="Eliminar producto"
                      onClick={() => handleOpenDelete(p)}
                    >
                      <Trash2 className="size-3 text-red-500" />
                    </Button>

                    <Button
                      type="button"
                      variant={p.activo ? "ghost" : "secondary"}
                      size="sm"
                      className={`h-6 px-1.5 text-[9px] font-semibold rounded-md ${
                        p.activo
                          ? "text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-muted-foreground bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => handleToggleActivo(p)}
                    >
                      {p.activo ? "Activo" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* VISTA LISTA / TABLA TOTALMENTE AJUSTADA AL ANCHO DE PANTALLA (SIN DESBORDES) */
        <div className="bg-card border rounded-lg overflow-hidden shadow-2xs w-full max-w-full">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12 text-center py-2.5">Foto</TableHead>
                <TableHead className="w-24 sm:w-28 py-2.5 hidden sm:table-cell">Código</TableHead>
                <TableHead className="py-2.5 min-w-0">Producto / Servicio</TableHead>
                <TableHead className="w-28 sm:w-36 py-2.5 hidden md:table-cell">Categoría</TableHead>
                <TableHead className="w-24 sm:w-28 text-right py-2.5">Precio</TableHead>
                <TableHead className="w-16 sm:w-20 text-center py-2.5 hidden lg:table-cell">Stock</TableHead>
                <TableHead className="w-20 sm:w-24 text-center py-2.5">Estado</TableHead>
                <TableHead className="w-20 sm:w-24 text-right py-2.5 pr-3">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                  {/* Foto con clic para editar */}
                  <TableCell className="w-12 text-center py-2">
                    <div
                      onClick={() => handleOpenImageEdit(p)}
                      className="size-8 rounded-md bg-gray-100 dark:bg-muted/60 overflow-hidden flex items-center justify-center mx-auto border shrink-0 cursor-pointer relative group hover:ring-2 hover:ring-emerald-500 transition-all"
                      title="Clic para cambiar foto"
                    >
                      {getImageSrc(p.imagen) ? (
                        <img src={getImageSrc(p.imagen)!} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <Boxes className="size-4 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="size-3" />
                      </div>
                    </div>
                  </TableCell>

                  {/* Código */}
                  <TableCell className="w-24 sm:w-28 font-mono text-xs font-semibold py-2 hidden sm:table-cell truncate">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate max-w-full inline-block">
                      {p.codigo || `#${p.id}`}
                    </span>
                  </TableCell>

                  {/* Producto / Servicio (Toma el espacio restante y se trunca elegantemente) */}
                  <TableCell className="py-2 min-w-0 max-w-0 overflow-hidden">
                    <div className="font-semibold text-foreground text-xs sm:text-sm truncate" title={p.nombre}>
                      {p.nombre}
                    </div>
                    {p.descripcion && (
                      <div className="text-[11px] text-muted-foreground truncate" title={p.descripcion}>
                        {p.descripcion}
                      </div>
                    )}
                  </TableCell>

                  {/* Categoría */}
                  <TableCell className="w-28 sm:w-36 py-2 hidden md:table-cell truncate">
                    <Badge variant="outline" className="text-[10px] font-medium truncate max-w-full">
                      {p.categoriaNombre || "General"}
                    </Badge>
                  </TableCell>

                  {/* Precio */}
                  <TableCell className="w-24 sm:w-28 text-right font-mono font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 py-2 shrink-0 whitespace-nowrap">
                    S/ {Number(p.precioVenta || 0).toFixed(2)}
                  </TableCell>

                  {/* Stock */}
                  <TableCell className="w-16 sm:w-20 text-center font-mono text-xs py-2 hidden lg:table-cell shrink-0">
                    <span className={p.stockActual > 0 ? "text-foreground font-medium" : "text-red-500 font-bold"}>
                      {p.stockActual}
                    </span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="w-20 sm:w-24 text-center py-2 shrink-0">
                    <Badge
                      variant={p.activo ? "default" : "secondary"}
                      className={`text-[9px] px-2 py-0.5 cursor-pointer whitespace-nowrap ${
                        p.activo ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      }`}
                      onClick={() => handleToggleActivo(p)}
                      title="Clic para cambiar estado"
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="w-20 sm:w-24 text-right py-2 pr-3 shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        title="Cambiar foto del producto"
                        onClick={() => handleOpenImageEdit(p)}
                      >
                        <Camera className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-600 hover:text-emerald-600"
                        title="Editar producto"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Edit2 className="size-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Eliminar producto"
                        onClick={() => handleOpenDelete(p)}
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

      {/* --------------------------------------------------------------------- */}
      {/* 5. MODAL DE CREAR / EDITAR PRODUCTO O SERVICIO */}
      {/* --------------------------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <h2 className="text-base font-bold text-foreground">
                {modalMode === "create" ? "Nuevo Producto o Servicio" : "Editar Producto o Servicio"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 rounded-full"
                onClick={() => setModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Nombre *</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Plan Fibra Óptica o Producto A"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Código / SKU</label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej. PROD-001"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Categoría</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border text-xs bg-background"
                    value={formData.categoriaId}
                    onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Imagen / Foto del Producto */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Foto / Imagen del Producto
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                  <div className="size-16 rounded-md bg-gray-100 dark:bg-muted/60 border overflow-hidden flex items-center justify-center shrink-0">
                    {getImageSrc(formData.imagen) ? (
                      <img
                        src={getImageSrc(formData.imagen)!}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Boxes className="size-6 text-muted-foreground stroke-[1.2]" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-xs font-medium border shadow-2xs">
                        <Upload className="size-3.5" />
                        <span>Subir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await processImageFile(file);
                                setFormData((prev) => ({ ...prev, imagen: base64 }));
                                toast.success("Foto seleccionada.");
                              } catch (err: any) {
                                toast.error(err.message || "Error al procesar la imagen.");
                              }
                            }
                          }}
                        />
                      </label>

                      {formData.imagen && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 px-2"
                          onClick={() => setFormData((prev) => ({ ...prev, imagen: "" }))}
                        >
                          <Trash2 className="size-3" />
                          <span>Quitar</span>
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="O pegar URL de imagen (https://...)"
                      value={formData.imagen && !formData.imagen.startsWith("data:") ? formData.imagen : ""}
                      onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Descripción</label>
                <textarea
                  className="w-full rounded-md border text-xs p-2 bg-background"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Precio Venta (PEN)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Stock Disponible</label>
                  <Input
                    type="number"
                    value={formData.stockActual}
                    onChange={(e) => setFormData({ ...formData, stockActual: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 6. MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* --------------------------------------------------------------------- */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">¿Eliminar producto?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ¿Estás seguro de que deseas eliminar permanentemente{" "}
                  <span className="font-semibold text-foreground">"{productToDelete.nombre}"</span>
                  {productToDelete.codigo ? ` (${productToDelete.codigo})` : ""}? Esta acción no se puede deshacer.
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
                  setProductToDelete(null);
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

      {/* --------------------------------------------------------------------- */}
      {/* 7. MODAL RÁPIDO PARA EDITAR / SUBIR IMAGEN DEL PRODUCTO */}
      {/* --------------------------------------------------------------------- */}
      {imageModalOpen && imageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Camera className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Editar Imagen</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                    {imageProduct.nombre} {imageProduct.codigo ? `(${imageProduct.codigo})` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 rounded-full"
                onClick={() => {
                  setImageModalOpen(false);
                  setImageProduct(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Preview Box */}
            <div className="flex flex-col items-center justify-center">
              <div className="size-44 sm:size-52 rounded-xl bg-gray-100 dark:bg-muted/40 border-2 border-dashed border-gray-300 dark:border-border overflow-hidden flex items-center justify-center relative shadow-inner group">
                {getImageSrc(imagePreview) ? (
                  <>
                    <img
                      src={getImageSrc(imagePreview)!}
                      alt={imageProduct.nombre}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs gap-1"
                        onClick={() => {
                          setImagePreview("");
                          setImageUrlInput("");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Quitar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <ImageIcon className="size-10 stroke-[1.2] mb-1.5 opacity-60" />
                    <span className="text-xs font-semibold">Sin imagen asignada</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Sube una foto o ingresa una URL</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action 1: Upload File */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Subir foto desde tu dispositivo
              </label>
              <label className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-colors text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Upload className="size-4" />
                <span>Elegir imagen (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const base64 = await processImageFile(file);
                        setImagePreview(base64);
                        setImageUrlInput("");
                        toast.success("Foto procesada y lista para guardar.");
                      } catch (err: any) {
                        toast.error(err.message || "Error al procesar la imagen.");
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* Action 2: Paste URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                O pegar enlace URL de la imagen
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      setImagePreview(imageUrlInput.trim());
                      toast.success("URL de imagen asignada.");
                    }
                  }}
                >
                  Cargar URL
                </Button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t mt-1">
              {imagePreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-8 gap-1"
                  onClick={() => {
                    setImagePreview("");
                    setImageUrlInput("");
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Quitar Imagen
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setImageModalOpen(false);
                    setImageProduct(null);
                  }}
                  disabled={savingImage}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                  onClick={handleSaveImageOnly}
                  disabled={savingImage}
                >
                  <Save className="size-3.5" />
                  <span>{savingImage ? "Guardando..." : "Guardar Imagen"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
