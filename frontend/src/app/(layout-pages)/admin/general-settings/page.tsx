"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  RefreshCw,
  Save,
  Briefcase,
  Layers,
  ArrowRight,
  Radio,
  Store,
  Clock,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [tipoModelo, setTipoModelo] = useState<string>("TELECOM");
  const [form, setForm] = useState({
    "empresa.nombre": "ASCENDO PERU",
    "empresa.ruc": "20611846721",
    "empresa.telefono": "948613380",
    "empresa.email": "comercial@nextlead.pe",
    "empresa.direccion": "Av. República de Panamá 3505, San Isidro",
    "timezone": "America/Lima",
    "formato.fecha": "d/m/Y",
    "formato.hora": "24h",
    "igv.porcentaje": "18",
    "moneda.principal": "PEN",
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings");
      if (res.data) {
        if (res.data["negocio.tipo_modelo"]) {
          setTipoModelo(res.data["negocio.tipo_modelo"]);
        }
        setForm((prev) => ({
          ...prev,
          "empresa.nombre": res.data["empresa.nombre"] || prev["empresa.nombre"],
          "empresa.ruc": res.data["empresa.ruc"] || prev["empresa.ruc"],
          "empresa.telefono": res.data["empresa.telefono"] || prev["empresa.telefono"],
          "empresa.email": res.data["empresa.email"] || prev["empresa.email"],
          "empresa.direccion": res.data["empresa.direccion"] || prev["empresa.direccion"],
          "timezone": res.data["timezone"] || prev["timezone"],
          "formato.fecha": res.data["formato.fecha"] || prev["formato.fecha"],
          "formato.hora": res.data["formato.hora"] || prev["formato.hora"],
          "igv.porcentaje": res.data["igv.porcentaje"] || prev["igv.porcentaje"],
          "moneda.principal": res.data["moneda.principal"] || prev["moneda.principal"],
        }));
      }
    } catch (err: any) {
      console.error("Error loading general settings:", err);
      toast.error("No se pudieron cargar los ajustes generales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/api/settings", form);
      toast.success("Ajustes generales guardados correctamente.");
    } catch (err: any) {
      console.error("Error saving general settings:", err);
      toast.error("Error al guardar los ajustes generales.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Ajustes Generales del Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Parámetros corporativos, datos fiscales, zona horaria y acceso al modelo de negocio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={loading || saving}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Save className="size-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Banner de Acceso al Modelo de Negocio */}
      <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
                {tipoModelo === "TELECOM" ? "📡 Telecomunicaciones" : "💼 Negocio Regular"}
              </Badge>
              <span className="text-xs text-muted-foreground">Modelo de Negocio Activo</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {tipoModelo === "TELECOM"
                ? "Modo Telecomunicaciones: Cobro por Comisiones según Ventas"
                : "Modo Regular: Cobro Directo según lo Vendido al Cliente"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Configura tus operadores asociados, esquemas de comisiones (Factor CFM o Monto Fijo), liquidación y reparto con asesores de venta.
            </p>
          </div>
          <Link href="/admin/negocio">
            <Button className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Briefcase className="size-4" />
              Configurar Modelo de Negocio
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="size-4" />
            Datos de la Empresa
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Clock className="size-4" />
            Regional & Impuestos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EMPRESA */}
        <TabsContent value="empresa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                Información Fiscal y de Contacto
              </CardTitle>
              <CardDescription>
                Estos datos aparecen en tus cotizaciones, comprobantes y comunicaciones oficiales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-nombre">Razón Social / Nombre Comercial</Label>
                  <Input
                    id="emp-nombre"
                    value={form["empresa.nombre"]}
                    onChange={(e) => setForm({ ...form, "empresa.nombre": e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-ruc">RUC (Registro Único de Contribuyentes)</Label>
                  <Input
                    id="emp-ruc"
                    value={form["empresa.ruc"]}
                    onChange={(e) => setForm({ ...form, "empresa.ruc": e.target.value })}
                    maxLength={11}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-tel">Teléfono / WhatsApp Corporativo</Label>
                  <Input
                    id="emp-tel"
                    value={form["empresa.telefono"]}
                    onChange={(e) => setForm({ ...form, "empresa.telefono": e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-email">Correo Electrónico de Contacto</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={form["empresa.email"]}
                    onChange={(e) => setForm({ ...form, "empresa.email": e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-dir">Dirección Fiscal / Oficina Principal</Label>
                <Input
                  id="emp-dir"
                  value={form["empresa.direccion"]}
                  onChange={(e) => setForm({ ...form, "empresa.direccion": e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: REGIONAL & IMPUESTOS */}
        <TabsContent value="sistema" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="size-5 text-primary" />
                Parámetros Regionales e Impuestos
              </CardTitle>
              <CardDescription>
                Zona horaria, formato de fechas y cálculo de IGV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sis-tz">Zona Horaria</Label>
                  <select
                    id="sis-tz"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form["timezone"]}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  >
                    <option value="America/Lima">América / Lima (GMT-5)</option>
                    <option value="America/Bogota">América / Bogotá (GMT-5)</option>
                    <option value="America/Santiago">América / Santiago (GMT-4)</option>
                    <option value="America/Mexico_City">América / Ciudad de México (GMT-6)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sis-igv">Porcentaje IGV (%)</Label>
                  <Input
                    id="sis-igv"
                    type="number"
                    value={form["igv.porcentaje"]}
                    onChange={(e) => setForm({ ...form, "igv.porcentaje": e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sis-moneda">Moneda Principal</Label>
                  <select
                    id="sis-moneda"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form["moneda.principal"]}
                    onChange={(e) => setForm({ ...form, "moneda.principal": e.target.value })}
                  >
                    <option value="PEN">PEN - Soles (S/)</option>
                    <option value="USD">USD - Dólares ($)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
