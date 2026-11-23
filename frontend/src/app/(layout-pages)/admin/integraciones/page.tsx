"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Sparkles,
  Bot,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit,
  ArrowUpDown,
  ShoppingBag,
  Sliders,
  MapPin,
  Upload,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface KnowledgeBaseItem {
  id?: number;
  category: string;
  keywords: string;
  answer: string;
  attachmentUrl?: string;
  attachmentType: string; // IMAGE, PDF, AUDIO, NONE
  intent?: string;
  active: boolean;
  priority: number;
  mediaIdWhatsapp?: string;
  mediaCaption?: string;
}

interface ProductConfigItem {
  id?: number;
  productoId: number;
  aiEnabled: boolean;
  searchKeywords?: string;
  customAiDescription?: string;
  intent?: string;
  priority: number;
  mediaIdWhatsapp?: string;
  imageCaption?: string;
  productCode?: string;
  productName?: string;
  productPrice?: string;
  productImage?: string;
}

interface ShippingCoverageItem {
  id?: number;
  districtName: string;
  deliveryFee: number;
  minOrderAmount: number;
  isActive: boolean;
  aliases?: string;
}

export default function IntegracionesPage() {
  const [activeTab, setActiveTab] = useState("meta");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Testing states
  const [testingMeta, setTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<any>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<any>(null);

  // General Settings Form
  const [form, setForm] = useState({
    // Meta / Facebook WhatsApp
    "whatsapp.api.token": "",
    "whatsapp.phone.id": "",
    "whatsapp.waba.id": "",
    "whatsapp.verify.token": "nextlead_verify_token",
    "whatsapp.api.version": "v18.0",

    // Google Gemini AI
    "gemini.api.key": "",
    "gemini.model": "gemini-1.5-flash",
    "ai.agent.name": "Asistente Virtual",
    "ai.business.description": "Venta de productos y servicios",
    "ai.tone": "amigable",
    "ai.custom.instructions": "",
    "ai.payment.methods": "",
    "ai.greeting.new": "¡Hola! Gracias por comunicarte con nosotros. ¿En qué te podemos ayudar hoy?",
    "ai.greeting.registered": "¡Bienvenido de vuelta! ¿En qué podemos ayudarte hoy?",

    // Flow behavior
    "ai.products.promotion": "true",
    "ai.products.promotion.keywords": "promocion, especial, oferta, descuento, promo, combo, paquete, pack",
    "ai.order.collect": "true",
    "ai.collect.location": "true",
    "ai.collect.document": "true",
    "ai.ask.container": "false",
  });

  // Data lists
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [productsConfig, setProductsConfig] = useState<ProductConfigItem[]>([]);
  const [shippingCoverage, setShippingCoverage] = useState<ShippingCoverageItem[]>([]);

  // Search & filter states
  const [kbSearch, setKbSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [shippingSearch, setShippingSearch] = useState("");

  // Modals & Editing
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [currentKb, setCurrentKb] = useState<KnowledgeBaseItem>({
    category: "General",
    keywords: "",
    answer: "",
    attachmentUrl: "",
    attachmentType: "NONE",
    active: true,
    priority: 10,
    mediaCaption: "",
  });

  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [currentShipping, setCurrentShipping] = useState<ShippingCoverageItem>({
    districtName: "",
    deliveryFee: 0,
    minOrderAmount: 0,
    isActive: true,
    aliases: "",
  });

  const kbFileInputRef = useRef<HTMLInputElement | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:8081/api/whatsapp/webhook`
      : "https://tudominio.com/api/whatsapp/webhook";

  // Load all configurations
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [settingsRes, kbRes, prodRes, shipRes] = await Promise.all([
        api.get<Record<string, string>>("/api/settings"),
        api.get<KnowledgeBaseItem[]>("/api/ai/knowledge-base"),
        api.get<ProductConfigItem[]>("/api/ai/products-config"),
        api.get<ShippingCoverageItem[]>("/api/ai/shipping-coverage"),
      ]);

      if (settingsRes.data) {
        setForm((prev) => ({
          ...prev,
          ...settingsRes.data,
        }));
      }
      if (Array.isArray(kbRes.data)) {
        // Sort ascending by priority (1, 2, 3...)
        setKnowledgeBase(kbRes.data.sort((a, b) => (a.priority || 100) - (b.priority || 100)));
      }
      if (Array.isArray(prodRes.data)) {
        setProductsConfig(prodRes.data.sort((a, b) => (a.priority || 100) - (b.priority || 100)));
      }
      if (Array.isArray(shipRes.data)) {
        setShippingCoverage(shipRes.data);
      }
    } catch (err) {
      console.error("Error al cargar configuraciones de IA:", err);
      toast.error("Error al cargar datos desde el backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.post("/api/settings", form);
      toast.success("Credenciales y reglas guardadas correctamente");
    } catch (err) {
      console.error("Error al guardar:", err);
      toast.error("Error al guardar la configuración");
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Meta
  const handleTestMeta = async () => {
    setTestingMeta(true);
    setMetaTestResult(null);
    try {
      const res = await api.post("/api/settings/test-meta", {
        token: form["whatsapp.api.token"],
        phoneId: form["whatsapp.phone.id"],
        version: form["whatsapp.api.version"],
      });
      setMetaTestResult(res.data);
      if (res.data?.success) {
        toast.success("¡Conexión exitosa con Meta Cloud API!");
      } else {
        toast.error("Error con Meta: " + (res.data?.error || "Verifique credenciales"));
      }
    } catch (err: any) {
      setMetaTestResult({ success: false, error: err.message });
      toast.error("Error al conectar con la API de Meta");
    } finally {
      setTestingMeta(false);
    }
  };

  // Test Gemini
  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await api.post("/api/settings/test-gemini", {
        apiKey: form["gemini.api.key"],
        model: form["gemini.model"],
      });
      setGeminiTestResult(res.data);
      if (res.data?.success) {
        toast.success("¡Conexión exitosa con Google Gemini IA!");
      } else {
        toast.error("Error con Gemini: " + (res.data?.error || "Revise su clave"));
      }
    } catch (err: any) {
      setGeminiTestResult({ success: false, error: err.message });
      toast.error("Error al conectar con Gemini");
    } finally {
      setTestingGemini(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success("URL del Webhook copiada al portapapeles");
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // ========================================================
  // KNOWLEDGE BASE (RESPUESTAS EN ORDEN CON IMÁGENES)
  // ========================================================
  const handleOpenKbModal = (item?: KnowledgeBaseItem) => {
    if (item) {
      setCurrentKb({ ...item });
    } else {
      // Find next priority number
      const nextPriority = knowledgeBase.length > 0
        ? Math.max(...knowledgeBase.map((k) => k.priority || 10)) + 10
        : 10;
      setCurrentKb({
        category: "Promociones",
        keywords: "",
        answer: "",
        attachmentUrl: "",
        attachmentType: "NONE",
        active: true,
        priority: nextPriority,
        mediaCaption: "",
      });
    }
    setKbModalOpen(true);
  };

  const handleSaveKb = async () => {
    if (!currentKb.answer.trim() && !currentKb.attachmentUrl) {
      toast.error("Debes ingresar una respuesta de texto o adjuntar una imagen");
      return;
    }
    try {
      await api.post("/api/ai/knowledge-base", currentKb);
      toast.success(currentKb.id ? "Respuesta actualizada" : "Respuesta creada exitosamente");
      setKbModalOpen(false);
      // Reload KB
      const res = await api.get<KnowledgeBaseItem[]>("/api/ai/knowledge-base");
      setKnowledgeBase(res.data.sort((a, b) => (a.priority || 100) - (b.priority || 100)));
    } catch (err) {
      console.error("Error al guardar respuesta:", err);
      toast.error("No se pudo guardar la respuesta");
    }
  };

  const handleDeleteKb = async (id?: number) => {
    if (!id || !confirm("¿Seguro de eliminar esta respuesta automática?")) return;
    try {
      await api.delete(`/api/ai/knowledge-base/${id}`);
      setKnowledgeBase((prev) => prev.filter((k) => k.id !== id));
      toast.success("Respuesta eliminada");
    } catch (err) {
      console.error("Error al eliminar:", err);
      toast.error("No se pudo eliminar la respuesta");
    }
  };

  // Upload image for Knowledge Base
  const handleUploadKbImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    const toastId = toast.loading("Subiendo imagen para la respuesta...");

    try {
      const res = await api.post<{ url: string }>("/api/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) {
        setCurrentKb((prev) => ({
          ...prev,
          attachmentUrl: res.data.url,
          attachmentType: "IMAGE",
        }));
        toast.success("Imagen subida y vinculada", { id: toastId });
      }
    } catch (err) {
      console.error("Error al subir archivo:", err);
      toast.error("Error al subir imagen al servidor", { id: toastId });
    }
  };

  // ========================================================
  // PRODUCT CONFIG (CATÁLOGO IA CON IMÁGENES EN ORDEN)
  // ========================================================
  const handleProductPriorityChange = (productoId: number, priorityVal: number) => {
    setProductsConfig((prev) =>
      prev.map((p) => (p.productoId === productoId ? { ...p, priority: priorityVal } : p))
    );
  };

  const handleProductToggleAi = (productoId: number, enabled: boolean) => {
    setProductsConfig((prev) =>
      prev.map((p) => (p.productoId === productoId ? { ...p, aiEnabled: enabled } : p))
    );
  };

  const handleProductCaptionChange = (productoId: number, caption: string) => {
    setProductsConfig((prev) =>
      prev.map((p) => (p.productoId === productoId ? { ...p, imageCaption: caption } : p))
    );
  };

  const handleSaveProductConfig = async (prod: ProductConfigItem) => {
    try {
      await api.post("/api/ai/products-config", prod);
      toast.success(`Producto "${prod.productName}" actualizado`);
    } catch (err) {
      console.error("Error al guardar producto:", err);
      toast.error("Error al actualizar configuración del producto");
    }
  };

  const handleSaveAllProducts = async () => {
    const toastId = toast.loading("Guardando catálogo de productos para la IA...");
    try {
      for (const prod of productsConfig) {
        await api.post("/api/ai/products-config", prod);
      }
      toast.success("Catálogo y orden de productos guardados", { id: toastId });
    } catch (err) {
      console.error("Error al guardar productos:", err);
      toast.error("Error al guardar productos", { id: toastId });
    }
  };

  // ========================================================
  // SHIPPING COVERAGE (DELIVERY IA)
  // ========================================================
  const handleOpenShippingModal = (item?: ShippingCoverageItem) => {
    if (item) {
      setCurrentShipping({ ...item });
    } else {
      setCurrentShipping({
        districtName: "",
        deliveryFee: 0,
        minOrderAmount: 0,
        isActive: true,
        aliases: "",
      });
    }
    setShippingModalOpen(true);
  };

  const handleSaveShipping = async () => {
    if (!currentShipping.districtName.trim()) {
      toast.error("Ingresa el nombre del distrito");
      return;
    }
    try {
      await api.post("/api/ai/shipping-coverage", currentShipping);
      toast.success("Zona de cobertura guardada");
      setShippingModalOpen(false);
      const res = await api.get<ShippingCoverageItem[]>("/api/ai/shipping-coverage");
      setShippingCoverage(res.data);
    } catch (err) {
      console.error("Error al guardar cobertura:", err);
      toast.error("No se pudo guardar la zona de cobertura");
    }
  };

  const handleDeleteShipping = async (id?: number) => {
    if (!id || !confirm("¿Seguro de eliminar este distrito de cobertura?")) return;
    try {
      await api.delete(`/api/ai/shipping-coverage/${id}`);
      setShippingCoverage((prev) => prev.filter((s) => s.id !== id));
      toast.success("Zona eliminada");
    } catch (err) {
      console.error("Error al eliminar zona:", err);
      toast.error("No se pudo eliminar la zona");
    }
  };

  // Filtered views
  const filteredKb = knowledgeBase.filter(
    (k) =>
      k.category.toLowerCase().includes(kbSearch.toLowerCase()) ||
      k.keywords.toLowerCase().includes(kbSearch.toLowerCase()) ||
      k.answer.toLowerCase().includes(kbSearch.toLowerCase())
  );

  const filteredProducts = productsConfig.filter(
    (p) =>
      (p.productName && p.productName.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.productCode && p.productCode.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.searchKeywords && p.searchKeywords.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredShipping = shippingCoverage.filter(
    (s) =>
      s.districtName.toLowerCase().includes(shippingSearch.toLowerCase()) ||
      (s.aliases && s.aliases.toLowerCase().includes(shippingSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 max-w-full pb-10">
      {/* Hidden File Input for KB Images */}
      <input
        type="file"
        ref={kbFileInputRef}
        onChange={handleUploadKbImage}
        className="hidden"
        accept="image/*,application/pdf"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
            </div>
            Configuración Integral: WhatsApp, Gemini IA & Respuestas Multimedia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona la conexión a Meta, motor Gemini, respuestas automáticas con imágenes en orden, catálogo de IA y reglas de atención.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </Button>
          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={savingSettings || loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save className="h-4 w-4" />
            {savingSettings ? "Guardando..." : "Guardar Ajustes"}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full mb-6 h-auto p-1 gap-1">
          <TabsTrigger value="meta" className="flex items-center gap-1.5 text-xs py-2">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Meta WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="gemini" className="flex items-center gap-1.5 text-xs py-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Gemini IA</span>
          </TabsTrigger>
          <TabsTrigger value="kb" className="flex items-center gap-1.5 text-xs py-2 font-medium">
            <ImageIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Respuestas & Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5 text-xs py-2">
            <ShoppingBag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Catálogo IA</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5 text-xs py-2">
            <Sliders className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
            <span className="truncate">Reglas & Flujos</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-1.5 text-xs py-2">
            <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            <span className="truncate">Zonas Delivery</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: META WHATSAPP CLOUD API */}
        {/* ======================================================== */}
        <TabsContent value="meta" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    Meta Cloud API - WhatsApp Business Oficial
                  </CardTitle>
                  <CardDescription>
                    Parámetros requeridos para el envío y recepción de mensajes a través de los servidores oficiales de Meta.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestMeta}
                  disabled={testingMeta}
                  className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Zap className={`h-4 w-4 ${testingMeta ? "animate-spin" : ""}`} />
                  {testingMeta ? "Verificando..." : "Probar Conexión con Meta"}
                </Button>
              </div>

              {metaTestResult && (
                <div
                  className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                    metaTestResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {metaTestResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-semibold text-sm mb-0.5">
                      {metaTestResult.success
                        ? "Conexión a Meta WhatsApp Cloud API Verificada"
                        : "Error en la conexión a Meta"}
                    </h5>
                    {metaTestResult.success && metaTestResult.data ? (
                      <div className="space-y-0.5 text-xs">
                        <p><strong>Nombre Verificado:</strong> {metaTestResult.data.verified_name}</p>
                        <p><strong>Número Oficial:</strong> {metaTestResult.data.display_phone_number} (ID: {metaTestResult.data.id})</p>
                        <p><strong>Calidad de Línea:</strong> Calidad {metaTestResult.data.quality_rating}</p>
                      </div>
                    ) : (
                      <p className="font-mono">{metaTestResult.error || "Código de error devuelto por Meta"}</p>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta-token" className="font-semibold text-xs sm:text-sm">
                    Token de Acceso Permanente de Meta (System User Token)
                  </Label>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Meta for Developers <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="meta-token"
                    type={showMetaToken ? "text" : "password"}
                    value={form["whatsapp.api.token"]}
                    onChange={(e) => handleFormChange("whatsapp.api.token", e.target.value)}
                    placeholder="EAA..."
                    className="pr-20 font-mono text-xs"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => setShowMetaToken(!showMetaToken)}
                    >
                      {showMetaToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-phone-id" className="font-semibold text-xs sm:text-sm">
                    Identificador de Número de Teléfono (Phone Number ID)
                  </Label>
                  <Input
                    id="meta-phone-id"
                    type="text"
                    value={form["whatsapp.phone.id"]}
                    onChange={(e) => handleFormChange("whatsapp.phone.id", e.target.value)}
                    placeholder="Ej: 1065379726659..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta-waba-id" className="font-semibold text-xs sm:text-sm">
                    ID de Cuenta de WhatsApp Business (WABA ID)
                  </Label>
                  <Input
                    id="meta-waba-id"
                    type="text"
                    value={form["whatsapp.waba.id"]}
                    onChange={(e) => handleFormChange("whatsapp.waba.id", e.target.value)}
                    placeholder="Ej: 10293847561..."
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-version" className="font-semibold text-xs sm:text-sm">
                    Versión del API Graph de Meta
                  </Label>
                  <Select
                    value={form["whatsapp.api.version"]}
                    onValueChange={(val) => handleFormChange("whatsapp.api.version", val)}
                  >
                    <SelectTrigger id="meta-version" className="text-xs">
                      <SelectValue placeholder="Selecciona la versión" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v18.0">v18.0 (Estable)</SelectItem>
                      <SelectItem value="v19.0">v19.0</SelectItem>
                      <SelectItem value="v20.0">v20.0</SelectItem>
                      <SelectItem value="v21.0">v21.0 (Recomendada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta-verify-token" className="font-semibold text-xs sm:text-sm">
                    Token de Verificación del Webhook (Verify Token)
                  </Label>
                  <Input
                    id="meta-verify-token"
                    type="text"
                    value={form["whatsapp.verify.token"]}
                    onChange={(e) => handleFormChange("whatsapp.verify.token", e.target.value)}
                    placeholder="nextlead_verify_token"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  URL del Webhook de WhatsApp (Endpoint de Recepción)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted font-mono text-xs text-foreground cursor-pointer"
                    onClick={handleCopyWebhook}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhook}
                    className="gap-1.5 shrink-0"
                  >
                    {copiedWebhook ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copiedWebhook ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: GOOGLE GEMINI AI */}
        {/* ======================================================== */}
        <TabsContent value="gemini" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Motor de Inteligencia Artificial - Google Gemini
                  </CardTitle>
                  <CardDescription>
                    Configura la clave de API, el modelo de lenguaje y la personalidad del asistente virtual.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <Zap className={`h-4 w-4 ${testingGemini ? "animate-spin" : ""}`} />
                  {testingGemini ? "Verificando..." : "Probar Conexión con Gemini"}
                </Button>
              </div>

              {geminiTestResult && (
                <div
                  className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                    geminiTestResult.success
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-800 dark:text-purple-300"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {geminiTestResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-semibold text-sm mb-0.5">
                      {geminiTestResult.success
                        ? "Conexión a Google Gemini Exitosa"
                        : "Error en la conexión a Gemini"}
                    </h5>
                    {geminiTestResult.success ? (
                      <p>Modelo <strong>{geminiTestResult.model}</strong> operativo y listo para responder.</p>
                    ) : (
                      <p className="font-mono">{geminiTestResult.error || "Error al autenticar o saldo agotado"}</p>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gemini-key" className="font-semibold text-xs sm:text-sm">
                    API Key de Google Gemini
                  </Label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Obtener API Key en Google AI Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="gemini-key"
                    type={showGeminiKey ? "text" : "password"}
                    value={form["gemini.api.key"]}
                    onChange={(e) => handleFormChange("gemini.api.key", e.target.value)}
                    placeholder="AIzaSy..."
                    className="pr-20 font-mono text-xs"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                    >
                      {showGeminiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-model" className="font-semibold text-xs sm:text-sm">
                    Modelo de Lenguaje (LLM)
                  </Label>
                  <Select
                    value={form["gemini.model"]}
                    onValueChange={(val) => handleFormChange("gemini.model", val)}
                  >
                    <SelectTrigger id="gemini-model" className="text-xs">
                      <SelectValue placeholder="Selecciona el modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Ultrarrápido y recomendado)</SelectItem>
                      <SelectItem value="gemini-2.0-flash">gemini-2.0-flash (Nueva Generación)</SelectItem>
                      <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (Máxima Capacidad de Razonamiento)</SelectItem>
                      <SelectItem value="gemini-2.5-flash">gemini-2.5-flash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-agent-name" className="font-semibold text-xs sm:text-sm">
                    Nombre del Asistente Virtual
                  </Label>
                  <Input
                    id="ai-agent-name"
                    type="text"
                    value={form["ai.agent.name"]}
                    onChange={(e) => handleFormChange("ai.agent.name", e.target.value)}
                    placeholder="Ej: Sofía de NextLead"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-tone" className="font-semibold text-xs sm:text-sm">
                    Tono de Comunicación
                  </Label>
                  <Select
                    value={form["ai.tone"]}
                    onValueChange={(val) => handleFormChange("ai.tone", val)}
                  >
                    <SelectTrigger id="ai-tone" className="text-xs">
                      <SelectValue placeholder="Selecciona el tono" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amigable">Amigable, cálido y servicial (Recomendado)</SelectItem>
                      <SelectItem value="formal">Ejecutivo, formal y corporativo</SelectItem>
                      <SelectItem value="persuasivo">Comercial, persuasivo y enfocado en ventas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-business-desc" className="font-semibold text-xs sm:text-sm">
                    Descripción del Negocio / Empresa
                  </Label>
                  <Input
                    id="ai-business-desc"
                    type="text"
                    value={form["ai.business.description"]}
                    onChange={(e) => handleFormChange("ai.business.description", e.target.value)}
                    placeholder="Ej: Distribución de productos y servicios para empresas"
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: RESPUESTAS AUTOMÁTICAS EN ORDEN CON IMÁGENES */}
        {/* ======================================================== */}
        <TabsContent value="kb" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Configuración de Respuestas en Orden & Multimedia (Base de Conocimiento)
                  </CardTitle>
                  <CardDescription>
                    Define las respuestas automáticas de WhatsApp, el orden de prioridad (1, 2, 3...) y las imágenes o documentos que deben enviarse al cliente.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar respuestas..."
                      value={kbSearch}
                      onChange={(e) => setKbSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-muted/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenKbModal()}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0 text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva Respuesta
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Orden</TableHead>
                      <TableHead className="w-24">Multimedia</TableHead>
                      <TableHead className="w-36">Categoría</TableHead>
                      <TableHead className="w-48">Palabras Clave (Disparadores)</TableHead>
                      <TableHead>Respuesta & Pie de Foto</TableHead>
                      <TableHead className="w-20 text-center">Estado</TableHead>
                      <TableHead className="w-20 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKb.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          No hay respuestas registradas. Crea una nueva respuesta con imagen o texto.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKb.map((kb) => {
                        const hasImg = kb.attachmentType === "IMAGE" && kb.attachmentUrl;
                        const hasPdf = kb.attachmentType === "PDF" && kb.attachmentUrl;
                        const imgUrl = kb.attachmentUrl
                          ? kb.attachmentUrl.startsWith("http")
                            ? kb.attachmentUrl
                            : `${API_BASE}${kb.attachmentUrl.startsWith("/") ? "" : "/"}${kb.attachmentUrl}`
                          : "";

                        return (
                          <TableRow key={kb.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-center font-bold text-xs">
                              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                                #{kb.priority || 100}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {hasImg ? (
                                <div className="relative group cursor-pointer" onClick={() => window.open(imgUrl, "_blank")}>
                                  <img
                                    src={imgUrl}
                                    alt="Adjunto"
                                    className="h-10 w-10 rounded border object-cover bg-black/5 hover:opacity-80 transition-opacity"
                                  />
                                </div>
                              ) : hasPdf ? (
                                <Badge variant="secondary" className="gap-1 text-[10px]">
                                  <FileText className="h-3 w-3 text-red-500" />
                                  PDF
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Solo Texto</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className="font-semibold text-xs">{kb.category}</span>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {(kb.keywords || "").split(",").slice(0, 3).map((kw, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 font-normal">
                                    {kw.trim()}
                                  </Badge>
                                ))}
                                {(kb.keywords || "").split(",").length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+más</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                                  {kb.answer}
                                </p>
                                {kb.mediaCaption && (
                                  <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate">
                                    📸 Caption: {kb.mediaCaption}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant={kb.active ? "default" : "secondary"}
                                className={`text-[10px] ${
                                  kb.active ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                }`}
                              >
                                {kb.active ? "Activo" : "Pausado"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenKbModal(kb)}
                                  title="Editar respuesta"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteKb(kb.id)}
                                  title="Eliminar respuesta"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: CATÁLOGO DE PRODUCTOS & PROMOCIONES CON IMAGEN */}
        {/* ======================================================== */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-amber-600" />
                    Catálogo de Productos para la IA: Promociones & Imágenes en Orden
                  </CardTitle>
                  <CardDescription>
                    Organiza las imágenes de productos y promociones que la IA enviará por WhatsApp según su orden de prioridad.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar productos..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-muted/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveAllProducts}
                    className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs h-8"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar Catálogo
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">IA On/Off</TableHead>
                      <TableHead className="w-24 text-center">Prioridad</TableHead>
                      <TableHead className="w-20">Foto</TableHead>
                      <TableHead className="w-48">Producto & Código</TableHead>
                      <TableHead className="w-24">Precio</TableHead>
                      <TableHead>Mensaje / Pie de Foto para WhatsApp (Caption)</TableHead>
                      <TableHead className="w-20 text-right">Guardar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          No se encontraron productos disponibles.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((prod) => {
                        const imgUrl = prod.productImage
                          ? prod.productImage.startsWith("http")
                            ? prod.productImage
                            : `${API_BASE}${prod.productImage.startsWith("/") ? "" : "/"}${prod.productImage}`
                          : "";

                        return (
                          <TableRow key={prod.productoId} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-center">
                              <Switch
                                checked={prod.aiEnabled}
                                onCheckedChange={(val) => handleProductToggleAi(prod.productoId, val)}
                              />
                            </TableCell>

                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={1}
                                max={999}
                                value={prod.priority || 100}
                                onChange={(e) =>
                                  handleProductPriorityChange(prod.productoId, parseInt(e.target.value) || 100)
                                }
                                className="w-16 h-8 text-xs text-center font-bold mx-auto"
                                title="Orden de envío (menor número se ofrece primero)"
                              />
                            </TableCell>

                            <TableCell>
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={prod.productName || "Producto"}
                                  className="h-10 w-10 rounded border object-contain bg-white cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(imgUrl, "_blank")}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </TableCell>

                            <TableCell>
                              <div>
                                <h4 className="font-semibold text-xs leading-tight">{prod.productName}</h4>
                                <span className="text-[10px] text-muted-foreground font-mono">{prod.productCode}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="font-bold text-xs text-emerald-600">S/ {prod.productPrice || "0.00"}</span>
                            </TableCell>

                            <TableCell>
                              <Input
                                type="text"
                                placeholder="Escribe el texto que la IA enviará junto a la imagen en WhatsApp..."
                                value={prod.imageCaption || ""}
                                onChange={(e) => handleProductCaptionChange(prod.productoId, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveProductConfig(prod)}
                                className="h-8 text-xs px-2.5"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 5: REGLAS & FLUJOS AUTOMÁTICOS */}
        {/* ======================================================== */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sliders className="h-5 w-5 text-cyan-600" />
                Flujos de Comportamiento del Bot en WhatsApp
              </CardTitle>
              <CardDescription>
                Activa o desactiva las capacidades automáticas del bot al interactuar con los clientes.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Switches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-card">
                  <div className="space-y-1">
                    <Label className="font-semibold text-sm">Promociones con Imágenes Proactivas</Label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Cuando el cliente pregunte por precios o promos, la IA enviará automáticamente las fotos oficiales con sus captions.
                    </p>
                  </div>
                  <Switch
                    checked={form["ai.products.promotion"] === "true"}
                    onCheckedChange={(val) => handleFormChange("ai.products.promotion", val ? "true" : "false")}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-card">
                  <div className="space-y-1">
                    <Label className="font-semibold text-sm">Recopilación Estructurada de Pedidos</Label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Permite que la IA detecte cantidades, productos y confirme el total antes de pasar a entrega.
                    </p>
                  </div>
                  <Switch
                    checked={form["ai.order.collect"] === "true"}
                    onCheckedChange={(val) => handleFormChange("ai.order.collect", val ? "true" : "false")}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-card">
                  <div className="space-y-1">
                    <Label className="font-semibold text-sm">Solicitud de Ubicación por WhatsApp (GPS)</Label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Instruye al bot a pedir al cliente que envíe su ubicación en tiempo real desde el clip de WhatsApp.
                    </p>
                  </div>
                  <Switch
                    checked={form["ai.collect.location"] === "true"}
                    onCheckedChange={(val) => handleFormChange("ai.collect.location", val ? "true" : "false")}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-card">
                  <div className="space-y-1">
                    <Label className="font-semibold text-sm">Solicitud de DNI / RUC y Comprobante</Label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Pide automáticamente si requiere Boleta o Factura con RUC para emitir la venta.
                    </p>
                  </div>
                  <Switch
                    checked={form["ai.collect.document"] === "true"}
                    onCheckedChange={(val) => handleFormChange("ai.collect.document", val ? "true" : "false")}
                  />
                </div>
              </div>

              {/* Saludos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs sm:text-sm">Saludo a Cliente Nuevo</Label>
                  <Textarea
                    rows={2}
                    value={form["ai.greeting.new"]}
                    onChange={(e) => handleFormChange("ai.greeting.new", e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs sm:text-sm">Saludo a Cliente Registrado (Frecuente)</Label>
                  <Textarea
                    rows={2}
                    value={form["ai.greeting.registered"]}
                    onChange={(e) => handleFormChange("ai.greeting.registered", e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Medios de Pago */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Información de Cuentas Bancarias & Medios de Pago
                </Label>
                <Textarea
                  rows={3}
                  value={form["ai.payment.methods"]}
                  onChange={(e) => handleFormChange("ai.payment.methods", e.target.value)}
                  placeholder="Coloca aquí los datos de Yape, BCP, Interbank que la IA entregará al cliente al momento de concretar la compra..."
                  className="text-xs font-mono"
                />
              </div>

              {/* Instrucciones Especiales */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="font-semibold text-xs sm:text-sm">
                  Instrucciones y Reglas de Negocio (System Prompt)
                </Label>
                <Textarea
                  rows={4}
                  value={form["ai.custom.instructions"]}
                  onChange={(e) => handleFormChange("ai.custom.instructions", e.target.value)}
                  placeholder="Reglas adicionales para la IA. Ejemplo: 'No ofrecer créditos sin previa aprobación. Indicar que el horario de entrega es hasta las 6 PM'..."
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 6: ZONAS DE COBERTURA & DELIVERY IA */}
        {/* ======================================================== */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-rose-600" />
                    Zonas de Cobertura & Tarifas de Delivery de la IA
                  </CardTitle>
                  <CardDescription>
                    La IA consulta esta tabla para validar si el distrito del cliente tiene cobertura y calcular el costo de envío.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar distritos..."
                      value={shippingSearch}
                      onChange={(e) => setShippingSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-muted/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenShippingModal()}
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shrink-0 text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo Distrito
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distrito</TableHead>
                      <TableHead>Costo Delivery</TableHead>
                      <TableHead>Pedido Mínimo</TableHead>
                      <TableHead>Alias / Variantes</TableHead>
                      <TableHead className="w-24 text-center">Estado</TableHead>
                      <TableHead className="w-20 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipping.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                          No hay distritos de cobertura registrados. Agrega los distritos donde realizas entregas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredShipping.map((ship) => (
                        <TableRow key={ship.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-semibold text-xs">{ship.districtName}</TableCell>
                          <TableCell className="text-xs">
                            {ship.deliveryFee === 0 ? (
                              <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-300 text-[10px]">
                                GRATIS
                              </Badge>
                            ) : (
                              `S/ ${ship.deliveryFee.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-xs">S/ {(ship.minOrderAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                            {ship.aliases || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={ship.isActive ? "default" : "secondary"}
                              className={`text-[10px] ${ship.isActive ? "bg-emerald-600" : ""}`}
                            >
                              {ship.isActive ? "Cubierto" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => handleOpenShippingModal(ship)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteShipping(ship.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR RESPUESTA AUTOMÁTICA EN ORDEN */}
      {/* ======================================================== */}
      <Dialog open={kbModalOpen} onOpenChange={setKbModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              {currentKb.id ? "Editar Respuesta Automática" : "Nueva Respuesta Automática en Orden"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura el texto, la imagen adjunta y el orden en que se responderá al cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Orden de Prioridad</Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={currentKb.priority || 10}
                  onChange={(e) => setCurrentKb({ ...currentKb, priority: parseInt(e.target.value) || 10 })}
                  className="h-8 text-xs font-bold"
                  placeholder="Ej: 1, 2, 3..."
                />
                <p className="text-[10px] text-muted-foreground">Menor número = se envía primero.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría</Label>
                <Input
                  type="text"
                  value={currentKb.category}
                  onChange={(e) => setCurrentKb({ ...currentKb, category: e.target.value })}
                  placeholder="Ej: Promociones, Saludo, Pagos"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Palabras Clave Disparadoras (separadas por coma)</Label>
              <Input
                type="text"
                value={currentKb.keywords}
                onChange={(e) => setCurrentKb({ ...currentKb, keywords: e.target.value })}
                placeholder="Ej: promo, precio, oferta, catalogo, fotos"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Si el cliente escribe cualquiera de estas palabras, el bot activará esta respuesta.</p>
            </div>

            {/* Imagen / Multimedia */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                  Imagen o Archivo Adjunto de WhatsApp
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => kbFileInputRef.current?.click()}
                  className="h-7 text-xs gap-1"
                >
                  <Upload className="h-3 w-3" />
                  Subir Foto
                </Button>
              </div>

              {currentKb.attachmentUrl ? (
                <div className="flex items-center gap-3 mt-2 p-2 bg-card rounded border">
                  {currentKb.attachmentType === "IMAGE" ? (
                    <img
                      src={
                        currentKb.attachmentUrl.startsWith("http")
                          ? currentKb.attachmentUrl
                          : `${API_BASE}${currentKb.attachmentUrl.startsWith("/") ? "" : "/"}${currentKb.attachmentUrl}`
                      }
                      alt="Preview"
                      className="h-12 w-12 rounded object-cover border"
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate">{currentKb.attachmentUrl}</p>
                    <span className="text-[10px] text-muted-foreground uppercase">{currentKb.attachmentType}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setCurrentKb({ ...currentKb, attachmentUrl: "", attachmentType: "NONE" })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Opcional: Si subes una foto, WhatsApp enviará la imagen acompañada del texto.
                </p>
              )}

              {currentKb.attachmentUrl && (
                <div className="space-y-1 mt-2">
                  <Label className="text-[11px] font-medium">Pie de Foto (Caption de la Imagen)</Label>
                  <Input
                    type="text"
                    value={currentKb.mediaCaption || ""}
                    onChange={(e) => setCurrentKb({ ...currentKb, mediaCaption: e.target.value })}
                    placeholder="Texto que acompaña a la imagen en WhatsApp..."
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Texto de la respuesta */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Texto de la Respuesta (WhatsApp)</Label>
              <Textarea
                rows={3}
                value={currentKb.answer}
                onChange={(e) => setCurrentKb({ ...currentKb, answer: e.target.value })}
                placeholder="Escribe la respuesta exacta que el bot enviará al cliente..."
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={currentKb.active}
                  onCheckedChange={(val) => setCurrentKb({ ...currentKb, active: val })}
                />
                <Label className="text-xs">Respuesta Activa</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setKbModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveKb} className="bg-blue-600 hover:bg-blue-700 text-white">
              Guardar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR DISTRITO DE COBERTURA */}
      {/* ======================================================== */}
      <Dialog open={shippingModalOpen} onOpenChange={setShippingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-rose-600" />
              {currentShipping.id ? "Editar Distrito de Cobertura" : "Nuevo Distrito de Cobertura"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura el distrito y el costo de delivery que la IA usará al coordinar envíos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nombre del Distrito</Label>
              <Input
                type="text"
                value={currentShipping.districtName}
                onChange={(e) => setCurrentShipping({ ...currentShipping, districtName: e.target.value })}
                placeholder="Ej: San Isidro, Surco, Miraflores..."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Costo de Delivery (S/)</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={currentShipping.deliveryFee}
                  onChange={(e) => setCurrentShipping({ ...currentShipping, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs font-bold"
                />
                <p className="text-[10px] text-muted-foreground">0 = Delivery Gratis</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pedido Mínimo (S/)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={currentShipping.minOrderAmount}
                  onChange={(e) => setCurrentShipping({ ...currentShipping, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Variantes o Alias (separados por coma)</Label>
              <Input
                type="text"
                value={currentShipping.aliases || ""}
                onChange={(e) => setCurrentShipping({ ...currentShipping, aliases: e.target.value })}
                placeholder="Ej: santiago de surco, surco viejo, chacarilla"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={currentShipping.isActive}
                onCheckedChange={(val) => setCurrentShipping({ ...currentShipping, isActive: val })}
              />
              <Label className="text-xs">Distrito con Cobertura Activa</Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShippingModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveShipping} className="bg-rose-600 hover:bg-rose-700 text-white">
              Guardar Distrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
