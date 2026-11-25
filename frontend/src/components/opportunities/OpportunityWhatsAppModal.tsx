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
import {
  MessageSquare,
  Copy,
  Check,
  Printer,
  ArrowRight,
  Send,
  Building2,
  User,
  Phone,
  Mail,
  Coins,
  Package,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  OpportunityWhatsAppParams,
  buildOpportunityWhatsAppMessage,
  copyOpportunityToClipboard,
  openOpportunityWhatsApp,
} from "./opportunityWhatsApp";

interface OpportunityWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OpportunityWhatsAppParams;
  isNewlyCreated?: boolean;
  onGoToPipeline?: () => void;
}

export function OpportunityWhatsAppModal({
  open,
  onOpenChange,
  data,
  isNewlyCreated = false,
  onGoToPipeline,
}: OpportunityWhatsAppModalProps) {
  const [copied, setCopied] = useState(false);

  const whatsappMessage = useMemo(() => {
    return buildOpportunityWhatsAppMessage(data);
  }, [data]);

  const handleCopy = async () => {
    const ok = await copyOpportunityToClipboard(whatsappMessage);
    if (ok) {
      setCopied(true);
      toast.success("¡Detalles de la oportunidad copiados al portapapeles para WhatsApp!");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("No se pudo copiar automáticamente. Por favor selecciónalo manualmente.");
    }
  };

  const handleSendWhatsApp = () => {
    openOpportunityWhatsApp(data.telefono, whatsappMessage);
  };

  const currencySymbol = data.moneda === "Dólares" ? "$" : "S/";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isNewlyCreated ? "¡Oportunidad Creada con Éxito!" : "Compartir por WhatsApp"}
                </DialogTitle>
                {data.id && (
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
                    #{data.id}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Envía o copia todos los detalles comerciales del cliente, servicios cotizados y montos directamente a WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg border bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Building2 className="size-3" /> Empresa
              </span>
              <p className="font-bold text-foreground truncate mt-0.5" title={data.empresa}>
                {data.empresa || "—"}
              </p>
            </div>

            <div className="p-2 rounded-lg border bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <User className="size-3" /> Contacto
              </span>
              <p className="font-bold text-foreground truncate mt-0.5" title={data.contacto}>
                {data.contacto || "—"}
              </p>
            </div>

            <div className="p-2 rounded-lg border bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Phone className="size-3" /> Teléfono WSP
              </span>
              <p className="font-bold text-emerald-600 font-mono truncate mt-0.5">
                {data.telefono || "No registrado"}
              </p>
            </div>

            <div className="p-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <Coins className="size-3" /> Total Mensual
              </span>
              <p className="font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {currencySymbol} {(data.total_mensual || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Formatted Text Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-emerald-600" />
                Mensaje formateado listo para WhatsApp:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copied ? "¡Copiado!" : "Copiar Texto"}
              </Button>
            </div>

            <div className="relative">
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] sm:text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto border border-slate-800 shadow-inner select-all">
                {whatsappMessage}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {data.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-8 gap-1.5"
              >
                <a href={`/opportunities/print?id=${data.id}`} target="_blank" rel="noreferrer">
                  <Printer className="size-3.5 text-muted-foreground" />
                  Ver PDF
                </a>
              </Button>
            )}

            {onGoToPipeline && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onGoToPipeline}
                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
              >
                Ir al Pipeline
                <ArrowRight className="size-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-8 gap-1.5 font-medium flex-1 sm:flex-none"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar para WSP"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendWhatsApp}
              className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex-1 sm:flex-none"
            >
              <Send className="size-3.5" />
              Enviar por WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
