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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  Plus,
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
  Navigation,
  Send,
  Clock,
  Compass,
  Map as MapIcon,
  Layers,
  ChevronRight,
  Info,
  Search,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Ubigeo {
  codigoUbigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface DireccionForm {
  idDireccion?: number;
  nombreUbicacion: string;
  codigoUbigeo: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccionCompleta: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  mapsUrlInput?: string;
  isResolvingMaps?: boolean;
  isSearchingAddress?: boolean;
  mapTimestamp?: number;
  mapSearchQuery?: string;
}

interface ChatterEntry {
  id: string;
  author: string;
  date: string;
  content: string;
  type: "note" | "message" | "activity" | "system";
}

function CreateContactContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master data
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [ubigeos, setUbigeos] = useState<Ubigeo[]>([]);

  // Form state
  const [tipoPersona, setTipoPersona] = useState<"NATURAL" | "EMPRESA">("NATURAL");
  const [tipoDocumento, setTipoDocumento] = useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [telefonoPrincipal, setTelefonoPrincipal] = useState("");
  const [telefonoSecundario, setTelefonoSecundario] = useState("");
  const [email, setEmail] = useState("");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [referencia, setReferencia] = useState("");
  const [aiActive, setAiActive] = useState(false);
  const [starred, setStarred] = useState(false);
  const [dateCreated, setDateCreated] = useState<string | null>(null);

  // Active Notebook Tab (Odoo style)
  const [activeTab, setActiveTab] = useState<"direcciones" | "bot_ia" | "notas">("direcciones");

  // Selected address index for the lateral map
  const [activeDirIndex, setActiveDirIndex] = useState(0);

  // Chatter State
  const [chatterEntries, setChatterEntries] = useState<ChatterEntry[]>([]);
  const [activeComposer, setActiveComposer] = useState<"none" | "message" | "note" | "activity">("none");
  const [composerText, setComposerText] = useState("");

  // Document Uniqueness Validation State
  const [docChecking, setDocChecking] = useState(false);
  const [docDuplicateError, setDocDuplicateError] = useState<{
    exists: boolean;
    nombre?: string;
    id?: number;
    tipoPersona?: string;
  } | null>(null);

  // Addresses
  const [direcciones, setDirecciones] = useState<DireccionForm[]>([
    {
      nombreUbicacion: "Sede Principal",
      codigoUbigeo: "150101",
      departamento: "LIMA",
      provincia: "LIMA",
      distrito: "LIMA",
      direccionCompleta: "",
      referencia: "",
      latitud: null,
      longitud: null,
      mapsUrlInput: "",
      mapSearchQuery: "",
    },
  ]);

  // Load Metadata & Edit Data
  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      try {
        const [empRes, ubiRes] = await Promise.all([
          api.get("/api/contacts/empresas"),
          api.get("/api/contacts/ubigeos"),
        ]);
        const ubiList: Ubigeo[] = Array.isArray(ubiRes.data) ? ubiRes.data : [];
        setEmpresas(Array.isArray(empRes.data) ? empRes.data : []);
        setUbigeos(ubiList);

        if (editId) {
          const contactRes = await api.get(`/api/contacts/${editId}`);
          const c = contactRes.data;
          if (c) {
            setTipoPersona(c.tipoPersona || "NATURAL");
            setTipoDocumento(c.tipoDocumento || (c.tipoPersona === "EMPRESA" ? "RUC" : "DNI"));
            setNumeroDocumento(c.numeroDocumento || "");
            setNombres(c.nombres || "");
            setApellidos(c.apellidos || "");
            setRazonSocial(c.razonSocial || "");
            setTelefonoPrincipal(c.telefonoPrincipal || "");
            setTelefonoSecundario(c.telefonoSecundario || "");
            setEmail(c.email || "");
            setEmpresaId(c.empresaId ? String(c.empresaId) : "");
            setReferencia(c.referencia || "");
            setAiActive(!!c.aiActive);
            setStarred(!!c.starred);
            setDateCreated(c.dateCreated || null);

            if (c.direcciones && c.direcciones.length > 0) {
              setDirecciones(
                c.direcciones.map((d: any, index: number) => {
                  const matchedUbi = ubiList.find((u) => u.codigoUbigeo === d.codigoUbigeo);
                  return {
                    idDireccion: d.idDireccion,
                    nombreUbicacion: d.nombreUbicacion || (index === 0 ? "Sede Principal" : `Ubicación ${index + 1}`),
                    codigoUbigeo: d.codigoUbigeo || "150101",
                    departamento: d.departamento || matchedUbi?.departamento || "LIMA",
                    provincia: d.provincia || matchedUbi?.provincia || "LIMA",
                    distrito: d.distrito || matchedUbi?.distrito || "LIMA",
                    direccionCompleta: d.direccionCompleta || "",
                    referencia: d.referencia || "",
                    latitud: d.latitud || (d.distrito === "ATE" ? -12.024 : -12.0463),
                    longitud: d.longitud || (d.distrito === "ATE" ? -76.912 : -77.0427),
                    mapsUrlInput: "",
                  };
                })
              );
            }
          }

          setChatterEntries([
            {
              id: "initial-1",
              author: "Sistema NextLead",
              date: c?.dateCreated ? c.dateCreated.substring(0, 10) : "Registrado",
              content: `Contacto #${editId} sincronizado con la base de datos de clientes.`,
              type: "system",
            },
          ]);
        } else {
          setChatterEntries([
            {
              id: "new-1",
              author: "Asistente CRM",
              date: "Ahora",
              content: "Creando nuevo contacto. Registra la identidad, ubigeo de Perú y verifica la ubicación en el mapa.",
              type: "system",
            },
          ]);
        }
      } catch (err: any) {
        console.error("Error loading contact data:", err);
        toast.error("Error al cargar la información inicial.");
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [editId]);

  // When tipoPersona changes
  const handleTipoPersonaChange = (type: "NATURAL" | "EMPRESA") => {
    setTipoPersona(type);
    if (type === "EMPRESA") {
      setTipoDocumento("RUC");
    } else {
      setTipoDocumento("DNI");
    }
  };

  // Real-time Document Uniqueness Check
  useEffect(() => {
    const cleanDoc = numeroDocumento.trim();
    const minLength = tipoDocumento === "RUC" ? 11 : 8;

    if (!cleanDoc || cleanDoc.length < minLength) {
      setDocDuplicateError(null);
      setDocChecking(false);
      return;
    }

    const timer = setTimeout(async () => {
      setDocChecking(true);
      try {
        const res = await api.get(
          `/api/contacts/check-document?numero=${encodeURIComponent(cleanDoc)}${
            editId ? `&excludeId=${editId}` : ""
          }`
        );
        if (res.data?.exists) {
          setDocDuplicateError({
            exists: true,
            nombre: res.data.nombre,
            id: res.data.id,
            tipoPersona: res.data.tipoPersona,
          });
        } else {
          setDocDuplicateError(null);
        }
      } catch (err) {
        // silent fallback
      } finally {
        setDocChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [numeroDocumento, tipoDocumento, editId]);

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

  // Update address Ubigeo fields in cascade
  const handleDepartamentoChange = (index: number, dep: string) => {
    const updated = [...direcciones];
    const provs = getProvinciasForDep(dep);
    const firstProv = provs[0] || "";
    const dists = getDistritosForProv(dep, firstProv);
    const firstDist = dists[0];

    updated[index] = {
      ...updated[index],
      departamento: dep,
      provincia: firstProv,
      distrito: firstDist?.distrito || "",
      codigoUbigeo: firstDist?.codigoUbigeo || updated[index].codigoUbigeo,
    };
    setDirecciones(updated);
  };

  const handleProvinciaChange = (index: number, prov: string) => {
    const updated = [...direcciones];
    const dep = updated[index].departamento || "LIMA";
    const dists = getDistritosForProv(dep, prov);
    const firstDist = dists[0];

    updated[index] = {
      ...updated[index],
      provincia: prov,
      distrito: firstDist?.distrito || "",
      codigoUbigeo: firstDist?.codigoUbigeo || updated[index].codigoUbigeo,
    };
    setDirecciones(updated);
  };

  const handleDistritoChange = (index: number, codUbigeo: string) => {
    const updated = [...direcciones];
    const matched = ubigeos.find((u) => u.codigoUbigeo === codUbigeo);
    if (matched) {
      updated[index] = {
        ...updated[index],
        codigoUbigeo: codUbigeo,
        distrito: matched.distrito,
        provincia: matched.provincia,
        departamento: matched.departamento,
      };
      setDirecciones(updated);
    }
  };

  // Add Address row
  const handleAddDireccion = () => {
    const newIdx = direcciones.length;
    setDirecciones([
      ...direcciones,
      {
        nombreUbicacion: `Sucursal ${newIdx + 1}`,
        codigoUbigeo: "150101",
        departamento: "LIMA",
        provincia: "LIMA",
        distrito: "LIMA",
        direccionCompleta: "",
        referencia: "",
        latitud: null,
        longitud: null,
        mapsUrlInput: "",
        mapSearchQuery: "",
      },
    ]);
    setActiveDirIndex(newIdx);
  };

  // Remove Address row
  const handleRemoveDireccion = (index: number) => {
    if (direcciones.length === 1) {
      toast.error("Debe existir al menos una dirección registrada.");
      return;
    }
    const filtered = direcciones.filter((_, i) => i !== index);
    setDirecciones(filtered);
    if (activeDirIndex >= filtered.length) {
      setActiveDirIndex(filtered.length - 1);
    }
  };

  // Update Address field
  const handleUpdateDireccion = (index: number, field: keyof DireccionForm, value: any) => {
    const updated = [...direcciones];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "direccionCompleta") {
      updated[index].latitud = null;
      updated[index].longitud = null;
      updated[index].mapSearchQuery = "";
    }
    setDirecciones(updated);
  };

  // Resolve Google Maps link
  const handleResolveMaps = async (index: number) => {
    const rawUrl = direcciones[index].mapsUrlInput;
    if (!rawUrl || !rawUrl.trim()) {
      toast.error("Pega un enlace de Google Maps primero.");
      return;
    }

    const updated = [...direcciones];
    updated[index].isResolvingMaps = true;
    setDirecciones([...updated]);

    try {
      const res = await api.get(`/api/contacts/resolve-maps-url?url=${encodeURIComponent(rawUrl.trim())}`);
      if (res.data?.lat && res.data?.lng) {
        updated[index].latitud = Number(res.data.lat);
        updated[index].longitud = Number(res.data.lng);
        toast.success(`Coordenadas detectadas: ${res.data.lat}, ${res.data.lng}`);
      } else {
        toast.error("No se pudieron extraer coordenadas válidas del enlace.");
      }
    } catch (err) {
      toast.error("Error al procesar el enlace de Google Maps.");
    } finally {
      updated[index].isResolvingMaps = false;
      setDirecciones([...updated]);
    }
  };

  // Search address in Peru & update map
  const handleSearchAddress = async (index: number) => {
    const dir = direcciones[index];
    if (!dir.direccionCompleta || !dir.direccionCompleta.trim()) {
      toast.error("Escribe una dirección primero para buscarla en el mapa.");
      return;
    }

    const updated = [...direcciones];
    updated[index].isSearchingAddress = true;
    setDirecciones([...updated]);

    const queryParts = [
      dir.direccionCompleta.trim(),
      dir.distrito,
      dir.provincia,
      dir.departamento,
      "Peru",
    ].filter(Boolean);

    const fullQuery = queryParts.join(", ");

    try {
      // 1. Endpoint geocode interno del servidor Next.js (con User-Agent y soporte OSM)
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(fullQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.lat && data.lng) {
          updated[index].latitud = Number(data.lat);
          updated[index].longitud = Number(data.lng);
          updated[index].mapSearchQuery = fullQuery;
          updated[index].mapTimestamp = Date.now();
          setDirecciones([...updated]);
          toast.success("Ubicación encontrada y centrada en el mapa.");
          return;
        }
      }

      // 2. Respaldo geocoding con calle y distrito
      const fallbackQuery = [dir.direccionCompleta.trim(), dir.distrito, "Peru"].filter(Boolean).join(", ");
      const fallbackRes = await fetch(`/api/geocode?q=${encodeURIComponent(fallbackQuery)}`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.found && fallbackData.lat && fallbackData.lng) {
          updated[index].latitud = Number(fallbackData.lat);
          updated[index].longitud = Number(fallbackData.lng);
          updated[index].mapSearchQuery = fallbackQuery;
          updated[index].mapTimestamp = Date.now();
          setDirecciones([...updated]);
          toast.success("Ubicación aproximada encontrada en el mapa.");
          return;
        }
      }

      // 3. Si no hay coordenadas en OSM, centramos Google Maps Embed con la consulta de texto completa
      updated[index].mapSearchQuery = fullQuery;
      updated[index].mapTimestamp = Date.now();
      setDirecciones([...updated]);
      toast.info("Mostrando búsqueda en Google Maps.");
    } catch (err) {
      console.error("Geocoding error:", err);
      updated[index].mapSearchQuery = fullQuery;
      updated[index].mapTimestamp = Date.now();
      setDirecciones([...updated]);
      toast.info("Actualizando mapa con la dirección ingresada.");
    } finally {
      updated[index].isSearchingAddress = false;
      setDirecciones([...updated]);
    }
  };

  // Active address for the lateral map
  const activeDir = direcciones[activeDirIndex] || direcciones[0];

  // Map URL for the lateral map iframe
  const mapEmbedUrl = useMemo(() => {
    const ts = activeDir?.mapTimestamp ? `&_t=${activeDir.mapTimestamp}` : "";

    // 1. Si tenemos coordenadas de GPS o geolocalización directa
    if (activeDir?.latitud && activeDir?.longitud) {
      return `https://maps.google.com/maps?q=${activeDir.latitud},${activeDir.longitud}&hl=es&z=17&output=embed${ts}`;
    }

    // 2. Si se buscó una dirección o se ingresó texto
    const targetQuery =
      activeDir?.mapSearchQuery ||
      [
        activeDir?.direccionCompleta?.trim(),
        activeDir?.distrito,
        activeDir?.provincia,
        activeDir?.departamento,
        "Peru",
      ]
        .filter(Boolean)
        .join(", ");

    if (targetQuery && targetQuery !== "Peru") {
      return `https://maps.google.com/maps?q=${encodeURIComponent(targetQuery)}&hl=es&z=16&output=embed${ts}`;
    }

    // 3. Predeterminado: Lima, Perú
    return `https://maps.google.com/maps?q=Lima,Peru&hl=es&z=13&output=embed${ts}`;
  }, [activeDir]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (docDuplicateError?.exists) {
      toast.error(
        `El número de documento ya está registrado para: ${docDuplicateError.nombre}. No se permiten contactos duplicados.`
      );
      return;
    }

    if (tipoPersona === "NATURAL") {
      if (!nombres.trim()) {
        toast.error("El nombre es obligatorio para persona natural.");
        return;
      }
      if (numeroDocumento.trim()) {
        if (tipoDocumento === "DNI" && !/^[0-9]{8}$/.test(numeroDocumento.trim())) {
          toast.error("El DNI debe tener exactamente 8 dígitos numéricos.");
          return;
        }
      }
    } else {
      if (!razonSocial.trim()) {
        toast.error("Razón Social es obligatoria para empresa.");
        return;
      }
      if (!/^(10|20)[0-9]{9}$/.test(numeroDocumento.trim())) {
        toast.error("El RUC debe tener 11 dígitos y comenzar con 10 o 20.");
        return;
      }
    }

    const cleanPhone = telefonoPrincipal.trim().replace(/[^0-9]/g, "");
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      toast.error("El teléfono principal debe tener exactamente 9 dígitos (ej. 987654321).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipoPersona,
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim() ? numeroDocumento.trim() : null,
        nombres: tipoPersona === "NATURAL" ? nombres.trim() : null,
        apellidos: tipoPersona === "NATURAL" && apellidos.trim() ? apellidos.trim() : null,
        razonSocial: tipoPersona === "EMPRESA" ? razonSocial.trim() : null,
        telefonoPrincipal: cleanPhone,
        telefonoSecundario: telefonoSecundario.trim() ? telefonoSecundario.trim() : null,
        email: email.trim() ? email.trim() : null,
        empresaId: tipoPersona === "NATURAL" && empresaId ? Number(empresaId) : null,
        referencia: referencia.trim() ? referencia.trim() : null,
        direcciones: direcciones.map((d) => ({
          nombreUbicacion: d.nombreUbicacion || "Principal",
          codigoUbigeo: d.codigoUbigeo || "150101",
          direccionCompleta: d.direccionCompleta || "",
          referencia: d.referencia || "",
          latitud: d.latitud,
          longitud: d.longitud,
        })),
      };

      if (editId) {
        await api.put(`/api/contacts/${editId}`, payload);
        toast.success("Contacto actualizado con éxito.");
      } else {
        await api.post("/api/contacts", payload);
        toast.success("Contacto registrado con éxito.");
      }

      router.push("/contactos");
    } catch (err: any) {
      console.error("Error saving contact:", err);
      let msg = "Error al guardar el contacto.";
      const data = err.response?.data;
      if (typeof data === "string") {
        msg = data;
      } else if (Array.isArray(data)) {
        msg = data.filter((m) => typeof m === "string").join(", ");
      } else if (typeof data?.message === "string") {
        msg = data.message;
      } else if (typeof data?.error === "string") {
        msg = data.error;
      } else if (Array.isArray(data?.errors)) {
        msg = data.errors.join(", ");
      }
      toast.error(msg || "Error al guardar el contacto.");
    } finally {
      setSaving(false);
    }
  };

  // Add Chatter Entry
  const handlePostChatter = () => {
    if (!composerText.trim()) return;
    const newEntry: ChatterEntry = {
      id: String(Date.now()),
      author: "Operador",
      date: "Hoy " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: composerText.trim(),
      type: activeComposer === "message" ? "message" : activeComposer === "note" ? "note" : "activity",
    };
    setChatterEntries([newEntry, ...chatterEntries]);
    setComposerText("");
    setActiveComposer("none");
    toast.success("Nota / actividad registrada en el historial.");
  };

  // Preview display name
  const displayNamePreview = useMemo(() => {
    if (tipoPersona === "EMPRESA") {
      return razonSocial.trim() || "Nombre de la Empresa";
    }
    const full = `${nombres.trim()} ${apellidos.trim()}`.trim();
    return full || "Nombre del Contacto";
  }, [tipoPersona, nombres, apellidos, razonSocial]);

  // Initials for avatar
  const avatarInitials = useMemo(() => {
    if (tipoPersona === "EMPRESA") {
      const parts = (razonSocial.trim() || "E").split(" ");
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }
    const n = nombres.trim() || "N";
    const a = apellidos.trim() || "C";
    return `${n[0]}${a[0]}`.toUpperCase();
  }, [tipoPersona, nombres, apellidos, razonSocial]);

  if (loading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="size-7 animate-spin text-primary" />
        <p className="font-medium text-xs">Cargando formulario de contacto...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 w-full max-w-full min-w-0 pb-10">
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR COMPACTA (HEADER ESTILO ODOO) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-card border rounded-lg px-4 py-2.5 shadow-2xs">
        {/* Izquierda: Retroceso y Breadcrumb */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-md hover:bg-muted shrink-0">
            <Link href="/contactos">
              <ArrowLeft className="size-4 text-muted-foreground" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 font-medium text-muted-foreground text-xs sm:text-sm">
            <Link href="/contactos" className="hover:text-foreground transition-colors">
              Contactos
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-semibold">
              {editId ? `Contacto #${editId}` : "Nuevo Registro"}
            </span>
          </div>
        </div>

        {/* Derecha: Botones Cancelar y Guardar */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs sm:text-sm font-medium px-3 text-muted-foreground hover:text-foreground"
          >
            <Link href="/contactos">Cancelar</Link>
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 gap-1.5 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={saving || (docDuplicateError?.exists ?? false)}
            title={docDuplicateError?.exists ? "El número de documento ya está registrado" : undefined}
          >
            {saving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar Contacto"}
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LAYOUT PRINCIPAL (FORM SHEET ~75% + CHATTER ~25%) */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* ======================================================================= */}
        {/* ZONA IZQUIERDA: HOJA DE FORMULARIO ("ODOO FORM SHEET") ~75% */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 bg-card border rounded-lg shadow-xs p-4 sm:p-5 flex flex-col gap-4">
          {/* --------------------------------------------------------------------- */}
          {/* CABECERA COMPACTA (Avatar + Título + Selector Pill) */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 pb-3.5 border-b">
            {/* Avatar Placeholder */}
            <div
              className={`size-14 sm:size-16 rounded-lg flex flex-col items-center justify-center font-bold text-base border border-dashed shrink-0 shadow-2xs ${
                tipoPersona === "EMPRESA"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {avatarInitials || (tipoPersona === "EMPRESA" ? <Building className="size-6" /> : <User className="size-6" />)}
            </div>

            {/* Nombre y Tipo Pill */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {displayNamePreview}
                </h2>
                {starred && <Star className="size-4 fill-amber-400 text-amber-500 shrink-0" />}
                {aiActive && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1.5 font-medium">
                    <Bot className="size-3" /> Bot Activo
                  </Badge>
                )}
              </div>

              {/* Selector de Contribuyente Pill */}
              <div className="inline-flex items-center rounded-md border bg-muted/30 p-0.5 w-fit gap-1 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => handleTipoPersonaChange("NATURAL")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs sm:text-sm transition-all ${
                    tipoPersona === "NATURAL"
                      ? "bg-card text-emerald-600 font-semibold shadow-2xs border border-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="size-3.5" />
                  <span>Persona Natural</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoPersonaChange("EMPRESA")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs sm:text-sm transition-all ${
                    tipoPersona === "EMPRESA"
                      ? "bg-card text-blue-600 font-semibold shadow-2xs border border-blue-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building className="size-3.5" />
                  <span>Empresa (RUC)</span>
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* BLOQUE SUPERIOR EN 2 COLUMNAS COMPACTAS */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            {/* Columna Izquierda: Identidad Fiscal */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <User className="size-3.5 text-emerald-600" />
                Identificación & Fiscal
              </span>

              {/* Tipo Doc y Número Doc */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                  <select
                    className="w-full h-8 px-2 rounded-md border bg-background text-xs sm:text-sm font-medium"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                  >
                    {tipoPersona === "NATURAL" ? (
                      <>
                        <option value="DNI">DNI</option>
                        <option value="CE">C.E.</option>
                      </>
                    ) : (
                      <option value="RUC">RUC</option>
                    )}
                  </select>
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      Número Documento {tipoPersona === "EMPRESA" ? <span className="text-destructive">*</span> : <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>}
                      {docChecking && (
                        <span className="text-[10px] text-muted-foreground italic flex items-center gap-1 font-normal">
                          <RefreshCw className="size-2.5 animate-spin" /> Verificando...
                        </span>
                      )}
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {numeroDocumento.length}/{tipoDocumento === "RUC" ? "11" : "8"}
                    </span>
                  </div>
                  <Input
                    placeholder={tipoPersona === "EMPRESA" ? "Ej: 20603844590" : "Ej: 72345678 (Opcional)"}
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    className={`h-8 text-xs sm:text-sm font-mono transition-colors ${
                      docDuplicateError?.exists
                        ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5 text-destructive font-semibold"
                        : ""
                    }`}
                    required={tipoPersona === "EMPRESA"}
                  />

                  {/* Alerta de Documento Duplicado */}
                  {docDuplicateError?.exists && (
                    <div className="p-2 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-1.5 mt-0.5 animate-in fade-in-50">
                      <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-destructive" />
                      <div className="flex-1">
                        <span className="font-medium">
                          Este {tipoDocumento} ya está registrado a nombre de:{" "}
                          <strong>{docDuplicateError.nombre}</strong> (ID #{docDuplicateError.id}).
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <Link
                            href={`/contactos/view?id=${docDuplicateError.id}`}
                            target="_blank"
                            className="text-xs font-semibold underline hover:opacity-80 inline-flex items-center gap-1 text-destructive"
                          >
                            Ver ficha de este contacto
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nombres / Apellidos o Razón Social */}
              {tipoPersona === "NATURAL" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Nombres <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Ej: Carlos Andrés"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      className="h-8 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Apellidos <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ej: Quispe Mamani (Opcional)"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      className="h-8 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Razón Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ej: Inversiones Los Álamos S.A.C."
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="h-8 text-xs sm:text-sm"
                    required
                  />
                </div>
              )}

              {/* Empresa Vinculada */}
              {tipoPersona === "NATURAL" && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Building className="size-3.5 text-muted-foreground" />
                    Vincular a Empresa
                  </Label>
                  <select
                    className="w-full h-8 px-2 rounded-md border bg-background text-xs sm:text-sm"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                  >
                    <option value="">-- Sin Empresa (Particular) --</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={String(emp.id)}>
                        {emp.razonSocial || emp.nombreDisplay} ({emp.numeroDocumento})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Columna Derecha: Contacto Directo */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <Phone className="size-3.5 text-emerald-600" />
                Contacto Directo
              </span>

              {/* Teléfono WhatsApp */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    Teléfono WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  {telefonoPrincipal.length === 9 && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> 9 dígitos
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-8 px-2 bg-muted text-muted-foreground border rounded-md flex items-center text-xs font-mono font-medium">
                    +51
                  </span>
                  <Input
                    placeholder="987654321"
                    value={telefonoPrincipal}
                    onChange={(e) => setTelefonoPrincipal(e.target.value)}
                    className="h-8 text-xs sm:text-sm font-mono flex-1"
                    maxLength={9}
                    required
                  />
                  {telefonoPrincipal.length === 9 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 gap-1 shrink-0 font-medium"
                      onClick={() => window.open(`https://wa.me/51${telefonoPrincipal}`, "_blank")}
                    >
                      <MessageSquare className="size-3" />
                      Probar
                    </Button>
                  )}
                </div>
              </div>

              {/* Teléfono Alternativo */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">Teléfono Alternativo / Fijo</Label>
                <Input
                  placeholder="Opcional: 9 dígitos o fijo"
                  value={telefonoSecundario}
                  onChange={(e) => setTelefonoSecundario(e.target.value)}
                  className="h-8 text-xs sm:text-sm font-mono"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  Correo Electrónico
                </Label>
                <Input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* BLOQUE INFERIOR CON PESTAÑAS (NOTEBOOK ESTILO ODOO) */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex flex-col border-t pt-2">
            {/* Tabs Navigation Bar */}
            <div className="flex items-center gap-5 border-b text-xs sm:text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("direcciones")}
                className={`pb-2.5 pt-0.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "direcciones"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="size-3.5 sm:size-4" />
                <span>Direcciones</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                  {direcciones.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bot_ia")}
                className={`pb-2.5 pt-0.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "bot_ia"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="size-3.5 sm:size-4" />
                <span>Bot</span>
                {aiActive && <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notas")}
                className={`pb-2.5 pt-0.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "notas"
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-3.5 sm:size-4" />
                <span>Notas</span>
              </button>
            </div>

            {/* =================================================================== */}
            {/* PESTAÑA 1: DIRECCIONES CON UBIGEO DE PERÚ Y MAPA AL COSTADO */}
            {/* =================================================================== */}
            {activeTab === "direcciones" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 pt-3 items-start text-xs sm:text-sm">
                {/* Zona Izquierda del Tab: Formulario de Direcciones (7/12) */}
                <div className="xl:col-span-7 flex flex-col gap-2.5">
                  {/* Selector de sedes / ubicaciones registradas */}
                  <div className="flex items-center justify-between gap-2 bg-muted/25 p-2 rounded-md border">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {direcciones.map((dir, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveDirIndex(idx)}
                          className={`px-2.5 py-1 rounded text-xs sm:text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                            activeDirIndex === idx
                              ? "bg-card text-emerald-600 font-semibold border border-emerald-500/30 shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span>{dir.nombreUbicacion || `Sede ${idx + 1}`}</span>
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-3 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs hover:shadow-sm shrink-0 transition-all cursor-pointer"
                      onClick={handleAddDireccion}
                    >
                      <Plus className="size-3.5" />
                      Agregar Sede
                    </Button>
                  </div>

                  {/* Formulario de la Dirección Activa */}
                  <div className="p-3 bg-muted/15 border rounded-lg flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b">
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-xs font-medium text-muted-foreground">Etiqueta Sede:</Label>
                        <Input
                          placeholder="Ej: Sede Ate, Almacén Central"
                          value={activeDir.nombreUbicacion}
                          onChange={(e) => handleUpdateDireccion(activeDirIndex, "nombreUbicacion", e.target.value)}
                          className="h-8 text-xs sm:text-sm font-semibold max-w-[200px]"
                        />
                      </div>

                      {direcciones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => handleRemoveDireccion(activeDirIndex)}
                        >
                          <Trash2 className="size-3.5" />
                          Eliminar
                        </Button>
                      )}
                    </div>

                    {/* Cascada de Ubigeo de Perú: Departamento, Provincia, Distrito */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Departamento */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium text-muted-foreground">Departamento</Label>
                        <select
                          className="w-full h-8 px-2 rounded-md border bg-background text-xs sm:text-sm"
                          value={activeDir.departamento || "LIMA"}
                          onChange={(e) => handleDepartamentoChange(activeDirIndex, e.target.value)}
                        >
                          {departamentosList.map((dep) => (
                            <option key={dep} value={dep}>
                              {dep}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Provincia */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium text-muted-foreground">Provincia / Ciudad</Label>
                        <select
                          className="w-full h-8 px-2 rounded-md border bg-background text-xs sm:text-sm"
                          value={activeDir.provincia || "LIMA"}
                          onChange={(e) => handleProvinciaChange(activeDirIndex, e.target.value)}
                        >
                          {getProvinciasForDep(activeDir.departamento || "LIMA").map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Distrito (Ubigeo) */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium text-muted-foreground">Distrito (Perú)</Label>
                        <select
                          className="w-full h-8 px-2 rounded-md border bg-background text-xs sm:text-sm"
                          value={activeDir.codigoUbigeo}
                          onChange={(e) => handleDistritoChange(activeDirIndex, e.target.value)}
                        >
                          {getDistritosForProv(activeDir.departamento || "LIMA", activeDir.provincia || "LIMA").map((u) => (
                            <option key={u.codigoUbigeo} value={u.codigoUbigeo}>
                              {u.distrito}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dirección Exacta con Botón Buscar en Mapa */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>
                          Dirección exacta de despacho <span className="text-destructive">*</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground italic">
                          (Presiona Enter o clic en Buscar)
                        </span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Ej: Av. Industrial 499, San Isidro / Ate"
                          value={activeDir.direccionCompleta}
                          onChange={(e) => handleUpdateDireccion(activeDirIndex, "direccionCompleta", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchAddress(activeDirIndex);
                            }
                          }}
                          className="h-8 text-xs sm:text-sm flex-1"
                          required
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0 shadow-xs"
                          onClick={() => handleSearchAddress(activeDirIndex)}
                          disabled={activeDir.isSearchingAddress}
                        >
                          {activeDir.isSearchingAddress ? (
                            <RefreshCw className="size-3.5 animate-spin" />
                          ) : (
                            <Search className="size-3.5" />
                          )}
                          Buscar en Mapa
                        </Button>
                      </div>
                    </div>

                    {/* Referencia de Entrega */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium text-muted-foreground">Referencia de llegada</Label>
                      <Input
                        placeholder="Ej: Frente al mercado central, portón blanco, timbre 2B"
                        value={activeDir.referencia}
                        onChange={(e) => handleUpdateDireccion(activeDirIndex, "referencia", e.target.value)}
                        className="h-8 text-xs sm:text-sm"
                      />
                    </div>

                    {/* Extractor de link Google Maps */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t">
                      <Input
                        placeholder="Pegar enlace de Google Maps para extraer GPS..."
                        value={activeDir.mapsUrlInput || ""}
                        onChange={(e) => handleUpdateDireccion(activeDirIndex, "mapsUrlInput", e.target.value)}
                        className="h-7 text-xs flex-1 font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 shrink-0 gap-1 text-emerald-600"
                        onClick={() => handleResolveMaps(activeDirIndex)}
                        disabled={activeDir.isResolvingMaps}
                      >
                        <Navigation className="size-3" />
                        {activeDir.isResolvingMaps ? "..." : "Detectar GPS"}
                      </Button>
                    </div>

                    {/* Coordenadas GPS */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Latitud:</span>
                        <Input
                          type="number"
                          step="0.000001"
                          value={activeDir.latitud ?? ""}
                          onChange={(e) => handleUpdateDireccion(activeDirIndex, "latitud", parseFloat(e.target.value) || null)}
                          placeholder="-12.0463"
                          className="h-7 text-xs font-mono px-2"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Longitud:</span>
                        <Input
                          type="number"
                          step="0.000001"
                          value={activeDir.longitud ?? ""}
                          onChange={(e) => handleUpdateDireccion(activeDirIndex, "longitud", parseFloat(e.target.value) || null)}
                          placeholder="-77.0427"
                          className="h-7 text-xs font-mono px-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zona Derecha del Tab: MAPA VISUAL AL COSTADO (5/12) */}
                <div className="xl:col-span-5 flex flex-col gap-1.5 border rounded-lg bg-card p-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <div className="flex items-center gap-1.5">
                      <MapIcon className="size-3.5 text-emerald-600" />
                      <span className="font-semibold text-xs sm:text-sm text-foreground">
                        Mapa: {activeDir.nombreUbicacion}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Recargar vista de mapa"
                        onClick={() => handleSearchAddress(activeDirIndex)}
                      >
                        <RefreshCw className={`size-3 ${activeDir.isSearchingAddress ? "animate-spin text-emerald-600" : ""}`} />
                      </Button>

                      {activeDir.latitud && activeDir.longitud && (
                        <a
                          href={`https://www.google.com/maps?q=${activeDir.latitud},${activeDir.longitud}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Maps
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Interactive Map Iframe Container */}
                  <div className="relative w-full h-[270px] rounded-md overflow-hidden border bg-muted/30">
                    <iframe
                      title={`Mapa ${activeDir.nombreUbicacion}`}
                      src={mapEmbedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                      allowFullScreen
                    />
                    {activeDir.isSearchingAddress && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                        <RefreshCw className="size-4 animate-spin" />
                        Buscando dirección en el mapa...
                      </div>
                    )}
                  </div>

                  {/* Map Footer Bar with Current Location Status */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="truncate max-w-[200px]">
                      📍 {activeDir.distrito || "Distrito"}, {activeDir.provincia || "Provincia"}
                    </span>
                    <span className="font-mono text-emerald-600 font-medium">
                      Ubigeo: {activeDir.codigoUbigeo}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* PESTAÑA 2: BOT IA & PREFERENCIAS */}
            {/* =================================================================== */}
            {activeTab === "bot_ia" && (
              <div className="flex flex-col gap-3 pt-3 text-xs sm:text-sm max-w-lg">
                {/* AI Bot Toggle Card */}
                <div className="p-3.5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/25 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-md bg-indigo-600/15 text-indigo-600 flex items-center justify-center">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs sm:text-sm text-foreground block">
                          Auto-Respuesta Bot IA (Gemini WhatsApp Assistant)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Cotización y registro automático de pedidos
                        </span>
                      </div>
                    </div>

                    <Switch checked={aiActive} onCheckedChange={setAiActive} />
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1.5 border-t border-indigo-500/15">
                    {aiActive ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
                        <Sparkles className="size-3.5 shrink-0" />
                        El bot está ACTIVO. Responderá preguntas de stock y pedidos en WhatsApp.
                      </span>
                    ) : (
                      "El bot está PAUSADO para este contacto. Atención manual por los operadores."
                    )}
                  </p>
                </div>

                {/* Starred / VIP Toggle Card */}
                <div className="p-3.5 bg-card border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center">
                      <Star className={`size-4 ${starred ? "fill-amber-400 text-amber-500" : ""}`} />
                    </div>
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-foreground block">
                        Contacto Favorito / VIP
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Prioridad comercial en el CRM
                      </span>
                    </div>
                  </div>

                  <Switch checked={starred} onCheckedChange={setStarred} />
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* PESTAÑA 3: NOTAS INTERNAS */}
            {/* =================================================================== */}
            {activeTab === "notas" && (
              <div className="flex flex-col gap-2 pt-3 text-xs sm:text-sm">
                <Label className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-muted-foreground" />
                  Notas y Observaciones Internas
                </Label>
                <Textarea
                  placeholder="Escribe acuerdos comerciales, condiciones de crédito, indicaciones de horario de descarga para choferes..."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  rows={5}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* ZONA DERECHA: CHATTER LATERAL COMPACTO (~25%) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-2.5">
          <Card className="bg-card border rounded-lg shadow-2xs overflow-hidden flex flex-col">
            {/* Chatter Action Buttons */}
            <div className="p-1.5 border-b bg-muted/30 flex items-center justify-between gap-1">
              <Button
                type="button"
                variant={activeComposer === "message" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2 gap-1 flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveComposer(activeComposer === "message" ? "none" : "message")}
              >
                <Send className="size-3 text-emerald-600" />
                Mensaje
              </Button>

              <Button
                type="button"
                variant={activeComposer === "note" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2 gap-1 flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveComposer(activeComposer === "note" ? "none" : "note")}
              >
                <FileText className="size-3 text-blue-600" />
                Nota
              </Button>

              <Button
                type="button"
                variant={activeComposer === "activity" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2 gap-1 flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveComposer(activeComposer === "activity" ? "none" : "activity")}
              >
                <Clock className="size-3 text-amber-500" />
                Actividad
              </Button>
            </div>

            {/* Quick Composer Box */}
            {activeComposer !== "none" && (
              <div className="p-2.5 bg-muted/20 border-b flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>
                    {activeComposer === "message"
                      ? "Mensaje WhatsApp"
                      : activeComposer === "note"
                      ? "Nota Interna"
                      : "Recordatorio"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveComposer("none")}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    ×
                  </button>
                </div>

                <Textarea
                  placeholder="Escribe el texto..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  rows={2}
                  className="text-xs sm:text-sm resize-none bg-background p-2"
                />

                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => {
                      setComposerText("");
                      setActiveComposer("none");
                    }}
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handlePostChatter}
                  >
                    Registrar
                  </Button>
                </div>
              </div>
            )}

            {/* Timeline Header with "Hoy" Separator */}
            <div className="p-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-px bg-border flex-1" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Hoy
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Timeline Feed */}
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-0.5">
                {chatterEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <div
                      className={`size-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                        entry.type === "message"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : entry.type === "note"
                          ? "bg-blue-500/15 text-blue-600"
                          : entry.type === "activity"
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {entry.type === "message" ? (
                        <Send className="size-3" />
                      ) : entry.type === "note" ? (
                        <FileText className="size-3" />
                      ) : entry.type === "activity" ? (
                        <Clock className="size-3" />
                      ) : (
                        <Info className="size-3" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 bg-muted/20 p-2 rounded-md border">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground text-xs truncate">
                          {entry.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {entry.date}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}

export default function CreateContactPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-7 animate-spin text-primary" />
          <p className="font-medium text-xs">Cargando formulario...</p>
        </div>
      }
    >
      <CreateContactContent />
    </Suspense>
  );
}
