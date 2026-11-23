"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  Printer,
  Headphones,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: any;
  summary: string;
  content: React.ReactNode;
}

export default function Documentation() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("ventas");

  const sections: DocSection[] = [
    {
      id: "ventas",
      title: "1. Ventas, Embudo & Instalaciones",
      category: "Comercial",
      icon: TrendingUp,
      summary: "Flujo del embudo de ventas, confirmación de venta instalada, bloqueo de seguridad y filtros comerciales.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            El módulo de <strong>Ventas & CRM</strong> permite gestionar todo el ciclo comercial de los leads generados por WhatsApp y llamadas hasta la entrega e instalación del servicio.
          </p>

          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Etapas del Embudo Comercial
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>NUEVO LEAD / PROSPECTO:</strong> Contacto inicial entrante que muestra interés en el producto o servicio.</li>
              <li><strong>DOCUMENTACIÓN:</strong> Recopilación de DNI, RUC, comprobante de pago preliminar o dirección del cliente.</li>
              <li><strong>EN INSTALACIÓN / RUTA:</strong> Pedido en tránsito o programado con el equipo técnico / conductor.</li>
              <li><strong>INSTALADA (Cierre Oficial):</strong> Al pasar una venta a esta columna, se solicita confirmación modal. Una vez confirmada, la venta se <strong>bloquea</strong> para proteger el registro, se suma formalmente al volumen de ventas y se habilita para la liquidación de comisiones.</li>
              <li><strong>ANULADA:</strong> Venta cancelada o rechazada. Queda bloqueada para evitar alteraciones contables.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
              <Users className="size-4 text-blue-600" />
              Filtros por Vendedor, Supervisor y Equipo
            </h4>
            <p>
              En la parte superior y en el panel lateral de filtros puedes segmentar las ventas por <strong>Supervisor</strong>, <strong>Vendedor / Asesor</strong> o <strong>Equipo de Ventas</strong> (ej: Call Center, Equipo Lima).
            </p>
          </div>

          <div className="p-3.5 rounded-lg border bg-amber-500/10 border-amber-300 dark:border-amber-900/50 space-y-1.5 text-amber-900 dark:text-amber-200">
            <h4 className="font-bold text-xs flex items-center gap-1.5">
              <Lock className="size-3.5 text-amber-600" />
              Regla de Negocio Crítica: Vendedor Asignado
            </h4>
            <p className="text-[11px]">
              Toda venta debe estar asociada a un personal de nómina para que el sistema pueda liquidar sus comisiones y reflejar el resultado en la rentabilidad.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "finanzas",
      title: "2. Finanzas, Caja & Bancos",
      category: "Finanzas",
      icon: DollarSign,
      summary: "Control de flujo de caja, arqueos bancarios (BCP, BBVA, Yape), panel lateral derecho y balance neto.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            El módulo de <strong>Flujo de Caja</strong> (/finanzas/cash-flow) registra en tiempo real todos los movimientos financieros de la empresa, tanto ingresos por ventas como egresos operativos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <h5 className="font-bold text-foreground text-xs">Cuentas y Medios Soportados</h5>
              <p className="text-[11px]">
                Banco BCP, BBVA Continental, Interbank, Yape, Plin y Efectivo en Caja Chica.
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <h5 className="font-bold text-foreground text-xs">Panel Lateral de Filtros (Lado Derecho)</h5>
              <p className="text-[11px]">
                Ubicado a la derecha con resumen financiero en vivo (Total Ingresos, Total Egresos, Flujo Neto) y rangos de fecha rápidos.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "rentabilidad",
      title: "3. Rentabilidad & Costos Sin IGV",
      category: "Finanzas",
      icon: BarChart3,
      summary: "Cálculo matemático de utilidades y márgenes netos descontando el 18% de IGV en ventas y costos.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            Todo el análisis de rentabilidad del CRM se calcula <strong>estrictamente sin IGV</strong> para reflejar la utilidad neta real de la operación comercial.
          </p>

          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground text-xs">Fórmula Oficial Aplicada</h4>
            <div className="p-2.5 rounded bg-background border font-mono text-xs text-foreground">
              Venta Neta = Monto Bruto / 1.18<br />
              Costo Unitario Neto = Costo Compra / 1.18<br />
              Margen Bruto = Venta Neta - Costo Mercadería - Comisión Personal
            </div>
          </div>

          <p>
            En el <strong>Simulador de Rentabilidad</strong> (/rentabilidad/simulador), puedes ajustar el precio de venta proyectado, el volumen de bidones y los costos directos para predecir el punto de equilibrio y la ganancia mensual estimada.
          </p>
        </div>
      ),
    },
    {
      id: "liquidaciones",
      title: "4. Nómina & Liquidación de Comisiones",
      category: "Personal",
      icon: CreditCard,
      summary: "Procesamiento de pagos a asesores y supervisores según ventas instaladas en el periodo.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            El módulo de <strong>Liquidaciones</strong> (/rentabilidad/liquidaciones) calcula de manera automatizada las comisiones generadas por cada vendedor y supervisor:
          </p>

          <ul className="list-disc pl-4 space-y-1.5">
            <li>Solo se liquidan ventas en estado <strong>INSTALADA</strong>.</li>
            <li>Si una venta se registró con comisión cero (0.00), el registro igualmente queda trazado en el cálculo para fines de auditoría.</li>
            <li>Al ejecutar el pago de una liquidación, se genera automáticamente un asiento de <strong>Egreso</strong> en el Flujo de Caja correspondiente a la cuenta bancaria de dispersión.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "usuarios",
      title: "5. Usuarios, Roles & Control de Accesos",
      category: "Seguridad",
      icon: ShieldCheck,
      summary: "Políticas de visibilidad: vendedor solo ve sus ventas, supervisor ve su equipo, y matriz de permisos por módulo.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            El sistema de seguridad de NextLead permite restringir la información según el cargo de cada colaborador:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-200 dark:border-emerald-950 space-y-1">
              <Badge className="bg-emerald-600 text-white font-bold text-[10px]">VENDEDOR</Badge>
              <p className="text-[11px] font-semibold text-foreground">Solo ve sus ventas</p>
              <p className="text-[10px] text-muted-foreground">
                No tiene acceso a rentabilidad, saldos bancarios de caja ni liquidaciones de otros asesores.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-200 dark:border-blue-950 space-y-1">
              <Badge className="bg-blue-600 text-white font-bold text-[10px]">SUPERVISOR</Badge>
              <p className="text-[11px] font-semibold text-foreground">Ventas de su equipo</p>
              <p className="text-[10px] text-muted-foreground">
                Permiso para validar y cerrar ventas a instaladas y revisar liquidaciones de su grupo comercial.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-purple-500/5 border-purple-200 dark:border-purple-950 space-y-1">
              <Badge className="bg-purple-600 text-white font-bold text-[10px]">ADMINISTRADOR</Badge>
              <p className="text-[11px] font-semibold text-foreground">Acceso Total</p>
              <p className="text-[10px] text-muted-foreground">
                Gestión de credenciales, configuración de roles (/admin/roles) y balances generales.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const ActiveIcon = activeSection.icon;

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            Documentación & Guía del CRM NextLead
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manual de usuario oficial, reglas de negocio, guías de operación y políticas de seguridad del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
            <Link href="/soporte">
              <Headphones className="size-4" />
              Mesa de Ayuda
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 text-xs"
          >
            <Printer className="size-4" />
            Imprimir Guía
          </Button>
        </div>
      </div>

      {/* 2. Buscador de Documentación */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tema en la documentación (ej: instalar venta, sin IGV, flujo de caja, comisiones, vendedor)..."
          className="pl-10 h-11 text-sm bg-card shadow-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 3. Estructura de Dos Columnas: Menú de Capítulos (Izq) & Contenido Extenso (Der) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* Columna Izquierda: Capítulos */}
        <div className="xl:col-span-4 flex flex-col gap-2">
          <Card className="border shadow-sm bg-card">
            <CardHeader className="p-3.5 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Capítulos y Módulos ({filteredSections.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {filteredSections.map((sec) => {
                const isSelected = sec.id === selectedSectionId;
                const Icon = sec.icon;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "hover:bg-muted/50 border-transparent bg-transparent text-foreground"
                    }`}
                  >
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold truncate">{sec.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                          {sec.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                        {sec.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Lectura del Capítulo */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <Card className="border shadow-sm bg-card w-full">
            <CardHeader className="p-5 border-b bg-muted/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ActiveIcon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {activeSection.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Categoría: {activeSection.category} • Guía Oficial NextLead CRM
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                  Actualizado 2026
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {activeSection.content}
            </CardContent>

            <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                ¿Tienes dudas adicionales sobre este módulo?
              </span>
              <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                <Link href="/soporte">
                  <Headphones className="size-3.5 text-primary" />
                  Contactar Soporte
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
