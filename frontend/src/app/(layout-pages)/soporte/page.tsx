"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Headphones,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  LifeBuoy,
  ShieldCheck,
  Server,
  Database,
  Wifi,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  RefreshCw,
} from "lucide-react";

export default function SoportePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Formulario de Ticket
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCategoria, setFormCategoria] = useState("Ventas / CRM");
  const [formPrioridad, setFormPrioridad] = useState("Media");
  const [formAsunto, setFormAsunto] = useState("");
  const [formMensaje, setFormMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ticketEnviado, setTicketEnviado] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crm_active_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          setFormNombre(`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username);
          setFormEmail(u.username ? `${u.username}@nextlead.pe` : "");
        } catch {}
      }
    }
  }, []);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsunto.trim() || !formMensaje.trim()) {
      toast.warning("Por favor completa el asunto y detalle de tu requerimiento.");
      return;
    }

    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setTicketEnviado(true);
      toast.success("¡Ticket de soporte generado con éxito! El equipo de TI lo atenderá en breve.");
    }, 800);
  };

  const handleNuevoTicket = () => {
    setTicketEnviado(false);
    setFormAsunto("");
    setFormMensaje("");
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Headphones className="size-6 text-primary" />
            Centro de Soporte Técnico & Atención
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mesa de ayuda operativa, canales de asistencia inmediata y resolución de incidencias en NextLead CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
            <Link href="/docs">
              <BookOpen className="size-4" />
              Ver Documentación
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm"
          >
            <a
              href="https://wa.me/51987654321?text=Hola%20Soporte%20NextLead,%20necesito%20asistencia%20con%20el%20CRM."
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" />
              WhatsApp Soporte
            </a>
          </Button>
        </div>
      </div>

      {/* 2. Tarjetas de Canales de Contacto Directo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-11 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <MessageCircle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">WhatsApp Directo</p>
              <p className="text-sm font-bold text-foreground truncate">+51 987 654 321</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Respuesta en ~5 min</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-11 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Central Telefónica</p>
              <p className="text-sm font-bold text-foreground truncate">(01) 765-4321</p>
              <span className="text-[10px] text-muted-foreground">Lun - Sáb 8am a 8pm</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-11 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Correo de Soporte</p>
              <p className="text-sm font-bold text-foreground truncate">soporte@nextlead.pe</p>
              <span className="text-[10px] text-muted-foreground">Tickets & Requerimientos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-11 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Horario de Guardia</p>
              <p className="text-sm font-bold text-foreground truncate">24/7 Monitoreo</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Servidores Activos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Panel en Dos Columnas: Formulario de Ticket (Izq) & Estado y FAQ (Der) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* Formulario de Ticket */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Send className="size-5 text-primary" />
                Registrar Solicitud / Ticket de Ayuda
              </CardTitle>
              <CardDescription className="text-xs">
                Describe tu duda o requerimiento técnico. Te responderemos por WhatsApp o correo registrado.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {ticketEnviado ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-emerald-500/10 rounded-xl border border-emerald-300 dark:border-emerald-900">
                  <div className="size-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">¡Ticket de Soporte Registrado!</h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Hemos recibido tu solicitud <strong>#{Math.floor(100000 + Math.random() * 900000)}</strong>. Nuestro equipo de soporte técnico se pondrá en contacto contigo a la brevedad.
                  </p>
                  <Button onClick={handleNuevoTicket} size="sm" className="mt-2 text-xs">
                    Enviar otra solicitud
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t_nombre" className="text-xs font-semibold">Tu Nombre</Label>
                      <Input
                        id="t_nombre"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        placeholder="ej: Juan Carlos Razuri"
                        className="h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="t_email" className="text-xs font-semibold">Correo / WhatsApp de Contacto</Label>
                      <Input
                        id="t_email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="ej: jcarlos@empresa.com o 987654321"
                        className="h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="t_categoria" className="text-xs font-semibold">Módulo o Área Afectada</Label>
                      <select
                        id="t_categoria"
                        value={formCategoria}
                        onChange={(e) => setFormCategoria(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                      >
                        <option value="Ventas / CRM">Ventas, Embudo & Instalación</option>
                        <option value="Finanzas / Caja">Flujo de Caja, Pagos & Bancos</option>
                        <option value="Rentabilidad">Rentabilidad & Simulador sin IGV</option>
                        <option value="Nómina / Comisiones">Liquidación de Comisiones & Staff</option>
                        <option value="Usuarios / Permisos">Usuarios, Roles & Accesos</option>
                        <option value="WhatsApp / Conexión">Conexión de WhatsApp Business</option>
                        <option value="Otro">Otro requerimiento técnico</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="t_prioridad" className="text-xs font-semibold">Nivel de Urgencia</Label>
                      <select
                        id="t_prioridad"
                        value={formPrioridad}
                        onChange={(e) => setFormPrioridad(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                      >
                        <option value="Baja">Baja (Consulta general)</option>
                        <option value="Media">Media (Atención estándar)</option>
                        <option value="Alta">Alta (Dificulta la operación)</option>
                        <option value="Crítica">Crítica (Sistema o caja detenida)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t_asunto" className="text-xs font-semibold">
                      Asunto / Resumen <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="t_asunto"
                      value={formAsunto}
                      onChange={(e) => setFormAsunto(e.target.value)}
                      placeholder="ej: Error al intentar cerrar e instalar la venta #1042"
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t_mensaje" className="text-xs font-semibold">
                      Detalle del Problema o Solicitud <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="t_mensaje"
                      value={formMensaje}
                      onChange={(e) => setFormMensaje(e.target.value)}
                      placeholder="Indica qué estabas realizando, los datos de la venta o movimiento, y cualquier mensaje de error en pantalla..."
                      rows={4}
                      className="text-xs"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={enviando}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-5 shadow-sm"
                    >
                      {enviando ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Enviar Solicitud de Soporte
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Estado de los Servicios y FAQ */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Tarjeta de Estado del Sistema */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Server className="size-4 text-emerald-600" />
                  Estado Operativo de la Plataforma
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                  100% OPERATIVO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <Database className="size-3.5 text-primary" />
                  <span className="font-medium">Base de Datos PostgreSQL</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3" /> Conectado (Puerto 5433)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <Server className="size-3.5 text-primary" />
                  <span className="font-medium">Backend Spring Boot</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3" /> En línea (Puerto 8081)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <Wifi className="size-3.5 text-primary" />
                  <span className="font-medium">Servidor Next.js Frontend</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3" /> Activo (Puerto 3000)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-primary" />
                  <span className="font-medium">Webhook WhatsApp Cloud API</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3" /> Sincronizado
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Preguntas Frecuentes Rápidas */}
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HelpCircle className="size-4 text-primary" />
                Preguntas Frecuentes (FAQ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="faq-1" className="border rounded-lg px-3 py-1">
                  <AccordionTrigger className="text-xs font-semibold py-2 text-left">
                    ¿Cómo confirmo e instalo una venta?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Al arrastrar o mover una venta a la columna <strong>INSTALADA</strong>, se abre un cuadro de confirmación que calcula la venta y bloquea su edición para evitar duplicados. Si se requiere modificar, un usuario con permisos puede desbloquearla.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2" className="border rounded-lg px-3 py-1">
                  <AccordionTrigger className="text-xs font-semibold py-2 text-left">
                    ¿Por qué las ventas deben tener un vendedor asignado?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Cada venta debe estar vinculada a un colaborador de nómina/staff para calcular automáticamente su comisión en la <strong>Liquidación de Pagos</strong>, registrar el desempeño por equipo y aplicar los filtros comerciales.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3" className="border rounded-lg px-3 py-1">
                  <AccordionTrigger className="text-xs font-semibold py-2 text-left">
                    ¿Cómo funciona el cálculo sin IGV?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    El CRM descuenta automáticamente el 18% de IGV (dividiendo entre 1.18 el valor bruto) tanto en el simulador de rentabilidad como en el reporte de márgenes comerciales para mostrar la ganancia neta real del negocio.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4" className="border rounded-lg px-3 py-1">
                  <AccordionTrigger className="text-xs font-semibold py-2 text-left">
                    ¿Cómo restrinjo que un vendedor solo vea sus ventas?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    En <strong>/admin/users</strong> o <strong>/admin/roles</strong>, configura el usuario con rol <em>VENDEDOR</em> y ámbito de ventas en <em>Solo sus ventas</em>. El sistema ocultará las ventas de otros asesores y los módulos financieros.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
