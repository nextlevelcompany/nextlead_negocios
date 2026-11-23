"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  Clock,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";

interface CompraItem {
  id: number;
  proveedor_id: number;
  proveedor_nombre?: string | null;
  numero_compra: string;
  fecha_compra: string;
  tipo_comprobante?: string | null;
  numero_comprobante?: string | null;
  subtotal: number;
  igv: number;
  total: number;
  estado: "recibida" | "pendiente";
  notas?: string | null;
  productos_detalle?: string | null;
}

interface ProductItem {
  id: number;
  nombre: string;
  codigo?: string;
  precio_unitario?: number;
  stock_actual?: number;
}

interface ProveedorItem {
  id: number;
  razon_social: string;
  ruc?: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<CompraItem[]>([]);
  const [providers, setProviders] = useState<ProveedorItem[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTelecom, setIsTelecom] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Purchase Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [form, setForm] = useState({
    proveedor_id: "",
    fecha_compra: new Date().toISOString().substring(0, 10),
    tipo_comprobante: "Factura",
    numero_comprobante: "",
    notas: "",
  });

  const [items, setItems] = useState<
    { producto_id: number; nombre: string; cantidad: number; costo_unitario: number }[]
  >([]);

  const [selectedProdId, setSelectedProdId] = useState("");
  const [prodQty, setProdQty] = useState(1);
  const [prodCost, setProdCost] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, provRes, prodRes, setRes] = await Promise.all([
        api.get("/api/compras"),
        api.get("/api/proveedores"),
        api.get("/api/productos"),
        api.get("/api/settings").catch(() => ({ data: {} })),
      ]);

      setPurchases(Array.isArray(compRes.data) ? compRes.data : []);
      setProviders(Array.isArray(provRes.data) ? provRes.data : []);
      setProductList(Array.isArray(prodRes.data) ? prodRes.data.filter((p: any) => p.activo !== false) : []);

      const settings = setRes.data || {};
      if (settings["negocio.tipo_modelo"] === "TELECOM") {
        setIsTelecom(true);
      }
    } catch (err: any) {
      console.error("Error loading purchases:", err);
      toast.error("Error al cargar compras e inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return purchases.filter((p) => {
      const prov = (p.proveedor_nombre || "").toLowerCase();
      const num = (p.numero_compra || "").toLowerCase();
      const doc = (p.numero_comprobante || "").toLowerCase();
      const det = (p.productos_detalle || "").toLowerCase();

      const matchSearch = !term || prov.includes(term) || num.includes(term) || doc.includes(term) || det.includes(term);
      const matchProv = filterProvider === "all" || String(p.proveedor_id) === filterProvider;
      const matchEstado = filterEstado === "all" || p.estado.toLowerCase() === filterEstado.toLowerCase();

      return matchSearch && matchProv && matchEstado;
    });
  }, [purchases, searchTerm, filterProvider, filterEstado]);

  // Open Details Modal
  const handleViewDetails = async (purchase: CompraItem) => {
    setSelectedPurchase(purchase);
    setDetailModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/compras/${purchase.id}`);
      if (res.data) {
        setPurchaseDetails(res.data.details || []);
      }
    } catch (err) {
      console.error("Error loading purchase details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Add Item to Purchase Form
  const handleAddItem = () => {
    if (!selectedProdId) {
      toast.error("Selecciona un producto.");
      return;
    }
    const prod = productList.find((p) => String(p.id) === selectedProdId);
    if (!prod) return;

    const costNum = parseFloat(prodCost);
    if (isNaN(costNum) || costNum <= 0) {
      toast.error("Ingresa un costo unitario válido mayor a 0.");
      return;
    }

    const existingIdx = items.findIndex((it) => it.producto_id === prod.id);
    if (existingIdx >= 0) {
      const copy = [...items];
      copy[existingIdx].cantidad += prodQty;
      copy[existingIdx].costo_unitario = costNum;
      setItems(copy);
    } else {
      setItems([
        ...items,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: prodQty,
          costo_unitario: costNum,
        },
      ]);
    }

    setSelectedProdId("");
    setProdQty(1);
    setProdCost("");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations for New Purchase
  const formSubtotal = items.reduce((acc, curr) => acc + curr.cantidad * curr.costo_unitario, 0);
  const formIgv = formSubtotal * 0.18;
  const formTotal = formSubtotal + formIgv;

  // Submit New Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proveedor_id) {
      toast.error("Selecciona un proveedor.");
      return;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un producto a la compra.");
      return;
    }

    setSavingPurchase(true);
    try {
      const payload = {
        proveedor_id: Number(form.proveedor_id),
        fecha_compra: form.fecha_compra,
        tipo_comprobante: form.tipo_comprobante,
        numero_comprobante: form.numero_comprobante,
        subtotal: Number(formSubtotal.toFixed(2)),
        igv: Number(formIgv.toFixed(2)),
        total: Number(formTotal.toFixed(2)),
        estado: "pendiente",
        notas: form.notas,
        items: items.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          costo_unitario: it.costo_unitario,
          subtotal: Number((it.cantidad * it.costo_unitario).toFixed(2)),
        })),
      };

      await api.post("/api/compras/save", payload);
      toast.success("Compra registrada con éxito.");
      setNewModalOpen(false);
      setForm({
        proveedor_id: "",
        fecha_compra: new Date().toISOString().substring(0, 10),
        tipo_comprobante: "Factura",
        numero_comprobante: "",
        notas: "",
      });
      setItems([]);
      loadData();
    } catch (err: any) {
      console.error("Error saving purchase:", err);
      toast.error(err.response?.data?.message || "Error al registrar la compra.");
    } finally {
      setSavingPurchase(false);
    }
  };

  // Receive Purchase into Warehouse
  const handleReceivePurchase = async (id: number) => {
    if (!confirm("¿Deseas confirmar la recepción de esta compra en almacén? El inventario se incrementará automáticamente y se registrará el gasto y egreso de caja.")) return;

    try {
      const res = await api.post(`/api/compras/receive/${id}`);
      toast.success(res.data?.message || "Mercadería recibida con éxito en almacén.");
      loadData();
    } catch (err: any) {
      console.error("Error receiving purchase:", err);
      toast.error(err.response?.data?.message || "Error al procesar la recepción.");
    }
  };

  // Delete Purchase
  const handleDeletePurchase = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta orden de compra?")) return;

    try {
      await api.delete(`/api/compras/${id}`);
      toast.success("Compra eliminada con éxito.");
      loadData();
    } catch (err: any) {
      console.error("Error deleting purchase:", err);
      toast.error(err.response?.data?.message || "No se puede eliminar la compra.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows = filteredPurchases.map((p) => ({
        "N° Compra": p.numero_compra,
        Proveedor: p.proveedor_nombre || "",
        Fecha: p.fecha_compra ? p.fecha_compra.substring(0, 10) : "",
        Comprobante: `${p.tipo_comprobante || ""} ${p.numero_comprobante || ""}`.trim(),
        "Detalle Productos": p.productos_detalle || "",
        "Subtotal Sin IGV (S/)": Number(p.subtotal || 0).toFixed(2),
        "IGV (S/)": Number(p.igv || 0).toFixed(2),
        "Total (S/)": Number(p.total || 0).toFixed(2),
        Estado: p.estado,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Compras");
      XLSX.writeFile(wb, `Compras_${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success("Excel descargado correctamente.");
    } catch (err) {
      toast.error("Error al exportar Excel.");
    }
  };

  const totalFilteredNeto = filteredPurchases.reduce((sum, p) => sum + Number(p.subtotal || 0), 0);
  const totalFilteredTotal = filteredPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const recibidasCount = filteredPurchases.filter((p) => p.estado === "recibida").length;
  const pendientesCount = filteredPurchases.filter((p) => p.estado === "pendiente").length;

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="size-6 text-emerald-600" />
            Compras & Abastecimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Adquisición de mercadería, control de proveedores, stock entrante y órdenes de compra.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
            <Download className="size-4 text-emerald-600" />
            Exportar Excel
          </Button>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <Plus className="size-4" />
            Nueva Compra
          </Button>
        </div>
      </div>

      {/* Info Banner for Telecom Mode */}
      {isTelecom && (
        <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/60 rounded-lg text-sky-600 dark:text-sky-400 mt-0.5">
              <Info className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sky-900 dark:text-sky-200">
                Modelo de Ventas Telecomunicaciones Activo
              </p>
              <p className="text-sky-700 dark:text-sky-300/80 text-xs mt-0.5">
                En este modelo, el módulo de <strong>Compras</strong> está reservado para la adquisición de hardware propio (routers, módems, switches, SIM cards). 
                Los costos de operación del día a día (alquiler, comisiones de asesores, servicios) se registran en{" "}
                <Link href="/finanzas/expenses" className="underline font-medium hover:text-sky-950 dark:hover:text-white">
                  Gastos Operativos
                </Link>.
              </p>
            </div>
          </div>
          <Link href="/admin/negocio">
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/40">
              Ajustar Inventario
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras Registradas</CardTitle>
            <ShoppingCart className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{filteredPurchases.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{recibidasCount} recibidas &bull; {pendientesCount} pendientes</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invertido (Sin IGV)</CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              S/ {totalFilteredNeto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base imponible mercadería</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total con IGV</CardTitle>
            <Layers className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              S/ {totalFilteredTotal.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Facturación total compras</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de Recepción</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendientesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Por ingresar a almacén</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="bg-card shadow-xs p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por N° de compra, proveedor, comprobante, producto..."
              className="pl-8 h-8 text-xs w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Proveedor */}
          <div>
            <select
              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <option value="all">Proveedor: Todos</option>
              {providers.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.razon_social}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <select
              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="all">Estado: Todos</option>
              <option value="recibida">Recibida en Almacén</option>
              <option value="pendiente">Pendiente de Ingreso</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Purchases Table */}
      <Card className="bg-card shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold text-xs">N° Compra</TableHead>
                <TableHead className="font-semibold text-xs">Proveedor</TableHead>
                <TableHead className="font-semibold text-xs">Fecha</TableHead>
                <TableHead className="font-semibold text-xs">Comprobante</TableHead>
                <TableHead className="font-semibold text-xs">Productos / Resumen</TableHead>
                <TableHead className="font-semibold text-xs text-right">Sin IGV</TableHead>
                <TableHead className="font-semibold text-xs text-right">Total (S/)</TableHead>
                <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                <TableHead className="font-semibold text-xs text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="size-6 animate-spin text-primary" />
                      <span className="text-xs">Cargando compras...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                    No se encontraron compras registradas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((p) => {
                  const isRecibida = p.estado === "recibida";

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 border-b transition-colors text-xs">
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">
                        {p.numero_compra}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {p.proveedor_nombre || "---"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {p.fecha_compra ? p.fecha_compra.substring(0, 10) : "---"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">
                        {p.numero_comprobante ? `${p.tipo_comprobante || ""}: ${p.numero_comprobante}` : "---"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">
                        {p.productos_detalle || "Ver ítems en detalle"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        S/ {Number(p.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        S/ {Number(p.total || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 capitalize ${
                            isRecibida
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {p.estado}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(p)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded"
                            title="Ver detalle de ítems"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {!isRecibida && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReceivePurchase(p.id)}
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Recibir en Almacén e incrementar stock"
                            >
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          )}

                          {!isRecibida && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePurchase(p.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 rounded"
                              title="Eliminar compra"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL: VER DETALLE DE COMPRA */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <ShoppingCart className="size-5" />
              Detalle de Compra {selectedPurchase?.numero_compra}
            </DialogTitle>
            <DialogDescription>
              Proveedor: <strong className="text-foreground">{selectedPurchase?.proveedor_nombre}</strong> &bull; Fecha:{" "}
              {selectedPurchase?.fecha_compra}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left">Producto</th>
                    <th className="py-2 px-2 text-center">Cantidad</th>
                    <th className="py-2 px-2 text-right">Costo Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingDetails ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Cargando detalle...
                      </td>
                    </tr>
                  ) : purchaseDetails.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No hay ítems registrados en esta compra.
                      </td>
                    </tr>
                  ) : (
                    purchaseDetails.map((it, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{it.producto_nombre}</td>
                        <td className="py-2 px-2 text-center font-bold font-mono">{it.cantidad}</td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                          S/ {Number(it.costo_unitario || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          S/ {Number(it.subtotal || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border flex justify-between items-center text-xs">
              <div>
                <span className="text-muted-foreground">Estado de Recepción: </span>
                <Badge variant="outline" className="capitalize ml-1 font-semibold">
                  {selectedPurchase?.estado}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">Subtotal Sin IGV: S/ {Number(selectedPurchase?.subtotal || 0).toFixed(2)}</div>
                <div className="text-base font-bold font-mono text-emerald-600">
                  Total Inc. IGV: S/ {Number(selectedPurchase?.total || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTRAR NUEVA COMPRA */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <ShoppingCart className="size-5" />
              Nueva Orden de Compra de Mercadería
            </DialogTitle>
            <DialogDescription>
              Selecciona el proveedor y agrega los productos con sus costos de adquisición.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePurchase} className="space-y-4 py-2">
            {/* Proveedor y Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Proveedor *</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.proveedor_id}
                  onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.razon_social} {p.ruc ? `(${p.ruc})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fecha de Compra *</Label>
                <Input
                  type="date"
                  value={form.fecha_compra}
                  onChange={(e) => setForm({ ...form, fecha_compra: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            {/* Comprobante */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo Comprobante</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={form.tipo_comprobante}
                  onChange={(e) => setForm({ ...form, tipo_comprobante: e.target.value })}
                >
                  <option value="Factura">Factura</option>
                  <option value="Boleta">Boleta</option>
                  <option value="Nota de Venta">Nota de Venta</option>
                  <option value="Guía de Remisión">Guía de Remisión</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">N° Comprobante</Label>
                <Input
                  placeholder="Ej. F001-0004523"
                  value={form.numero_comprobante}
                  onChange={(e) => setForm({ ...form, numero_comprobante: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Agregar Productos */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold">Agregar Productos del Catálogo</Label>
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-muted/40 p-2.5 rounded-lg border">
                <div className="flex-1 w-full">
                  <select
                    className="w-full h-8 px-2.5 rounded-md border bg-background text-xs text-foreground"
                    value={selectedProdId}
                    onChange={(e) => {
                      setSelectedProdId(e.target.value);
                      const p = productList.find((x) => String(x.id) === e.target.value);
                      if (p && p.precio_unitario) {
                        setProdCost(String(p.precio_unitario));
                      }
                    }}
                  >
                    <option value="">-- Seleccionar Producto --</option>
                    {productList.map((prod) => (
                      <option key={prod.id} value={String(prod.id)}>
                        {prod.nombre} (Stock: {prod.stock_actual || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    className="h-8 w-16 text-center text-xs"
                    value={prodQty}
                    onChange={(e) => setProdQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Costo S/"
                    className="h-8 w-24 text-right text-xs font-mono"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabla de Ítems */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left">Producto</th>
                    <th className="py-2 px-2 text-center w-16">Cant.</th>
                    <th className="py-2 px-2 text-right w-24">Costo Unit.</th>
                    <th className="py-2 px-3 text-right w-28">Subtotal</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Agrega productos a la orden de compra utilizando el selector superior.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{it.nombre}</td>
                        <td className="py-2 px-2 text-center font-bold font-mono">{it.cantidad}</td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                          S/ {it.costo_unitario.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          S/ {(it.cantidad * it.costo_unitario).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(idx)}
                            className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen Contable */}
            <div className="bg-muted/40 p-3 rounded-lg border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (Sin IGV):</span>
                <span className="font-mono font-semibold text-foreground">S/ {formSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IGV (18%):</span>
                <span className="font-mono font-semibold text-foreground">S/ {formIgv.toFixed(2)}</span>
              </div>
              <div className="pt-1.5 border-t flex justify-between font-bold text-sm">
                <span>Total Compra:</span>
                <span className="font-mono text-emerald-600">S/ {formTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notas / Observaciones</Label>
              <Textarea
                placeholder="Condiciones de pago, plazo de entrega pactado con el proveedor..."
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewModalOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingPurchase}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {savingPurchase ? "Guardando..." : "Registrar Compra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
