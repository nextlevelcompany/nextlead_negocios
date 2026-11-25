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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Coins,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  OpportunityWhatsAppParams,
  buildOpportunityWhatsAppMessage,
  buildOpportunityConditionsMessage,
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
  const [activeTab, setActiveTab] = useState<string>("detalle");
  const [copiedDetail, setCopiedDetail] = useState(false);
  const [copiedConditions, setCopiedConditions] = useState(false);

  // Mensaje limpio únicamente con los detalles de la oportunidad (sin condiciones extensas de servicio)
  const whatsappDetailMessage = useMemo(() => {
    return buildOpportunityWhatsAppMessage(data, false);
  }, [data]);

  // Mensaje separado para las condiciones del servicio
  const conditionsMessage = useMemo(() => {
    return buildOpportunityConditionsMessage(data);
  }, [data]);

  const handleCopyDetail = async () => {
    const ok = await copyOpportunityToClipboard(whatsappDetailMessage);
    if (ok) {
      setCopiedDetail(true);
      toast.success("¡Detalle de la cotización copiado al portapapeles!");
      setTimeout(() => setCopiedDetail(false), 2500);
    } else {
      toast.error("No se pudo copiar automáticamente. Por favor selecciónalo manualmente.");
    }
  };

  const handleCopyConditions = async () => {
    const ok = await copyOpportunityToClipboard(conditionsMessage);
    if (ok) {
      setCopiedConditions(true);
      toast.success("¡Condiciones comerciales copiadas al portapapeles!");
      setTimeout(() => setCopiedConditions(false), 2500);
    } else {
      toast.error("No se pudo copiar automáticamente.");
    }
  };

  const handleSendWhatsApp = () => {
    openOpportunityWhatsApp(data.telefono, whatsappDetailMessage);
  };

  const currencySymbol = data.moneda === "Dólares" ? "$" : "S/";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isNewlyCreated ? "¡Oportunidad Creada con Éxito!" : "Compartir Cotización por WhatsApp"}
                </DialogTitle>
                {data.id && (
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
                    #{data.id}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Copia el detalle comercial o envíalo directamente a WhatsApp con un solo clic.
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

          {/* Pestañas: Detalle de Cotización vs Condiciones del Servicio */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="bg-muted/60 p-0.5 h-8">
                <TabsTrigger value="detalle" className="text-xs gap-1.5 h-7">
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  Detalle de Propuesta
                </TabsTrigger>
                {Boolean(data.condiciones) && (
                  <TabsTrigger value="condiciones" className="text-xs gap-1.5 h-7">
                    <FileText className="size-3.5 text-indigo-600" />
                    Condiciones del Servicio
                  </TabsTrigger>
                )}
              </TabsList>

              {activeTab === "detalle" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDetail}
                  className="h-7 text-xs gap-1.5 border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                >
                  {copiedDetail ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  {copiedDetail ? "¡Detalle Copiado!" : "Copiar Detalle"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyConditions}
                  className="h-7 text-xs gap-1.5 border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-medium"
                >
                  {copiedConditions ? <Check className="size-3.5 text-indigo-600" /> : <Copy className="size-3.5" />}
                  {copiedConditions ? "¡Condiciones Copiadas!" : "Copiar Condiciones"}
                </Button>
              )}
            </div>

            {/* Pestaña 1: Detalle limpio de cotización */}
            <TabsContent value="detalle" className="m-0 focus-visible:outline-hidden">
              <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/15 p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/50 dark:border-emerald-800/30 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                  <span>Mensaje listo para enviar a WhatsApp (Sin cláusulas extensas)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Haz clic en copiar o enviar directo</span>
                </div>
                <div className="max-h-[280px] overflow-y-auto pr-1 text-xs sm:text-[13px] text-foreground leading-relaxed font-sans whitespace-pre-wrap select-all">
                  {whatsappDetailMessage}
                </div>
              </div>
            </TabsContent>

            {/* Pestaña 2: Condiciones del servicio por separado */}
            {Boolean(data.condiciones) && (
              <TabsContent value="condiciones" className="m-0 focus-visible:outline-hidden">
                <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-800/40 bg-indigo-50/20 dark:bg-indigo-950/15 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-200/50 dark:border-indigo-800/30 text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold">
                    <span>Cláusulas y Condiciones del Servicio (Opcional para cliente)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Términos contractuales</span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto pr-1 text-xs text-foreground leading-relaxed font-sans whitespace-pre-wrap select-all">
                    {data.condiciones}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
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
              onClick={handleCopyDetail}
              className="text-xs h-8 gap-1.5 font-medium flex-1 sm:flex-none border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
            >
              {copiedDetail ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copiedDetail ? "Copiado" : "Copiar Detalle"}
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
