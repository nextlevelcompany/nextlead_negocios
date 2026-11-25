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
  TrendingDown,
  Layers,
  ArrowRight,
  User,
  MapPin,
  X,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  CorporateQuoteTable,
  CorporateQuoteItem,
} from "@/components/opportunities/CorporateQuoteTable";
import { OpportunityWhatsAppModal } from "@/components/opportunities/OpportunityWhatsAppModal";
import { OpportunityWhatsAppParams } from "@/components/opportunities/opportunityWhatsApp";

interface KanbanColumn {
  id: number;
  nombre: string;
  es_ganada?: boolean;
  es_perdida?: boolean;
}

interface KanbanTag {
  id: number;
  nombre: string;
  color: string;
}

interface ProductItem {
  id: number;
  nombre: string;
  precioVenta?: number;
  precio_venta?: number;
  precio?: number;
  descripcion?: string;
  categoria_nombre?: string;
  activo?: boolean;
}

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
}

function CreateOpportunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savedOpportunityId, setSavedOpportunityId] = useState<number | null>(editId ? Number(editId) : null);

  // Master data
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tags, setTags] = useState<KanbanTag[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Contact addresses and subcontacts
  const [addresses, setAddresses] = useState<string[]>([]);
  const [subcontacts, setSubcontacts] = useState<any[]>([]);
  const [selectedContactPerson, setSelectedContactPerson] = useState("");

  // Form state - Default tipo_propuesta: "venta"
  const [form, setForm] = useState({
    id: editId ? Number(editId) : null,
    titulo: "",
    contacto_id: "" as string | number,
    etapa_id: "" as string | number,
    prioridad: "Media",
    etiquetas: "",
    notas: "",
    tipo_propuesta: "venta" as "venta" | "renovacion",
    plazo_acuerdo: 24,
    moneda: "Soles",
    total_instalacion: 0,
    firma_nombre: "",
    firma_cargo: "",
    firma_celular: "",
    firma_email: "",
    condiciones_comerciales: "",
    contacto_persona: "",
    trabajador_id: null as number | null,
    supervisor_id: null as number | null,
  });

  const [staffList, setStaffList] = useState<any[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Search & Filter state for client & contact
  const [contactSearch, setContactSearch] = useState("");
  const [searchFilterType, setSearchFilterType] = useState<"todos" | "empresa" | "contacto">("todos");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Quotation items
  const [items, setItems] = useState<CorporateQuoteItem[]>([]);
  const [ubigeosList, setUbigeosList] = useState<any[]>([]);

  // Quick-add from catalog
  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  // Load Initial Metadata
  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      try {
        const [oppRes, prodRes, setRes, ubiRes] = await Promise.all([
          api.get("/api/opportunities/kanban?includeContacts=true"),
          api.get("/api/productos"),
          api.get("/api/opportunities/settings"),
          api.get("/api/contacts/ubigeos"),
        ]);

        const cols: KanbanColumn[] = oppRes.data?.columns || [];
        const tgs: KanbanTag[] = oppRes.data?.tags || [];
        const cts: ContactOption[] = oppRes.data?.contacts || [];
        const opps: any[] = oppRes.data?.opportunities || [];
        const loadedSettings: Record<string, string> = setRes.data || {};

        setColumns(cols);
        setTags(tgs);
        setContacts(cts);
        setProducts(prodRes.data || []);
        setSettings(loadedSettings);
        setUbigeosList(Array.isArray(ubiRes.data) ? ubiRes.data : []);

        if (oppRes.data?.staff && Array.isArray(oppRes.data.staff) && oppRes.data.staff.length > 0) {
          setStaffList(oppRes.data.staff);
        } else {
          try {
            const stRes = await api.get("/api/payroll/staff");
            if (Array.isArray(stRes.data)) setStaffList(stRes.data);
          } catch (_) {}
        }

        if (editId) {
          const oppToEdit = opps.find((o) => String(o.id) === String(editId));
          if (oppToEdit) {
            setForm({
              id: oppToEdit.id,
              titulo: oppToEdit.titulo || "",
              contacto_id: oppToEdit.contacto_id ? String(oppToEdit.contacto_id) : "",
              etapa_id: oppToEdit.etapa_id ? String(oppToEdit.etapa_id) : (cols[0]?.id ? String(cols[0].id) : ""),
              prioridad: oppToEdit.prioridad || "Media",
              etiquetas: oppToEdit.etiquetas || "",
              notas: oppToEdit.notas || "",
              tipo_propuesta: (oppToEdit.tipo_propuesta as any) || "venta",
              plazo_acuerdo: oppToEdit.plazo_acuerdo || 24,
              moneda: oppToEdit.moneda || loadedSettings["cotizacion.moneda_defecto"] || "Soles",
              total_instalacion: Number(oppToEdit.total_instalacion) || 0,
              firma_nombre: oppToEdit.firma_nombre || loadedSettings["cotizacion.firma_nombre_defecto"] || "",
              firma_cargo: oppToEdit.firma_cargo || loadedSettings["cotizacion.firma_cargo_defecto"] || "",
              firma_celular: oppToEdit.firma_celular || loadedSettings["cotizacion.firma_celular_defecto"] || "",
              firma_email: oppToEdit.firma_email || loadedSettings["cotizacion.firma_email_defecto"] || "",
              condiciones_comerciales: oppToEdit.condiciones_comerciales || loadedSettings["cotizacion.condiciones_defecto"] || "",
              contacto_persona: oppToEdit.contacto_persona || "",
              trabajador_id: oppToEdit.trabajador_id ? Number(oppToEdit.trabajador_id) : null,
              supervisor_id: oppToEdit.supervisor_id ? Number(oppToEdit.supervisor_id) : null,
            });

            if (oppToEdit.etiquetas) {
              setSelectedTags(
                oppToEdit.etiquetas
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean)
              );
            }

            // Parse detailed items
            if (oppToEdit.detalles_json) {
              try {
                const parsed = JSON.parse(oppToEdit.detalles_json);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setItems(parsed);
                }
              } catch (e) {
                console.error("Error parsing detalles_json", e);
              }
            } else if (oppToEdit.productos_json) {
              try {
                const parsedProds = JSON.parse(oppToEdit.productos_json);
                if (Array.isArray(parsedProds)) {
                  setItems(
                    parsedProds.map((p: any) => ({
                      id: p.id,
                      tipo: "propuesto",
                      titulo: p.nombre,
                      descripcion: p.nombre,
                      especificaciones: "Acceso a internet dedicado con velocidad garantizada al 70%.",
                      plazo: 24,
                      cantidad: Number(p.cantidad) || 1,
                      precio: Number(p.precio) || 0,
                      instalacion: 0,
                      direccion: "Dirección según sede principal",
                      moneda: oppToEdit.moneda || "Soles",
                    }))
                  );
                }
              } catch (e) {
                console.error("Error parsing productos_json", e);
              }
            }

            if (oppToEdit.contacto_id) {
              loadContactAddresses(oppToEdit.contacto_id);
            }
            if (oppToEdit.contacto_persona) {
              setSelectedContactPerson(oppToEdit.contacto_persona);
            }
          } else {
            toast.error("No se encontró la oportunidad especificada.");
          }
        } else {
          // Defaults for new opportunity
          if (cols.length > 0) {
            setForm((prev) => ({
              ...prev,
              tipo_propuesta: "venta",
              plazo_acuerdo: 24,
              etapa_id: String(cols[0].id),
              moneda: loadedSettings["cotizacion.moneda_defecto"] || "Soles",
              firma_nombre: loadedSettings["cotizacion.firma_nombre_defecto"] || "",
              firma_cargo: loadedSettings["cotizacion.firma_cargo_defecto"] || "",
              firma_celular: loadedSettings["cotizacion.firma_celular_defecto"] || "",
              firma_email: loadedSettings["cotizacion.firma_email_defecto"] || "",
              condiciones_comerciales: loadedSettings["cotizacion.condiciones_defecto"] || "",
            }));
          }
        }
      } catch (err: any) {
        console.error("Error loading metadata:", err);
        toast.error("Error al cargar los datos maestros.");
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [editId]);

  // Load Contact Addresses & Subcontacts (con Ubigeo Completo de Distrito y Provincia)
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

      // If items have no address set, update them with the primary address (with ubigeo)
      if (addressStrings.length > 0) {
        const primary = addressStrings[0];
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
      titulo: prev.titulo && !prev.titulo.startsWith("Cotización:") ? prev.titulo : `Cotización: ${c.display_name}`,
    }));
    setContactSearch(c.display_name);
    setIsDropdownOpen(false);
    loadContactAddresses(c.id);
  };

  const handleToggleTag = (tagName: string) => {
    let updated: string[];
    if (selectedTags.includes(tagName)) {
      updated = selectedTags.filter((t) => t !== tagName);
    } else {
      updated = [...selectedTags, tagName];
    }
    setSelectedTags(updated);
    setForm((prev) => ({ ...prev, etiquetas: updated.join(", ") }));
  };

  // Add Item from Catalog (automatically fills the client's address)
  const handleAddCatalogItem = () => {
    if (!selectedCatalogId) {
      toast.error("Selecciona un producto del catálogo.");
      return;
    }
    const prod = products.find((p) => String(p.id) === selectedCatalogId);
    if (!prod) return;

    const basePriceIncIgv = Number(prod.precioVenta ?? prod.precio_venta ?? prod.precio ?? 0);
    const primaryAddress = addresses.length > 0 ? addresses[0] : "Dirección de Sede Principal";

    const newItem: CorporateQuoteItem = {
      id: prod.id,
      tipo: "propuesto",
      titulo: prod.nombre,
      descripcion: prod.nombre,
      especificaciones:
        prod.descripcion ||
        "Acceso a internet de alta disponibilidad con velocidad garantizada al 70%, 100% fibra óptica simétrica, IP Pública fija y soporte técnico 24/7.",
      plazo: form.plazo_acuerdo || 24,
      cantidad: 1,
      precio: basePriceIncIgv,
      instalacion: 0,
      direccion: primaryAddress,
      moneda: form.moneda,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedCatalogId("");
    toast.success(`Servicio "${prod.nombre}" agregado con dirección predeterminada.`);
  };

  // Add Custom Manual Item (automatically fills client's address)
  const handleAddCustomItem = () => {
    const primaryAddress = addresses.length > 0 ? addresses[0] : "Dirección de Sede Principal";
    const newItem: CorporateQuoteItem = {
      id: Date.now(),
      tipo: "propuesto",
      titulo: "Internet Dedicado - 20 Mbps",
      descripcion: "Internet Dedicado - 20 Mbps",
      especificaciones:
        "Acceso a internet Dedicado con overbooking de 1:1, simétrico, enlace 100% fibra óptica con IP Pública Fija.",
      plazo: form.plazo_acuerdo || 24,
      cantidad: 1,
      precio: 385.0,
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

  // Financial calculations: Product prices ALREADY include IGV (18%)
  const totalMonthlyIncIgv = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.precio) || 0) * (Number(curr.cantidad) || 1), 0);
  }, [items]);

  const totalInstallationIncIgv = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.instalacion) || 0) * (Number(curr.cantidad) || 1), 0);
  }, [items]);

  // Desglose fiscal exacto de la base imponible y el IGV
  const subtotalMonthlyNoIgv = totalMonthlyIncIgv > 0 ? totalMonthlyIncIgv / 1.18 : 0;
  const igvMonthly = totalMonthlyIncIgv - subtotalMonthlyNoIgv;

  const subtotalInstallationNoIgv = totalInstallationIncIgv > 0 ? totalInstallationIncIgv / 1.18 : 0;
  const igvInstallation = totalInstallationIncIgv - subtotalInstallationNoIgv;

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

  // Selected contact object
  const currentContact = useMemo(() => {
    return contacts.find((c) => String(c.id) === String(form.contacto_id));
  }, [contacts, form.contacto_id]);

  // Parameters for WhatsApp message and modal preview
  const currentWhatsAppParams: OpportunityWhatsAppParams = useMemo(() => {
    const primaryAddress = addresses.length > 0 ? addresses[0] : "";
    return {
      id: savedOpportunityId || form.id || undefined,
      titulo: form.titulo,
      empresa: currentContact?.display_name || currentContact?.razon_social || "",
      ruc: currentContact?.numero_documento || "",
      direccion: primaryAddress,
      contacto: selectedContactPerson || form.contacto_persona || "",
      telefono: currentContact?.telefono_principal || "",
      correo: currentContact?.email || "",
      tipo_propuesta: form.tipo_propuesta,
      plazo_acuerdo: form.plazo_acuerdo,
      moneda: form.moneda,
      items: items.map((it) => ({
        titulo: it.titulo,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio: it.precio,
        instalacion: it.instalacion,
        direccion: it.direccion,
      })),
      total_mensual: totalMonthlyIncIgv,
      total_instalacion: totalInstallationIncIgv,
      asesor_nombre: form.firma_nombre,
      asesor_cargo: form.firma_cargo,
      asesor_celular: form.firma_celular,
      asesor_email: form.firma_email,
      condiciones: form.condiciones_comerciales,
      notas: form.notas,
    };
  }, [
    savedOpportunityId,
    form,
    currentContact,
    addresses,
    selectedContactPerson,
    items,
    totalMonthlyIncIgv,
    totalInstallationIncIgv,
  ]);

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent, openPrintAfter = false) => {
    if (e) e.preventDefault();

    if (!form.titulo.trim()) {
      toast.error("El título de la oportunidad es obligatorio.");
      return;
    }
    if (!form.etapa_id) {
      toast.error("Debes seleccionar una etapa del pipeline.");
      return;
    }

    setSaving(true);
    try {
      const productosCompat = items.map((it) => ({
        id: typeof it.id === "number" ? it.id : 0,
        nombre: it.titulo || it.descripcion,
        precio: it.precio,
        cantidad: it.cantidad || 1,
      }));

      const payload = {
        id: form.id,
        titulo: form.titulo,
        contacto_id: form.contacto_id ? Number(form.contacto_id) : null,
        etapa_id: Number(form.etapa_id),
        valor: totalMonthlyIncIgv,
        prioridad: form.prioridad,
        etiquetas: form.etiquetas,
        notas: form.notas,
        tipo_propuesta: form.tipo_propuesta || "venta",
        plazo_acuerdo: Number(form.plazo_acuerdo) || 24,
        moneda: form.moneda,
        total_instalacion: totalInstallationIncIgv,
        firma_nombre: form.firma_nombre,
        firma_cargo: form.firma_cargo,
        firma_celular: form.firma_celular,
        firma_email: form.firma_email,
        condiciones_comerciales: form.condiciones_comerciales,
        contacto_persona: selectedContactPerson || form.contacto_persona || "",
        trabajador_id: form.trabajador_id ? Number(form.trabajador_id) : null,
        supervisor_id: form.supervisor_id ? Number(form.supervisor_id) : null,
        detalles_json: JSON.stringify(items),
        productos_json: JSON.stringify(productosCompat),
      };

      const res = await api.post("/api/opportunities/save", payload);
      const savedId = res.data?.id || form.id;
      if (savedId) {
        setSavedOpportunityId(Number(savedId));
      }

      if (res.data?.venta_creada) {
        toast.success(`¡Oportunidad Ganada! Venta ${res.data.numero_venta} Creada`, {
          description: `Se ha generado automáticamente la venta ${res.data.numero_venta} en el módulo de Ventas.`,
        });
      } else {
        toast.success(form.id ? "Oportunidad actualizada con éxito." : "Oportunidad creada con éxito.");
      }

      if (openPrintAfter && savedId) {
        router.push(`/opportunities/print?id=${savedId}`);
      } else {
        // Al crear o guardar la oportunidad, mostrar ventana para copiar y enviar a WhatsApp
        setSuccessModalOpen(true);
      }
    } catch (err: any) {
      console.error("Error saving opportunity:", err);
      toast.error(err.response?.data?.message || "Error al guardar la oportunidad.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        <RefreshCw className="size-5 animate-spin mr-2" />
        Cargando oportunidad y servicios...
      </div>
    );
  }

  const currencySymbol = form.moneda === "Dólares" ? "$" : "S/";

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/opportunities/view")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Volver al Pipeline"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Coins className="size-5 text-emerald-600 shrink-0" />
              {editId ? `Editar Oportunidad #${editId}` : "Nueva Oportunidad & Cotizador Corporativo"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Cotización con cálculo contable (Subtotal sin IGV, IGV 18% y Total Inc. IGV).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/opportunities/view")}
            className="text-xs h-8"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSuccessModalOpen(true)}
            className="text-xs h-8 gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            title="Vista previa y copia de resumen para WhatsApp"
          >
            <MessageSquare className="size-3.5" />
            WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => handleSubmit(undefined, true)}
            className="text-xs h-8 gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Printer className="size-3.5" />
            PDF
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => handleSubmit()}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar Oportunidad
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-COLUMN RESPONSIVE LAYOUT (Col 1: Cliente | Col 2: Servicios | Col 3: Cierre) */}
      {/* ========================================================================= */}
      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start w-full min-w-0">
          {/* ===================================================================== */}
          {/* COLUMNA 1 (lg:col-span-3 xl:col-span-3): CLIENTE, CONTACTO & PIPELINE */}
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
                {/* Filtro de Búsqueda de Cliente y Contacto */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Cliente / Razón Social *</Label>
                    {/* Filtro de Tipo: Todos / Empresa / Contacto */}
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
                          setForm((prev) => ({ ...prev, contacto_id: "" }));
                          setAddresses([]);
                        }}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Resultados Desplegables de Búsqueda */}
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
                  <Label className="text-xs font-semibold">Persona de Contacto ("Atención:")</Label>
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
                      <option value="">-- Otra persona / Representante legal --</option>
                    </select>
                  ) : (
                    <Input
                      placeholder="Ej. Ing. Carlos Quispe (Gerente de TI)"
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
                    Direcciones / Sedes Registradas ({addresses.length}):
                  </Label>
                  {addresses.length > 0 ? (
                    <div className="text-[11px] bg-muted/40 p-2 rounded border space-y-1 max-h-24 overflow-y-auto">
                      {addresses.map((a, i) => (
                        <div key={i} className="flex items-center gap-1 truncate text-foreground font-medium">
                          <span className="text-emerald-700 font-bold">{i + 1}.</span> {a}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic bg-muted/30 p-1.5 rounded">
                      El cliente no tiene direcciones registradas aún. Podrás escribir la dirección en cada ítem de servicio.
                    </div>
                  )}
                </div>

                {/* Título de la Oportunidad */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold">Título de Oportunidad *</Label>
                  <Input
                    placeholder="Ej. Cotización Enlace Fibra Óptica"
                    value={form.titulo}
                    onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {/* Etapa del Pipeline */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Etapa del Pipeline *</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                    value={form.etapa_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, etapa_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Seleccionar Etapa --</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.es_ganada ? " (Ganada)" : c.es_perdida ? " (Perdida)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modalidad de Cotización (Por defecto: Venta) */}
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-xs font-semibold">Modalidad de Cotización *</Label>
                  <div className="grid grid-cols-2 gap-1.5 bg-muted/60 p-1 rounded-lg border">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, tipo_propuesta: "venta" }));
                      }}
                      className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                        form.tipo_propuesta === "venta"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Venta Estándar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, tipo_propuesta: "renovacion" }));
                      }}
                      className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                        form.tipo_propuesta === "renovacion"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Renovación
                    </button>
                  </div>
                </div>

                {/* Moneda y Plazo General */}
                <div className="grid grid-cols-2 gap-2">
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
                    <Label className="text-xs font-semibold">Plazo del Contrato</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs"
                      value={form.plazo_acuerdo}
                      onChange={(e) => setForm((prev) => ({ ...prev, plazo_acuerdo: Number(e.target.value) }))}
                    >
                      <option value={24}>Acuerdo: 24 meses</option>
                      <option value={12}>Acuerdo: 12 meses</option>
                      <option value={36}>Acuerdo: 36 meses</option>
                      <option value={6}>Acuerdo: 6 meses</option>
                    </select>
                  </div>
                </div>

                {/* Prioridad */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Prioridad</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                    value={form.prioridad}
                    onChange={(e) => setForm((prev) => ({ ...prev, prioridad: e.target.value }))}
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                {/* Etiquetas */}
                {tags.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t">
                    <Label className="text-xs font-semibold text-muted-foreground">Etiquetas</Label>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => {
                        const active = selectedTags.includes(t.nombre);
                        return (
                          <Badge
                            key={t.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer text-[10px] px-1.5 py-0.5"
                            style={
                              active
                                ? { backgroundColor: t.color, color: "#fff", borderColor: t.color }
                                : { borderColor: t.color, color: t.color }
                            }
                            onClick={() => handleToggleTag(t.nombre)}
                          >
                            {t.nombre}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                      2. Servicios y Productos Cotizados
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Tabla corporativa formal con dirección automática del cliente.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomItem}
                      className="h-9 sm:h-7 text-xs sm:text-[11px] px-3 text-emerald-700 border-emerald-400 hover:bg-emerald-50 w-full sm:w-auto font-medium"
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
                          {p.nombre} (S/ {Number(p.precioVenta ?? p.precio_venta ?? p.precio ?? 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCatalogItem}
                      className="h-10 sm:h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-xs w-full sm:w-auto"
                    >
                      <Plus className="size-4 shrink-0" />
                      <span>Agregar Producto</span>
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-3">
                {/* TABLA CORPORATIVA EXACTA (ITEM, DESCRIPCIÓN, INSTALACIÓN, PRECIO MENSUAL) */}
                <CorporateQuoteTable
                  items={items}
                  currency={form.moneda}
                  editable={true}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  availableAddresses={addresses}
                />
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 3 (lg:col-span-3 xl:col-span-3): RESUMEN CONTABLE & FIRMAS    */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 min-w-0">
            {/* Card Resumen Contable y Totales */}
            <Card className="shadow-xs bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                  <Coins className="size-4" />
                  3. Resumen y Cierre de Cotización
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <div className="space-y-2 bg-background/90 p-3 rounded-lg border text-xs">
                  {/* Subtotal No Inc IGV */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground font-medium">Subtotal (Valor Venta):</span>
                    <span className="font-bold text-foreground">
                      {currencySymbol} {subtotalMonthlyNoIgv.toFixed(2)} / mes
                    </span>
                  </div>

                  {/* IGV 18% */}
                  <div className="flex justify-between items-baseline text-muted-foreground">
                    <span>I.G.V. (18% incluido):</span>
                    <span>{currencySymbol} {igvMonthly.toFixed(2)}</span>
                  </div>

                  {/* Total Inc IGV */}
                  <div className="flex justify-between items-baseline pt-1.5 border-t">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                      Total Mensual (Inc. IGV):
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {currencySymbol} {totalMonthlyIncIgv.toFixed(2)}
                    </span>
                  </div>

                  {/* Instalación Total */}
                  <div className="flex justify-between items-baseline pt-1.5 border-t text-[11px]">
                    <span className="text-muted-foreground font-medium">Instalación Única (Inc. IGV):</span>
                    <span className="font-semibold text-foreground">
                      {currencySymbol} {totalInstallationIncIgv.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botones Principales de Guardado */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit()}
                    className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                  >
                    {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Guardar Oportunidad
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => handleSubmit(undefined, true)}
                    className="w-full h-8 text-xs font-medium border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                  >
                    <Printer className="size-3.5" />
                    Guardar y Ver Cotización (PDF)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Condiciones Contractuales y Firmas */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2 pt-4 px-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-3.5 text-emerald-600" />
                  Condiciones Comerciales & Firma
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Condiciones de Servicio (PDF Pág. 1)</Label>
                  <Textarea
                    rows={4}
                    value={form.condiciones_comerciales}
                    onChange={(e) => setForm((prev) => ({ ...prev, condiciones_comerciales: e.target.value }))}
                    placeholder="Términos comerciales..."
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* Asesor Comercial Suscriptor */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <UserCheck className="size-3 text-emerald-600" />
                      Ejecutivo Comercial que Firma:
                    </Label>
                    {form.trabajador_id && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-semibold">
                        Asignado del Personal
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {/* Select from registered staff */}
                    {staffList.length > 0 && (
                      <select
                        className="w-full h-8 px-2 rounded-md border bg-background text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mb-1"
                        value={form.trabajador_id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setForm((prev) => ({ ...prev, trabajador_id: null, supervisor_id: null }));
                            return;
                          }
                          const st = staffList.find((s) => String(s.id) === val);
                          if (st) {
                            setForm((prev) => ({
                              ...prev,
                              trabajador_id: st.id,
                              supervisor_id: st.supervisor_id || null,
                              firma_nombre: `${st.nombre} ${st.apellido || ""}`.trim(),
                              firma_cargo: st.perfil_nombre || st.rol_operativo || "Asesor Comercial",
                              firma_celular: st.telefono || prev.firma_celular,
                              firma_email: st.email || prev.firma_email,
                            }));
                          }
                        }}
                      >
                        <option value="">-- Seleccionar Asesor del Personal --</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.nombre} {st.apellido || ""} ({st.perfil_nombre || st.rol_operativo || "Asesor"})
                          </option>
                        ))}
                      </select>
                    )}

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
                        className="h-7 text-xs"
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

                {/* Notas Internas */}
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Notas Internas del Pipeline
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.notas}
                    onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                    placeholder="Apuntes privados de la negociación..."
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Modal interactivo para copiar y enviar a WhatsApp con todos los detalles */}
      <OpportunityWhatsAppModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        data={currentWhatsAppParams}
        isNewlyCreated={!form.id}
        onGoToPipeline={() => router.push("/opportunities/view")}
      />
    </div>
  );
}

export default function CreateOpportunityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-sm text-muted-foreground">
          Cargando cotizador de oportunidades...
        </div>
      }
    >
      <CreateOpportunityContent />
    </Suspense>
  );
}
