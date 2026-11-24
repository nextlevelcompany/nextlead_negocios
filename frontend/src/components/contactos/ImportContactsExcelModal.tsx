"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ImportContactsExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  success: boolean;
  totalProcessed?: number;
  created?: number;
  updated?: number;
  errors?: string[];
  message?: string;
}

export function ImportContactsExcelModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportContactsExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
  };

  const handleDownloadTemplate = () => {
    // Descargar muestra desde la API
    window.location.href = "/api/contacts/template";
    toast.info("Descargando plantilla de ejemplo en formato Excel...");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const name = selected.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        toast.error("Por favor selecciona un archivo Excel (.xlsx o .xls)");
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const name = dropped.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        toast.error("Por favor selecciona un archivo Excel (.xlsx o .xls)");
        return;
      }
      setFile(dropped);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Debes seleccionar un archivo Excel primero");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("updateExisting", updateExisting ? "true" : "false");

      const res = await fetch("/api/contacts/import-excel", {
        method: "POST",
        body: formData,
      });

      const data: ImportResult = await res.json();
      setResult(data);

      if (res.ok && data.success) {
        toast.success(
          `¡Carga completada! ${data.created || 0} nuevos creados, ${data.updated || 0} actualizados.`
        );
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.message || "Error al procesar el archivo Excel");
      }
    } catch (e: any) {
      console.error("Error subiendo Excel:", e);
      toast.error("Error de conexión al subir el archivo");
      setResult({
        success: false,
        message: e?.message || "Ocurrió un error inesperado durante la carga.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetState();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Carga Masiva de Contactos y Empresas
              </DialogTitle>
              <DialogDescription className="text-xs">
                Importa prospectos mediante archivo Excel o descarga la plantilla de muestra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* PASO 1: Descargar Plantilla */}
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                1. ¿Aún no tienes el formato?
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Descarga una muestra en <strong>.xlsx</strong> con ejemplos de Empresas, Personas Naturales y datos de Experian.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
            >
              <Download className="size-3.5 mr-1.5" />
              Bajar Muestra Excel
            </Button>
          </div>

          {/* PASO 2: Subir Archivo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              2. Selecciona o arrastra tu archivo Excel
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-1.5">
                  <FileCheck2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                  <p className="font-semibold text-xs text-foreground line-clamp-1">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar archivo
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="size-8 text-muted-foreground" />
                  <p className="font-medium text-xs text-foreground">
                    Arrastra tu archivo aquí o <span className="text-primary underline">explora en tu equipo</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Formatos admitidos: .xlsx, .xls (Plantilla estándar o Formato Experian)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Opción de actualización */}
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground select-none">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            Actualizar datos si el contacto o empresa ya existe (mismo RUC / DNI)
          </label>

          {/* Resultados de Importación */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {result.success ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ¡Importación Procesada Exitosamente!
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-4" />
                    Ocurrió un error en la importación
                  </>
                )}
              </div>

              {result.success && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="bg-background/60 p-2 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">Procesados</span>
                    <span className="font-bold text-sm text-foreground">
                      {result.totalProcessed?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="bg-background/60 p-2 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">Nuevos</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {result.created?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="bg-background/60 p-2 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">Actualizados</span>
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                      {result.updated?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 max-h-28 overflow-y-auto space-y-1 text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Detalles / Advertencias:</p>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="italic">... y {result.errors.length - 5} notas más.</p>
                  )}
                </div>
              )}

              {result.message && !result.success && (
                <p className="text-xs">{result.message}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {result?.success ? "Cerrar" : "Cancelar"}
          </Button>

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Procesando Excel...
              </>
            ) : (
              <>
                <UploadCloud className="size-4 mr-2" />
                Subir e Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
