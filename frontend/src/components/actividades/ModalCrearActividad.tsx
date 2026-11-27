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
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [personasEmpresa, setPersonasEmpresa] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingAux, setLoadingAux] = useState(false);

  // Form State
  const [tipo, setTipo] = useState("Llamada");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [fechaFinProgramada, setFechaFinProgramada] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [trabajadorId, setTrabajadorId] = useState("");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [contactoId, setContactoId] = useState<string>("");

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
      setContactoId(initialData?.contacto_id ? String(initialData.contacto_id) : "");

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

  const loadAuxData = async (initEmpId?: number | null) => {
    try {
      setLoadingAux(true);
      const [resEmpresas, resContacts, resStaff] = await Promise.allSettled([
        api.get("/api/contacts/empresas"),
        api.get("/api/contacts?limit=200"),
        api.get("/api/payroll/staff"),
      ]);

      if (resEmpresas.status === "fulfilled") {
        setEmpresas(resEmpresas.value.data || []);
      }
      if (resContacts.status === "fulfilled") {
        const cData = resContacts.value.data;
        setAllContacts(Array.isArray(cData) ? cData : cData?.content || cData?.contactos || []);
      }
      if (resStaff.status === "fulfilled") {
        const staff = resStaff.value.data || [];
        setStaffList(staff);
        if (staff.length > 0 && !trabajadorId) {
          setTrabajadorId(String(staff[0].id));
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

          {/* SELECTOR DE EMPRESA Y CONTACTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-lg">
            {/* 1. Empresa */}
            <div>
              <label className="font-semibold text-foreground mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building className="size-3.5 text-blue-600" />
                  Empresa (Corporativo)
                </span>
                {empresaId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaId("");
                      setContactoId("");
                    }}
                    className="text-[10px] text-muted-foreground hover:text-rose-600 underline"
                  >
                    Quitar Empresa
                  </button>
                )}
              </label>
              <select
                value={empresaId}
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  setContactoId(""); // Limpiar contacto para elegir de la empresa
                }}
                className="w-full h-9 bg-card border rounded-md px-2.5 text-xs font-medium"
              >
                <option value="">-- Sin Empresa (Persona Independiente) --</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    🏢 {emp.razonSocial || emp.nombreDisplay || `Empresa #${emp.id}`}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {empresaId ? "Asociado a la cuenta corporativa." : "Si no hay empresa, se asociará directamente al contacto."}
              </span>
            </div>

            {/* 2. Persona / Contacto */}
            <div>
              <label className="font-semibold text-foreground mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="size-3.5 text-emerald-600" />
                  Persona de Contacto
                </span>
                {contactoId && (
                  <button
                    type="button"
                    onClick={() => setContactoId("")}
                    className="text-[10px] text-muted-foreground hover:text-rose-600 underline"
                  >
                    Sin contacto
                  </button>
                )}
              </label>
              <select
                value={contactoId}
                onChange={(e) => setContactoId(e.target.value)}
                className="w-full h-9 bg-card border rounded-md px-2.5 text-xs font-medium"
              >
                <option value="">-- Seleccionar Contacto (Opcional) --</option>

                {/* Si hay personas registradas en la empresa seleccionada */}
                {empresaId && personasEmpresa.length > 0 && (
                  <optgroup label="Personas de esta Empresa">
                    {personasEmpresa.map((p) => (
                      <option key={p.id} value={p.id}>
                        👤 {p.nombreDisplay || `${p.nombres || ""} ${p.apellidos || ""}`.trim()} {p.cargo ? `(${p.cargo})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Contactos Generales */}
                <optgroup label={empresaId ? "Otros Contactos" : "Todos los Contactos"}>
                  {allContacts
                    .filter((c) => !empresaId || c.empresaId === Number(empresaId) || c.tipoPersona === "NATURAL")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tipoPersona === "EMPRESA" ? "🏢 " : "👤 "}
                        {c.razon_social || c.nombreDisplay || `${c.nombres || ""} ${c.apellidos || ""}`.trim() || `ID #${c.id}`}
                      </option>
                    ))}
                </optgroup>
              </select>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Persona física con quien se gestionará la actividad.
              </span>
            </div>
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
