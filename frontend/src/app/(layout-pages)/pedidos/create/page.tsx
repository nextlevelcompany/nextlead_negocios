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
  Truck,
  ArrowLeft,
  Building2,
  Package,
  Search,
  CheckCircle2,
  MapPin,
  X,
  User,
  Calendar,
  Clock,
  DollarSign,
  Save,
  Trash2,
  RefreshCw,
  Plus,
  Layers,
  Phone,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ProductItem {
  id: number;
  nombre: string;
  precio_unitario?: number;
  precioVenta?: number;
  precio_venta?: number;
  precio?: number;
  descripcion?: string;
  activo?: boolean;
}

interface ContactOption {
  id: number;
  tipoPersona?: string;
  tipo_persona?: string;
  nombreDisplay?: string;
  display_name?: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  numeroDocumento?: string;
  numero_documento?: string;
  telefonoPrincipal?: string;
  telefono_principal?: string;
  email?: string;
  empresaNombre?: string;
  empresa_padre_nombre?: string;
  direcciones?: any[];
}

function CreatePedidoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master lists
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  // Client search & filters (same as opportunities)
  const [contactSearch, setContactSearch] = useState("");
  const [searchFilterType, setSearchFilterType] = useState<"todos" | "empresa" | "contacto">("todos");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ContactOption | null>(null);

  // Contact addresses & subcontacts
  const [addresses, setAddresses] = useState<string[]>([]);
  const [subcontacts, setSubcontacts] = useState<any[]>([]);
  const [selectedContactPerson, setSelectedContactPerson] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");

  // Order Fields
  const todayStr = new Date().toISOString().split("T")[0];
  const [fechaEntrega, setFechaEntrega] = useState(todayStr);
  const [horaEntrega, setHoraEntrega] = useState("12:00");
  const [prioridad, setPrioridad] = useState("Media");
  const [choferId, setChoferId] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [tipoEnvio, setTipoEnvio] = useState("Despacho");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("Pendiente");
  const [notas, setNotas] = useState("");

  // Product Selection Table
  const [productosPedido, setProductosPedido] = useState<
    { id: number; nombre: string; precio: number; cantidad: number }[]
  >([]);

  // Catalog Quick-Add
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [selectedCatalogQty, setSelectedCatalogQty] = useState(1);

  // Load Initial Metadata
  useEffect(() => {
    const fetchMasters = async () => {
      setLoading(true);
      try {
        const [contactsRes, prodRes, logRes] = await Promise.all([
          api.get("/api/contacts"),
          api.get("/api/productos"),
          api.get("/api/pedidos/logistics-data"),
        ]);

        const rawContacts: any[] = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        const normalizedContacts: ContactOption[] = rawContacts.map((c) => ({
          id: c.id,
          tipoPersona: c.tipoPersona || c.tipo_persona || "NATURAL",
          tipo_persona: c.tipoPersona || c.tipo_persona || "NATURAL",
          display_name:
            c.nombreDisplay ||
            c.display_name ||
            (c.razonSocial ? c.razonSocial : `${c.nombres || ""} ${c.apellidos || ""}`.trim()) ||
            `Contacto #${c.id}`,
          nombreDisplay:
            c.nombreDisplay ||
            c.display_name ||
            (c.razonSocial ? c.razonSocial : `${c.nombres || ""} ${c.apellidos || ""}`.trim()) ||
            `Contacto #${c.id}`,
          numeroDocumento: c.numeroDocumento || c.numero_documento || "",
          numero_documento: c.numeroDocumento || c.numero_documento || "",
          telefonoPrincipal: c.telefonoPrincipal || c.telefono_principal || "",
          telefono_principal: c.telefonoPrincipal || c.telefono_principal || "",
          email: c.email || "",
          empresaNombre: c.empresaNombre || c.empresa_padre_nombre || "",
          empresa_padre_nombre: c.empresaNombre || c.empresa_padre_nombre || "",
          direcciones: Array.isArray(c.direcciones) ? c.direcciones : [],
        }));

        setContacts(normalizedContacts);
        setProductList(Array.isArray(prodRes.data) ? prodRes.data.filter((p: any) => p.activo !== false) : []);
        if (logRes.data) {
          setZonas(logRes.data.zonas || []);
          setDrivers(logRes.data.drivers || []);
          setColumns(logRes.data.columns || []);
        }

        // If editing an existing order
        if (editId) {
          const editRes = await api.get(`/api/pedidos/${editId}`);
          const p = editRes.data;
          if (p) {
            setFechaEntrega(p.fecha_entrega ? String(p.fecha_entrega).split("T")[0] : todayStr);
            setHoraEntrega(p.hora_entrega || "12:00");
            setPrioridad(p.prioridad || "Media");
            setChoferId(p.chofer_id ? String(p.chofer_id) : "");
            setZonaId(p.zona ? String(p.zona) : "");
            setTipoEnvio(p.tipo_envio || "Despacho");
            setNotas(p.notas || "");
            setMetodoPago(p.metodo_pago || "efectivo");
            setEstadoPago(p.estado_pago || "Pendiente");
            setDireccionEntrega(p.direccion_entrega || "");
            setSelectedContactPerson(p.contacto_persona_nombre || "");

            if (p.contacto_id) {
              const matched = normalizedContacts.find((c) => c.id === p.contacto_id);
              if (matched) {
                setSelectedClient(matched);
                setContactSearch(matched.display_name || "");
              }
              loadContactDetails(p.contacto_id);
            }

            if (Array.isArray(p.items)) {
              setProductosPedido(
                p.items.map((it: any) => ({
                  id: it.producto_id,
                  nombre: it.nombre || `Producto #${it.producto_id}`,
                  precio: Number(it.precio_unitario || 0),
                  cantidad: Number(it.cantidad || 1),
                }))
              );
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading order creation masters:", err);
        toast.error("Error al cargar datos maestros del pedido.");
      } finally {
        setLoading(false);
      }
    };

    fetchMasters();
  }, [editId]);

  // Load contact details, addresses, and secondary contacts
  const loadContactDetails = async (contactId: number) => {
    try {
      const res = await api.get(`/api/pedidos/contact-details/${contactId}`);
      if (res.data) {
        const rawAddrs: any[] = res.data.addresses || [];
        const addrStrings = rawAddrs
          .map((a: any) => {
            const parts = [
              a.direccion,
              a.distrito,
              a.provincia,
              a.departamento ? (a.departamento !== a.provincia ? a.departamento : null) : null,
            ].filter(Boolean);
            return parts.join(", ");
          })
          .filter(Boolean);

        setAddresses(addrStrings);
        setSubcontacts(res.data.contacts_person || []);

        // Pre-fill delivery address if not already set
        if (addrStrings.length > 0 && !direccionEntrega) {
          setDireccionEntrega(addrStrings[0]);
        }
        if (res.data.contacts_person && res.data.contacts_person.length > 0 && !selectedContactPerson) {
          setSelectedContactPerson(res.data.contacts_person[0].nombre_completo);
        }
      }
    } catch (err) {
      console.error("Error loading contact details:", err);
    }
  };

  const handleSelectClient = (c: ContactOption) => {
    setSelectedClient(c);
    setContactSearch(c.display_name || "");
    setIsDropdownOpen(false);
    loadContactDetails(c.id);
  };

  // Filter contacts by Name, Contact Person, RUC/DNI, or Phone
  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (searchFilterType === "empresa") {
      list = list.filter((c) => c.tipoPersona === "EMPRESA" || c.tipo_persona === "EMPRESA");
    } else if (searchFilterType === "contacto") {
      list = list.filter((c) => c.tipoPersona === "NATURAL" || c.tipo_persona === "NATURAL");
    }

    if (!contactSearch.trim()) return list;

    const q = contactSearch.toLowerCase().trim();
    return list.filter((c) => {
      const name = (c.display_name || c.nombreDisplay || "").toLowerCase();
      const ruc = (c.numeroDocumento || c.numero_documento || "").toLowerCase();
      const tel = (c.telefonoPrincipal || c.telefono_principal || "").toLowerCase();
      const parent = (c.empresaNombre || c.empresa_padre_nombre || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return (
        name.includes(q) ||
        ruc.includes(q) ||
        tel.includes(q) ||
        parent.includes(q) ||
        email.includes(q)
      );
    });
  }, [contacts, contactSearch, searchFilterType]);

  // Catalog Quick Add
  const handleAddCatalogItem = () => {
    if (!selectedCatalogId) {
      toast.error("Selecciona un producto del catálogo.");
      return;
    }
    const prod = productList.find((p) => String(p.id) === selectedCatalogId);
    if (!prod) return;

    const unitPriceIncIgv = Number(
      prod.precio_unitario ?? prod.precioVenta ?? prod.precio_venta ?? prod.precio ?? 0
    );

    const existingIdx = productosPedido.findIndex((p) => p.id === prod.id);
    if (existingIdx >= 0) {
      const copy = [...productosPedido];
      copy[existingIdx].cantidad += Number(selectedCatalogQty) || 1;
      setProductosPedido(copy);
    } else {
      setProductosPedido([
        ...productosPedido,
        {
          id: prod.id,
          nombre: prod.nombre,
          precio: unitPriceIncIgv,
          cantidad: Number(selectedCatalogQty) || 1,
        },
      ]);
    }

    setSelectedCatalogId("");
    setSelectedCatalogQty(1);
    toast.success(`Producto "${prod.nombre}" agregado al pedido.`);
  };

  const handleUpdateProductQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveProduct(index);
      return;
    }
    setProductosPedido((prev) => {
      const copy = [...prev];
      copy[index].cantidad = newQty;
      return copy;
    });
  };

  const handleUpdateProductPrice = (index: number, newPrice: number) => {
    setProductosPedido((prev) => {
      const copy = [...prev];
      copy[index].precio = Math.max(0, newPrice);
      return copy;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setProductosPedido((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations (Strict Sin IGV / Con IGV)
  const totalIncIgv = useMemo(() => {
    return productosPedido.reduce((acc, curr) => acc + curr.precio * curr.cantidad, 0);
  }, [productosPedido]);

  const subtotalNoIgv = totalIncIgv > 0 ? totalIncIgv / 1.18 : 0;
  const igvAmount = totalIncIgv - subtotalNoIgv;

  // Submit Order
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedClient && !editId) {
      toast.error("Por favor selecciona un cliente para el pedido.");
      return;
    }
    if (productosPedido.length === 0) {
      toast.error("Debes agregar al menos un producto al pedido.");
      return;
    }
    if (!direccionEntrega.trim()) {
      toast.error("La dirección de entrega es obligatoria.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        pedido_id: editId ? Number(editId) : null,
        contacto_id: selectedClient ? selectedClient.id : null,
        contacto_persona_nombre: selectedContactPerson,
        metodoPago: metodoPago,
        estado_pago: estadoPago,
        subtotal: Number(subtotalNoIgv.toFixed(2)),
        igv: Number(igvAmount.toFixed(2)),
        total: Number(totalIncIgv.toFixed(2)),
        direccion_entrega: direccionEntrega,
        latitud: null,
        longitud: null,
        notas: notas,
        fecha_entrega: fechaEntrega,
        hora_entrega: horaEntrega,
        chofer_id: choferId || null,
        prioridad: prioridad,
        zona: zonaId || null,
        tipo_envio: tipoEnvio,
        productos: productosPedido.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: p.cantidad,
        })),
      };

      const res = await api.post("/api/pedidos/save", payload);
      if (res.data?.status === "success" || res.status === 200) {
        toast.success(editId ? "Pedido actualizado con éxito." : "¡Pedido registrado exitosamente!");
        router.push("/pedidos/view");
      } else {
        toast.error(res.data?.message || "Error al guardar el pedido.");
      }
    } catch (err: any) {
      console.error("Error saving order:", err);
      toast.error(err.response?.data?.message || "Error de conexión al guardar pedido.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        <RefreshCw className="size-5 animate-spin mr-2" />
        Cargando datos maestros y logística...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/pedidos/view")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Volver al Tablero de Pedidos"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Truck className="size-5 text-emerald-600 shrink-0" />
              {editId ? `Editar Pedido #${editId}` : "Nuevo Pedido & Programación de Despacho"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Gestión logística comercial con desglose contable (Subtotal sin IGV, IGV 18% y Total Inc. IGV).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/pedidos/view")}
            className="text-xs h-8"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => handleSubmit()}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {editId ? "Actualizar Pedido" : "Guardar Pedido"}
          </Button>
        </div>
      </div>

      {/* 3-COLUMN RESPONSIVE LAYOUT (Col 1: Cliente | Col 2: Carga | Col 3: Despacho) */}
      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start w-full min-w-0">
          {/* ===================================================================== */}
          {/* COLUMNA 1 (lg:col-span-3 xl:col-span-3): CLIENTE, CONTACTO & DIRECCIÓN */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 min-w-0">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="size-4 text-emerald-600" />
                  1. Cliente & Contacto
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Búsqueda rápida por Razón Social, Contacto, RUC o DNI.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Search Type Filters: Todos / Empresas / Contactos */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Cliente / Razón Social *</Label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSearchFilterType("todos")}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          searchFilterType === "todos"
                            ? "bg-emerald-600 text-white font-bold"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchFilterType("empresa")}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          searchFilterType === "empresa"
                            ? "bg-emerald-600 text-white font-bold"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Empresas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchFilterType("contacto")}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          searchFilterType === "contacto"
                            ? "bg-emerald-600 text-white font-bold"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Personas
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      placeholder="Escribe nombre, RUC, DNI o teléfono..."
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="h-8 text-xs pr-7"
                    />
                    {contactSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setContactSearch("");
                          setSelectedClient(null);
                          setAddresses([]);
                        }}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-popover border rounded-md shadow-lg divide-y text-xs">
                      {filteredContacts.length === 0 ? (
                        <div className="p-3 text-center text-muted-foreground text-xs">
                          No se encontraron clientes o contactos coincidentes.
                        </div>
                      ) : (
                        filteredContacts.slice(0, 20).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="p-2 hover:bg-muted/80 cursor-pointer transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 shrink-0 ${
                                    c.tipoPersona === "EMPRESA" || c.tipo_persona === "EMPRESA"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }`}
                                >
                                  {c.tipoPersona || c.tipo_persona || "PERSONA"}
                                </Badge>
                                <span className="truncate">{c.display_name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                {(c.numeroDocumento || c.numero_documento) && (
                                  <span>Doc: {c.numeroDocumento || c.numero_documento}</span>
                                )}
                                {(c.telefonoPrincipal || c.telefono_principal) && (
                                  <span>Tel: {c.telefonoPrincipal || c.telefono_principal}</span>
                                )}
                                {(c.empresaNombre || c.empresa_padre_nombre) && (
                                  <span className="text-emerald-700 font-medium truncate">
                                    Empresa: {c.empresaNombre || c.empresa_padre_nombre}
                                  </span>
                                )}
                              </div>
                            </div>
                            <CheckCircle2 className="size-3.5 text-muted-foreground shrink-0 opacity-40 hover:opacity-100" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Active Selected Client Badge */}
                  {selectedClient && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded p-2 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-900 dark:text-emerald-300">
                          {selectedClient.display_name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Doc: {selectedClient.numeroDocumento || selectedClient.numero_documento || "---"} &bull; Tel:{" "}
                          {selectedClient.telefonoPrincipal || selectedClient.telefono_principal || "---"}
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[9px]">Seleccionado</Badge>
                    </div>
                  )}
                </div>

                {/* Persona de Contacto / Quien Recibe ("Atención:") */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Persona de Contacto / Quién Recibe</Label>
                  {subcontacts.length > 0 ? (
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                      value={selectedContactPerson}
                      onChange={(e) => setSelectedContactPerson(e.target.value)}
                    >
                      {subcontacts.map((sc) => (
                        <option key={sc.id} value={sc.nombre_completo}>
                          {sc.nombre_completo} {sc.numero_documento ? `(${sc.numero_documento})` : ""}
                        </option>
                      ))}
                      <option value="">-- Otra persona / Escribir manualmente --</option>
                    </select>
                  ) : (
                    <Input
                      placeholder="Ej. Ing. Carlos Quispe (Recepción / Almacén)"
                      value={selectedContactPerson}
                      onChange={(e) => setSelectedContactPerson(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                {/* Direcciones / Sedes Registradas */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                    <MapPin className="size-3.5 text-emerald-600" />
                    Sedes Registradas ({addresses.length}):
                  </Label>
                  {addresses.length > 0 ? (
                    <div className="text-[11px] bg-muted/40 p-2 rounded border space-y-1 max-h-24 overflow-y-auto">
                      {addresses.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDireccionEntrega(a)}
                          className="w-full text-left flex items-center gap-1 truncate text-foreground font-medium hover:text-emerald-600 hover:underline"
                          title="Click para usar esta dirección"
                        >
                          <span className="text-emerald-700 font-bold">{i + 1}.</span> {a}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic bg-muted/30 p-1.5 rounded">
                      El cliente no tiene sedes registradas. Escribe la dirección abajo.
                    </div>
                  )}
                </div>

                {/* Dirección de Entrega Final */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold">Dirección de Entrega del Pedido *</Label>
                  <Input
                    placeholder="Ej. Av. Nicolás Ayllón 1250, Almacén Central"
                    value={direccionEntrega}
                    onChange={(e) => setDireccionEntrega(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {/* Prioridad y Tipo de Envío */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Prioridad</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value)}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Tipo de Envío</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                      value={tipoEnvio}
                      onChange={(e) => setTipoEnvio(e.target.value)}
                    >
                      <option value="Despacho">Despacho</option>
                      <option value="Recojo en Almacén">Recojo Almacén</option>
                      <option value="Envío Express">Envío Express</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 2 (lg:col-span-6 xl:col-span-6): PRODUCTOS & CARGA DEL PEDIDO  */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4 min-w-0">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-emerald-600" />
                    2. Productos & Carga del Pedido
                  </div>
                  <Badge variant="outline" className="text-xs font-normal">
                    {productosPedido.length} {productosPedido.length === 1 ? "ítem" : "ítems"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Agrega productos del catálogo con desglose contable neto (Sin IGV) y precio final.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Selector Rápido del Catálogo */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/40 p-3 rounded-lg border">
                  <div className="flex-1 w-full min-w-0">
                    <select
                      className="w-full h-10 sm:h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value)}
                    >
                      <option value="">-- Seleccionar producto del catálogo --</option>
                      {productList.map((prod) => {
                        const price = Number(
                          prod.precio_unitario ?? prod.precioVenta ?? prod.precio_venta ?? prod.precio ?? 0
                        );
                        return (
                          <option key={prod.id} value={String(prod.id)}>
                            {prod.nombre} — S/ {price.toFixed(2)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="number"
                      min="1"
                      className="h-10 sm:h-8 w-20 text-center text-xs font-semibold"
                      value={selectedCatalogQty}
                      onChange={(e) => setSelectedCatalogQty(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Cant."
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCatalogItem}
                      className="h-10 sm:h-8 text-xs font-semibold flex-1 sm:flex-initial gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 flex items-center justify-center"
                    >
                      <Plus className="size-4" />
                      <span>Agregar Producto</span>
                    </Button>
                  </div>
                </div>

                {/* Tabla de Productos del Pedido */}
                <div className="border rounded-lg overflow-x-auto smooth-scroll">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                      <tr>
                        <th className="py-2 px-3 text-left">Producto / Descripción</th>
                        <th className="py-2 px-2 text-center w-24">Cant.</th>
                        <th className="py-2 px-2 text-right w-24">P. Unitario</th>
                        <th className="py-2 px-2 text-right w-28">Subtotal (Sin IGV)</th>
                        <th className="py-2 px-2 text-right w-24">Total</th>
                        <th className="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productosPedido.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Package className="size-6 text-muted-foreground/50" />
                              <p className="font-medium text-xs">Aún no has agregado productos a este pedido.</p>
                              <p className="text-[10px] text-muted-foreground">
                                Utiliza el selector superior para agregar ítems del catálogo.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        productosPedido.map((p, idx) => {
                          const itemTotal = p.precio * p.cantidad;
                          const itemNeto = itemTotal / 1.18;
                          return (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3 font-medium text-foreground">
                                <div className="truncate">{p.nombre}</div>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateProductQty(idx, p.cantidad - 1)}
                                    className="h-5 w-5 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-bold text-xs">{p.cantidad}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateProductQty(idx, p.cantidad + 1)}
                                    className="h-5 w-5 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-medium">
                                <Input
                                  type="number"
                                  step="0.10"
                                  min="0"
                                  value={p.precio}
                                  onChange={(e) => handleUpdateProductPrice(idx, parseFloat(e.target.value) || 0)}
                                  className="h-7 w-20 text-right text-xs p-1 ml-auto font-mono"
                                />
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                                S/ {itemNeto.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-foreground">
                                S/ {itemTotal.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveProduct(idx)}
                                  className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notas e Instrucciones del Pedido */}
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs font-semibold">Notas e Instrucciones para el Conductor</Label>
                  <Textarea
                    placeholder="Ej. Dejar con recepción en sótano 1, portón blanco. Confirmar por llamada antes de llegar..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 3 (lg:col-span-3 xl:col-span-3): RESUMEN & PROGRAMACIÓN       */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 min-w-0">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Truck className="size-4 text-emerald-600" />
                  3. Despacho & Pago
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Programación de entrega y cobranza del pedido.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Desglose Contable y Económico */}
                <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Subtotal Neto (Sin IGV):</span>
                    <span className="font-mono font-semibold text-foreground">S/ {subtotalNoIgv.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>IGV (18%):</span>
                    <span className="font-mono font-semibold text-foreground">S/ {igvAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Total con IGV:</span>
                    <span className="font-mono text-base font-bold text-emerald-600">
                      S/ {totalIncIgv.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Fecha y Franja Horaria de Entrega */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    Fecha de Entrega *
                  </Label>
                  <Input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Hora / Franja Estimada
                  </Label>
                  <Input
                    type="time"
                    value={horaEntrega}
                    onChange={(e) => setHoraEntrega(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Conductor Asignado */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold">Conductor / Unidad Asignada</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                    value={choferId}
                    onChange={(e) => setChoferId(e.target.value)}
                  >
                    <option value="">-- Sin conductor asignado --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.nombre} {d.apellido || ""} {d.vehiculo_placa ? `(${d.vehiculo_placa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zona de Entrega */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Zona Logística</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                    value={zonaId}
                    onChange={(e) => setZonaId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Zona --</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={String(z.id)}>
                        {z.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Método y Estado de Pago */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Método de Pago</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="yape">Yape / Plin</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Estado de Pago</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs"
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value)}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Parcial">Parcial</option>
                    </select>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                  >
                    {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    {editId ? "Actualizar Pedido" : "Guardar Pedido"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/pedidos/view")}
                    className="w-full h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PedidosCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
          <RefreshCw className="size-5 animate-spin mr-2" />
          Cargando formulario de pedidos...
        </div>
      }
    >
      <CreatePedidoContent />
    </Suspense>
  );
}
