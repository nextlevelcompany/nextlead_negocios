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
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Store,
  Radio,
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  HelpCircle,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Layers,
  Sparkles,
  Users,
  Smartphone,
  Wifi,
  FileCheck2,
  Boxes,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type ModeloNegocio = "REGULAR" | "TELECOM";

export default function BusinessConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [tipoModelo, setTipoModelo] = useState<ModeloNegocio>("TELECOM");

  // Configuración Negocio Regular
  const [regularConfig, setRegularConfig] = useState({
    nombreComercial: "Comercializadora & Servicios",
    moneda: "PEN",
    cobroDirecto: true,
    controlStock: true,
    margenSugeridoPct: 35,
    comisionVendedorTipo: "PORCENTAJE", // "PORCENTAJE" | "FIJO"
    comisionVendedorValor: 5.0, // 5% o S/ 5 por venta
    metaMensualVentas: 30,
    metodosPago: {
      efectivo: true,
      yapePlin: true,
      transferencia: true,
      tarjeta: true,
    },
    tipoComprobanteDefault: "boleta", // "boleta" | "factura" | "nota_venta"
  });

  // Configuración Negocio Telecomunicaciones
  const [telecomConfig, setTelecomConfig] = useState({
    operadorPrincipal: "ON Negocios",
    operadoresActivos: ["ON Negocios", "Claro Empresas", "Movistar", "Entel Empresas"],
    nuevoOperador: "",
    codigoDealer: "DL-ON-2026",
    modeloComisionAgencia: "FACTOR_CFM", // "FACTOR_CFM" | "MONTO_FIJO" | "ESCALONADO"
    factorCfm: 2.0, // Multiplicador sobre el Cargo Fijo Mensual del plan vendido
    comisionFijaVenta: 150.0, // Monto fijo si aplica
    repartoComisionAsesorPct: 40.0, // 40% para el asesor, 60% para la agencia
    comisionFijaAsesor: 60.0, // O pago fijo por línea/servicio instalado
    asesorComisionTipo: "PORCENTAJE", // "PORCENTAJE" | "FIJO"
    condicionLiquidacion: "INSTALACION_VALIDADA", // "AL_VENDER" | "INSTALACION_VALIDADA" | "COBRO_OPERADOR"
    cicloLiquidacion: "QUINCENAL", // "SEMANAL" | "QUINCENAL" | "MENSUAL"
    diasPermanenciaMinima: 90, // Periodo de clawback / garantía
    requiereFactibilidad: true,
    bonoCumplimientoMeta: 200.0,
    metaLineasMensual: 15,
    gestionaStock: false, // Por defecto en Telecomunicaciones no se compran productos físicos para almacén
  });

  // Simulador interactivo state
  const [simRegularPrecio, setSimRegularPrecio] = useState<number>(180);
  const [simRegularCantidad, setSimRegularCantidad] = useState<number>(1);
  const [simRegularCosto, setSimRegularCosto] = useState<number>(110);

  const [simTelecomCfm, setSimTelecomCfm] = useState<number>(199); // Plan fibra 300 mbps
  const [simTelecomCantidad, setSimTelecomCantidad] = useState<number>(1);

  // Cargar ajustes desde backend
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings");
      const data = res.data || {};

      // Tipo modelo
      if (data["negocio.tipo_modelo"]) {
        setTipoModelo(data["negocio.tipo_modelo"] as ModeloNegocio);
      }

      // Regular
      setRegularConfig((prev) => ({
        ...prev,
        nombreComercial: data["negocio.regular.nombre"] || data["empresa.nombre"] || prev.nombreComercial,
        moneda: data["negocio.regular.moneda"] || prev.moneda,
        cobroDirecto: data["negocio.regular.cobro_directo"] !== "false",
        controlStock: data["negocio.regular.control_stock"] === "true",
        margenSugeridoPct: parseFloat(data["negocio.regular.margen_sugerido"] || "35"),
        comisionVendedorTipo: data["negocio.regular.comision_tipo"] || prev.comisionVendedorTipo,
        comisionVendedorValor: parseFloat(data["negocio.regular.comision_valor"] || "5"),
        metaMensualVentas: parseInt(data["negocio.regular.meta_ventas"] || "30"),
        tipoComprobanteDefault: data["negocio.regular.comprobante_default"] || prev.tipoComprobanteDefault,
        metodosPago: {
          efectivo: data["negocio.regular.pago_efectivo"] !== "false",
          yapePlin: data["negocio.regular.pago_yape"] !== "false",
          transferencia: data["negocio.regular.pago_transferencia"] !== "false",
          tarjeta: data["negocio.regular.pago_tarjeta"] !== "false",
        },
      }));

      // Telecom
      if (data["negocio.telecom.operadores_activos"]) {
        try {
          const ops = JSON.parse(data["negocio.telecom.operadores_activos"]);
          if (Array.isArray(ops) && ops.length > 0) {
            telecomConfig.operadoresActivos = ops;
          }
        } catch (e) {
          // ignore
        }
      }

      setTelecomConfig((prev) => ({
        ...prev,
        operadorPrincipal: data["negocio.telecom.operador_principal"] || prev.operadorPrincipal,
        codigoDealer: data["negocio.telecom.codigo_dealer"] || prev.codigoDealer,
        modeloComisionAgencia: data["negocio.telecom.modelo_comision"] || prev.modeloComisionAgencia,
        factorCfm: parseFloat(data["negocio.telecom.factor_cfm"] || "2.0"),
        comisionFijaVenta: parseFloat(data["negocio.telecom.comision_fija"] || "150"),
        repartoComisionAsesorPct: parseFloat(data["negocio.telecom.reparto_asesor_pct"] || "40"),
        comisionFijaAsesor: parseFloat(data["negocio.telecom.comision_asesor_fija"] || "60"),
        asesorComisionTipo: data["negocio.telecom.asesor_comision_tipo"] || prev.asesorComisionTipo,
        condicionLiquidacion: data["negocio.telecom.condicion_liquidacion"] || prev.condicionLiquidacion,
        cicloLiquidacion: data["negocio.telecom.ciclo_liquidacion"] || prev.cicloLiquidacion,
        diasPermanenciaMinima: parseInt(data["negocio.telecom.dias_permanencia"] || "90"),
        requiereFactibilidad: data["negocio.telecom.requiere_factibilidad"] !== "false",
        bonoCumplimientoMeta: parseFloat(data["negocio.telecom.bono_meta"] || "200"),
        metaLineasMensual: parseInt(data["negocio.telecom.meta_lineas"] || "15"),
        gestionaStock: data["negocio.gestiona_stock"] === "true",
      }));
    } catch (err: any) {
      console.error("Error al cargar configuración:", err);
      toast.error("No se pudo cargar la configuración del negocio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Guardar configuración
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        "negocio.tipo_modelo": tipoModelo,

        // Regular
        "negocio.regular.nombre": regularConfig.nombreComercial,
        "negocio.regular.moneda": regularConfig.moneda,
        "negocio.regular.cobro_directo": regularConfig.cobroDirecto ? "true" : "false",
        "negocio.regular.control_stock": regularConfig.controlStock ? "true" : "false",
        "negocio.regular.margen_sugerido": regularConfig.margenSugeridoPct.toString(),
        "negocio.regular.comision_tipo": regularConfig.comisionVendedorTipo,
        "negocio.regular.comision_valor": regularConfig.comisionVendedorValor.toString(),
        "negocio.regular.meta_ventas": regularConfig.metaMensualVentas.toString(),
        "negocio.regular.comprobante_default": regularConfig.tipoComprobanteDefault,
        "negocio.regular.pago_efectivo": regularConfig.metodosPago.efectivo ? "true" : "false",
        "negocio.regular.pago_yape": regularConfig.metodosPago.yapePlin ? "true" : "false",
        "negocio.regular.pago_transferencia": regularConfig.metodosPago.transferencia ? "true" : "false",
        "negocio.regular.pago_tarjeta": regularConfig.metodosPago.tarjeta ? "true" : "false",

        // Telecom
        "negocio.telecom.operador_principal": telecomConfig.operadorPrincipal,
        "negocio.telecom.operadores_activos": JSON.stringify(telecomConfig.operadoresActivos),
        "negocio.telecom.codigo_dealer": telecomConfig.codigoDealer,
        "negocio.telecom.modelo_comision": telecomConfig.modeloComisionAgencia,
        "negocio.telecom.factor_cfm": telecomConfig.factorCfm.toString(),
        "negocio.telecom.comision_fija": telecomConfig.comisionFijaVenta.toString(),
        "negocio.telecom.reparto_asesor_pct": telecomConfig.repartoComisionAsesorPct.toString(),
        "negocio.telecom.comision_asesor_fija": telecomConfig.comisionFijaAsesor.toString(),
        "negocio.telecom.asesor_comision_tipo": telecomConfig.asesorComisionTipo,
        "negocio.telecom.condicion_liquidacion": telecomConfig.condicionLiquidacion,
        "negocio.telecom.ciclo_liquidacion": telecomConfig.cicloLiquidacion,
        "negocio.telecom.dias_permanencia": telecomConfig.diasPermanenciaMinima.toString(),
        "negocio.telecom.requiere_factibilidad": telecomConfig.requiereFactibilidad ? "true" : "false",
        "negocio.telecom.bono_meta": telecomConfig.bonoCumplimientoMeta.toString(),
        "negocio.telecom.meta_lineas": telecomConfig.metaLineasMensual.toString(),
        "negocio.gestiona_stock": (tipoModelo === "REGULAR" ? regularConfig.controlStock : telecomConfig.gestionaStock) ? "true" : "false",
      };

      await api.post("/api/settings", payload);

      if (typeof window !== "undefined") {
        localStorage.setItem("negocio.tipo_modelo", tipoModelo);
        localStorage.setItem("negocio.gestiona_stock", payload["negocio.gestiona_stock"]);
        window.dispatchEvent(new Event("business-settings-changed"));
      }

      toast.success("¡Configuración del modelo de negocio guardada exitosamente!");
    } catch (err: any) {
      console.error("Error al guardar:", err);
      toast.error("Ocurrió un error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  // Agregar operador telco
  const handleAddOperador = () => {
    if (!telecomConfig.nuevoOperador.trim()) return;
    const name = telecomConfig.nuevoOperador.trim();
    if (!telecomConfig.operadoresActivos.includes(name)) {
      setTelecomConfig((prev) => ({
        ...prev,
        operadoresActivos: [...prev.operadoresActivos, name],
        nuevoOperador: "",
      }));
    }
  };

  const handleRemoveOperador = (op: string) => {
    if (telecomConfig.operadoresActivos.length <= 1) {
      toast.warning("Debe haber al menos un operador activo.");
      return;
    }
    setTelecomConfig((prev) => ({
      ...prev,
      operadoresActivos: prev.operadoresActivos.filter((o) => o !== op),
      operadorPrincipal: prev.operadorPrincipal === op ? prev.operadoresActivos.find((o) => o !== op) || "" : prev.operadorPrincipal,
    }));
  };

  // Cálculos del simulador
  // 1. Regular
  const simRegularTotal = simRegularPrecio * simRegularCantidad;
  const simRegularCostoTotal = simRegularCosto * simRegularCantidad;
  const simRegularMargenBruto = simRegularTotal - simRegularCostoTotal;
  const simRegularComisionVendedor =
    regularConfig.comisionVendedorTipo === "PORCENTAJE"
      ? (simRegularTotal * regularConfig.comisionVendedorValor) / 100
      : regularConfig.comisionVendedorValor * simRegularCantidad;
  const simRegularUtilidadNeta = simRegularMargenBruto - simRegularComisionVendedor;

  // 2. Telecom
  const simTelecomComisionOperadorBruta =
    telecomConfig.modeloComisionAgencia === "FACTOR_CFM"
      ? simTelecomCfm * telecomConfig.factorCfm * simTelecomCantidad
      : telecomConfig.comisionFijaVenta * simTelecomCantidad;

  const simTelecomComisionAsesor =
    telecomConfig.asesorComisionTipo === "PORCENTAJE"
      ? (simTelecomComisionOperadorBruta * telecomConfig.repartoComisionAsesorPct) / 100
      : telecomConfig.comisionFijaAsesor * simTelecomCantidad;

  const simTelecomUtilidadAgencia = simTelecomComisionOperadorBruta - simTelecomComisionAsesor;

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Configuración del Modelo de Negocio
            </h1>
            <Badge
              variant="outline"
              className={
                tipoModelo === "TELECOM"
                  ? "bg-sky-500/10 text-sky-600 border-sky-300 font-semibold"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-300 font-semibold"
              }
            >
              {tipoModelo === "TELECOM" ? "📡 Telecomunicaciones (Comisiones)" : "💼 Negocio Regular (Venta Directa)"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Define cómo opera tu empresa: cobro directo al cliente final por producto/servicio vendido o ventas por comisiones con operadores de telecomunicaciones.
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
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow"
          >
            <Save className="size-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Selector de Modelo Principal (2 Tarjetas Interactivas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tarjeta 1: Negocio Regular */}
        <div
          onClick={() => setTipoModelo("REGULAR")}
          className={`cursor-pointer rounded-xl border-2 p-5 transition-all relative flex flex-col justify-between ${
            tipoModelo === "REGULAR"
              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-400/20"
              : "border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/30"
          }`}
        >
          {tipoModelo === "REGULAR" && (
            <div className="absolute top-4 right-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="size-4" />
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Store className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Negocio Regular</h3>
                <p className="text-xs text-muted-foreground">Comercio, Distribución y Venta Directa</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">Se cobra de acuerdo a lo que se vende al cliente.</strong> El cliente paga el valor total del producto o servicio directamente a tu empresa (Boleta/Factura).
            </p>
            <ul className="text-xs space-y-2 text-muted-foreground border-t pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Cobro directo: El cliente te paga el 100% de la venta.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Margen comercial tradicional: Ganancia = Precio de Venta - Costo.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Control de inventario, compras de stock y despachos físicos.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Comisión al vendedor calculada sobre el total vendido.</span>
              </li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">
              {tipoModelo === "REGULAR" ? "Modelo Seleccionado Actualmente" : "Haga clic para activar este modelo"}
            </span>
            <Button
              size="sm"
              variant={tipoModelo === "REGULAR" ? "default" : "outline"}
              className={tipoModelo === "REGULAR" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {tipoModelo === "REGULAR" ? "Activo" : "Seleccionar"}
            </Button>
          </div>
        </div>

        {/* Tarjeta 2: Negocio Telecomunicaciones */}
        <div
          onClick={() => setTipoModelo("TELECOM")}
          className={`cursor-pointer rounded-xl border-2 p-5 transition-all relative flex flex-col justify-between ${
            tipoModelo === "TELECOM"
              ? "border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 shadow-md ring-2 ring-sky-400/20"
              : "border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/30"
          }`}
        >
          {tipoModelo === "TELECOM" && (
            <div className="absolute top-4 right-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white">
                <CheckCircle2 className="size-4" />
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600">
                <Radio className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Ventas Telecomunicaciones</h3>
                <p className="text-xs text-muted-foreground">Canal de Ventas, Dealer & Broker Telco</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">Se cobran comisiones según las ventas y activaciones.</strong> No se cobra lo que se vende al cliente: el cliente paga su mensualidad al operador (ON Negocios, Claro, Movistar, etc.) y la empresa cobra comisiones liquidadas por el operador.
            </p>
            <ul className="text-xs space-y-2 text-muted-foreground border-t pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                <span>El cliente contrata el plan y abona directamente al operador.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                <span>Ingreso por Comisión de Activación (Factor CFM o Monto Fijo).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                <span>Finanzas centradas en Gastos Operativos y Flujo de Caja.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                <span>Módulo de Compras modular (visible solo si vendes hardware propio).</span>
              </li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t flex items-center justify-between">
            <span className="text-xs font-medium text-sky-600">
              {tipoModelo === "TELECOM" ? "Modelo Seleccionado Actualmente" : "Haga clic para activar este modelo"}
            </span>
            <Button
              size="sm"
              variant={tipoModelo === "TELECOM" ? "default" : "outline"}
              className={tipoModelo === "TELECOM" ? "bg-sky-600 hover:bg-sky-700" : ""}
            >
              {tipoModelo === "TELECOM" ? "Activo" : "Seleccionar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Pestañas de Configuración y Simulador */}
      <Tabs defaultValue="parametros" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="parametros" className="gap-2">
            <Layers className="size-4" />
            Parámetros del Modelo
          </TabsTrigger>
          <TabsTrigger value="simulador" className="gap-2">
            <Calculator className="size-4" />
            Simulador en Vivo
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PARÁMETROS */}
        <TabsContent value="parametros" className="mt-4 space-y-6">
          {tipoModelo === "REGULAR" ? (
            /* CONFIGURACIÓN NEGOCIO REGULAR */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Store className="size-5" />
                    Parámetros de Venta Directa (Negocio Regular)
                  </CardTitle>
                  <CardDescription>
                    Configuración de ventas donde se factura y cobra directamente el importe de los productos al cliente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-nombre">Nombre Comercial del Negocio</Label>
                      <Input
                        id="reg-nombre"
                        value={regularConfig.nombreComercial}
                        onChange={(e) =>
                          setRegularConfig({ ...regularConfig, nombreComercial: e.target.value })
                        }
                        placeholder="Ej. Comercializadora Lima SAC"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-moneda">Moneda de Facturación</Label>
                      <select
                        id="reg-moneda"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={regularConfig.moneda}
                        onChange={(e) =>
                          setRegularConfig({ ...regularConfig, moneda: e.target.value })
                        }
                      >
                        <option value="PEN">Soles (PEN - S/)</option>
                        <option value="USD">Dólares Americanos (USD - $)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-comprobante">Comprobante Predeterminado</Label>
                      <select
                        id="reg-comprobante"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={regularConfig.tipoComprobanteDefault}
                        onChange={(e) =>
                          setRegularConfig({
                            ...regularConfig,
                            tipoComprobanteDefault: e.target.value,
                          })
                        }
                      >
                        <option value="boleta">Boleta de Venta</option>
                        <option value="factura">Factura Electrónica</option>
                        <option value="nota_venta">Nota de Venta / Recibo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-margen">Margen Comercial Sugerido (%)</Label>
                      <div className="relative">
                        <Input
                          id="reg-margen"
                          type="number"
                          value={regularConfig.margenSugeridoPct}
                          onChange={(e) =>
                            setRegularConfig({
                              ...regularConfig,
                              margenSugeridoPct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="pr-8"
                        />
                        <Percent className="size-4 absolute right-2.5 top-2.5 text-muted-foreground" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Margen sugerido sobre el costo de adquisición.</p>
                    </div>
                  </div>

                  {/* Switches de Operación */}
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Cobro Directo al Cliente</Label>
                        <p className="text-xs text-muted-foreground">
                          El cliente paga el importe directamente a la cuenta/caja de tu empresa.
                        </p>
                      </div>
                      <Switch
                        checked={regularConfig.cobroDirecto}
                        onCheckedChange={(checked) =>
                          setRegularConfig({ ...regularConfig, cobroDirecto: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Control de Stock e Inventario (Compras Activas)</Label>
                        <p className="text-xs text-muted-foreground">
                          Descontar existencias en ventas y habilitar módulo de Compras de mercadería en Finanzas.
                        </p>
                      </div>
                      <Switch
                        checked={regularConfig.controlStock}
                        onCheckedChange={(checked) =>
                          setRegularConfig({ ...regularConfig, controlStock: checked })
                        }
                      />
                    </div>
                  </div>

                  {/* Métodos de Pago Aceptados */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Métodos de Cobro Habilitados al Cliente</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: "efectivo", label: "Efectivo" },
                        { key: "yapePlin", label: "Yape / Plin" },
                        { key: "transferencia", label: "Transferencia BCP/BBVA" },
                        { key: "tarjeta", label: "Tarjeta Crédito/Débito" },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center space-x-2 border rounded-md p-2.5 bg-card"
                        >
                          <Switch
                            id={`pay-${item.key}`}
                            size="sm"
                            checked={
                              (regularConfig.metodosPago as any)[item.key]
                            }
                            onCheckedChange={(checked) =>
                              setRegularConfig({
                                ...regularConfig,
                                metodosPago: {
                                  ...regularConfig.metodosPago,
                                  [item.key]: checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor={`pay-${item.key}`} className="text-xs font-medium cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Columna Derecha: Comisiones Vendedor Regular */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Users className="size-5" />
                    Comisiones de Vendedores
                  </CardTitle>
                  <CardDescription>
                    Incentivos del equipo comercial en venta directa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Comisión al Asesor</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={regularConfig.comisionVendedorTipo === "PORCENTAJE" ? "default" : "outline"}
                        className={regularConfig.comisionVendedorTipo === "PORCENTAJE" ? "bg-emerald-600" : ""}
                        onClick={() =>
                          setRegularConfig({ ...regularConfig, comisionVendedorTipo: "PORCENTAJE" })
                        }
                      >
                        % Porcentaje Venta
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={regularConfig.comisionVendedorTipo === "FIJO" ? "default" : "outline"}
                        className={regularConfig.comisionVendedorTipo === "FIJO" ? "bg-emerald-600" : ""}
                        onClick={() =>
                          setRegularConfig({ ...regularConfig, comisionVendedorTipo: "FIJO" })
                        }
                      >
                        S/ Monto Fijo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-comision-val">
                      {regularConfig.comisionVendedorTipo === "PORCENTAJE"
                        ? "Porcentaje de Comisión (%)"
                        : "Comisión Fija por Pedido (S/)"}
                    </Label>
                    <Input
                      id="reg-comision-val"
                      type="number"
                      value={regularConfig.comisionVendedorValor}
                      onChange={(e) =>
                        setRegularConfig({
                          ...regularConfig,
                          comisionVendedorValor: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-meta">Meta Mensual de Ventas (Pedidos)</Label>
                    <Input
                      id="reg-meta"
                      type="number"
                      value={regularConfig.metaMensualVentas}
                      onChange={(e) =>
                        setRegularConfig({
                          ...regularConfig,
                          metaMensualVentas: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="rounded-lg p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-4" />
                      Regla Comercial Activa
                    </div>
                    <p>
                      Por cada venta cerrada, el asesor recibe{" "}
                      <strong>
                        {regularConfig.comisionVendedorTipo === "PORCENTAJE"
                          ? `${regularConfig.comisionVendedorValor}% del monto total vendido`
                          : `S/ ${regularConfig.comisionVendedorValor.toFixed(2)} fijos`}
                      </strong>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* CONFIGURACIÓN NEGOCIO TELECOMUNICACIONES */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-600">
                    <Radio className="size-5" />
                    Esquema de Comisiones con Operadores Telecom
                  </CardTitle>
                  <CardDescription>
                    Parámetros de liquidación donde el operador paga comisiones a tu empresa según las ventas y planes activados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Operador Principal y Código Dealer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tel-op-principal">Operador Principal / Contrata</Label>
                      <select
                        id="tel-op-principal"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={telecomConfig.operadorPrincipal}
                        onChange={(e) =>
                          setTelecomConfig({ ...telecomConfig, operadorPrincipal: e.target.value })
                        }
                      >
                        {telecomConfig.operadoresActivos.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tel-dealer">Código de Dealer / Agencia</Label>
                      <Input
                        id="tel-dealer"
                        value={telecomConfig.codigoDealer}
                        onChange={(e) =>
                          setTelecomConfig({ ...telecomConfig, codigoDealer: e.target.value })
                        }
                        placeholder="Ej. DL-ON-2026 / AG-CLARO-44"
                      />
                    </div>
                  </div>

                  {/* Operadores Activos (Chips) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Operadores Disponibles en el Catálogo
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {telecomConfig.operadoresActivos.map((op) => (
                        <Badge
                          key={op}
                          variant="secondary"
                          className="px-3 py-1 text-xs gap-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-300/40"
                        >
                          {op}
                          {op === telecomConfig.operadorPrincipal && (
                            <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded-full">
                              Principal
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveOperador(op)}
                            className="hover:text-destructive ml-1"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 max-w-sm mt-2">
                      <Input
                        placeholder="Nuevo operador (ej. Win, Wow)"
                        value={telecomConfig.nuevoOperador}
                        onChange={(e) =>
                          setTelecomConfig({ ...telecomConfig, nuevoOperador: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddOperador}
                        className="h-8 text-xs"
                      >
                        + Agregar
                      </Button>
                    </div>
                  </div>

                  {/* Modelo de Comisión que paga el Operador a la Empresa */}
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div>
                      <Label className="text-sm font-bold text-foreground">
                        Modalidad de Comisión del Operador (Ingreso de tu Empresa)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        El cliente no te paga el servicio; paga al operador. ¿Cómo te liquida el operador la comisión por cada venta?
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() =>
                          setTelecomConfig({ ...telecomConfig, modeloComisionAgencia: "FACTOR_CFM" })
                        }
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          telecomConfig.modeloComisionAgencia === "FACTOR_CFM"
                            ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-foreground">Factor sobre Cargo Fijo (CFM)</span>
                          {telecomConfig.modeloComisionAgencia === "FACTOR_CFM" && (
                            <CheckCircle2 className="size-3.5 text-sky-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Multiplica el cargo mensual del plan (ej. 2.0x el plan de S/ 199 = S/ 398 de comisión).
                        </p>
                      </div>

                      <div
                        onClick={() =>
                          setTelecomConfig({ ...telecomConfig, modeloComisionAgencia: "MONTO_FIJO" })
                        }
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          telecomConfig.modeloComisionAgencia === "MONTO_FIJO"
                            ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-foreground">Comisión Fija por Venta</span>
                          {telecomConfig.modeloComisionAgencia === "MONTO_FIJO" && (
                            <CheckCircle2 className="size-3.5 text-sky-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Monto fijo acordado por cada activación independientemente del valor del plan.
                        </p>
                      </div>
                    </div>

                    {telecomConfig.modeloComisionAgencia === "FACTOR_CFM" ? (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="tel-factor">Factor Multiplicador de Comisión (x CFM)</Label>
                          <Badge variant="outline" className="font-mono text-sky-600 bg-sky-500/10">
                            {telecomConfig.factorCfm.toFixed(2)}x
                          </Badge>
                        </div>
                        <Input
                          id="tel-factor"
                          type="number"
                          step="0.1"
                          value={telecomConfig.factorCfm}
                          onChange={(e) =>
                            setTelecomConfig({
                              ...telecomConfig,
                              factorCfm: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ej. 1.8, 2.0, 2.5"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="tel-monto-fijo">Comisión Fija Pagada por el Operador (S/)</Label>
                        <Input
                          id="tel-monto-fijo"
                          type="number"
                          value={telecomConfig.comisionFijaVenta}
                          onChange={(e) =>
                            setTelecomConfig({
                              ...telecomConfig,
                              comisionFijaVenta: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ej. 150.00"
                        />
                      </div>
                    )}
                  </div>

                  {/* Condiciones de Liquidación */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tel-condicion">Momento de Liquidación</Label>
                      <select
                        id="tel-condicion"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={telecomConfig.condicionLiquidacion}
                        onChange={(e) =>
                          setTelecomConfig({
                            ...telecomConfig,
                            condicionLiquidacion: e.target.value,
                          })
                        }
                      >
                        <option value="INSTALACION_VALIDADA">Instalación Validada</option>
                        <option value="AL_VENDER">Al Registrar Venta</option>
                        <option value="COBRO_OPERADOR">Al Cobrar del Operador</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tel-ciclo">Frecuencia de Liquidación</Label>
                      <select
                        id="tel-ciclo"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={telecomConfig.cicloLiquidacion}
                        onChange={(e) =>
                          setTelecomConfig({
                            ...telecomConfig,
                            cicloLiquidacion: e.target.value,
                          })
                        }
                      >
                        <option value="SEMANAL">Semanal (Viernes)</option>
                        <option value="QUINCENAL">Quincenal (15 y 30)</option>
                        <option value="MENSUAL">Fin de Mes</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tel-permanencia">Garantía / Clawback (Días)</Label>
                      <Input
                        id="tel-permanencia"
                        type="number"
                        value={telecomConfig.diasPermanenciaMinima}
                        onChange={(e) =>
                          setTelecomConfig({
                            ...telecomConfig,
                            diasPermanenciaMinima: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Modularización: Compras e Inventario de Hardware Propio */}
                  <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold text-foreground">
                            ¿Tu agencia compra y comercializa hardware propio? (Routers, Equipos, Chips)
                          </Label>
                          <Badge
                            variant="outline"
                            className={
                              telecomConfig.gestionaStock
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-400 font-semibold"
                                : "bg-muted text-muted-foreground font-semibold"
                            }
                          >
                            {telecomConfig.gestionaStock ? "Módulo Compras Visible" : "Solo Gastos Operativos"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {telecomConfig.gestionaStock
                            ? "El módulo de Compras está VISIBLE en el menú Finanzas para registrar compras de stock físico que entran a tu almacén."
                            : "Por defecto en telecomunicaciones puras el módulo Compras se oculta del menú Finanzas, dejando Gastos y Flujo de Caja como principales. Actívalo si tu empresa compra routers MikroTik, terminales o insumos propios para revender."}
                        </p>
                      </div>
                      <Switch
                        checked={telecomConfig.gestionaStock}
                        onCheckedChange={(checked) =>
                          setTelecomConfig({ ...telecomConfig, gestionaStock: checked })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Columna Derecha: Comisión al Asesor / Ejecutivo Telco */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-600">
                    <Users className="size-5" />
                    Comisión para el Asesor
                  </CardTitle>
                  <CardDescription>
                    Reparto de la comisión del operador entre la agencia y el vendedor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Forma de Pago al Asesor</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={telecomConfig.asesorComisionTipo === "PORCENTAJE" ? "default" : "outline"}
                        className={telecomConfig.asesorComisionTipo === "PORCENTAJE" ? "bg-sky-600" : ""}
                        onClick={() =>
                          setTelecomConfig({ ...telecomConfig, asesorComisionTipo: "PORCENTAJE" })
                        }
                      >
                        % Reparto de Comisión
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={telecomConfig.asesorComisionTipo === "FIJO" ? "default" : "outline"}
                        className={telecomConfig.asesorComisionTipo === "FIJO" ? "bg-sky-600" : ""}
                        onClick={() =>
                          setTelecomConfig({ ...telecomConfig, asesorComisionTipo: "FIJO" })
                        }
                      >
                        S/ Monto Fijo
                      </Button>
                    </div>
                  </div>

                  {telecomConfig.asesorComisionTipo === "PORCENTAJE" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tel-asesor-pct">Porcentaje para el Asesor</Label>
                        <Badge variant="outline" className="text-sky-600 font-mono">
                          {telecomConfig.repartoComisionAsesorPct}%
                        </Badge>
                      </div>
                      <Input
                        id="tel-asesor-pct"
                        type="number"
                        value={telecomConfig.repartoComisionAsesorPct}
                        onChange={(e) =>
                          setTelecomConfig({
                            ...telecomConfig,
                            repartoComisionAsesorPct: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        La agencia retiene el {100 - telecomConfig.repartoComisionAsesorPct}% de la comisión que paga el operador.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="tel-asesor-fijo">Pago Fijo al Asesor por Instalación (S/)</Label>
                      <Input
                        id="tel-asesor-fijo"
                        type="number"
                        value={telecomConfig.comisionFijaAsesor}
                        onChange={(e) =>
                          setTelecomConfig({
                            ...telecomConfig,
                            comisionFijaAsesor: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="tel-meta">Meta Mensual de Líneas / Servicios</Label>
                    <Input
                      id="tel-meta"
                      type="number"
                      value={telecomConfig.metaLineasMensual}
                      onChange={(e) =>
                        setTelecomConfig({
                          ...telecomConfig,
                          metaLineasMensual: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tel-bono">Bono Extra por Cumplir Meta (S/)</Label>
                    <Input
                      id="tel-bono"
                      type="number"
                      value={telecomConfig.bonoCumplimientoMeta}
                      onChange={(e) =>
                        setTelecomConfig({
                          ...telecomConfig,
                          bonoCumplimientoMeta: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SIMULADOR */}
        <TabsContent value="simulador" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-5 text-primary" />
                Simulador Comparativo de Flujo de Dinero y Comisiones
              </CardTitle>
              <CardDescription>
                Comprueba en tiempo real cómo se calculan los cobros e ingresos en el modelo actual configurado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tipoModelo === "REGULAR" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label htmlFor="sim-reg-precio">Precio de Venta al Cliente (S/)</Label>
                      <Input
                        id="sim-reg-precio"
                        type="number"
                        value={simRegularPrecio}
                        onChange={(e) => setSimRegularPrecio(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-reg-cant">Cantidad Vendida</Label>
                      <Input
                        id="sim-reg-cant"
                        type="number"
                        min="1"
                        value={simRegularCantidad}
                        onChange={(e) => setSimRegularCantidad(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-reg-costo">Costo Unitario del Producto (S/)</Label>
                      <Input
                        id="sim-reg-costo"
                        type="number"
                        value={simRegularCosto}
                        onChange={(e) => setSimRegularCosto(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/20">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Total Cobrado al Cliente
                      </span>
                      <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                        S/ {simRegularTotal.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Pago directo ingresado a tu caja
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-card">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Costo de Mercadería
                      </span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        S/ {simRegularCostoTotal.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Inversión en productos
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-card">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Comisión Asesor (
                        {regularConfig.comisionVendedorTipo === "PORCENTAJE"
                          ? `${regularConfig.comisionVendedorValor}%`
                          : "Fijo"}
                        )
                      </span>
                      <div className="text-2xl font-bold text-amber-600 mt-1">
                        S/ {simRegularComisionVendedor.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Pago al vendedor por la venta
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-primary/10 border-primary/20">
                      <span className="text-xs font-semibold text-primary">
                        Utilidad Neta de la Empresa
                      </span>
                      <div className="text-2xl font-bold text-primary mt-1">
                        S/ {simRegularUtilidadNeta.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Ganancia limpia final
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label htmlFor="sim-tel-cfm">
                        Cargo Fijo Mensual del Plan (CFM) S/
                      </Label>
                      <Input
                        id="sim-tel-cfm"
                        type="number"
                        value={simTelecomCfm}
                        onChange={(e) => setSimTelecomCfm(parseFloat(e.target.value) || 0)}
                        placeholder="Ej. 199 (Plan Fibra 300 Mbps)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-tel-cant">Cantidad de Planes / Líneas</Label>
                      <Input
                        id="sim-tel-cant"
                        type="number"
                        min="1"
                        value={simTelecomCantidad}
                        onChange={(e) => setSimTelecomCantidad(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border p-4 bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Pago del Cliente al Operador
                      </span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        S/ {(simTelecomCfm * simTelecomCantidad).toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground"> /mes</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        El cliente paga al operador, no al CRM
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-sky-500/10 border-sky-500/20">
                      <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                        Comisión Bruta del Operador ({telecomConfig.modeloComisionAgencia === "FACTOR_CFM" ? `${telecomConfig.factorCfm}x CFM` : "Fijo"})
                      </span>
                      <div className="text-2xl font-bold text-sky-800 dark:text-sky-200 mt-1">
                        S/ {simTelecomComisionOperadorBruta.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Ingreso que el operador te liquida
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/20">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Comisión del Asesor ({telecomConfig.asesorComisionTipo === "PORCENTAJE" ? `${telecomConfig.repartoComisionAsesorPct}%` : `S/ ${telecomConfig.comisionFijaAsesor}`})
                      </span>
                      <div className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1">
                        S/ {simTelecomComisionAsesor.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Pago al vendedor tras instalación
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/20">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Ganancia Neta de tu Agencia
                      </span>
                      <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                        S/ {simTelecomUtilidadAgencia.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Retención neta de la agencia
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
