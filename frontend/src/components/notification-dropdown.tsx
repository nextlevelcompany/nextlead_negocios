"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  Target,
  DollarSign,
  Truck,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export interface AlertItem {
  id: string;
  modulo: "oportunidad" | "venta" | "pedido" | "mensaje";
  titulo: string;
  descripcion: string;
  tiempo: string;
  prioridad: "alta" | "media" | "urgente";
  url: string;
  referencia_id: any;
}

export function NotificationDropdown() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Inicializar alertas leídas del día actual
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toISOString().substring(0, 10);
    const storedDate = localStorage.getItem("crm_alerts_read_date");
    if (storedDate === today) {
      try {
        const storedIds = JSON.parse(localStorage.getItem("crm_alerts_read_ids") || "[]");
        setReadIds(new Set(storedIds));
      } catch {}
    } else {
      // Nuevo día: restablecer alertas para que vuelvan a avisar al menos una vez al día
      localStorage.setItem("crm_alerts_read_date", today);
      localStorage.setItem("crm_alerts_read_ids", "[]");
      setReadIds(new Set());
    }
  }, []);

  // Cargar alertas desde el backend
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/notifications/alerts");
      if (res.data && Array.isArray(res.data.alerts)) {
        setAlerts(res.data.alerts);
      }
    } catch (err) {
      console.warn("No se pudieron cargar las alertas de notificación:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Polling cada 90 segundos para refrescar alertas en segundo plano
    const interval = setInterval(fetchAlerts, 90000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Alertas activas no leídas hoy
  const unreadAlerts = alerts.filter((a) => !readIds.has(a.id));
  const unreadCount = unreadAlerts.length;

  // Marcar una como leída
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("crm_alerts_read_ids", JSON.stringify(Array.from(updated)));
      }
      return updated;
    });
  };

  // Marcar todas como leídas hoy
  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = new Set(alerts.map((a) => a.id));
    setReadIds(allIds);
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_alerts_read_ids", JSON.stringify(Array.from(allIds)));
    }
  };

  // Clic en la alerta: marcar como leída y navegar a la sección
  const handleAlertClick = (item: AlertItem) => {
    handleMarkAsRead(item.id);
    setOpen(false);
    router.push(item.url);
  };

  // Icono y color por tipo de módulo
  const getModuleMeta = (modulo: AlertItem["modulo"], prioridad: AlertItem["prioridad"]) => {
    switch (modulo) {
      case "oportunidad":
        return {
          icon: <Target className="size-4 text-purple-600 dark:text-purple-400" />,
          bg: "bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
          label: "Oportunidad",
        };
      case "venta":
        return {
          icon: <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
          label: "Venta / Instalación",
        };
      case "pedido":
        return {
          icon: <Truck className="size-4 text-amber-600 dark:text-amber-400" />,
          bg: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
          label: "Logística / Pedido",
        };
      case "mensaje":
        return {
          icon: <MessageSquare className="size-4 text-cyan-600 dark:text-cyan-400" />,
          bg: "bg-cyan-100 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800",
          label: "WhatsApp",
        };
      default:
        return {
          icon: <AlertTriangle className="size-4 text-blue-600 dark:text-blue-400" />,
          bg: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
          label: "Sistema",
        };
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full w-9 h-9 md:w-10 md:h-10 shrink-0"
          title="Notificaciones de Seguimiento Diario"
        >
          <Bell className="size-5 md:size-5.5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none shadow-sm border-2 border-background animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-88 sm:w-96 p-0 rounded-xl shadow-xl border bg-popover">
        {/* Cabecera */}
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Alertas & Seguimiento</span>
            {unreadCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4.5 font-bold">
                {unreadCount} pendientes
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">
                Al día
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchAlerts()}
              disabled={loading}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Refrescar alertas"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 text-[11px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                title="Marcar todas como atendidas hoy"
              >
                <CheckCheck className="size-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Marcar leídas</span>
              </Button>
            )}
          </div>
        </DropdownMenuLabel>

        {/* Lista de Alertas */}
        <ScrollArea className="max-h-96">
          {alerts.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <div className="size-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCheck className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">¡Todo al día!</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                No hay oportunidades, ventas ni pedidos estancados sin actividad en este momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {alerts.map((item) => {
                const meta = getModuleMeta(item.modulo, item.prioridad);
                const isRead = readIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAlertClick(item)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left",
                      isRead
                        ? "opacity-55 hover:opacity-90 hover:bg-muted/40"
                        : "bg-muted/20 hover:bg-muted/50"
                    )}
                  >
                    {/* Icono de Módulo */}
                    <div className={cn("size-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5", meta.bg)}>
                      {meta.icon}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5 shrink-0">
                          <Clock className="size-2.5" />
                          {item.tiempo}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-foreground leading-snug line-clamp-1">
                        {item.titulo}
                      </p>

                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.descripcion}
                      </p>
                    </div>

                    {/* Botón de marcar leído si no está leído */}
                    {!isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="text-muted-foreground/60 hover:text-emerald-600 p-1 shrink-0 mt-1"
                        title="Marcar como leída"
                      >
                        <span className="size-2 rounded-full bg-emerald-500 block" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} alerta(s) requieren atención hoy` : "Sin pendientes hoy"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              router.push("/opportunities/view");
            }}
            className="h-7 text-xs text-primary font-medium gap-1"
          >
            <span>Ver Tablero</span>
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
