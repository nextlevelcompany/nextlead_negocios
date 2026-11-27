"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Building,
  User,
  RefreshCw,
  Sparkles,
  Truck,
  Award,
  Clock,
  Phone,
  MessageSquare,
  Users,
  Search,
} from "lucide-react";

export interface ModalCrearActividadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: {
    empresa_id?: number | null;
    empresa_nombre?: string;
    contacto_id?: number | null;
    contacto_nombre?: string;
    oportunidad_id?: number | null;
    oportunidad_titulo?: string;
    pedido_id?: number | null;
    pedido_numero?: string;
    venta_id?: number | null;
    venta_numero?: string;
    asunto?: string;
    tipo?: string;
    descripcion?: string;
    fecha_programada?: string;
  };
}

// Cache global en memoria para acelerar la apertura del modal a 0ms
let cachedEmpresas: any[] | null = null;
let cachedStaff: any[] | null = null;
let cachedContacts: any[] | null = null;

// Función auxiliar para obtener fecha y hora local (YYYY-MM-DDTHH:mm) sin desfase UTC
export const getLocalIsoString = (d: Date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function ModalCrearActividad({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: ModalCrearActividadProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Catálogos auxiliares
  const [empresas, setEmpresas] = useState<any[]>(cachedEmpresas || []);
  const [personasEmpresa, setPersonasEmpresa] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>(cachedContacts || []);
  const [staffList, setStaffList] = useState<any[]>(cachedStaff || []);
  const [loadingAux, setLoadingAux] = useState(false);

  // Búsqueda rápida de cliente en vivo
  const [clientSearch, setClientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");

  // Form State
  const [tipo, setTipo] = useState("Llamada");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [fechaFinProgramada, setFechaFinProgramada] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [trabajadorId, setTrabajadorId] = useState("");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [empresaNombre, setEmpresaNombre] = useState<string>("");
  const [contactoId, setContactoId] = useState<string>("");
  const [contactoNombre, setContactoNombre] = useState<string>("");

  // Inicializar o resetear formulario al abrir
  useEffect(() => {
    if (open) {
      const nowLocal = getLocalIsoString();
      setTipo(initialData?.tipo || "Llamada");
      setAsunto(initialData?.asunto || "");
      setDescripcion(initialData?.descripcion || "");
      setFechaProgramada(initialData?.fecha_programada || nowLocal);
      setFechaFinProgramada("");
      setPrioridad("Media");
      setEmpresaId(initialData?.empresa_id ? String(initialData.empresa_id) : "");
      setEmpresaNombre(initialData?.empresa_nombre || "");
      setContactoId(initialData?.contacto_id ? String(initialData.contacto_id) : "");
      setContactoNombre(initialData?.contacto_nombre || "");
      setClientSearch("");
      setSearchResults([]);

      const initialName = initialData?.empresa_nombre
        ? `🏢 ${initialData.empresa_nombre}`
        : initialData?.contacto_nombre
        ? `👤 ${initialData.contacto_nombre}`
        : "";
      setSelectedClientName(initialName);

      loadAuxData(initialData?.empresa_id);
    }
  }, [open, initialData]);

  // Cargar personas si cambia la empresa
  useEffect(() => {
    if (empresaId) {
      loadPersonasDeEmpresa(Number(empresaId));
    } else {
      setPersonasEmpresa([]);
    }
  }, [empresaId]);

  // Búsqueda en vivo rápida con debounce
  useEffect(() => {
    const query = clientSearch.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearchingClient(false);
      return;
    }

    // 1. Filtrado instantáneo local (0ms)
    const qLower = query.toLowerCase();
    const localMatches: any[] = [];

    (cachedEmpresas || empresas).forEach((e) => {
      const name = (e.razonSocial || e.nombreDisplay || "").toLowerCase();
      const doc = (e.numeroDocumento || "").toLowerCase();
      if (name.includes(qLower) || doc.includes(qLower)) {
        localMatches.push({ ...e, tipoPersona: "EMPRESA" });
      }
    });

    (cachedContacts || allContacts).forEach((c) => {
      const name = `${c.nombres || ""} ${c.apellidos || ""} ${c.razon_social || c.nombreDisplay || ""}`.toLowerCase();
      const doc = (c.numero_documento || c.numeroDocumento || "").toLowerCase();
      if ((name.includes(qLower) || doc.includes(qLower)) && !localMatches.some((m) => m.id === c.id)) {
        localMatches.push(c);
      }
    });

    setSearchResults(localMatches.slice(0, 10));

    // 2. Búsqueda en servidor para encontrar cualquier contacto en BD (debounce 250ms)
    const timer = setTimeout(async () => {
      try {
        setIsSearchingClient(true);
        const res = await api.get(`/api/contacts?search=${encodeURIComponent(query)}&size=15`);
        const serverData = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        
        // Unir evitando duplicados
        const combined = [...localMatches];
        serverData.forEach((sItem: any) => {
          if (!combined.some((m) => m.id === sItem.id)) {
            combined.push(sItem);
          }
        });
        setSearchResults(combined.slice(0, 15));
      } catch (err) {
        // En caso de error de red, mantener los locales
      } finally {
        setIsSearchingClient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [clientSearch]);

  const loadAuxData = async (initEmpId?: number | null) => {
    try {
      if (!cachedEmpresas || !cachedStaff) {
        setLoadingAux(true);
        const [resEmpresas, resContacts, resStaff] = await Promise.allSettled([
          api.get("/api/contacts/empresas"),
          api.get("/api/contacts?size=100"),
          api.get("/api/payroll/staff"),
        ]);

        if (resEmpresas.status === "fulfilled") {
          const empData = resEmpresas.value.data || [];
          cachedEmpresas = empData;
          setEmpresas(empData);
        }
        if (resContacts.status === "fulfilled") {
          const cData = resContacts.value.data;
          const list = Array.isArray(cData) ? cData : cData?.content || cData?.contactos || [];
          cachedContacts = list;
          setAllContacts(list);
        }
        if (resStaff.status === "fulfilled") {
          const staff = resStaff.value.data || [];
          cachedStaff = staff;
          setStaffList(staff);
          if (staff.length > 0 && !trabajadorId) {
            setTrabajadorId(String(staff[0].id));
          }
        }
      } else {
        setEmpresas(cachedEmpresas);
        setStaffList(cachedStaff);
        if (cachedContacts) setAllContacts(cachedContacts);
        if (cachedStaff.length > 0 && !trabajadorId) {
          setTrabajadorId(String(cachedStaff[0].id));
        }
      }

      if (initEmpId) {
        await loadPersonasDeEmpresa(initEmpId);
      }
    } catch (err) {
      console.error("Error al cargar datos auxiliares:", err);
    } finally {
      setLoadingAux(false);
    }
  };

  const loadPersonasDeEmpresa = async (idEmp: number) => {
    try {
      const res = await api.get(`/api/contacts/${idEmp}/personas`);
      setPersonasEmpresa(res.data || []);
    } catch {
      setPersonasEmpresa([]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim()) {
      toast.error("Por favor ingrese el asunto o título de la actividad.");
      return;
    }
    if (!fechaProgramada) {
      toast.error("Seleccione la fecha y hora programada.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        tipo,
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
        fecha_programada: fechaProgramada,
        fecha_fin_programada: fechaFinProgramada || null,
        prioridad,
        trabajador_id: trabajadorId ? Number(trabajadorId) : null,
        empresa_id: empresaId ? Number(empresaId) : null,
        contacto_id: contactoId ? Number(contactoId) : null,
        oportunidad_id: initialData?.oportunidad_id || null,
        pedido_id: initialData?.pedido_id || null,
        venta_id: initialData?.venta_id || null,
      };

      await api.post("/api/actividades", payload);
      toast.success("Actividad programada y visible en el planificador.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error al guardar actividad:", err);
      toast.error(err.response?.data?.message || "No se pudo programar la actividad.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
            <CalendarCheck className="size-5" />
            <span>Programar Nueva Actividad</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Planifica una gestión (llamada, reunión, visita, cobro) vinculada a tu empresa, contacto o módulo comercial.
          </DialogDescription>
        </DialogHeader>

        {/* Badges de contexto si viene desde una Oportunidad, Pedido o Venta */}
        {(initialData?.oportunidad_id || initialData?.pedido_id || initialData?.venta_id || initialData?.empresa_id) && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/40 rounded-lg border text-xs">
            <span className="text-muted-foreground font-semibold text-[11px]">Vinculado a:</span>
            {initialData.empresa_id && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[11px]">
                <Building className="size-3" />
                <span>Empresa: {initialData.empresa_nombre || `#${initialData.empresa_id}`}</span>
              </Badge>
            )}
            {initialData.oportunidad_id && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 text-[11px]">
                <Sparkles className="size-3" />
                <span>Oportunidad: {initialData.oportunidad_titulo || `#${initialData.oportunidad_id}`}</span>
              </Badge>
            )}
            {initialData.pedido_id && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px]">
                <Truck className="size-3" />
                <span>Pedido: {initialData.pedido_numero || `#${initialData.pedido_id}`}</span>
              </Badge>
            )}
            {initialData.venta_id && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[11px]">
                <Award className="size-3" />
                <span>Venta: {initialData.venta_numero || `#${initialData.venta_id}`}</span>
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-3 py-1 text-xs">
          {/* Asunto */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Asunto / Título de la Gestión *
            </label>
            <Input
              required
              placeholder="Ej: Llamada de cierre, Visita de relevamiento, Entrega de contrato..."
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Tipo & Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Tipo de Actividad
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-9 bg-card border rounded-md px-2.5 font-medium text-xs"
              >
                <option value="Llamada">📞 Llamada Telefónica</option>
                <option value="WhatsApp">💬 Mensaje / Chat WhatsApp</option>
                <option value="Reunión Presencial">🟣 Reunión Presencial</option>
                <option value="Videollamada">💻 Videollamada (Zoom/Meet)</option>
                <option value="Visita Técnica">🛠️ Visita Técnica / Medición</option>
                <option value="Despacho">🚚 Despacho / Entrega</option>
                <option value="Cobranza">💰 Gestión de Cobranza</option>
                <option value="Envío de Cotización">📄 Envío de Cotización</option>
                <option value="Tarea Interna">📌 Tarea Interna de Oficina</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full h-9 bg-card border rounded-md px-2.5 font-medium text-xs"
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* SELECTOR Y VINCULACIÓN DE CLIENTE / EMPRESA */}
          <div className="p-3 bg-muted/20 border rounded-lg space-y-2.5">
            {/* CASO A: YA HAY UN CLIENTE O EMPRESA SELECCIONADO */}
            {(empresaId || contactoId || empresaNombre || contactoNombre || selectedClientName) ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    Cliente / Empresa Vinculada
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaId("");
                      setEmpresaNombre("");
                      setContactoId("");
                      setContactoNombre("");
                      setSelectedClientName("");
                      setPersonasEmpresa([]);
                      setClientSearch("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-rose-600 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    ✕ Cambiar Cliente
                  </button>
                </div>

                {/* Tarjeta Visual Destacada de la Entidad */}
                <div className="p-2.5 bg-background border border-primary/30 rounded-md flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl shrink-0">{empresaId || empresaNombre ? "🏢" : "👤"}</span>
                    <div className="truncate">
                      <div className="font-bold text-xs text-foreground truncate">
                        {empresaNombre || contactoNombre || selectedClientName || `Entidad #${empresaId || contactoId}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {empresaId && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-200">
                            🏢 Cuenta Empresa #{empresaId}
                          </Badge>
                        )}
                        {contactoId && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                            👤 Contacto #{contactoId}
                          </Badge>
                        )}
                        {!empresaId && !contactoId && (
                          <span className="text-[10px] text-muted-foreground">Vinculado a esta gestión</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0.5 shrink-0">
                    ✓ Vinculado
                  </Badge>
                </div>

                {/* Si es una Empresa con personas de contacto registradas, permitir seleccionar la persona específica */}
                {empresaId && personasEmpresa.length > 0 && (
                  <div className="pt-1.5 border-t border-border/40">
                    <label className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                      <User className="size-3 text-emerald-600" />
                      Persona de Contacto en esta Empresa (Opcional):
                    </label>
                    <select
                      value={contactoId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactoId(val);
                        const found = personasEmpresa.find((p) => String(p.id) === val);
                        if (found) {
                          setContactoNombre(found.nombreDisplay || `${found.nombres || ""} ${found.apellidos || ""}`.trim());
                        }
                      }}
                      className="w-full h-8 bg-card border rounded-md px-2 text-xs font-medium"
                    >
                      <option value="">-- Toda la Empresa / Contacto General --</option>
                      {personasEmpresa.map((p) => (
                        <option key={p.id} value={p.id}>
                          👤 {p.nombreDisplay || `${p.nombres || ""} ${p.apellidos || ""}`.trim()} {p.cargo ? `(${p.cargo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* CASO B: NO HAY CLIENTE SELECCIONADO -> MOSTRAR BUSCADOR Y DROPDOWNS */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    Buscar y Vincular Cliente / Empresa
                  </label>
                </div>

                {/* BARRA DE BÚSQUEDA RÁPIDA EN VIVO */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="size-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="🔍 Escribe para buscar cliente por nombre, empresa o RUC/DNI..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-8 pl-8 pr-8 text-xs bg-background"
                    />
                    {isSearchingClient && (
                      <RefreshCw className="size-3 animate-spin absolute right-2.5 text-muted-foreground" />
                    )}
                    {clientSearch && !isSearchingClient && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch("");
                          setSearchResults([]);
                        }}
                        className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* RESULTADOS DE BÚSQUEDA EN TIEMPO REAL */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-popover border border-border rounded-md shadow-lg p-1 text-xs divide-y divide-border/40">
                      {searchResults.map((item) => {
                        const isEmp = item.tipoPersona === "EMPRESA" || item.razonSocial || item.razon_social;
                        const name = item.razonSocial || item.razon_social || item.nombreDisplay || `${item.nombres || ""} ${item.apellidos || ""}`.trim();
                        const doc = item.numeroDocumento || item.numero_documento;

                        return (
                          <button
                            key={`${item.id}-${isEmp ? "emp" : "nat"}`}
                            type="button"
                            onClick={() => {
                              if (isEmp) {
                                setEmpresaId(String(item.id));
                                setEmpresaNombre(name);
                                setSelectedClientName(`🏢 ${name}`);
                                setContactoId("");
                                setContactoNombre("");
                                loadPersonasDeEmpresa(item.id);
                              } else {
                                setContactoId(String(item.id));
                                setContactoNombre(name);
                                setSelectedClientName(`👤 ${name}`);
                                if (item.empresaId || item.empresa_id) {
                                  setEmpresaId(String(item.empresaId || item.empresa_id));
                                  setEmpresaNombre(item.empresa_padre_nombre || "Empresa");
                                  loadPersonasDeEmpresa(item.empresaId || item.empresa_id);
                                } else {
                                  setEmpresaId("");
                                  setEmpresaNombre("");
                                }
                              }
                              setClientSearch("");
                              setSearchResults([]);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-muted/60 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-sm shrink-0">{isEmp ? "🏢" : "👤"}</span>
                              <div className="truncate">
                                <span className="font-semibold text-foreground truncate block">{name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {isEmp ? "Empresa" : "Persona Natural"} {doc ? `• Doc: ${doc}` : ""}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-primary font-medium shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">
                              Seleccionar
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* O Selección Manual desde Catálogo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground mb-0.5 flex items-center gap-1">
                      <Building className="size-3 text-blue-600" />
                      O seleccionar Empresa:
                    </label>
                    <select
                      value={empresaId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmpresaId(val);
                        setContactoId("");
                        const found = empresas.find((x) => String(x.id) === val);
                        if (found) {
                          setEmpresaNombre(found.razonSocial || found.nombreDisplay || "");
                        }
                      }}
                      className="w-full h-8 bg-card border rounded-md px-2 text-xs"
                    >
                      <option value="">-- Sin Empresa --</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          🏢 {emp.razonSocial || emp.nombreDisplay || `Empresa #${emp.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground mb-0.5 flex items-center gap-1">
                      <User className="size-3 text-emerald-600" />
                      O Contacto Particular:
                    </label>
                    <select
                      value={contactoId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactoId(val);
                        const found = allContacts.find((c) => String(c.id) === val);
                        if (found) {
                          setContactoNombre(found.nombreDisplay || `${found.nombres || ""} ${found.apellidos || ""}`.trim());
                        }
                      }}
                      className="w-full h-8 bg-card border rounded-md px-2 text-xs"
                    >
                      <option value="">-- Seleccionar Persona --</option>
                      {allContacts
                        .filter((c) => c.tipoPersona === "NATURAL")
                        .slice(0, 50)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            👤 {c.nombreDisplay || `${c.nombres || ""} ${c.apellidos || ""}`.trim() || `ID #${c.id}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fecha y Hora de Inicio / Fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
                <Clock className="size-3.5 text-amber-600" />
                Fecha y Hora Programada *
              </label>
              <Input
                type="datetime-local"
                required
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Hora de Fin Estimada (Opcional)
              </label>
              <Input
                type="datetime-local"
                value={fechaFinProgramada}
                onChange={(e) => setFechaFinProgramada(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          {/* Responsable Asignado */}
          <div>
            <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
              <Users className="size-3.5 text-primary" />
              Responsable / Asesor Asignado
            </label>
            <select
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
              className="w-full h-9 bg-card border rounded-md px-2.5 font-medium text-xs"
            >
              <option value="">-- Sin Asignar --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.apellido || ""} ({s.rol_operativo})
                </option>
              ))}
            </select>
          </div>

          {/* Descripción / Notas de preparación */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Descripción / Notas de Preparación
            </label>
            <textarea
              rows={2}
              placeholder="Notas, acuerdos previos o instrucciones para la gestión..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full text-xs bg-card border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5">
              {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              <span>Guardar Actividad</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
