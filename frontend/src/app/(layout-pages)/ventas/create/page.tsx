"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  ShoppingCart,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Package,
  Coins,
  Search,
  CheckCircle2,
  Printer,
  ArrowLeft,
  FileText,
  UserCheck,
  CreditCard,
  Check,
  MapPin,
  X,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  CorporateQuoteTable,
  CorporateQuoteItem,
} from "@/components/opportunities/CorporateQuoteTable";

interface ContactOption {
  id: number;
  tipo_persona?: string;
  display_name: string;
  telefono_principal?: string;
  numero_documento?: string;
  email?: string;
  razon_social?: string;
  nombres?: string;
  apellidos?: string;
  empresa_id?: number;
  empresa_padre_nombre?: string;
  direccion?: string;
}

interface ProductItem {
  id: number;
  nombre: string;
  codigo?: string;
  precioVenta?: number;
  precio_venta?: number;
  precio?: number;
  stockActual?: number;
  stock_actual?: number;
  descripcion?: string;
  categoria_nombre?: string;
  activo?: boolean;
}

function CreateSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromContactId = searchParams.get("contacto_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master Data
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [subcontacts, setSubcontacts] = useState<any[]>([]);
  const [selectedContactPerson, setSelectedContactPerson] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);

  // Search & Filter state for client & contact
  const [contactSearch, setContactSearch] = useState("");
  const [searchFilterType, setSearchFilterType] = useState<"todos" | "empresa" | "contacto">("todos");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    contacto_id: "" as string | number,
    trabajador_id: "" as string | number,
    tipo_comprobante: "factura" as "factura" | "boleta" | "nota_venta",
    estado_operativo: "pendiente" as "pendiente" | "en_proceso" | "completada",
    metodo_pago: "Transferencia",
    estado_pago: "pendiente" as "pendiente" | "pagado" | "parcial",
    monto_pagado: 0,
    moneda: "Soles",
    tipo_propuesta: "venta" as "venta" | "renovacion",
    plazo_acuerdo: 24,
    direccion_entrega: "",
    firma_nombre: "",
    firma_cargo: "",
    firma_celular: "",
    firma_email: "",
    condiciones_comerciales: "Venta e instalación sujeta a factibilidad técnica y conformidad de entrega.",
    notas: "",
  });

  // Items in Sale
  const [items, setItems] = useState<CorporateQuoteItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  // Load Initial Metadata
  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      try {
        const [contactsRes, prodsRes, settingsRes, staffRes] = await Promise.all([
          api.get("/api/contacts"),
          api.get("/api/productos"),
          api.get("/api/opportunities/settings").catch(() => ({ data: {} })),
          api.get("/api/payroll/staff").catch(() => ({ data: [] })),
        ]);

        const rawContacts = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        const mappedContacts: ContactOption[] = rawContacts.map((c: any) => ({
          id: c.id,
          tipo_persona: c.tipoPersona || c.tipo_persona || (c.razonSocial ? "EMPRESA" : "NATURAL"),
          display_name: c.razonSocial || `${c.nombres || ""} ${c.apellidos || ""}`.trim() || `Contacto #${c.id}`,
          telefono_principal: c.telefonoPrincipal || c.telefono_principal || "",
          numero_documento: c.numeroDocumento || c.numero_documento || "",
          email: c.email || "",
          empresa_id: c.empresaId || c.empresa_id,
          empresa_padre_nombre: c.empresaPadreNombre || c.empresa_padre_nombre,
          direccion: c.direccion || "",
        }));

        const rawProds = Array.isArray(prodsRes.data) ? prodsRes.data : [];
        const mappedProds: ProductItem[] = rawProds.map((p: any) => ({
          ...p,
          precio_venta: Number(p.precioVenta ?? p.precio_venta ?? p.precio ?? 0),
          stock_actual: Number(p.stockActual ?? p.stock_actual ?? 0),
        }));

        const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
        setStaffList(rawStaff);
        setContacts(mappedContacts);
        setProducts(mappedProds);

        const loadedSettings = settingsRes.data || {};
        const firstStaff = rawStaff.length > 0 ? rawStaff[0] : null;

        if (loadedSettings || firstStaff) {
          setForm((prev) => ({
            ...prev,
            trabajador_id: prev.trabajador_id || (firstStaff ? firstStaff.id : ""),
            firma_nombre: firstStaff ? `${firstStaff.nombre} ${firstStaff.apellido || ""}`.trim() : (loadedSettings["cotizacion.firma_nombre_defecto"] || prev.firma_nombre),
            firma_cargo: firstStaff ? (firstStaff.perfil_nombre || firstStaff.rol_operativo || "Asesor Comercial") : (loadedSettings["cotizacion.firma_cargo_defecto"] || prev.firma_cargo),
            firma_celular: firstStaff ? (firstStaff.linea_movil || firstStaff.telefono || "") : (loadedSettings["cotizacion.firma_celular_defecto"] || prev.firma_celular),
            firma_email: loadedSettings["cotizacion.firma_email_defecto"] || prev.firma_email,
            condiciones_comerciales: loadedSettings["cotizacion.condiciones_defecto"] || prev.condiciones_comerciales,
          }));
        }

        // If pre-selected contact via URL
        if (fromContactId) {
          const match = mappedContacts.find((c) => String(c.id) === String(fromContactId));
          if (match) {
            handleSelectContact(match);
          }
        }
      } catch (err: any) {
        console.error("Error loading sales metadata:", err);
        toast.error("Error al cargar lista de clientes o catálogo de productos.");
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [fromContactId]);

  // Load Contact Addresses & Subcontacts
  const loadContactAddresses = async (contactId: number | string) => {
    try {
      const res = await api.get(`/api/opportunities/contact-addresses/${contactId}`);
      const rawAddrs: any[] = res.data?.addresses || [];
      const subc: any[] = res.data?.subcontacts || [];

      const formatAddressWithDistritoYCiudad = (a: any) => {
        if (a.direccion_con_ubigeo) return a.direccion_con_ubigeo;
        const street = (a.direccion || a.direccion_completa || "").trim();
        const dis = (a.distrito || "").trim();
        const ciudad = (a.provincia || a.departamento || "Lima").trim();

        let loc = "";
        if (dis && ciudad) {
          loc = `${dis}, ${ciudad}`;
        } else if (dis) {
          loc = dis;
        } else if (ciudad) {
          loc = ciudad;
        }

        if (!street) return loc;
        if (!loc) return street;

        const stUpper = street.toUpperCase();
        if (stUpper.includes(dis.toUpperCase()) && stUpper.includes(ciudad.toUpperCase())) {
          return street;
        }
        return `${street}, ${loc}`;
      };

      const addressStrings: string[] = rawAddrs
        .map(formatAddressWithDistritoYCiudad)
        .filter(Boolean);

      setAddresses(addressStrings);
      setSubcontacts(subc);

      if (subc.length > 0) {
        setSelectedContactPerson(subc[0].nombre_completo);
      }

      if (addressStrings.length > 0) {
        const primary = addressStrings[0];
        setForm((prev) => ({
          ...prev,
          direccion_entrega: prev.direccion_entrega || primary,
        }));
        setItems((prev) =>
          prev.map((it) => (!it.direccion || it.direccion === "Dirección de Sede Principal" ? { ...it, direccion: primary } : it))
        );
      }
    } catch (err) {
      console.error("Error loading contact addresses:", err);
      setAddresses([]);
      setSubcontacts([]);
    }
  };

  const handleSelectContact = (c: ContactOption) => {
    setForm((prev) => ({
      ...prev,
      contacto_id: String(c.id),
      direccion_entrega: c.direccion || prev.direccion_entrega,
    }));
    setContactSearch(c.display_name);
    setIsDropdownOpen(false);
    loadContactAddresses(c.id);
  };

  // Add Item from Catalog
  const handleAddCatalogItem = () => {
    if (!selectedCatalogId) {
      toast.error("Selecciona un producto o plan del catálogo.");
      return;
    }
    const prod = products.find((p) => String(p.id) === selectedCatalogId);
    if (!prod) return;

    const basePriceIncIgv = Number(prod.precio_venta ?? prod.precioVenta ?? prod.precio ?? 0);
    const primaryAddress = form.direccion_entrega || (addresses.length > 0 ? addresses[0] : "Sede Principal");

    const newItem: CorporateQuoteItem = {
      id: prod.id,
      tipo: "propuesto",
      titulo: prod.nombre,
      descripcion: prod.nombre,
      especificaciones:
        prod.descripcion ||
        "Acceso a internet dedicado con velocidad garantizada al 70%, fibra óptica simétrica, IP Pública fija y soporte 24/7.",
      plazo: form.plazo_acuerdo || 24,
      cantidad: 1,
      precio: basePriceIncIgv,
      instalacion: 0,
      direccion: primaryAddress,
      moneda: form.moneda,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedCatalogId("");
    toast.success(`Servicio "${prod.nombre}" agregado a la venta.`);
  };

  // Add Custom Manual Item
  const handleAddCustomItem = () => {
    const primaryAddress = form.direccion_entrega || (addresses.length > 0 ? addresses[0] : "Sede Principal");
    const newItem: CorporateQuoteItem = {
      id: 0,
      tipo: "propuesto",
      titulo: "Servicio de Conectividad Especial",
      descripcion: "Servicio de Conectividad Especial",
      especificaciones:
        "Enlace de datos de alta disponibilidad 1:1, simétrico, con IP Pública fija y soporte técnico preferencial.",
      plazo: form.plazo_acuerdo || 24,
      cantidad: 1,
      precio: 199.0,
      instalacion: 0,
      direccion: primaryAddress,
      moneda: form.moneda,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === "descripcion") {
        copy[index].titulo = val;
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations (Product prices include 18% IGV)
  const totalMonthlyIncIgv = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.precio) || 0) * (Number(curr.cantidad) || 1), 0);
  }, [items]);

  const totalInstallationIncIgv = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.instalacion) || 0) * (Number(curr.cantidad) || 1), 0);
  }, [items]);

  const grandTotalIncIgv = totalMonthlyIncIgv + totalInstallationIncIgv;

  const subtotalMonthlyNoIgv = totalMonthlyIncIgv > 0 ? totalMonthlyIncIgv / 1.18 : 0;
  const igvMonthly = totalMonthlyIncIgv - subtotalMonthlyNoIgv;

  // Filter contacts by Name, Contact Person, RUC/DNI, or Phone
  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (searchFilterType === "empresa") {
      list = list.filter((c) => c.tipo_persona === "EMPRESA");
    } else if (searchFilterType === "contacto") {
      list = list.filter((c) => c.tipo_persona === "NATURAL" || c.empresa_id);
    }

    if (!contactSearch.trim()) return list;

    const q = contactSearch.toLowerCase().trim();
    return list.filter((c) => {
      const name = (c.display_name || "").toLowerCase();
      const ruc = (c.numero_documento || "").toLowerCase();
      const tel = (c.telefono_principal || "").toLowerCase();
      const parent = (c.empresa_padre_nombre || "").toLowerCase();
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

  const currentContact = useMemo(() => {
    return contacts.find((c) => String(c.id) === String(form.contacto_id));
  }, [contacts, form.contacto_id]);

  // Submit Handler: Saves to /api/sales/save
  const handleSubmitSale = async (e?: React.FormEvent, openPrintAfter = false) => {
    if (e) e.preventDefault();

    if (!form.contacto_id) {
      toast.error("Debes seleccionar un cliente para emitir la venta.");
      return;
    }
    if (items.length === 0) {
      toast.error("Debes agregar al menos un producto o plan a la venta.");
      return;
    }

    setSaving(true);
    try {
      const finalPaidAmount =
        form.estado_pago === "pagado"
          ? Number(totalMonthlyIncIgv.toFixed(2))
          : form.estado_pago === "parcial"
          ? Number(form.monto_pagado || 0)
          : 0.0;

      let finalNotes = form.notas.trim();
      if (selectedContactPerson) {
        finalNotes = `Atención: ${selectedContactPerson}` + (finalNotes ? ` | ${finalNotes}` : "");
      }
      if (form.firma_nombre) {
        finalNotes += ` | Asesor: ${form.firma_nombre}`;
      }

      const selectedStaffObj = staffList.find((s) => Number(s.id) === Number(form.trabajador_id));
      const payload = {
        contacto_id: Number(form.contacto_id),
        trabajador_id: form.trabajador_id ? Number(form.trabajador_id) : (staffList[0]?.id ?? null),
        equipo: selectedStaffObj?.equipo || undefined,
        supervisor_id: selectedStaffObj?.supervisor_id ? Number(selectedStaffObj.supervisor_id) : undefined,
        tipo_comprobante: form.tipo_comprobante,
        estado: form.estado_operativo,
        metodo_pago: form.metodo_pago,
        estado_pago: form.estado_pago,
        subtotal: Number(subtotalMonthlyNoIgv.toFixed(2)),
        igv: Number(igvMonthly.toFixed(2)),
        total: Number(totalMonthlyIncIgv.toFixed(2)),
        monto_pagado: finalPaidAmount,
        bidones_entregados: 0,
        bidones_recogidos: 0,
        notas: finalNotes,
        direccion_entrega: form.direccion_entrega.trim() || (addresses.length > 0 ? addresses[0] : "Sede Principal"),
        items: items.map((it) => ({
          producto_id: typeof it.id === "number" ? it.id : 0,
          cantidad: Number(it.cantidad) || 1,
          precio_unitario: Number(it.precio) || 0,
        })),
      };

      const res = await api.post("/api/sales/save", payload);
      toast.success(res.data?.message || "¡Venta registrada con éxito!");

      if (openPrintAfter) {
        window.print();
      }
      router.push("/ventas/view");
    } catch (err: any) {
      console.error("Error saving sale:", err);
      toast.error(err.response?.data?.message || "Error al emitir la venta.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        <RefreshCw className="size-5 animate-spin mr-2 text-emerald-600" />
        Cargando catálogo y clientes para venta...
      </div>
    );
  }

  const currencySymbol = form.moneda === "Dólares" ? "$" : "S/";

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/ventas/view")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Volver al Tablero de Ventas"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="size-5 text-emerald-600 shrink-0" />
              Nueva Venta Directa & Facturación
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Emisión de comprobante formal con asignación de sede, cálculo fiscal (Base + IGV 18%) y registro en pipeline operativo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/ventas/view")}
            className="text-xs h-8"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving || !form.contacto_id || items.length === 0}
            onClick={() => handleSubmitSale(undefined, true)}
            className="text-xs h-8 gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Printer className="size-3.5" />
            Imprimir
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving || !form.contacto_id || items.length === 0}
            onClick={() => handleSubmitSale()}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold cursor-pointer"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar & Emitir Venta
          </Button>
        </div>
      </div>

      {/* 2. 3-Column Responsive Layout */}
      <form onSubmit={(e) => handleSubmitSale(e)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start w-full min-w-0">
          {/* ===================================================================== */}
          {/* COLUMNA 1 (lg:col-span-3 xl:col-span-3): CLIENTE, CONTACTO & PARÁMETROS */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 min-w-0">
            {/* Card: 1. Cliente & Facturación */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="size-4 text-emerald-600" />
                  1. Cliente & Sede
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Búsqueda rápida por Razón Social, Contacto, RUC o DNI.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Filtro y Buscador de Cliente */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Cliente / Razón Social *</Label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSearchFilterType("todos")}
                        className={`px-1.5 py-0.5 rounded ${
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
                        className={`px-1.5 py-0.5 rounded ${
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
                        className={`px-1.5 py-0.5 rounded ${
                          searchFilterType === "contacto"
                            ? "bg-emerald-600 text-white font-bold"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Contactos
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      placeholder="Escribe RUC, DNI, Razón Social o Teléfono..."
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
                          setForm((prev) => ({ ...prev, contacto_id: "" }));
                          setAddresses([]);
                        }}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Resultados Desplegables */}
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
                            onClick={() => handleSelectContact(c)}
                            className="p-2 hover:bg-muted/80 cursor-pointer transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 shrink-0 ${
                                    c.tipo_persona === "EMPRESA"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }`}
                                >
                                  {c.tipo_persona || "PERSONA"}
                                </Badge>
                                <span className="truncate">{c.display_name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                {c.numero_documento && <span>Doc: {c.numero_documento}</span>}
                                {c.telefono_principal && <span>Tel: {c.telefono_principal}</span>}
                                {c.empresa_padre_nombre && (
                                  <span className="text-emerald-700 font-medium truncate">
                                    Empresa: {c.empresa_padre_nombre}
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

                  {/* Cliente Seleccionado Activo */}
                  {currentContact && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded p-2 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-900 dark:text-emerald-300">
                          {currentContact.display_name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Doc: {currentContact.numero_documento || "---"} &bull; Tel:{" "}
                          {currentContact.telefono_principal || "---"}
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[9px]">Seleccionado</Badge>
                    </div>
                  )}
                </div>

                {/* Persona de Contacto ("Atención:") */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Persona de Contacto ("Atención a:")</Label>
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
                      <option value="">-- Otra persona / Representante --</option>
                    </select>
                  ) : (
                    <Input
                      placeholder="Ej. Ing. Carlos Quispe (Administrador)"
                      value={selectedContactPerson}
                      onChange={(e) => setSelectedContactPerson(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                {/* Sedes / Direcciones del Cliente */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                    <MapPin className="size-3.5 text-emerald-600" />
                    Sedes Registradas del Cliente ({addresses.length}):
                  </Label>
                  {addresses.length > 0 ? (
                    <div className="text-[11px] bg-muted/40 p-2 rounded border space-y-1 max-h-24 overflow-y-auto">
                      {addresses.map((a, i) => (
                        <div
                          key={i}
                          onClick={() => setForm((prev) => ({ ...prev, direccion_entrega: a }))}
                          className="flex items-center gap-1 truncate text-foreground font-medium hover:text-emerald-600 cursor-pointer"
                          title="Clic para usar como dirección de entrega principal"
                        >
                          <span className="text-emerald-700 font-bold">{i + 1}.</span> {a}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic bg-muted/30 p-1.5 rounded">
                      Sin direcciones registradas aún. Escribe la dirección en el campo inferior.
                    </div>
                  )}
                </div>

                {/* Dirección de Instalación / Sede Principal */}
                <div className="space-y-1 pt-1 border-t">
                  <Label htmlFor="dir_entrega" className="text-xs font-semibold">
                    Dirección de Entrega / Sede Principal *
                  </Label>
                  <Input
                    id="dir_entrega"
                    placeholder="Ej. Av. Javier Prado Este 450, San Isidro, Lima"
                    value={form.direccion_entrega}
                    onChange={(e) => setForm((prev) => ({ ...prev, direccion_entrega: e.target.value }))}
                    className="h-8 text-xs font-medium"
                    required
                  />
                </div>

                {/* Tipo de Comprobante */}
                <div className="space-y-1 pt-1 border-t">
                  <Label htmlFor="tipo_comp" className="text-xs font-semibold">Tipo de Comprobante *</Label>
                  <select
                    id="tipo_comp"
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs font-semibold"
                    value={form.tipo_comprobante}
                    onChange={(e) => setForm((prev) => ({ ...prev, tipo_comprobante: e.target.value as any }))}
                  >
                    <option value="factura">Factura Electrónica (RUC)</option>
                    <option value="boleta">Boleta de Venta (DNI)</option>
                    <option value="nota_venta">Nota de Venta / Recibo Interno</option>
                  </select>
                </div>

                {/* Fase Operativa Inicial */}
                <div className="space-y-1">
                  <Label htmlFor="estado_op" className="text-xs font-semibold">Fase Operativa Inicial *</Label>
                  <select
                    id="estado_op"
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs font-semibold"
                    value={form.estado_operativo}
                    onChange={(e) => setForm((prev) => ({ ...prev, estado_operativo: e.target.value as any }))}
                  >
                    <option value="pendiente">○ Por Instalar (En Cola de Cuadrilla)</option>
                    <option value="en_proceso">◐ En Instalación (Cuadrilla Asignada)</option>
                    <option value="completada">● Instalada (Venta Cerrada & Certificada)</option>
                  </select>
                </div>

                {/* Moneda y Plazo General */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Moneda</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs"
                      value={form.moneda}
                      onChange={(e) => setForm((prev) => ({ ...prev, moneda: e.target.value }))}
                    >
                      <option value="Soles">Soles (S/)</option>
                      <option value="Dólares">Dólares ($)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Plazo Contratado</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs"
                      value={form.plazo_acuerdo}
                      onChange={(e) => setForm((prev) => ({ ...prev, plazo_acuerdo: Number(e.target.value) }))}
                    >
                      <option value={24}>Acuerdo: 24 meses</option>
                      <option value={12}>Acuerdo: 12 meses</option>
                      <option value={36}>Acuerdo: 36 meses</option>
                      <option value={1}>Pago Único / Mensual</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 2 (lg:col-span-6 xl:col-span-6): TABLA DE SERVICIOS           */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4 min-w-0">
            <Card className="shadow-xs border-emerald-500/30">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Package className="size-4 text-emerald-600" />
                      2. Servicios y Productos Facturados ({items.length})
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Tabla formal corporativa con dirección de sede asignada a cada servicio.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomItem}
                      className="h-9 sm:h-7 text-xs sm:text-[11px] px-3 text-emerald-700 border-emerald-400 hover:bg-emerald-50 cursor-pointer w-full sm:w-auto font-medium"
                    >
                      <Plus className="size-3.5 mr-1" />
                      + Ítem Personalizado
                    </Button>
                  </div>
                </div>

                {/* Selector rápido desde catálogo con dirección automática */}
                {products.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t mt-2">
                    <select
                      className="w-full flex-1 h-10 sm:h-8 rounded-md border border-input bg-background px-3 text-xs shadow-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value)}
                    >
                      <option value="">-- Seleccionar desde Catálogo Oficial --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (S/ {Number(p.precio_venta ?? p.precioVenta ?? 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCatalogItem}
                      className="h-10 sm:h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-xs w-full sm:w-auto cursor-pointer"
                    >
                      <Plus className="size-4 shrink-0" />
                      <span>Agregar Producto</span>
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-3">
                {items.length === 0 ? (
                  <div className="py-12 border border-dashed rounded-lg text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2 bg-muted/10">
                    <Package className="size-8 text-muted-foreground/30" />
                    <p className="font-semibold text-foreground text-sm">No has agregado productos a esta venta.</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Utiliza el selector superior para agregar planes de internet, equipamiento de red o cargos de instalación.
                    </p>
                  </div>
                ) : (
                  <CorporateQuoteTable
                    items={items}
                    currency={form.moneda}
                    editable={true}
                    onUpdateItem={handleUpdateItem}
                    onRemoveItem={handleRemoveItem}
                    availableAddresses={addresses.length > 0 ? addresses : [form.direccion_entrega || "Sede Principal"]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 3 (lg:col-span-3 xl:col-span-3): RESUMEN CONTABLE, COBRO & CIERRE */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 min-w-0">
            {/* Card: Resumen Contable y Totales */}
            <Card className="shadow-xs bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                  <Coins className="size-4" />
                  3. Resumen y Liquidación de Venta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <div className="space-y-2 bg-background/90 p-3 rounded-lg border text-xs">
                  {/* Subtotal No Inc IGV */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground font-medium">Subtotal (Valor Venta):</span>
                    <span className="font-bold text-foreground font-mono">
                      {currencySymbol} {subtotalMonthlyNoIgv.toFixed(2)}
                    </span>
                  </div>

                  {/* IGV 18% */}
                  <div className="flex justify-between items-baseline text-muted-foreground">
                    <span>I.G.V. (18% incluido):</span>
                    <span className="font-mono">{currencySymbol} {igvMonthly.toFixed(2)}</span>
                  </div>

                  {/* Total Mensual Inc IGV */}
                  <div className="flex justify-between items-baseline pt-1.5 border-t">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                      Total Facturado (Inc. IGV):
                    </span>
                    <span className="text-base font-black text-emerald-700 font-mono">
                      {currencySymbol} {totalMonthlyIncIgv.toFixed(2)}
                    </span>
                  </div>

                  {/* Instalación Total */}
                  {totalInstallationIncIgv > 0 && (
                    <div className="flex justify-between items-baseline pt-1.5 border-t text-[11px]">
                      <span className="text-muted-foreground font-medium">Instalación Única:</span>
                      <span className="font-semibold text-foreground font-mono">
                        {currencySymbol} {totalInstallationIncIgv.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Parámetros de Cobranza de 1ra Factura */}
                <div className="space-y-2 bg-background/90 p-3 rounded-lg border text-xs">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-emerald-600" />
                    Cobranza de Primera Factura / Abono:
                  </span>

                  {/* Estado del Cobro */}
                  <div className="space-y-1">
                    <Label htmlFor="est_pago" className="text-[11px] font-semibold text-muted-foreground">
                      Estado del Cobro
                    </Label>
                    <select
                      id="est_pago"
                      className="w-full h-8 px-2 rounded border bg-background text-xs font-semibold"
                      value={form.estado_pago}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setForm((prev) => ({
                          ...prev,
                          estado_pago: val,
                          monto_pagado: val === "pagado" ? totalMonthlyIncIgv : prev.monto_pagado,
                        }));
                      }}
                    >
                      <option value="pendiente">○ Pendiente de Cobro (1ra Factura)</option>
                      <option value="pagado">● Pagado al 100% (Liquidado)</option>
                      <option value="parcial">◐ Pago Parcial (Abono Inicial)</option>
                    </select>
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-1">
                    <Label htmlFor="met_pago" className="text-[11px] font-semibold text-muted-foreground">
                      Método de Pago
                    </Label>
                    <select
                      id="met_pago"
                      className="w-full h-8 px-2 rounded border bg-background text-xs font-medium"
                      value={form.metodo_pago}
                      onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                    >
                      <option value="Transferencia">Transferencia Bancaria (BCP / BBVA / Interbank)</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                    </select>
                  </div>

                  {/* Monto Cobrado si es Parcial */}
                  {form.estado_pago === "parcial" && (
                    <div className="space-y-1">
                      <Label htmlFor="monto_p" className="text-[11px] font-semibold text-muted-foreground">
                        Monto Amortizado (PEN)
                      </Label>
                      <Input
                        id="monto_p"
                        type="number"
                        step="0.01"
                        className="h-8 font-mono text-xs"
                        value={form.monto_pagado}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, monto_pagado: parseFloat(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Botones Principales de Guardado */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    disabled={saving || !form.contacto_id || items.length === 0}
                    onClick={() => handleSubmitSale()}
                    className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer"
                  >
                    {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Guardar & Emitir Venta
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || !form.contacto_id || items.length === 0}
                    onClick={() => handleSubmitSale(undefined, true)}
                    className="w-full h-8 text-xs font-medium border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-1.5 cursor-pointer"
                  >
                    <Printer className="size-3.5" />
                    Guardar e Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Condiciones Contractuales y Firmas */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-3.5 text-emerald-600" />
                  Condiciones & Asesor Comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Términos Comerciales de la Venta</Label>
                  <Textarea
                    rows={3}
                    value={form.condiciones_comerciales}
                    onChange={(e) => setForm((prev) => ({ ...prev, condiciones_comerciales: e.target.value }))}
                    placeholder="Términos de servicio, tiempo de entrega o instalación..."
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* Asesor Comercial Responsable */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold flex items-center justify-between gap-1 text-foreground">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-indigo-600" />
                      Asesor Comercial Responsable: *
                    </span>
                    <Link href="/payroll/staff" className="text-[10px] text-blue-600 hover:underline">
                      + Administrar Personal
                    </Link>
                  </Label>

                  {staffList.length > 0 ? (
                    <select
                      value={form.trabajador_id}
                      onChange={(e) => {
                        const selId = Number(e.target.value);
                        const selStaff = staffList.find((s) => s.id === selId);
                        setForm((prev) => ({
                          ...prev,
                          trabajador_id: selId,
                          firma_nombre: selStaff ? `${selStaff.nombre} ${selStaff.apellido || ""}`.trim() : prev.firma_nombre,
                          firma_cargo: selStaff ? (selStaff.perfil_nombre || selStaff.rol_operativo || "Asesor Comercial") : prev.firma_cargo,
                          firma_celular: selStaff ? (selStaff.linea_movil || selStaff.telefono || "") : prev.firma_celular,
                        }));
                      }}
                      className="w-full h-8 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      required
                    >
                      <option value="">-- Seleccionar Asesor Comercial para Comisiones --</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.nombre} {st.apellido || ""} {st.equipo ? `• [${st.equipo}] ` : ""}{st.perfil_nombre ? `(${st.perfil_nombre})` : `(${st.rol_operativo || "Personal"})`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-amber-600">
                      No hay colaboradores registrados en Personal. Registre uno para asociar comisiones.
                    </p>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <Input
                      placeholder="Nombre del Asesor"
                      value={form.firma_nombre}
                      onChange={(e) => setForm((prev) => ({ ...prev, firma_nombre: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Cargo del Asesor"
                      value={form.firma_cargo}
                      onChange={(e) => setForm((prev) => ({ ...prev, firma_cargo: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        placeholder="Celular"
                        value={form.firma_celular}
                        onChange={(e) => setForm((prev) => ({ ...prev, firma_celular: e.target.value }))}
                        className="h-7 text-xs font-mono"
                      />
                      <Input
                        placeholder="Email"
                        value={form.firma_email}
                        onChange={(e) => setForm((prev) => ({ ...prev, firma_email: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Observaciones Internas */}
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Observaciones Internas
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.notas}
                    onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                    placeholder="Instrucciones especiales para cuadrilla o facturación..."
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreateSalePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-sm text-muted-foreground">
          <RefreshCw className="size-5 animate-spin mr-2 text-emerald-600" />
          Cargando emisión de venta...
        </div>
      }
    >
      <CreateSaleContent />
    </Suspense>
  );
}
