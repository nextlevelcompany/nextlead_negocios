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
  Download,
  Share2,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Producto } from "@/app/(layout-pages)/productos/view/page";

interface ProductWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Producto | null;
}

/**
 * Convierte cualquier imagen (URL remota, ruta relativa o base64) en un Blob PNG auténtico
 * para usarlo en navigator.clipboard.write ([ClipboardItem]) o en Web Share API (File).
 */
async function getImagePngBlob(imageSrc: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 500;
        canvas.height = img.naturalHeight || img.height || 500;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      } catch (err) {
        console.warn("Canvas toBlob error:", err);
        // Fallback: fetch directo
        fetch(imageSrc)
          .then((r) => r.blob())
          .then(resolve)
          .catch(() => resolve(null));
      }
    };
    img.onerror = () => {
      fetch(imageSrc)
        .then((r) => r.blob())
        .then(resolve)
        .catch(() => resolve(null));
    };
    img.src = imageSrc;
  });
}

export function ProductWhatsAppModal({
  open,
  onOpenChange,
  product,
}: ProductWhatsAppModalProps) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Normalizar la fuente de la imagen
  const resolvedImageUrl = useMemo(() => {
    if (!product?.imagen) return null;
    let img = product.imagen.trim();
    if (img.startsWith("data:image") || img.startsWith("http://") || img.startsWith("https://")) {
      return img;
    }
    if (img.startsWith("/")) {
      return typeof window !== "undefined" ? `${window.location.origin}${img}` : img;
    }
    if (img.length > 50 && !img.includes(" ") && !img.includes("\n")) {
      return `data:image/jpeg;base64,${img}`;
    }
    return null;
  }, [product]);

  // Formato enriquecido con iconos y emojis de WhatsApp
  const whatsappMessage = useMemo(() => {
    if (!product) return "";

    const fullImageUrl = resolvedImageUrl
      ? resolvedImageUrl.startsWith("data:")
        ? "" // data URLs son demasiado largas para el texto de WhatsApp
        : resolvedImageUrl
      : "";

    const precioVenta = Number(product.precioVenta || 0);
    const precioSinIgv = precioVenta > 0 ? (precioVenta / 1.18).toFixed(2) : "0.00";

    const lines: string[] = [
      `🚀 *${(product.nombre || "PRODUCTO").toUpperCase()}*`,
      product.codigo ? `🔖 *Código / Plan:* \`${product.codigo}\`` : "",
      product.categoriaNombre ? `🏷️ *Categoría:* ${product.categoriaNombre}` : "",
      "",
      product.descripcion ? `📋 *Detalle del Servicio / Producto:*\n${product.descripcion.trim()}\n` : "",
      `💰 *Tarifa Comercial:*`,
      `• *S/ ${precioVenta.toFixed(2)} inc. IGV*`,
      `• Base Imponible: _S/ ${precioSinIgv} sin IGV_`,
      "",
      `⚡ *Beneficios Clave:*`,
      `• Fibra óptica simétrica corporativa y alta disponibilidad`,
      `• Soporte y monitoreo empresarial dedicado`,
      "",
      fullImageUrl ? `📸 *Ficha Técnica / Imagen:*\n${fullImageUrl}\n` : "",
      `📲 _¿Deseas contratar o cotizar para tu empresa? ¡Responde a este mensaje para ayudarte!_`,
    ];

    return lines.filter((l, idx, arr) => {
      if (l === "" && arr[idx - 1] === "") return false;
      return true;
    }).join("\n");
  }, [product, resolvedImageUrl]);

  if (!product) return null;

  // 1. Copiar texto formateado
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedText(true);
      toast.success("¡Texto de WhatsApp copiado al portapapeles!");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("No se pudo copiar el texto.");
    }
  };

  // 2. Copiar Imagen al Portapapeles (para pegar con Ctrl+V directamente en WhatsApp)
  const handleCopyImageToClipboard = async () => {
    if (!resolvedImageUrl) {
      toast.error("Este producto no cuenta con imagen cargada.");
      return;
    }
    try {
      toast.loading("Procesando imagen...", { id: "copy-img" });
      const blob = await getImagePngBlob(resolvedImageUrl);
      if (!blob) {
        toast.dismiss("copy-img");
        toast.error("No se pudo procesar la imagen del producto.");
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      toast.dismiss("copy-img");
      setCopiedImage(true);
      toast.success("¡Imagen copiada! En WhatsApp solo presiona Ctrl + V para pegarla.", {
        duration: 5000,
      });
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err: any) {
      toast.dismiss("copy-img");
      console.warn("Clipboard image write error:", err);
      toast.error("Tu navegador no permitió copiar la imagen. Usa el botón 'Descargar Imagen' o 'Compartir'.");
    }
  };

  // 3. Descargar imagen para arrastrar o adjuntar
  const handleDownloadImage = async () => {
    if (!resolvedImageUrl) return;
    try {
      const blob = await getImagePngBlob(resolvedImageUrl);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = (product.codigo || product.nombre || "producto")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      a.download = `${cleanName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("¡Imagen descargada exitosamente!");
    } catch {
      toast.error("No se pudo descargar la imagen.");
    }
  };

  // 4. Compartir Ficha Completa con Imagen (Web Share API nativa si existe, o WhatsApp Web con Copiar Imagen)
  const handleShareWithImage = async () => {
    setSharing(true);

    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length === 9 && !cleanPhone.startsWith("51")) {
      cleanPhone = "51" + cleanPhone;
    }

    // A) Si tiene imagen y el navegador soporta compartir archivos nativos (Android, iOS, Windows Share)
    if (resolvedImageUrl && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const blob = await getImagePngBlob(resolvedImageUrl);
        if (blob) {
          const file = new File(
            [blob],
            `${(product.codigo || "producto").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`,
            { type: "image/png" }
          );

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: product.nombre,
              text: whatsappMessage,
              files: [file],
            });
            toast.success("¡Ficha e imagen compartidas con éxito!");
            setSharing(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // El usuario canceló el diálogo nativo de compartir
          setSharing(false);
          return;
        }
        console.warn("Web Share API con archivos no admitida en esta plataforma:", err);
      }
    }

    // B) En Desktop o WhatsApp Web:
    // 1. Copiamos la imagen al portapapeles del sistema (si existe)
    if (resolvedImageUrl) {
      try {
        const blob = await getImagePngBlob(resolvedImageUrl);
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ]);
          toast.success("📸 ¡Imagen copiada al portapapeles! Al abrir WhatsApp presiona Ctrl + V en el chat.", {
            duration: 6000,
          });
        }
      } catch (err) {
        console.warn("Auto copy image failed:", err);
      }
    }

    // 2. Abrimos WhatsApp con el texto preparado
    const encoded = encodeURIComponent(whatsappMessage);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, "_blank");
    setSharing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                Compartir Ficha Comercial por WhatsApp
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-mono">
                  {product.codigo || `#${product.id}`}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Envía o copia la ficha con imagen real del producto y mensaje detallado listo para el cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)]">
          {/* Card Resumen del Producto con Acciones de Imagen */}
          <div className="p-3 rounded-lg border bg-muted/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-16 rounded-md border overflow-hidden bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-center shadow-xs">
                {resolvedImageUrl ? (
                  <img src={resolvedImageUrl} alt={product.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Package className="size-7 text-muted-foreground" />
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
            </div>

            {/* Acciones para la Imagen Real */}
            {resolvedImageUrl ? (
              <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyImageToClipboard}
                    className="h-7 text-[11px] gap-1 px-2.5 font-medium border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Copia la imagen al portapapeles para pegarla con Ctrl+V en WhatsApp"
                  >
                    {copiedImage ? <Check className="size-3 text-emerald-600" /> : <ImageIcon className="size-3" />}
                    <span>{copiedImage ? "¡Imagen Copiada!" : "Copiar Imagen (Ctrl+V)"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadImage}
                    className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                    title="Descargar archivo de imagen"
                  >
                    <Download className="size-3" />
                    <span>Descargar</span>
                  </Button>
                </div>

                <span className="text-[10px] text-muted-foreground italic hidden sm:inline">
                  Pega en el chat con Ctrl + V
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                ⚠️ Este producto no tiene imagen cargada. Puedes agregarle una en &quot;Editar Foto&quot;.
              </p>
            )}
          </div>

          {/* Banner explicativo para WhatsApp Web */}
          {resolvedImageUrl && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-950 dark:text-emerald-200">
              <Info className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">¿Cómo enviar la imagen en WhatsApp Web (PC)?</span>
                <p className="text-[10.5px] leading-relaxed text-muted-foreground dark:text-emerald-300/80">
                  Al hacer clic en <strong>&quot;Enviar Ficha por WhatsApp&quot;</strong>, el sistema copia automáticamente la imagen a tu portapapeles. Cuando se abra WhatsApp, solo presiona <strong>Ctrl + V</strong> en el chat y se pegará la foto con alta calidad junto al texto.
                </p>
              </div>
            </div>
          )}

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
              Si dejas el número vacío, WhatsApp Web te permitirá seleccionar cualquier chat o grupo.
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
                <span>{copiedText ? "Copiado" : "Copiar Texto"}</span>
              </Button>
            </div>

            <div className="rounded-lg border bg-zinc-950 text-zinc-100 p-3 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text selection:bg-emerald-600 selection:text-white">
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
            {resolvedImageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyImageToClipboard}
                className="h-8 text-xs gap-1 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {copiedImage ? <Check className="size-3.5 text-emerald-600" /> : <ImageIcon className="size-3.5" />}
                <span>{copiedImage ? "¡Copiada!" : "Copiar Imagen"}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="h-8 text-xs gap-1 border-muted-foreground/30 text-foreground hover:bg-muted"
            >
              {copiedText ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copiedText ? "¡Copiado!" : "Copiar Texto"}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleShareWithImage}
              disabled={sharing}
              className="flex-1 sm:flex-initial h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Send className="size-3.5" />
              <span>Enviar Ficha por WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
