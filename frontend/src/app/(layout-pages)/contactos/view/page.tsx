"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Bot,
  Star,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  FileText,
  Send,
  Clock,
  Compass,
  Map as MapIcon,
  ChevronRight,
  Info,
  ShoppingBag,
  Briefcase,
  Plus,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Search,
  X,
  Save,
  DollarSign,
  Users,
  Receipt,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Ubigeo {
  codigoUbigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface Direccion {
  idDireccion?: number;
  nombreUbicacion?: string;
  codigoUbigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccionCompleta?: string;
  referencia?: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface OrderItem {
  tipo: "pedido" | "venta";
  id: number;
  numero: string;
  fecha: string;
  total: number;
  estado_pago?: string;
  estado_entrega?: string;
  direccion_entrega?: string;
}

interface OportunidadItem {
  id: number;
  titulo: string;
  valor: number;
  prioridad: string;
  etiquetas?: string;
  created_at: string;
  notas?: string;
  productos_json?: string;
  etapa_nombre?: string;
  es_ganada?: boolean;
  es_perdida?: boolean;
  vendedor_nombre?: string;
}

interface VentaItem {
  id: number;
  numero: string;
  fecha: string;
  total: number;
  subtotal: number;
  igv: number;
  monto_pagado: number;
  estado_pago?: string;
  estado_entrega?: string;
  metodo_pago?: string;
  tipo_comprobante?: string;
  direccion_entrega?: string;
  bidones_entregados?: number;
  bidones_recogidos?: number;
}

interface Contact {
  id: number;
  tipoPersona: "NATURAL" | "EMPRESA";
  tipoDocumento: string;
  numeroDocumento: string;
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  nombreDisplay?: string;
  telefonoPrincipal: string;
  telefonoSecundario?: string | null;
  email?: string | null;
  empresaId?: number | null;
  empresaNombre?: string | null;
  starred?: boolean;
  aiActive?: boolean;
  dateCreated?: string;
  referencia?: string | null;
  direcciones?: Direccion[];
}

interface ChatterEntry {
  id: string;
  author: string;
  date: string;
  content: string;
  type: "note" | "message" | "activity" | "system";
}

const getErrorMessage = (err: any, defaultMsg: string): string => {
  if (!err) return defaultMsg;
  if (typeof err === "string") return err;
  const data = err?.response?.data;
  if (!data) return err?.message || defaultMsg;
  if (typeof data === "string") return data;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  if (Array.isArray(data)) {
    const msgs = data.filter((item) => typeof item === "string");
    if (msgs.length > 0) return msgs.join(", ");
  }
  if (Array.isArray(data.errors)) {
    const msgs = data.errors.filter((item: any) => typeof item === "string");
    if (msgs.length > 0) return msgs.join(", ");
  }
  return defaultMsg;
};

function ContactDetailViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [ubigeos, setUbigeos] = useState<Ubigeo[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadItem[]>([]);
  const [ventas, setVentas] = useState<VentaItem[]>([]);
  const [linkedPersons, setLinkedPersons] = useState<Contact[]>([]);
  const [parentCompany, setParentCompany] = useState<Contact | null>(null);
  const [copiedDoc, setCopiedDoc] = useState(false);

  // Active Notebook Tab (Odoo style)
  const [activeTab, setActiveTab] = useState<
    "direcciones" | "oportunidades" | "ventas" | "personas" | "pedidos" | "bot_ia" | "notas"
  >("direcciones");

  // Selected address index for the lateral map
  const [activeDirIndex, setActiveDirIndex] = useState(0);

  // Inline "Agregar Dirección" Form State
  const [showAddDirForm, setShowAddDirForm] = useState(false);
  const [savingDir, setSavingDir] = useState(false);
  const [searchingNewDirMap, setSearchingNewDirMap] = useState(false);
  const [newDir, setNewDir] = useState({
    nombreUbicacion: "",
    codigoUbigeo: "150101",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    direccionCompleta: "",
    referencia: "",
    latitud: null as number | null,
    longitud: null as number | null,
    mapSearchQuery: "",
    mapTimestamp: 0,
  });

  // Inline "Agregar Persona / Contacto Relacionado" Form State
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [newPerson, setNewPerson] = useState({
    nombres: "",
    apellidos: "",
    numeroDocumento: "",
    telefonoPrincipal: "",
    email: "",
    referencia: "",
  });

  // Chatter State
  const [chatterEntries, setChatterEntries] = useState<ChatterEntry[]>([]);
  const [activeComposer, setActiveComposer] = useState<"none" | "message" | "note" | "activity">("none");
  const [composerText, setComposerText] = useState("");

  // Load Contact and related data
  const loadContactData = async () => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [cRes, oRes, ubiRes, aRes, oppsRes, ventasRes] = await Promise.all([
        api.get(`/api/contacts/${contactId}`),
        api.get(`/api/contacts/${contactId}/pedidos`).catch(() => ({ data: [] })),
        api.get("/api/contacts/ubigeos").catch(() => ({ data: [] })),
        api.get(`/api/contacts/${contactId}/addresses`).catch(() => ({ data: [] })),
        api.get(`/api/contacts/${contactId}/oportunidades`).catch(() => ({ data: [] })),
        api.get(`/api/contacts/${contactId}/ventas`).catch(() => ({ data: [] })),
      ]);

      const cData = cRes.data;
      if (Array.isArray(aRes.data) && aRes.data.length > 0) {
        cData.direcciones = aRes.data;
      }
      setContact(cData);
      setUbigeos(Array.isArray(ubiRes.data) ? ubiRes.data : []);

      const oList: OrderItem[] = Array.isArray(oRes.data)
        ? oRes.data
        : Array.isArray(oRes.data?.pedidos)
        ? oRes.data.pedidos
        : [];
      setOrders(oList);

      setOportunidades(Array.isArray(oppsRes.data) ? oppsRes.data : []);
      setVentas(Array.isArray(ventasRes.data) ? ventasRes.data : []);

      // If contact is EMPRESA, fetch linked persons
      if (cData?.tipoPersona === "EMPRESA") {
        try {
          const pRes = await api.get(`/api/contacts/${contactId}/personas`);
          setLinkedPersons(Array.isArray(pRes.data) ? pRes.data : []);
        } catch (e) {
          setLinkedPersons([]);
        }
      } else if (cData?.empresaId) {
        // If NATURAL person, fetch employer company details and colleagues
        try {
          const [parentRes, colleaguesRes] = await Promise.all([
            api.get(`/api/contacts/${cData.empresaId}`).catch(() => null),
            api.get(`/api/contacts/${cData.empresaId}/personas`).catch(() => ({ data: [] })),
          ]);
          if (parentRes?.data) setParentCompany(parentRes.data);
          setLinkedPersons(Array.isArray(colleaguesRes.data) ? colleaguesRes.data : []);
        } catch (e) {}
      }

      // Initial Chatter events
      const entries: ChatterEntry[] = [];
      if (cData?.dateCreated) {
        entries.push({
          id: "ev-1",
          author: "Sistema NextLead",
          date: cData.dateCreated.substring(0, 10),
          content: `Registro de contacto creado en la base de datos (${
            cData.tipoPersona === "EMPRESA" ? "RUC Empresarial" : "Persona Natural"
          }).`,
          type: "system",
        });
      }

      if (oList.length > 0) {
        entries.push({
          id: "ev-2",
          author: "Ventas CRM",
          date: oList[0].fecha ? oList[0].fecha.substring(0, 10) : "Reciente",
          content: `Último movimiento comercial registrado: ${oList[0].numero} por S/ ${Number(
            oList[0].total || 0
          ).toFixed(2)}.`,
          type: "system",
        });
      }

      setChatterEntries(entries);
    } catch (err: any) {
      console.error("Error loading contact details:", err);
      toast.error("No se pudo cargar la información del contacto.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactData();
  }, [contactId]);

  // Distinct Departamentos
  const departamentosList = useMemo(() => {
    const set = new Set<string>();
    ubigeos.forEach((u) => {
      if (u.departamento) set.add(u.departamento.toUpperCase());
    });
    return Array.from(set).sort();
  }, [ubigeos]);

  // Helper: get Provincias for a Departamento
  const getProvinciasForDep = (dep: string) => {
    const set = new Set<string>();
    ubigeos.forEach((u) => {
      if (u.departamento?.toUpperCase() === dep?.toUpperCase() && u.provincia) {
        set.add(u.provincia.toUpperCase());
      }
    });
    return Array.from(set).sort();
  };

  // Helper: get Distritos for Departamento + Provincia
  const getDistritosForProv = (dep: string, prov: string) => {
    return ubigeos.filter(
      (u) =>
        u.departamento?.toUpperCase() === dep?.toUpperCase() &&
        u.provincia?.toUpperCase() === prov?.toUpperCase()
    );
  };

  // Open inline add address form
  const handleOpenAddDirForm = () => {
    const currentCount = contact?.direcciones?.length || 0;
    setNewDir({
      nombreUbicacion: `Sucursal ${currentCount + 1}`,
      codigoUbigeo: "150101",
      departamento: "LIMA",
      provincia: "LIMA",
      distrito: "LIMA",
      direccionCompleta: "",
      referencia: "",
      latitud: null,
      longitud: null,
      mapSearchQuery: "",
      mapTimestamp: Date.now(),
    });
    setShowAddDirForm(true);
  };

  // Cascade handlers for newDir
  const handleNewDirDepChange = (dep: string) => {
    const provs = getProvinciasForDep(dep);
    const firstProv = provs[0] || "";
    const dists = getDistritosForProv(dep, firstProv);
    const firstDist = dists[0];
    setNewDir((prev) => ({
      ...prev,
      departamento: dep,
      provincia: firstProv,
      distrito: firstDist?.distrito || "",
      codigoUbigeo: firstDist?.codigoUbigeo || "150101",
    }));
  };

  const handleNewDirProvChange = (prov: string) => {
    const dep = newDir.departamento || "LIMA";
    const dists = getDistritosForProv(dep, prov);
    const firstDist = dists[0];
    setNewDir((prev) => ({
      ...prev,
      provincia: prov,
      distrito: firstDist?.distrito || "",
      codigoUbigeo: firstDist?.codigoUbigeo || "150101",
    }));
  };

  const handleNewDirDistChange = (codUbigeo: string) => {
    const matched = ubigeos.find((u) => u.codigoUbigeo === codUbigeo);
    if (matched) {
      setNewDir((prev) => ({
        ...prev,
        codigoUbigeo: codUbigeo,
        distrito: matched.distrito,
        provincia: matched.provincia,
        departamento: matched.departamento,
      }));
    }
  };

  // Search address for newDir in map
  const handleSearchNewDirAddress = async () => {
    if (!newDir.direccionCompleta || !newDir.direccionCompleta.trim()) {
      toast.error("Escribe una dirección exacta para buscarla en el mapa.");
      return;
    }

    setSearchingNewDirMap(true);
    const fullQuery = [
      newDir.direccionCompleta.trim(),
      newDir.distrito,
      newDir.provincia,
      newDir.departamento,
      "Peru",
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(fullQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.lat && data.lng) {
          setNewDir((prev) => ({
            ...prev,
            latitud: Number(data.lat),
            longitud: Number(data.lng),
            mapSearchQuery: fullQuery,
            mapTimestamp: Date.now(),
          }));
          toast.success("Ubicación encontrada y centrada en el mapa.");
          return;
        }
      }

      setNewDir((prev) => ({
        ...prev,
        mapSearchQuery: fullQuery,
        mapTimestamp: Date.now(),
      }));
      toast.info("Mostrando búsqueda aproximada en Google Maps.");
    } catch (e) {
      setNewDir((prev) => ({
        ...prev,
        mapSearchQuery: fullQuery,
        mapTimestamp: Date.now(),
      }));
    } finally {
      setSearchingNewDirMap(false);
    }
  };

  // Save new address to backend
  const handleSaveNewAddress = async () => {
    if (!contact) return;
    if (!newDir.direccionCompleta || !newDir.direccionCompleta.trim()) {
      toast.error("La dirección exacta de despacho es obligatoria.");
      return;
    }

    setSavingDir(true);
    try {
      const payload = {
        nombreUbicacion: newDir.nombreUbicacion.trim() || `Sede ${(contact.direcciones?.length || 0) + 1}`,
        codigoUbigeo: newDir.codigoUbigeo || "150101",
        direccionCompleta: newDir.direccionCompleta.trim(),
        referencia: newDir.referencia?.trim() || null,
        latitud: newDir.latitud,
        longitud: newDir.longitud,
      };

      let updatedAddresses: Direccion[] = [];

      try {
        const res = await api.post(`/api/contacts/${contact.id}/addresses`, payload);
        updatedAddresses = Array.isArray(res.data) ? res.data : [];
      } catch (postErr: any) {
        if (postErr.response?.status === 404 || postErr.response?.status === 405) {
          const existing = (contact.direcciones || []).map((d) => ({
            nombreUbicacion: d.nombreUbicacion,
            codigoUbigeo: d.codigoUbigeo,
            direccionCompleta: d.direccionCompleta,
            referencia: d.referencia,
            latitud: d.latitud,
            longitud: d.longitud,
          }));

          const putRes = await api.put(`/api/contacts/${contact.id}`, {
            tipoPersona: contact.tipoPersona,
            tipoDocumento: contact.tipoDocumento,
            numeroDocumento: contact.numeroDocumento,
            nombres: contact.nombres,
            apellidos: contact.apellidos,
            razonSocial: contact.razonSocial,
            telefonoPrincipal: contact.telefonoPrincipal,
            telefonoSecundario: contact.telefonoSecundario,
            email: contact.email,
            empresaId: contact.empresaId,
            referencia: contact.referencia,
            direcciones: [...existing, payload],
          });
          updatedAddresses = putRes.data?.direcciones || [];
        } else {
          throw postErr;
        }
      }

      setContact({
        ...contact,
        direcciones: updatedAddresses,
      });
      setActiveDirIndex(updatedAddresses.length > 0 ? updatedAddresses.length - 1 : 0);
      setShowAddDirForm(false);
      toast.success("Nueva sede agregada correctamente.");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Error al guardar la nueva sede."));
    } finally {
      setSavingDir(false);
    }
  };

  // Delete address directly
  const handleDeleteAddress = async (addrId: number) => {
    if (!contact) return;
    if (!confirm("¿Estás seguro de eliminar esta sede de entrega?")) return;

    try {
      let updatedAddresses: Direccion[] = [];
      try {
        const res = await api.delete(`/api/contacts/${contact.id}/addresses/${addrId}`);
        updatedAddresses = Array.isArray(res.data) ? res.data : [];
      } catch (delErr: any) {
        if (delErr.response?.status === 404 || delErr.response?.status === 405) {
          const remaining = (contact.direcciones || [])
            .filter((d) => d.idDireccion !== addrId)
            .map((d) => ({
              nombreUbicacion: d.nombreUbicacion,
              codigoUbigeo: d.codigoUbigeo,
              direccionCompleta: d.direccionCompleta,
              referencia: d.referencia,
              latitud: d.latitud,
              longitud: d.longitud,
            }));

          const putRes = await api.put(`/api/contacts/${contact.id}`, {
            tipoPersona: contact.tipoPersona,
            tipoDocumento: contact.tipoDocumento,
            numeroDocumento: contact.numeroDocumento,
            nombres: contact.nombres,
            apellidos: contact.apellidos,
            razonSocial: contact.razonSocial,
            telefonoPrincipal: contact.telefonoPrincipal,
            telefonoSecundario: contact.telefonoSecundario,
            email: contact.email,
            empresaId: contact.empresaId,
            referencia: contact.referencia,
            direcciones: remaining,
          });
          updatedAddresses = putRes.data?.direcciones || [];
        } else {
          throw delErr;
        }
      }

      setContact({
        ...contact,
        direcciones: updatedAddresses,
      });
      setActiveDirIndex(0);
      toast.success("Sede eliminada correctamente.");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Error al eliminar la sede."));
    }
  };

  // Add related contact person to Empresa
  const handleSaveNewPerson = async () => {
    if (!contact) return;
    if (!newPerson.nombres.trim() || !newPerson.apellidos.trim()) {
      toast.error("Nombres y Apellidos son obligatorios.");
      return;
    }
    if (!/^[0-9]{8}$/.test(newPerson.numeroDocumento.trim())) {
      toast.error("El DNI debe tener exactamente 8 dígitos numéricos.");
      return;
    }
    const cleanPhone = newPerson.telefonoPrincipal.trim().replace(/[^0-9]/g, "");
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      toast.error("El teléfono debe tener exactamente 9 dígitos (ej. 987654321).");
      return;
    }

    setSavingPerson(true);
    try {
      const payload = {
        tipoPersona: "NATURAL",
        tipoDocumento: "DNI",
        numeroDocumento: newPerson.numeroDocumento.trim(),
        nombres: newPerson.nombres.trim(),
        apellidos: newPerson.apellidos.trim(),
        telefonoPrincipal: cleanPhone,
        email: newPerson.email?.trim() || null,
        referencia: newPerson.referencia?.trim() || null,
        empresaId: contact.id,
      };

      await api.post(`/api/contacts/${contact.id}/personas`, payload);
      toast.success("Contacto relacionado agregado con éxito.");
      setShowAddPersonForm(false);
      setNewPerson({
        nombres: "",
        apellidos: "",
        numeroDocumento: "",
        telefonoPrincipal: "",
        email: "",
        referencia: "",
      });

      // Refresh linked persons
      const pRes = await api.get(`/api/contacts/${contact.id}/personas`);
      setLinkedPersons(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Error al registrar contacto relacionado."));
    } finally {
      setSavingPerson(false);
    }
  };

  // Toggle Star
  const handleToggleStar = async () => {
    if (!contact) return;
    try {
      const res = await api.put(`/api/contacts/${contact.id}/star`);
      const newStarred = res.data?.starred ?? !contact.starred;
      setContact({ ...contact, starred: newStarred });
      toast.success(newStarred ? "Marcado como contacto VIP / Favorito." : "Removido de favoritos.");
    } catch (err) {
      toast.error("Error al actualizar estado favorito.");
    }
  };

  // Toggle AI Bot
  const handleToggleAi = async () => {
    if (!contact) return;
    try {
      const res = await api.put(`/api/contacts/${contact.id}/toggle-ai`);
      const newAi = res.data?.aiActive ?? !contact.aiActive;
      setContact({ ...contact, aiActive: newAi });
      toast.success(
        newAi
          ? "Bot IA Gemini activado para responder por WhatsApp."
          : "Bot IA pausado (atención humana requerida)."
      );
    } catch (err) {
      toast.error("Error al actualizar estado del Bot IA.");
    }
  };

  // Delete Contact
  const handleDeleteContact = async () => {
    if (!contact) return;
    const name = contact.nombreDisplay || contact.razonSocial || "este contacto";
    if (
      !confirm(
        `¿Estás seguro de eliminar permanentemente a "${name}"? Esta acción borrará también sus direcciones registradas.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/contacts/${contact.id}`);
      toast.success("Contacto eliminado con éxito.");
      router.push("/contactos");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "No se pudo eliminar el contacto."));
    }
  };

  // Copy document number to clipboard
  const handleCopyDoc = () => {
    if (!contact?.numeroDocumento) return;
    navigator.clipboard.writeText(contact.numeroDocumento);
    setCopiedDoc(true);
    toast.success("Número de documento copiado al portapapeles.");
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  // Add Chatter Entry
  const handleAddChatter = (type: "message" | "note" | "activity") => {
    if (!composerText.trim()) return;

    const newEntry: ChatterEntry = {
      id: `chat-${Date.now()}`,
      author: "Usuario Actual",
      date: "Hoy " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: composerText.trim(),
      type: type,
    };

    setChatterEntries([newEntry, ...chatterEntries]);
    setComposerText("");
    setActiveComposer("none");
    toast.success(type === "note" ? "Nota interna registrada." : "Registro añadido a la actividad.");
  };

  // Active address for the lateral map
  const activeDir = contact?.direcciones?.[activeDirIndex] || contact?.direcciones?.[0];

  // Map URL for the lateral map iframe
  const mapEmbedUrl = useMemo(() => {
    if (showAddDirForm) {
      const ts = newDir.mapTimestamp ? `&_t=${newDir.mapTimestamp}` : "";
      if (newDir.latitud && newDir.longitud) {
        return `https://maps.google.com/maps?q=${newDir.latitud},${newDir.longitud}&hl=es&z=17&output=embed${ts}`;
      }
      const targetQuery =
        newDir.mapSearchQuery ||
        [
          newDir.direccionCompleta?.trim(),
          newDir.distrito,
          newDir.provincia,
          newDir.departamento,
          "Peru",
        ]
          .filter(Boolean)
          .join(", ");

      if (targetQuery && targetQuery !== "Peru") {
        return `https://maps.google.com/maps?q=${encodeURIComponent(targetQuery)}&hl=es&z=16&output=embed${ts}`;
      }
      return `https://maps.google.com/maps?q=Lima,Peru&hl=es&z=13&output=embed${ts}`;
    }

    if (!activeDir) {
      return "https://maps.google.com/maps?q=Lima,Peru&hl=es&z=12&output=embed";
    }

    if (activeDir.latitud && activeDir.longitud) {
      return `https://maps.google.com/maps?q=${activeDir.latitud},${activeDir.longitud}&hl=es&z=17&output=embed`;
    }

    const queryParts = [
      activeDir.direccionCompleta?.trim(),
      activeDir.distrito,
      activeDir.provincia,
      activeDir.departamento,
      "Peru",
    ].filter(Boolean);

    const fullQuery = queryParts.join(", ");
    if (fullQuery && fullQuery !== "Peru") {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fullQuery)}&hl=es&z=16&output=embed`;
    }

    return "https://maps.google.com/maps?q=Lima,Peru&hl=es&z=13&output=embed";
  }, [activeDir, showAddDirForm, newDir]);

  // Totals calculations
  const totalVentasAmount = useMemo(() => {
    return ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  }, [ventas]);

  const totalOppsAmount = useMemo(() => {
    return oportunidades.reduce((acc, o) => acc + (Number(o.valor) || 0), 0);
  }, [oportunidades]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="size-8 animate-spin text-emerald-600" />
        <span className="text-sm font-medium text-muted-foreground">Cargando ficha del contacto...</span>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
        <AlertCircle className="size-12 text-destructive/70" />
        <h2 className="text-lg font-bold text-foreground">Contacto no encontrado</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          El contacto que intentas consultar no existe o fue eliminado de la base de datos.
        </p>
        <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
          <Link href="/contactos">
            <ArrowLeft className="size-3.5 mr-1.5" />
            Volver al Directorio
          </Link>
        </Button>
      </div>
    );
  }

  const isEmpresa = contact.tipoPersona === "EMPRESA";
  const displayName =
    contact.nombreDisplay ||
    (isEmpresa
      ? contact.razonSocial
      : `${contact.nombres || ""} ${contact.apellidos || ""}`.trim()) ||
    "Sin Nombre";

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-full min-w-0">
      {/* --------------------------------------------------------------------- */}
      {/* 1. BARRA SUPERIOR (HEADER DE ACCIONES ESTILO ODOO) */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b">
        {/* Breadcrumb e Identidad */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/contactos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
            <Link href="/contactos" className="hover:text-foreground transition-colors shrink-0 font-medium">
              Directorio
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[240px] sm:max-w-md">
              {displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleStar}
            className="text-muted-foreground hover:text-amber-500 transition-colors ml-1 p-1 rounded"
            title={contact.starred ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            <Star
              className={`size-4 sm:size-5 ${
                contact.starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground/60"
              }`}
            />
          </button>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Abrir WhatsApp Directo */}
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs sm:text-sm px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium"
            onClick={() => {
              const clean = contact.telefonoPrincipal.replace(/[^0-9]/g, "");
              const formatted = clean.startsWith("51") ? clean : `51${clean}`;
              window.open(`https://wa.me/${formatted}`, "_blank");
            }}
          >
            <MessageSquare className="size-3.5" />
            WhatsApp
          </Button>

          {/* Crear Nueva Oportunidad */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs sm:text-sm px-2.5 gap-1.5 text-foreground hover:bg-muted font-medium"
            asChild
          >
            <Link
              href={`/opportunities/create?contacto_id=${contact.id}&nombre=${encodeURIComponent(
                displayName
              )}&telefono=${encodeURIComponent(contact.telefonoPrincipal)}`}
            >
              <Briefcase className="size-3.5 text-primary" />
              Oportunidad
            </Link>
          </Button>

          {/* Crear Nuevo Pedido */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs sm:text-sm px-2.5 gap-1.5 text-foreground hover:bg-muted font-medium"
            asChild
          >
            <Link
              href={`/pedidos/create?cliente_id=${contact.id}&nombre=${encodeURIComponent(
                displayName
              )}&telefono=${encodeURIComponent(contact.telefonoPrincipal)}`}
            >
              <ShoppingBag className="size-3.5 text-emerald-600" />
              Pedido
            </Link>
          </Button>

          {/* Editar Registro */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs sm:text-sm px-3 gap-1.5 border-muted-foreground/30 hover:border-foreground font-medium"
            asChild
          >
            <Link href={`/contactos/create?edit_id=${contact.id}`}>
              <Edit className="size-3.5 text-muted-foreground" />
              Editar Ficha
            </Link>
          </Button>

          {/* Eliminar Registro */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteContact}
            title="Eliminar contacto permanentemente"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. LAYOUT PRINCIPAL: HOJA ODOO SHEET (~75%) + PANEL CHATTER (~25%) */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start w-full min-w-0">
        {/* =================================================================== */}
        {/* ZONA IZQUIERDA: HOJA DE FORMULARIO ODOO SHEET (col-span-9 en desktop) */}
        {/* =================================================================== */}
        <div className="xl:col-span-9 bg-card rounded-lg border shadow-xs p-3.5 sm:p-4 flex flex-col gap-3 min-w-0">
          {/* Header Superior del Sheet: SMART BUTTONS TIPO ODOO */}
          <div className="flex items-center justify-between pb-2.5 border-b gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`text-xs uppercase font-semibold px-2.5 py-0.5 ${
                  isEmpresa
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                }`}
              >
                {isEmpresa ? "Empresa / RUC" : "Persona Natural"}
              </Badge>

              <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono font-medium">
                {contact.tipoDocumento}: {contact.numeroDocumento}
              </Badge>

              {contact.aiActive && (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1.5 font-medium"
                >
                  <Bot className="size-3" />
                  Bot IA Activo
                </Badge>
              )}
            </div>

            {/* Smart KPI Stat Buttons (Estilo Odoo) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón Smart: Oportunidades CRM */}
              <button
                type="button"
                onClick={() => setActiveTab("oportunidades")}
                className={`flex items-center gap-2 px-2.5 py-1 rounded border text-left transition-all ${
                  activeTab === "oportunidades"
                    ? "bg-primary/10 border-primary text-primary shadow-2xs font-semibold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title="Ver oportunidades de este contacto"
              >
                <Briefcase className="size-3.5 text-primary shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs sm:text-sm font-bold text-foreground">{oportunidades.length}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Oportunidades</span>
                </div>
              </button>

              {/* Botón Smart: Ventas */}
              <button
                type="button"
                onClick={() => setActiveTab("ventas")}
                className={`flex items-center gap-2 px-2.5 py-1 rounded border text-left transition-all ${
                  activeTab === "ventas"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs font-semibold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title="Ver ventas facturadas"
              >
                <DollarSign className="size-3.5 text-emerald-600 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    S/ {totalVentasAmount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Ventas ({ventas.length})</span>
                </div>
              </button>

              {/* Botón Smart: Pedidos */}
              <button
                type="button"
                onClick={() => setActiveTab("pedidos")}
                className={`flex items-center gap-2 px-2.5 py-1 rounded border text-left transition-all ${
                  activeTab === "pedidos"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title="Ver pedidos registrados"
              >
                <ShoppingBag className="size-3.5 text-blue-600 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs sm:text-sm font-bold text-foreground">{orders.length}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Pedidos</span>
                </div>
              </button>

              {/* Botón Smart: Contactos Relacionados */}
              <button
                type="button"
                onClick={() => setActiveTab("personas")}
                className={`flex items-center gap-2 px-2.5 py-1 rounded border text-left transition-all ${
                  activeTab === "personas"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title="Ver contactos relacionados a la empresa"
              >
                <Users className="size-3.5 text-amber-600 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {isEmpresa ? linkedPersons.length : parentCompany ? 1 : 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Contactos</span>
                </div>
              </button>

              {/* Botón Smart: Bot IA Switch Rápido */}
              <button
                type="button"
                onClick={handleToggleAi}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all text-xs font-medium ${
                  contact.aiActive
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
                title="Alternar auto-respuesta IA"
              >
                <Bot
                  className={`size-3.5 ${contact.aiActive ? "text-indigo-600 animate-pulse" : "text-muted-foreground"}`}
                />
                <span className="text-xs font-semibold">{contact.aiActive ? "IA On" : "IA Off"}</span>
              </button>
            </div>
          </div>

          {/* Bloque Identidad del Contacto */}
          <div className="flex items-start gap-3 pt-0.5">
            <div
              className={`size-12 rounded-lg flex items-center justify-center shrink-0 text-base font-bold shadow-2xs border ${
                isEmpresa
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              }`}
            >
              {isEmpresa ? <Building className="size-6" /> : <User className="size-6" />}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {displayName}
                </h2>
                {contact.starred && (
                  <Star className="size-4 fill-amber-400 text-amber-500 shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted-foreground mt-0.5 flex-wrap">
                <span className="font-mono flex items-center gap-1">
                  {contact.tipoDocumento}: <strong className="text-foreground">{contact.numeroDocumento}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleCopyDoc}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  title="Copiar número"
                >
                  {copiedDoc ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </button>

                {contact.empresaNombre && (
                  <Link
                    href={`/contactos/view?id=${contact.empresaId}`}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    title="Ver empresa registrada"
                  >
                    <Building className="size-3" />
                    {contact.empresaNombre}
                  </Link>
                )}

                {contact.dateCreated && (
                  <span className="text-xs text-muted-foreground/70 flex items-center gap-1 ml-auto">
                    <Calendar className="size-3" />
                    Registrado: {contact.dateCreated.substring(0, 10)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* BLOQUE SUPERIOR: GRID DE 2 COLUMNAS COMPACTO ESTILO ODOO */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 pb-2.5 border-t border-b text-xs sm:text-sm">
            {/* Columna Izquierda: Identidad & Fiscalidad */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <User className="size-3 text-emerald-600" />
                Datos Fiscales & Identidad
              </span>

              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span className="text-muted-foreground text-xs sm:text-sm">Contribuyente:</span>
                <span className="col-span-2 font-medium text-foreground">
                  {isEmpresa ? "Empresa (RUC)" : "Persona Natural"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span className="text-muted-foreground text-xs sm:text-sm">Documento:</span>
                <span className="col-span-2 font-mono font-medium text-foreground">
                  {contact.tipoDocumento} {contact.numeroDocumento}
                </span>
              </div>

              {isEmpresa ? (
                <div className="grid grid-cols-3 gap-1 py-0.5">
                  <span className="text-muted-foreground text-xs sm:text-sm">Razón Social:</span>
                  <span className="col-span-2 font-medium text-foreground truncate">
                    {contact.razonSocial || "-"}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 py-0.5">
                  <span className="text-muted-foreground text-xs sm:text-sm">Nombre:</span>
                  <span className="col-span-2 font-medium text-foreground truncate">
                    {contact.nombres} {contact.apellidos}
                  </span>
                </div>
              )}

              {contact.empresaNombre && (
                <div className="grid grid-cols-3 gap-1 py-0.5">
                  <span className="text-muted-foreground text-xs sm:text-sm">Empresa:</span>
                  <Link
                    href={`/contactos/view?id=${contact.empresaId}`}
                    className="col-span-2 font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate hover:underline"
                  >
                    <Building className="size-3" />
                    {contact.empresaNombre}
                  </Link>
                </div>
              )}

              {isEmpresa && (
                <div className="grid grid-cols-3 gap-1 py-0.5">
                  <span className="text-muted-foreground text-xs sm:text-sm">Colaboradores:</span>
                  <span className="col-span-2 font-medium text-foreground flex items-center gap-1">
                    <Users className="size-3 text-amber-500" />
                    {linkedPersons.length} contacto(s) de la empresa
                  </span>
                </div>
              )}
            </div>

            {/* Columna Derecha: Contacto Directo & Comunicación */}
            <div className="flex flex-col gap-2 md:border-l md:pl-3">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <Phone className="size-3 text-emerald-600" />
                Contacto Directo
              </span>

              {/* Teléfono WhatsApp */}
              <div className="grid grid-cols-3 gap-1 py-0.5 items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">WhatsApp:</span>
                <div className="col-span-2 flex items-center gap-2 font-mono">
                  <span className="font-semibold text-foreground text-xs sm:text-sm">+51 {contact.telefonoPrincipal}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    title="Abrir chat en WhatsApp Web"
                    onClick={() => {
                      const clean = contact.telefonoPrincipal.replace(/[^0-9]/g, "");
                      const formatted = clean.startsWith("51") ? clean : `51${clean}`;
                      window.open(`https://wa.me/${formatted}`, "_blank");
                    }}
                  >
                    <MessageSquare className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Teléfono Secundario */}
              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span className="text-muted-foreground text-xs sm:text-sm">Fijo / Alt.:</span>
                <span className="col-span-2 font-mono text-foreground truncate text-xs sm:text-sm">
                  {contact.telefonoSecundario || <span className="text-muted-foreground italic">No registrado</span>}
                </span>
              </div>

              {/* Correo Electrónico */}
              <div className="grid grid-cols-3 gap-1 py-0.5 items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Email:</span>
                <div className="col-span-2 truncate">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:underline flex items-center gap-1 truncate text-xs sm:text-sm"
                    >
                      <Mail className="size-3" />
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic text-xs sm:text-sm">No registrado</span>
                  )}
                </div>
              </div>

              {/* Referencia General */}
              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span className="text-muted-foreground text-xs sm:text-sm">Referencia:</span>
                <span className="col-span-2 text-foreground truncate text-xs sm:text-sm">
                  {contact.referencia || <span className="text-muted-foreground italic">Ninguna</span>}
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* BLOQUE INFERIOR CON PESTAÑAS (NOTEBOOK ESTILO ODOO) */}
          {/* ----------------------------------------------------------------- */}
          <div className="flex flex-col pt-0.5">
            {/* Tabs Navigation Bar */}
            <div className="flex items-center gap-3.5 border-b text-xs sm:text-sm font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("direcciones")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "direcciones"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="size-3.5" />
                <span>Direcciones</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {contact.direcciones?.length || 0}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("oportunidades")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "oportunidades"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="size-3.5" />
                <span>Oportunidades</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {oportunidades.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ventas")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "ventas"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="size-3.5" />
                <span>Ventas</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {ventas.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("personas")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "personas"
                    ? "border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="size-3.5" />
                <span>Contactos</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {linkedPersons.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pedidos")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "pedidos"
                    ? "border-blue-600 text-blue-700 dark:text-blue-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBag className="size-3.5" />
                <span>Pedidos</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {orders.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bot_ia")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "bot_ia"
                    ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="size-3.5" />
                <span>Bot</span>
                {contact.aiActive && <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notas")}
                className={`pb-2 pt-1 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "notas"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-3.5" />
                <span>Notas</span>
              </button>
            </div>

            {/* =============================================================== */}
            {/* PESTAÑA 1: DIRECCIONES CON AGREGADO DIRECTO Y MAPA COMPACTO */}
            {/* =============================================================== */}
            {activeTab === "direcciones" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 pt-2.5 items-start text-xs sm:text-sm">
                {/* Zona Izquierda: Formulario Agregar / Lista Sedes (7/12) */}
                <div className="xl:col-span-7 flex flex-col gap-2.5">
                  {/* Barra de Sedes + Botón Agregar Sede */}
                  <div className="flex items-center justify-between gap-2 bg-muted/25 p-1.5 rounded-md border">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      {contact.direcciones &&
                        contact.direcciones.map((dir, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setShowAddDirForm(false);
                              setActiveDirIndex(idx);
                            }}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                              !showAddDirForm && activeDirIndex === idx
                                ? "bg-card text-emerald-600 font-semibold border border-emerald-500/30 shadow-2xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span>{dir.nombreUbicacion || `Sede ${idx + 1}`}</span>
                          </button>
                        ))}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs shrink-0 transition-all cursor-pointer"
                      onClick={handleOpenAddDirForm}
                    >
                      <Plus className="size-3.5" />
                      Agregar Sede
                    </Button>
                  </div>

                  {/* FORMULARIO INLINE: AGREGAR DIRECCIÓN */}
                  {showAddDirForm ? (
                    <div className="p-3 bg-card border-2 border-indigo-500/40 rounded-lg flex flex-col gap-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                          <Plus className="size-3.5" />
                          Registrar Nueva Sede / Ubicación
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowAddDirForm(false)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground shrink-0 w-24">
                          Etiqueta Sede:
                        </Label>
                        <Input
                          placeholder="Ej: Almacén Sur, Sucursal Miraflores"
                          value={newDir.nombreUbicacion}
                          onChange={(e) => setNewDir({ ...newDir, nombreUbicacion: e.target.value })}
                          className="h-8 text-xs sm:text-sm flex-1"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs text-muted-foreground font-medium">Departamento</Label>
                          <select
                            className="w-full h-8 px-2 rounded border bg-background text-xs sm:text-sm"
                            value={newDir.departamento}
                            onChange={(e) => handleNewDirDepChange(e.target.value)}
                          >
                            {departamentosList.map((dep) => (
                              <option key={dep} value={dep}>
                                {dep}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label className="text-xs text-muted-foreground font-medium">Provincia</Label>
                          <select
                            className="w-full h-8 px-2 rounded border bg-background text-xs sm:text-sm"
                            value={newDir.provincia}
                            onChange={(e) => handleNewDirProvChange(e.target.value)}
                          >
                            {getProvinciasForDep(newDir.departamento).map((prov) => (
                              <option key={prov} value={prov}>
                                {prov}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label className="text-xs text-muted-foreground font-medium">Distrito (Ubigeo)</Label>
                          <select
                            className="w-full h-8 px-2 rounded border bg-background text-xs sm:text-sm"
                            value={newDir.codigoUbigeo}
                            onChange={(e) => handleNewDirDistChange(e.target.value)}
                          >
                            {getDistritosForProv(newDir.departamento, newDir.provincia).map((u) => (
                              <option key={u.codigoUbigeo} value={u.codigoUbigeo}>
                                {u.distrito}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Dirección exacta de despacho <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Ej: Av. República de Panamá 3550, San Isidro"
                            value={newDir.direccionCompleta}
                            onChange={(e) =>
                              setNewDir({
                                ...newDir,
                                direccionCompleta: e.target.value,
                                latitud: null,
                                longitud: null,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSearchNewDirAddress();
                              }
                            }}
                            className="h-8 text-xs sm:text-sm flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0 font-medium"
                            onClick={handleSearchNewDirAddress}
                            disabled={searchingNewDirMap}
                          >
                            {searchingNewDirMap ? (
                              <RefreshCw className="size-3 animate-spin" />
                            ) : (
                              <Search className="size-3" />
                            )}
                            Buscar
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground shrink-0 w-24">
                          Referencia:
                        </Label>
                        <Input
                          placeholder="Ej: Portón gris, frente a parque, timbre 1A"
                          value={newDir.referencia}
                          onChange={(e) => setNewDir({ ...newDir, referencia: e.target.value })}
                          className="h-8 text-xs sm:text-sm flex-1"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => setShowAddDirForm(false)}
                        >
                          Cancelar
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 font-semibold"
                          onClick={handleSaveNewAddress}
                          disabled={savingDir}
                        >
                          {savingDir ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                          Guardar Sede
                        </Button>
                      </div>
                    </div>
                  ) : activeDir ? (
                    /* TARJETA DE LA SEDE ACTIVA */
                    <div className="p-3 bg-muted/15 border rounded-lg flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-emerald-600" />
                          <span className="font-semibold text-foreground text-sm">
                            {activeDir.nombreUbicacion || "Sede Principal"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono text-emerald-600 border-emerald-500/30 px-2 py-0.5"
                          >
                            Ubigeo: {activeDir.codigoUbigeo || "150101"}
                          </Badge>

                          {contact.direcciones && contact.direcciones.length > 1 && activeDir.idDireccion && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => handleDeleteAddress(activeDir.idDireccion!)}
                            >
                              <Trash2 className="size-3" />
                              Borrar
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm py-1">
                        <div>
                          <span className="text-muted-foreground block text-xs">Departamento</span>
                          <span className="font-medium text-foreground">{activeDir.departamento || "LIMA"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Provincia</span>
                          <span className="font-medium text-foreground">{activeDir.provincia || "LIMA"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Distrito</span>
                          <span className="font-medium text-foreground">{activeDir.distrito || "LIMA"}</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t">
                        <span className="text-muted-foreground block text-xs">Dirección exacta:</span>
                        <span className="font-medium text-foreground text-xs sm:text-sm leading-snug">
                          {activeDir.direccionCompleta || "Sin dirección registrada"}
                        </span>
                      </div>

                      {activeDir.referencia && (
                        <div>
                          <span className="text-muted-foreground block text-xs">Referencia:</span>
                          <span className="text-muted-foreground italic text-xs">{activeDir.referencia}</span>
                        </div>
                      )}

                      <div className="pt-1 border-t flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>
                          GPS:{" "}
                          {activeDir.latitud
                            ? `${Number(activeDir.latitud).toFixed(5)}, ${Number(activeDir.longitud).toFixed(5)}`
                            : "No fijado"}
                        </span>
                        {activeDir.latitud && activeDir.longitud && (
                          <a
                            href={`https://www.google.com/maps?q=${activeDir.latitud},${activeDir.longitud}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            Abrir Maps
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <MapPin className="size-6 text-muted-foreground/50" />
                      <p className="font-medium text-sm">Sin direcciones registradas.</p>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleOpenAddDirForm}
                      >
                        <Plus className="size-3 mr-1" />
                        Agregar Dirección
                      </Button>
                    </div>
                  )}
                </div>

                {/* Zona Derecha: MAPA COMPACTO AL COSTADO (5/12) */}
                <div className="xl:col-span-5 flex flex-col gap-1.5 border rounded-lg bg-card p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <div className="flex items-center gap-1.5">
                      <MapIcon className="size-3.5 text-emerald-600" />
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[170px]">
                        Mapa:{" "}
                        {showAddDirForm
                          ? newDir.nombreUbicacion || "Nueva Sede"
                          : activeDir?.nombreUbicacion || "Ubicación"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {showAddDirForm ? (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <Plus className="size-3" /> Modo Registro
                        </span>
                      ) : activeDir?.latitud && activeDir?.longitud ? (
                        <a
                          href={`https://www.google.com/maps?q=${activeDir.latitud},${activeDir.longitud}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          Maps
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Contenedor del Mapa Iframe Compacto (h-[180px]) */}
                  <div className="relative w-full h-[180px] rounded-md overflow-hidden border bg-muted/30">
                    <iframe
                      title={`Mapa ${activeDir?.nombreUbicacion || "Ubicación"}`}
                      src={mapEmbedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                      allowFullScreen
                    />
                    {searchingNewDirMap && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                        <RefreshCw className="size-3.5 animate-spin" />
                        Buscando dirección...
                      </div>
                    )}
                  </div>

                  {/* Footer del Mapa */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="truncate max-w-[170px]">
                      📍{" "}
                      {showAddDirForm
                        ? `${newDir.distrito}, ${newDir.provincia}`
                        : `${activeDir?.distrito || "Distrito"}, ${activeDir?.provincia || "Provincia"}`}
                    </span>
                    <span className="font-mono text-emerald-600 font-medium text-xs">
                      Ubigeo: {showAddDirForm ? newDir.codigoUbigeo : activeDir?.codigoUbigeo || "150101"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 2: OPORTUNIDADES CRM VINCULADAS */}
            {/* =============================================================== */}
            {activeTab === "oportunidades" && (
              <div className="flex flex-col gap-3 pt-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    <span className="font-semibold text-foreground text-xs sm:text-sm">
                      Oportunidades en Pipeline CRM
                    </span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      Total: S/ {totalOppsAmount.toFixed(2)}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-medium"
                    asChild
                  >
                    <Link
                      href={`/opportunities/create?contacto_id=${contact.id}&nombre=${encodeURIComponent(
                        displayName
                      )}&telefono=${encodeURIComponent(contact.telefonoPrincipal)}`}
                    >
                      <Plus className="size-3" />
                      Nueva Oportunidad
                    </Link>
                  </Button>
                </div>

                {oportunidades.length === 0 ? (
                  <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Briefcase className="size-8 text-muted-foreground/40" />
                    <h4 className="font-semibold text-foreground text-sm">Sin oportunidades activas</h4>
                    <p className="text-xs text-muted-foreground">
                      No hay oportunidades o cotizaciones registradas para este contacto.
                    </p>
                    <Button size="sm" variant="outline" className="mt-1 text-xs h-7" asChild>
                      <Link
                        href={`/opportunities/create?contacto_id=${contact.id}&nombre=${encodeURIComponent(
                          displayName
                        )}`}
                      >
                        <Plus className="size-3 mr-1" />
                        Crear Oportunidad
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs sm:text-sm font-semibold">
                          <TableHead className="text-xs sm:text-sm">Título de Oportunidad</TableHead>
                          <TableHead className="text-xs sm:text-sm">Valor (PEN)</TableHead>
                          <TableHead className="text-xs sm:text-sm">Etapa / Pipeline</TableHead>
                          <TableHead className="text-xs sm:text-sm">Prioridad</TableHead>
                          <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                          <TableHead className="text-xs sm:text-sm">Vendedor</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {oportunidades.map((opp) => (
                          <TableRow key={opp.id} className="text-xs sm:text-sm">
                            <TableCell className="font-semibold text-foreground">
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm">{opp.titulo}</span>
                                {opp.notas && (
                                  <span className="text-xs text-muted-foreground truncate max-w-xs font-normal">
                                    {opp.notas}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-foreground text-xs sm:text-sm">
                              S/ {Number(opp.valor || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={opp.es_ganada ? "default" : opp.es_perdida ? "destructive" : "secondary"}
                                className="text-xs px-2 py-0.5"
                              >
                                {opp.etapa_nombre || "Prospecto"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {opp.prioridad || "Media"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {opp.created_at ? opp.created_at.substring(0, 10) : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-medium">
                              {opp.vendedor_nombre?.trim() || "Asesor Asignado"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 text-primary" asChild>
                                <Link href={`/opportunities/create?edit_id=${opp.id}`}>
                                  Editar
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 3: VENTAS Y FACTURACIÓN */}
            {/* =============================================================== */}
            {activeTab === "ventas" && (
              <div className="flex flex-col gap-3 pt-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-emerald-600" />
                    <span className="font-semibold text-foreground text-xs sm:text-sm">
                      Historial de Ventas & Facturación
                    </span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5 text-emerald-600 border-emerald-500/30">
                      Total Acumulado: S/ {totalVentasAmount.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                {ventas.length === 0 ? (
                  <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <DollarSign className="size-8 text-muted-foreground/40" />
                    <h4 className="font-semibold text-foreground text-sm">Sin ventas registradas</h4>
                    <p className="text-xs text-muted-foreground">
                      Este cliente aún no registra transacciones en el módulo de ventas.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs sm:text-sm font-semibold">
                          <TableHead className="text-xs sm:text-sm">N° Comprobante</TableHead>
                          <TableHead className="text-xs sm:text-sm">Fecha Venta</TableHead>
                          <TableHead className="text-xs sm:text-sm">Tipo Doc.</TableHead>
                          <TableHead className="text-xs sm:text-sm">Subtotal</TableHead>
                          <TableHead className="text-xs sm:text-sm">IGV</TableHead>
                          <TableHead className="text-xs sm:text-sm">Total</TableHead>
                          <TableHead className="text-xs sm:text-sm">Estado Pago</TableHead>
                          <TableHead className="text-xs sm:text-sm">Método</TableHead>
                          <TableHead className="text-xs sm:text-sm">Dirección Entrega</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventas.map((v) => (
                          <TableRow key={v.id} className="text-xs sm:text-sm">
                            <TableCell className="font-mono font-bold text-foreground text-xs sm:text-sm">
                              {v.numero || `#V-${v.id}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {v.fecha ? v.fecha.substring(0, 10) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs uppercase">
                                {v.tipo_comprobante?.replace("_", " ") || "Nota"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground text-xs sm:text-sm">
                              S/ {Number(v.subtotal || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground text-xs sm:text-sm">
                              S/ {Number(v.igv || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-foreground text-xs sm:text-sm">
                              S/ {Number(v.total || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={v.estado_pago === "pagado" ? "default" : "secondary"}
                                className={`text-xs uppercase font-medium ${
                                  v.estado_pago === "pagado" ? "bg-emerald-600 text-white" : ""
                                }`}
                              >
                                {v.estado_pago || "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground capitalize text-xs sm:text-sm">
                              {v.metodo_pago || "Efectivo"}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs">
                              {v.direccion_entrega || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 4: CONTACTOS RELACIONADOS (EMPRESA / COLABORADORES) */}
            {/* =============================================================== */}
            {activeTab === "personas" && (
              <div className="flex flex-col gap-3 pt-2.5 text-xs sm:text-sm">
                {/* Header de la pestaña */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-amber-600" />
                    <span className="font-semibold text-foreground text-xs sm:text-sm">
                      {isEmpresa
                        ? "Contactos y Personas Vinculadas a esta Empresa"
                        : "Empresa Vinculada & Colegas"}
                    </span>
                  </div>

                  {isEmpresa && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-3 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                      onClick={() => setShowAddPersonForm(true)}
                    >
                      <UserPlus className="size-3.5" />
                      Agregar Contacto
                    </Button>
                  )}
                </div>

                {/* Si es Persona Natural, mostrar tarjeta de su empresa matriz */}
                {!isEmpresa && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-10 rounded-md bg-blue-600/15 text-blue-600 flex items-center justify-center shrink-0">
                        <Building className="size-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          {contact.empresaNombre || parentCompany?.razonSocial || "Sin Empresa Vinculada"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {parentCompany?.numeroDocumento
                            ? `RUC: ${parentCompany.numeroDocumento} • Teléfono: +51 ${parentCompany.telefonoPrincipal}`
                            : "Este contacto está registrado de manera independiente."}
                        </span>
                      </div>
                    </div>

                    {contact.empresaId && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" asChild>
                        <Link href={`/contactos/view?id=${contact.empresaId}`}>
                          <ExternalLink className="size-3" />
                          Ver Ficha Empresa
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                {/* Formulario Inline: Agregar Persona a la Empresa */}
                {isEmpresa && showAddPersonForm && (
                  <div className="p-3.5 bg-card border-2 border-amber-500/40 rounded-lg flex flex-col gap-2.5 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <UserPlus className="size-3.5" />
                        Registrar Nuevo Colaborador / Contacto de la Empresa
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAddPersonForm(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                          Nombres <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Ej: Marco Antonio"
                          value={newPerson.nombres}
                          onChange={(e) => setNewPerson({ ...newPerson, nombres: e.target.value })}
                          className="h-8 text-xs sm:text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                          Apellidos <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Ej: Silva Ramos"
                          value={newPerson.apellidos}
                          onChange={(e) => setNewPerson({ ...newPerson, apellidos: e.target.value })}
                          className="h-8 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                          DNI <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="8 dígitos"
                          maxLength={8}
                          value={newPerson.numeroDocumento}
                          onChange={(e) => setNewPerson({ ...newPerson, numeroDocumento: e.target.value })}
                          className="h-8 text-xs sm:text-sm font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                          Teléfono WhatsApp <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="9 dígitos"
                          maxLength={9}
                          value={newPerson.telefonoPrincipal}
                          onChange={(e) => setNewPerson({ ...newPerson, telefonoPrincipal: e.target.value })}
                          className="h-8 text-xs sm:text-sm font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">Cargo / Rol</Label>
                        <Input
                          placeholder="Ej: Gerente Compras"
                          value={newPerson.referencia}
                          onChange={(e) => setNewPerson({ ...newPerson, referencia: e.target.value })}
                          className="h-8 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium">Correo Electrónico</Label>
                      <Input
                        type="email"
                        placeholder="contacto@empresa.com"
                        value={newPerson.email}
                        onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                        className="h-8 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1.5 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => setShowAddPersonForm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs px-3.5 bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold"
                        onClick={handleSaveNewPerson}
                        disabled={savingPerson}
                      >
                        {savingPerson ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3.5" />}
                        Guardar Colaborador
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de Colaboradores / Contactos Relacionados */}
                {linkedPersons.length === 0 ? (
                  <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Users className="size-8 text-muted-foreground/40" />
                    <h4 className="font-semibold text-foreground text-sm">
                      {isEmpresa ? "Sin colaboradores vinculados" : "Sin colegas registrados"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {isEmpresa
                        ? "No hay contactos o representantes registrados para esta empresa."
                        : "No hay otros contactos registrados bajo la misma empresa."}
                    </p>
                    {isEmpresa && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 text-xs h-7 text-amber-600 hover:text-amber-700"
                        onClick={() => setShowAddPersonForm(true)}
                      >
                        <UserPlus className="size-3 mr-1" />
                        Agregar Primer Contacto
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {linkedPersons.map((person) => (
                      <div
                        key={person.id}
                        className="p-3 bg-card border rounded-lg flex items-start justify-between gap-2.5 shadow-2xs hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="size-9 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                            <User className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-sm block truncate">
                              {person.nombres} {person.apellidos}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono block">
                              {person.tipoDocumento}: {person.numeroDocumento}
                            </span>
                            {person.referencia && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block truncate mt-0.5">
                                💼 {person.referencia}
                              </span>
                            )}
                            <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground font-mono">
                              <span className="font-medium">+51 {person.telefonoPrincipal}</span>
                              {person.email && <span className="truncate max-w-[140px] font-sans">• {person.email}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                            title="Chat WhatsApp"
                            onClick={() => {
                              const clean = person.telefonoPrincipal.replace(/[^0-9]/g, "");
                              const formatted = clean.startsWith("51") ? clean : `51${clean}`;
                              window.open(`https://wa.me/${formatted}`, "_blank");
                            }}
                          >
                            <MessageSquare className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            asChild
                            title="Ver ficha individual"
                          >
                            <Link href={`/contactos/view?id=${person.id}`}>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 5: HISTORIAL DE PEDIDOS Y DESPACHOS */}
            {/* =============================================================== */}
            {activeTab === "pedidos" && (
              <div className="flex flex-col gap-3 pt-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-blue-600" />
                    <span className="font-semibold text-foreground text-xs sm:text-sm">
                      Pedidos Registrados
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-medium"
                    asChild
                  >
                    <Link
                      href={`/pedidos/create?cliente_id=${contact.id}&nombre=${encodeURIComponent(displayName)}`}
                    >
                      <Plus className="size-3" />
                      Nuevo Pedido
                    </Link>
                  </Button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="size-8 text-muted-foreground/40" />
                    <h4 className="font-semibold text-foreground text-sm">Sin pedidos registrados</h4>
                    <p className="text-xs text-muted-foreground">
                      Este cliente aún no registra órdenes de compra o despachos en el sistema.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs h-7 text-blue-600 hover:text-blue-700"
                      asChild
                    >
                      <Link href={`/pedidos/create?cliente_id=${contact.id}`}>
                        <Plus className="size-3 mr-1" />
                        Crear Primer Pedido
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs sm:text-sm font-semibold">
                          <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                          <TableHead className="text-xs sm:text-sm">Número</TableHead>
                          <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                          <TableHead className="text-xs sm:text-sm">Total</TableHead>
                          <TableHead className="text-xs sm:text-sm">Estado Pago</TableHead>
                          <TableHead className="text-xs sm:text-sm">Entrega</TableHead>
                          <TableHead className="text-xs sm:text-sm">Dirección Despacho</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order, idx) => (
                          <TableRow key={idx} className="text-xs sm:text-sm">
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-xs uppercase font-medium ${
                                  order.tipo === "pedido"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                                }`}
                              >
                                {order.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold font-mono text-foreground text-xs sm:text-sm">
                              {order.numero || `#${order.id}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {order.fecha ? order.fecha.substring(0, 10) : "-"}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-foreground text-xs sm:text-sm">
                              S/ {Number(order.total || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${
                                  order.estado_pago === "PAGADO"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {order.estado_pago || "PENDIENTE"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {order.estado_entrega || "En Proceso"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                              {order.direccion_entrega || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 6: BOT IA & PREFERENCIAS */}
            {/* =============================================================== */}
            {activeTab === "bot_ia" && (
              <div className="flex flex-col gap-3 pt-2.5 text-xs sm:text-sm max-w-xl">
                <div className="p-3.5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/25 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-md bg-indigo-600/15 text-indigo-600 flex items-center justify-center shrink-0">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          Auto-Respuesta Bot IA (Gemini WhatsApp Assistant)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contact.aiActive
                            ? "Activo: El bot responderá consultas automáticamente vía WhatsApp."
                            : "Pausado: Las respuestas deben ser gestionadas manualmente por un asesor."}
                        </span>
                      </div>
                    </div>

                    <Switch checked={!!contact.aiActive} onCheckedChange={handleToggleAi} />
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Star
                      className={`size-4 ${
                        contact.starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-sm text-foreground block">Contacto Favorito / VIP</span>
                      <span className="text-xs text-muted-foreground">
                        Prioriza este cliente en tableros y notificaciones del equipo.
                      </span>
                    </div>
                  </div>
                  <Switch checked={!!contact.starred} onCheckedChange={handleToggleStar} />
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 7: NOTAS INTERNAS */}
            {/* =============================================================== */}
            {activeTab === "notas" && (
              <div className="flex flex-col gap-2.5 pt-2.5 text-xs sm:text-sm">
                <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-emerald-600" />
                  Notas y Observaciones Internas
                </span>

                <div className="p-3.5 bg-muted/20 border rounded-lg min-h-[110px] text-xs sm:text-sm">
                  {contact.referencia ? (
                    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {contact.referencia}
                    </p>
                  ) : (
                    <p className="italic text-muted-foreground text-xs sm:text-sm">
                      No se han registrado notas internas para este cliente. Haz clic en "Editar Ficha" para añadir
                      observaciones comerciales o preferencias de despacho.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* ZONA DERECHA: PANEL LATERAL DE ACTIVIDAD (CHATTER ESTILO ODOO) */}
        {/* =================================================================== */}
        <div className="xl:col-span-3 flex flex-col gap-2.5">
          <div className="bg-card rounded-lg border shadow-xs p-3 flex flex-col gap-2.5">
            {/* Header Chatter */}
            <div className="flex items-center justify-between pb-1.5 border-b">
              <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-emerald-600" />
                Historial & Actividad
              </span>
              <span className="text-xs text-muted-foreground">{chatterEntries.length} eventos</span>
            </div>

            {/* Botones de Acción Chatter */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={activeComposer === "note" ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs px-2.5 gap-1.5 flex-1 ${
                  activeComposer === "note" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
                onClick={() => setActiveComposer(activeComposer === "note" ? "none" : "note")}
              >
                <FileText className="size-3" />
                Nota
              </Button>

              <Button
                type="button"
                variant={activeComposer === "message" ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs px-2.5 gap-1.5 flex-1 ${
                  activeComposer === "message" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
                onClick={() => setActiveComposer(activeComposer === "message" ? "none" : "message")}
              >
                <MessageSquare className="size-3" />
                Mensaje
              </Button>
            </div>

            {/* Composer Box */}
            {activeComposer !== "none" && (
              <div className="flex flex-col gap-2 pt-1.5 border-t">
                <Textarea
                  placeholder={
                    activeComposer === "note"
                      ? "Escribe una nota interna para este contacto..."
                      : "Escribe un mensaje de registro..."
                  }
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="text-xs sm:text-sm min-h-[65px] p-2.5 resize-none"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      setActiveComposer("none");
                      setComposerText("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                    onClick={() => handleAddChatter(activeComposer as any)}
                  >
                    <Send className="size-3" />
                    Registrar
                  </Button>
                </div>
              </div>
            )}

            {/* Timeline Stream */}
            <div className="flex flex-col gap-2 pt-1 max-h-[480px] overflow-y-auto pr-0.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center py-0.5 bg-muted/40 rounded">
                Línea de Tiempo
              </div>

              {chatterEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 rounded border bg-muted/15 flex flex-col gap-1 text-xs transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {entry.type === "note" && <FileText className="size-3 text-amber-500" />}
                      {entry.type === "message" && <MessageSquare className="size-3 text-blue-500" />}
                      {entry.type === "system" && <Sparkles className="size-3 text-emerald-500" />}
                      {entry.author}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{entry.date}</span>
                  </div>
                  <p className="text-muted-foreground leading-snug text-xs">{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium text-muted-foreground">Cargando contacto...</span>
        </div>
      }
    >
      <ContactDetailViewContent />
    </Suspense>
  );
}
