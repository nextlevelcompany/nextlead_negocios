"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  FileText,
  Image as ImageIcon,
  Save,
  UserCheck,
  Eye,
  RefreshCw,
  Coins,
  ShieldAlert,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import api, { getMediaUrl } from "@/lib/api";

export default function QuotationConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMembrete, setUploadingMembrete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    "cotizacion.empresa_nombre": "",
    "cotizacion.empresa_ruc": "",
    "cotizacion.empresa_direccion": "",
    "cotizacion.empresa_telefono": "",
    "cotizacion.empresa_email": "",
    "cotizacion.empresa_web": "",
    "cotizacion.logo_url": "",
    "cotizacion.pie_pagina_url": "",
    "cotizacion.moneda_defecto": "Soles",
    "cotizacion.mostrar_datos_empresa": "false",
    "cotizacion.firma_nombre_defecto": "",
    "cotizacion.firma_cargo_defecto": "",
    "cotizacion.firma_celular_defecto": "",
    "cotizacion.firma_email_defecto": "",
    "cotizacion.condiciones_defecto": "",
    "cotizacion.exclusiones_defecto": "",
    "cotizacion.hoja_membrete_url": "",
    "cotizacion.hoja_membrete_imagen_url": "",
    "cotizacion.hoja_membrete_nombre": "",
    "cotizacion.hoja_membrete_tipo": "",
    "cotizacion.usar_hoja_membrete": "true",
  });

  const cleanMediaUrl = (url?: string) => {
    if (!url) return "";
    let clean = url.trim();
    if (clean.includes("/uploads/")) {
      clean = clean.substring(clean.indexOf("/uploads/"));
    } else if (clean.includes("/productos/")) {
      clean = clean.substring(clean.indexOf("/productos/"));
    }
    return clean;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/opportunities/settings");
      if (res.data) {
        const cleaned: Record<string, string> = { ...res.data };
        for (const k of Object.keys(cleaned)) {
          if (typeof cleaned[k] === "string" && (cleaned[k].includes("/uploads/") || cleaned[k].includes("/productos/"))) {
            cleaned[k] = cleanMediaUrl(cleaned[k]);
          }
        }
        setForm((prev) => ({
          ...prev,
          ...cleaned,
        }));
      }
    } catch (err: any) {
      console.error("Error loading quote settings:", err);
      toast.error("No se pudo cargar la configuración de cotizaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Upload Membrete (PDF, Word, Images)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validExts = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(fileExt)) {
      toast.error("Formato no válido. Solo se acepta PDF (.pdf), Word (.docx, .doc) o Imágenes (.png, .jpg).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo permitido (20 MB).");
      return;
    }

    setUploadingMembrete(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/opportunities/upload-membrete", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.url) {
        setForm((prev) => ({
          ...prev,
          "cotizacion.hoja_membrete_url": res.data.url,
          "cotizacion.hoja_membrete_imagen_url": res.data.imageUrl || res.data.url,
          "cotizacion.hoja_membrete_nombre": res.data.filename || file.name,
          "cotizacion.hoja_membrete_tipo": res.data.fileType || fileExt.replace(".", ""),
          "cotizacion.usar_hoja_membrete": "true",
        }));
        toast.success(`Hoja membrete "${file.name}" cargada con éxito.`);
      }
    } catch (err: any) {
      console.error("Error uploading membrete:", err);
      toast.error(err.response?.data?.message || "Error al subir la hoja membrete.");
    } finally {
      setUploadingMembrete(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMembrete = () => {
    setForm((prev) => ({
      ...prev,
      "cotizacion.hoja_membrete_url": "",
      "cotizacion.hoja_membrete_imagen_url": "",
      "cotizacion.hoja_membrete_nombre": "",
      "cotizacion.hoja_membrete_tipo": "",
    }));
    toast.info("Hoja membrete removida.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = { ...form };
      for (const k of Object.keys(payload)) {
        if (typeof payload[k] === "string" && (payload[k].includes("/uploads/") || payload[k].includes("/productos/"))) {
          payload[k] = cleanMediaUrl(payload[k]);
        }
      }
      await api.post("/api/opportunities/settings", payload);
      toast.success("Configuración de cotización guardada con éxito.");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast.error(err.response?.data?.message || "Error al guardar configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-xs">
        <RefreshCw className="size-4 animate-spin mr-2 text-emerald-600" />
        Cargando configuración de cotizaciones...
      </div>
    );
  }

  const membreteUrl = form["cotizacion.hoja_membrete_url"];
  const membreteName = form["cotizacion.hoja_membrete_nombre"] || "Hoja Membrete";
  const membreteType = (form["cotizacion.hoja_membrete_tipo"] || "").toLowerCase();
  const isImageMembrete = ["png", "jpg", "jpeg", "webp"].includes(membreteType);
  const isPdfMembrete = membreteType === "pdf";
  const isWordMembrete = ["docx", "doc"].includes(membreteType);

  const previewMembreteImg =
    cleanMediaUrl(form["cotizacion.hoja_membrete_imagen_url"]) ||
    (["png", "jpg", "jpeg", "webp"].some((ext) => (form["cotizacion.hoja_membrete_url"] || "").toLowerCase().endsWith(ext))
      ? cleanMediaUrl(form["cotizacion.hoja_membrete_url"])
      : (form["cotizacion.hoja_membrete_url"] ? "/uploads/membrete_a4.png" : ""));

  return (
    <div className="flex flex-col gap-3.5 w-full max-w-full min-w-0 pb-10">
      <form onSubmit={handleSave} className="flex flex-col gap-3.5">
        {/* Compact Top Action Bar */}
        <div className="flex items-center justify-between gap-3 bg-card border rounded-xl px-3.5 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Volver al Pipeline"
            >
              <Link href="/opportunities/view">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 leading-none">
                <Building2 className="size-4 text-emerald-600" />
                Configuración de Cotización & Hoja Membrete
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Personaliza los datos corporativos, logotipo y hoja membrete (PDF / Word) para las cotizaciones.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold h-8 px-3 shrink-0 shadow-xs"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar Configuración
          </Button>
        </div>

        {/* 2-Column Responsive Layout: Left Form (7 cols) | Right Compact Live Preview (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* ================================================================= */}
          {/* LEFT COLUMN (lg:col-span-7): COMPACT FORM CARDS                   */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-3.5 min-w-0">
            {/* CARD 1: HOJA MEMBRETE OFICIAL (PDF / WORD / IMAGEN) */}
            <Card className="shadow-xs border-emerald-500/30 bg-card">
              <CardHeader className="py-2.5 px-3.5 border-b bg-emerald-50/30 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                    <UploadCloud className="size-4 text-emerald-600" />
                    1. Hoja Membrete Oficial (PDF, Word o Imagen)
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-600 text-emerald-700 bg-white dark:bg-emerald-950">
                    PDF &bull; DOCX &bull; PNG &bull; JPG
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <input
                  ref={fileInputRef}
                  id="membrete_file_input"
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />

                {membreteUrl ? (
                  <div className="border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-10 rounded-lg border bg-white flex items-center justify-center shrink-0 shadow-2xs">
                        {isPdfMembrete ? (
                          <FileText className="size-5 text-red-600" />
                        ) : isWordMembrete ? (
                          <FileSpreadsheet className="size-5 text-blue-600" />
                        ) : (
                          <ImageIcon className="size-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground truncate max-w-[220px]">
                            {membreteName}
                          </span>
                          <Badge className="text-[9px] uppercase px-1 py-0 h-4 bg-emerald-600 text-white font-bold">
                            {membreteType || "ACTIVO"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Ruta en servidor: {cleanMediaUrl(membreteUrl)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 px-2 text-[11px] gap-1 bg-white hover:bg-slate-50"
                      >
                        <a href={getMediaUrl(membreteUrl)} target="_blank" rel="noreferrer">
                          <Download className="size-3 text-emerald-600" />
                          Ver / Descargar
                        </a>
                      </Button>
                      <label
                        htmlFor="membrete_file_input"
                        className="inline-flex items-center justify-center h-7 px-2 text-[11px] font-medium gap-1 rounded-md border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        Reemplazar
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveMembrete}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar membrete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="membrete_file_input"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                    className="block border-2 border-dashed border-muted-foreground/30 hover:border-emerald-500 rounded-lg p-4 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-emerald-50/20"
                  >
                    <UploadCloud className="size-7 mx-auto text-emerald-600 mb-1" />
                    <p className="text-xs font-bold text-foreground">
                      Haz clic o arrastra aquí tu Hoja Membrete Oficial
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Formatos soportados: <strong>PDF (.pdf)</strong>, <strong>Word (.docx, .doc)</strong> o <strong>Imágenes (.png, .jpg)</strong>.
                    </p>
                    <div className="inline-flex items-center gap-1.5 mt-2.5 h-7 px-3 text-xs font-semibold rounded-md border border-emerald-600 text-emerald-700 bg-background shadow-xs hover:bg-emerald-50/50">
                      {uploadingMembrete ? <RefreshCw className="size-3 animate-spin" /> : <UploadCloud className="size-3" />}
                      {uploadingMembrete ? "Subiendo archivo..." : "Seleccionar Archivo"}
                    </div>
                  </label>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form["cotizacion.usar_hoja_membrete"] !== "false"}
                      onChange={(e) => handleChange("cotizacion.usar_hoja_membrete", e.target.checked ? "true" : "false")}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-foreground">
                      Aplicar automáticamente como fondo / membrete en cotizaciones A4
                    </span>
                  </label>
                  <span className="text-[10px] italic">Formato A4 estándar</span>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: DATOS DE LA EMPRESA & MONEDA (COMPACT GRID) */}
            <Card className="shadow-xs bg-card">
              <CardHeader className="py-2.5 px-3.5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Building2 className="size-4 text-emerald-600" />
                    2. Datos de la Empresa Emisora & Moneda
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mostrar_datos_empresa" className="text-[11px] font-medium text-muted-foreground cursor-pointer">
                      Imprimir en Cotización
                    </Label>
                    <Switch
                      id="mostrar_datos_empresa"
                      checked={form["cotizacion.mostrar_datos_empresa"] === "true"}
                      onCheckedChange={(checked) =>
                        handleChange("cotizacion.mostrar_datos_empresa", checked ? "true" : "false")
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                {form["cotizacion.mostrar_datos_empresa"] !== "true" && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2.5 text-[11px] text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">Encabezado de empresa oculto en la cotización</span>
                      Recomendado cuando usas Hoja Membretada para evitar que estos textos se superpongan con el membrete oficial.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 border-emerald-600 text-emerald-700 bg-white"
                      onClick={() => handleChange("cotizacion.mostrar_datos_empresa", "true")}
                    >
                      Activar encabezado
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold">Razón Social o Nombre Comercial</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ej. Mi Empresa S.A.C."
                      value={form["cotizacion.empresa_nombre"]}
                      onChange={(e) => handleChange("cotizacion.empresa_nombre", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">RUC / Identificación Fiscal</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ej. 20601234567"
                      value={form["cotizacion.empresa_ruc"]}
                      onChange={(e) => handleChange("cotizacion.empresa_ruc", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Dirección Fiscal / Sede Central</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ej. Av. República de Panamá 3505, San Isidro, Lima"
                    value={form["cotizacion.empresa_direccion"]}
                    onChange={(e) => handleChange("cotizacion.empresa_direccion", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Teléfono Comercial</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="+51 987 654 321"
                      value={form["cotizacion.empresa_telefono"]}
                      onChange={(e) => handleChange("cotizacion.empresa_telefono", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Correo Comercial</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ventas@miempresa.com"
                      value={form["cotizacion.empresa_email"]}
                      onChange={(e) => handleChange("cotizacion.empresa_email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Sitio Web</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="www.miempresa.com"
                      value={form["cotizacion.empresa_web"]}
                      onChange={(e) => handleChange("cotizacion.empresa_web", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold flex items-center gap-1">
                      <ImageIcon className="size-3 text-blue-600" />
                      URL Logo (Opcional)
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="https://.../logo.png"
                      value={form["cotizacion.logo_url"]}
                      onChange={(e) => handleChange("cotizacion.logo_url", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold flex items-center gap-1">
                      <ImageIcon className="size-3 text-blue-600" />
                      URL Banner Footer (Opcional)
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="https://.../footer.png"
                      value={form["cotizacion.pie_pagina_url"]}
                      onChange={(e) => handleChange("cotizacion.pie_pagina_url", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold flex items-center gap-1">
                      <Coins className="size-3 text-emerald-600" />
                      Moneda por Defecto
                    </Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-0 text-xs shadow-2xs font-semibold focus:ring-1 focus:ring-ring"
                      value={form["cotizacion.moneda_defecto"]}
                      onChange={(e) => handleChange("cotizacion.moneda_defecto", e.target.value)}
                    >
                      <option value="Soles">Soles (S/)</option>
                      <option value="Dólares">Dólares ($)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: EJECUTIVO COMERCIAL & FIRMA */}
            <Card className="shadow-xs bg-card">
              <CardHeader className="py-2.5 px-3.5 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <UserCheck className="size-4 text-emerald-600" />
                  3. Asesor Comercial & Firma por Defecto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Nombres y Apellidos</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ej. Juan Pérez"
                      value={form["cotizacion.firma_nombre_defecto"]}
                      onChange={(e) => handleChange("cotizacion.firma_nombre_defecto", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Cargo del Asesor</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ej. Consultor Comercial Senior"
                      value={form["cotizacion.firma_cargo_defecto"]}
                      onChange={(e) => handleChange("cotizacion.firma_cargo_defecto", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Celular de Contacto</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="+51 987 654 321"
                      value={form["cotizacion.firma_celular_defecto"]}
                      onChange={(e) => handleChange("cotizacion.firma_celular_defecto", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Correo Electrónico</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="asesor@miempresa.com"
                      value={form["cotizacion.firma_email_defecto"]}
                      onChange={(e) => handleChange("cotizacion.firma_email_defecto", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: CLÁUSULAS Y CONDICIONES LEGALES */}
            <Card className="shadow-xs bg-card">
              <CardHeader className="py-2.5 px-3.5 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-4 text-emerald-600" />
                  4. Condiciones Comerciales y Técnicas (Por Defecto)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Condiciones Generales (Página 1)</Label>
                  <Textarea
                    rows={3}
                    className="text-xs leading-relaxed py-1.5"
                    placeholder="1. Precios válidos por 15 días calendario..."
                    value={form["cotizacion.condiciones_defecto"]}
                    onChange={(e) => handleChange("cotizacion.condiciones_defecto", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold flex items-center gap-1">
                    <ShieldAlert className="size-3 text-amber-600" />
                    Exclusiones y Premisas Técnicas (Página 2 - Cláusula 10)
                  </Label>
                  <Textarea
                    rows={2}
                    className="text-xs leading-relaxed py-1.5"
                    placeholder="10. Exclusiones: No incluye obras civiles especiales..."
                    value={form["cotizacion.exclusiones_defecto"]}
                    onChange={(e) => handleChange("cotizacion.exclusiones_defecto", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN (lg:col-span-5): COMPACT LIVE VISUAL PREVIEW         */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-3 min-w-0">
            <div className="sticky top-4 space-y-3">
              <Card className="shadow-2xs border-emerald-500/30 bg-card">
                <CardHeader className="py-2.5 px-3.5 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Eye className="size-3.5 text-emerald-600" />
                      Vista Previa Compacta (Documento A4)
                    </CardTitle>
                    {membreteUrl ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-600 text-emerald-700 bg-emerald-50">
                        Membrete Activo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                        Membrete Estándar
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2.5">
                  {/* Miniature Page 1 */}
                  <div className={`border rounded-md bg-white text-gray-800 shadow-2xs text-[9px] font-sans select-none relative overflow-hidden min-h-[340px] flex flex-col justify-between ${previewMembreteImg ? "pt-9 pb-5 px-2.5" : "p-2.5"}`}>
                    {/* Membrete background full */}
                    {previewMembreteImg && (
                      <img
                        src={getMediaUrl(previewMembreteImg)}
                        alt="Membrete"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      />
                    )}

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-300 pb-1 bg-transparent">
                        <div>
                          {form["cotizacion.mostrar_datos_empresa"] === "true" ? (
                            form["cotizacion.logo_url"] ? (
                              <img
                                src={getMediaUrl(form["cotizacion.logo_url"])}
                                alt="Logo"
                                className="h-4 max-w-[70px] object-contain"
                              />
                            ) : (
                              <div className="h-4 px-1.5 bg-emerald-700 text-white font-bold rounded flex items-center text-[8px]">
                                {form["cotizacion.empresa_nombre"] || "MI EMPRESA"}
                              </div>
                            )
                          ) : (
                            <div className="text-[8px] font-bold text-gray-700 uppercase tracking-wider">
                              PROPUESTA COMERCIAL
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[7px] text-gray-600">
                          <span className="font-bold text-gray-800">COT-202611-0001</span>
                          <div>Fecha: Hoy</div>
                        </div>
                      </div>

                      <div className="bg-transparent p-1.5 rounded text-[8px] border border-gray-300 leading-tight">
                        <span className="font-bold">Cliente:</span> Inversiones & Servicios S.A.C.
                        <br />
                        <span className="font-bold">Dirección:</span> AV. EL DERBY 254, SAN ISIDRO, LIMA
                      </div>

                      <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
                        <div className="bg-[#082653] text-white font-bold px-1.5 py-0.5 text-[7px] flex justify-between">
                          <span>DETALLE DEL SERVICIO PROPUESTO</span>
                          <span>{form["cotizacion.moneda_defecto"] === "Dólares" ? "USD ($)" : "PEN (S/)"}</span>
                        </div>
                        <div className="p-1 space-y-0.5 text-[7px]">
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="font-semibold text-[#082653]">1. Enlace Corporativo Dedicado 1:1</span>
                            <span className="font-medium text-slate-700">24 meses</span>
                          </div>
                          <div className="flex justify-between text-[7px] font-bold text-white bg-[#082653] px-1 py-0.5 rounded-xs mt-1">
                            <span>Total Renta Mensual (Inc. IGV):</span>
                            <span>{form["cotizacion.moneda_defecto"] === "Dólares" ? "$ 454.30" : "S/ 454.30"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[6.5px] text-gray-500 space-y-0.5 border-t pt-0.5 bg-white/80 p-0.5 rounded">
                        <span className="font-bold text-gray-700">CONDICIONES COMERCIALES:</span>
                        <p className="line-clamp-2">
                          {form["cotizacion.condiciones_defecto"] || "1. Precios válidos por 15 días calendario..."}
                        </p>
                      </div>

                      <div className="text-center text-[7px] text-gray-400 pt-0.5 border-t">
                        [ Página 1 de 2 ]
                      </div>
                    </div>
                  </div>

                  {/* Miniature Page 2 */}
                  <div className="border rounded-md bg-white text-gray-800 p-2.5 shadow-2xs text-[9px] font-sans select-none relative overflow-hidden">
                    {/* Membrete background full */}
                    {previewMembreteImg && (
                      <img
                        src={previewMembreteImg}
                        alt="Membrete"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      />
                    )}

                    <div className="relative z-10 space-y-2">
                      <div className="text-[6.5px] text-gray-500 space-y-0.5 bg-white/80 p-1 rounded">
                        <span className="font-bold text-gray-700">10. EXCLUSIONES TÉCNICAS:</span>
                        <p className="line-clamp-2">
                          {form["cotizacion.exclusiones_defecto"] || "No incluye obras civiles especiales..."}
                        </p>
                      </div>

                      {/* Dual signature box */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t">
                        <div className="border rounded p-1 text-center bg-gray-50/90">
                          <div className="h-4 border-b border-dashed border-gray-300"></div>
                          <div className="font-bold text-[7px] text-gray-800 mt-0.5">
                            {form["cotizacion.firma_nombre_defecto"] || "Asesor Comercial"}
                          </div>
                          <div className="text-[6.5px] text-gray-500">
                            {form["cotizacion.firma_cargo_defecto"] || "Ejecutivo Comercial"}
                          </div>
                        </div>
                        <div className="border rounded p-1 text-center bg-gray-50/90">
                          <div className="h-4 border-b border-dashed border-gray-300"></div>
                          <div className="font-bold text-[7px] text-gray-800 mt-0.5">
                            Aceptación del Cliente
                          </div>
                          <div className="text-[6.5px] text-gray-500">Firma y Sello</div>
                        </div>
                      </div>

                      {form["cotizacion.pie_pagina_url"] ? (
                        <div className="pt-0.5">
                          <img
                            src={form["cotizacion.pie_pagina_url"]}
                            alt="Banner Footer"
                            className="w-full h-4 object-cover rounded"
                          />
                        </div>
                      ) : !previewMembreteImg ? (
                        <div className="bg-emerald-800 text-white text-center py-0.5 rounded text-[6.5px]">
                          {form["cotizacion.empresa_nombre"] || "MI EMPRESA"} &bull; {form["cotizacion.empresa_web"] || "www.miempresa.com"}
                        </div>
                      ) : null}

                      <div className="text-center text-[7px] text-gray-400 pt-0.5">
                        [ Página 2 de 2 ]
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
