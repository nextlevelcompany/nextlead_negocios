"use client";

import React, { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  ExternalLink,
  Package,
  Sparkles,
  Phone,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Producto } from "@/app/(layout-pages)/productos/view/page";

interface ProductWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Producto | null;
}

export function ProductWhatsAppModal({
  open,
  onOpenChange,
  product,
}: ProductWhatsAppModalProps) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // Formato enriquecido con iconos y emojis de WhatsApp
  const whatsappMessage = useMemo(() => {
    if (!product) return "";

    const fullImageUrl = product.imagen
      ? product.imagen.startsWith("http")
        ? product.imagen
        : typeof window !== "undefined"
        ? `${window.location.origin}${product.imagen}`
        : `https://crm.oncomercial.pe${product.imagen}`
      : "";

    const precioVenta = Number(product.precioVenta || 0);
    const precioSinIgv = precioVenta > 0 ? (precioVenta / 1.18).toFixed(2) : "0.00";

    const lines: string[] = [
      `🚀 *${(product.nombre || "PRODUCTO").toUpperCase()}*`,
      product.codigo ? `🔖 *Código / Plan:* \`${product.codigo}\`` : "",
      product.categoriaNombre ? `🏷️ *Categoría:* ${product.categoriaNombre}` : "",
      "",
      product.descripcion ? `📋 *Detalle del Servicio / Producto:*\n${product.descripcion.trim()}\n` : "",
      `💰 *Tarifa / Precio:*`,
      `• *S/ ${precioVenta.toFixed(2)} inc. IGV*`,
      `• Base Imponible: _S/ ${precioSinIgv} sin IGV_`,
      "",
      `⚡ *Beneficios Clave:*`,
      `• Fibra óptica simétrica corporativa y alta disponibilidad`,
      `• Soporte y monitoreo empresarial dedicado`,
      "",
      fullImageUrl ? `📸 *Ficha Técnica / Imagen Oficial:*\n${fullImageUrl}\n` : "",
      `📲 _¿Deseas contratar o cotizar para tu empresa? ¡Responde a este mensaje para ayudarte!_`,
    ];

    return lines.filter((l, idx, arr) => {
      // Evitar líneas vacías duplicadas
      if (l === "" && arr[idx - 1] === "") return false;
      return true;
    }).join("\n");
  }, [product]);

  if (!product) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedText(true);
      toast.success("¡Texto de WhatsApp copiado al portapapeles!");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("No se pudo copiar automáticamente. Por favor selecciónalo manualmente.");
    }
  };

  const handleCopyImageUrl = async () => {
    if (!product.imagen) return;
    const fullImageUrl = product.imagen.startsWith("http")
      ? product.imagen
      : `${window.location.origin}${product.imagen}`;
    try {
      await navigator.clipboard.writeText(fullImageUrl);
      setCopiedImage(true);
      toast.success("¡Enlace de imagen copiado al portapapeles!");
      setTimeout(() => setCopiedImage(false), 2500);
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length === 9 && !cleanPhone.startsWith("51")) {
      cleanPhone = "51" + cleanPhone;
    }

    const encoded = encodeURIComponent(whatsappMessage);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, "_blank");
  };

  const imageUrl = product.imagen
    ? product.imagen.startsWith("http")
      ? product.imagen
      : product.imagen
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                Compartir Ficha por WhatsApp
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-mono">
                  {product.codigo || `#${product.id}`}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Envía o copia la ficha comercial formateada con emojis e información detallada lista para el cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)]">
          {/* Card Resumen del Producto */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
            <div className="size-14 rounded-md border overflow-hidden bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt={product.nombre} className="w-full h-full object-cover" />
              ) : (
                <Package className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {product.categoriaNombre || "General"}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  SKU: {product.codigo || `#${product.id}`}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate" title={product.nombre}>
                {product.nombre}
              </h4>
              <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                S/ {Number(product.precioVenta || 0).toFixed(2)}
                <span className="text-[10px] text-muted-foreground font-normal ml-1">inc. IGV</span>
              </p>
            </div>
            {imageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyImageUrl}
                className="h-7 text-[11px] gap-1 shrink-0 text-muted-foreground hover:text-foreground"
                title="Copiar link de la imagen"
              >
                {copiedImage ? <Check className="size-3 text-emerald-600" /> : <ImageIcon className="size-3" />}
                <span className="hidden sm:inline">Link Foto</span>
              </Button>
            )}
          </div>

          {/* Input para número opcional */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Phone className="size-3 text-emerald-600" />
              Número de WhatsApp del Cliente (Opcional):
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border bg-muted/50 text-muted-foreground">
                +51
              </span>
              <Input
                type="tel"
                placeholder="ej: 987654321 (o dejar vacío para elegir contacto en WhatsApp)"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Si dejas el número vacío, WhatsApp Web te permitirá seleccionar cualquier chat o grupo al abrir.
            </p>
          </div>

          {/* Preview del Mensaje Formateado */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3 text-emerald-600" />
                Mensaje formateado con iconos para WhatsApp:
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyText}
                className="h-6 text-[11px] gap-1 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {copiedText ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedText ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>

            <div className="rounded-lg border bg-zinc-950 text-zinc-100 p-3 font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap select-text selection:bg-emerald-600 selection:text-white">
              {whatsappMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-muted/30 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-8 text-xs"
          >
            Cerrar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial h-8 text-xs gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {copiedText ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copiedText ? "¡Copiado!" : "Copiar Texto"}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-initial h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Send className="size-3.5" />
              <span>Enviar por WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
