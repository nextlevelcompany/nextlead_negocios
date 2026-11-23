"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Send,
  Bot,
  User,
  Sparkles,
  Paperclip,
  RefreshCw,
  Check,
  CheckCheck,
  MessageSquare,
  X,
  FileText,
  Bookmark,
  ChevronLeft,
  Flame,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ConversationItem {
  chat_phone: string;
  contact_id?: number | null;
  contact_name: string;
  ai_active: boolean;
  last_message_id?: number;
  last_message?: string;
  last_timestamp?: string;
  sender?: string;
  receiver?: string;
  status?: string;
}

interface MessageItem {
  id?: number;
  sender: string;
  receiver: string;
  messageText: string;
  timestamp: string;
  status?: string;
  wamid?: string;
}

// Clean phone numbers
function cleanPhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

// Sanitize UTF-8 strings that may have been double-encoded in DB
function cleanTextEncoding(str: string): string {
  if (!str) return "";
  let res = str;
  try {
    if (/[\u00C2-\u00C3]/.test(str)) {
      res = decodeURIComponent(escape(str));
    }
  } catch {
    // ignore
  }
  return res
    .replace(/Â¡/g, "¡")
    .replace(/Â¿/g, "¿")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‘/g, "Ñ")
    .replace(/âœ…/g, "✅")
    .replace(/Â/g, "");
}

// Format timestamps
function formatTime(timestamp?: string): string {
  if (!timestamp) return "";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return (
      d.toLocaleDateString([], { day: "2-digit", month: "short" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}

// Parser for media tags like [IMAGE], [MEDIA:image], [Documento], etc.
function parseMessageContent(text: string) {
  let images: string[] = [];
  let audios: string[] = [];
  let documents: string[] = [];
  let displayText = text || "";

  if (!text) return { images, audios, documents, displayText };

  // Format 1: [IMAGE]/uploads/...
  if (text.startsWith("[IMAGE]")) {
    const raw = text.substring(7).trim();
    raw.split(",").forEach((p) => {
      let clean = p.trim().replace(":8080/", ":8081/");
      if (clean.startsWith("http")) images.push(clean);
      else images.push(`${API_BASE}${clean}`);
    });
    return { images, audios, documents, displayText: "" };
  }

  // Format 2: [AUDIO]/uploads/...
  if (text.startsWith("[AUDIO]")) {
    const raw = text.substring(7).trim();
    raw.split(",").forEach((p) => {
      let clean = p.trim().replace(":8080/", ":8081/");
      if (clean.startsWith("http")) audios.push(clean);
      else images.push(`${API_BASE}${clean}`);
    });
    return { images, audios, documents, displayText: "" };
  }

  // Format 3: [MEDIA:image] id=... url=...
  const mediaRegex = /\[MEDIA:(image|audio|video|document)\]/i;
  const match = text.match(mediaRegex);
  if (match) {
    const mediaType = match[1].toLowerCase();
    const tagIndex = text.indexOf(match[0]);
    displayText = text.substring(0, tagIndex).trim();
    const after = text.substring(tagIndex + match[0].length);

    const urlMatch = after.match(/(?:url=|id=)(https?:\/\/[^\s,]+|\/[^\s,]+)/i);
    if (urlMatch) {
      let clean = urlMatch[1].trim().replace(":8080/", ":8081/");
      const fullUrl = clean.startsWith("http") ? clean : `${API_BASE}${clean}`;
      if (mediaType === "image") images.push(fullUrl);
      else if (mediaType === "audio") audios.push(fullUrl);
      else documents.push(fullUrl);
    }
  }

  return { images, audios, documents, displayText };
}

// Predefined Canned Responses
const DEFAULT_CANNED_RESPONSES = [
  {
    id: "c1",
    title: "👋 Saludo",
    text: "¡Hola! Qué gusto saludarte. Bienvenido a NextLead, ¿en qué podemos ayudarte el día de hoy?",
  },
  {
    id: "c2",
    title: "💳 Cuentas Pago",
    text: "Nuestros medios de pago autorizados son:\n• Yape / Plin: 902 801 168 (NextLead)\n• BCP Ahorros: 191-XXXXXXXX-X-XX\nPor favor envíanos la captura del comprobante una vez realizado.",
  },
  {
    id: "c3",
    title: "🕒 Horario",
    text: "Nuestro horario de atención comercial es de Lunes a Viernes de 8:30 AM a 6:30 PM y Sábados de 9:00 AM a 1:00 PM.",
  },
  {
    id: "c4",
    title: "📍 Ubicación",
    text: "Nuestra oficina central se encuentra en Av. República de Panamá 3505, San Isidro, Lima.",
  },
  {
    id: "c5",
    title: "🚚 Envíos",
    text: "Realizamos envíos a todo Lima Metropolitana y despachos a nivel nacional por agencias autorizadas. ¡Pregunta por tu zona!",
  },
  {
    id: "c6",
    title: "🙏 Despedida",
    text: "¡Muchas gracias por tu tiempo y confianza! Quedamos a tu entera disposición. ¡Que tengas un excelente día!",
  },
];

export default function ChatBox() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "ai" | "manual">("all");

  // AI states
  const [suggestingReply, setSuggestingReply] = useState<boolean>(false);
  const [analyzingChat, setAnalyzingChat] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [togglingAi, setTogglingAi] = useState<boolean>(false);

  // Mobile layout toggle
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations list
  const fetchConversations = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingChats(true);
    try {
      const res = await api.get<ConversationItem[]>("/api/messages/conversations");
      if (Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
      if (!quiet) toast.error("No se pudo cargar la lista de chats de WhatsApp");
    } finally {
      if (!quiet) setLoadingChats(false);
    }
  }, []);

  // Initial load & periodic poll
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Load messages for selected conversation
  const loadConversationMessages = useCallback(async (phone: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const clean = cleanPhone(phone);
      const res = await api.get<MessageItem[]>(`/api/messages/conversation/${clean}`);
      if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Error al cargar mensajes de la conversación:", err);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, []);

  // When a chat is selected
  const handleSelectChat = (chat: ConversationItem) => {
    setSelectedChat(chat);
    setMobileShowChat(true);
    loadConversationMessages(chat.chat_phone);
  };

  // Polling for active chat
  useEffect(() => {
    if (!selectedChat?.chat_phone) return;
    const interval = setInterval(() => {
      loadConversationMessages(selectedChat.chat_phone, true);
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedChat, loadConversationMessages]);

  // Send text message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat?.chat_phone || sending) return;

    const textToSend = inputText.trim();
    const phone = cleanPhone(selectedChat.chat_phone);
    setInputText("");
    setSending(true);

    const tempMsg: MessageItem = {
      sender: "system",
      receiver: phone,
      messageText: textToSend,
      timestamp: new Date().toISOString(),
      status: "SENT",
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await api.post("/api/messages", {
        sender: "system",
        receiver: phone,
        messageText: textToSend,
      });

      // Backend pauses AI on human takeover
      setSelectedChat((prev) => (prev ? { ...prev, ai_active: false } : null));
      setConversations((prev) =>
        prev.map((c) =>
          cleanPhone(c.chat_phone) === phone
            ? { ...c, ai_active: false, last_message: textToSend, last_timestamp: new Date().toISOString() }
            : c
        )
      );

      loadConversationMessages(phone, true);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      toast.error("Error al enviar el mensaje por WhatsApp");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle AI
  const handleToggleAi = async () => {
    if (!selectedChat?.chat_phone || togglingAi) return;
    const phone = cleanPhone(selectedChat.chat_phone);
    const newState = !selectedChat.ai_active;
    setTogglingAi(true);

    try {
      const res = await api.put(`/api/messages/toggle-ai/${phone}`, { aiActive: newState });
      const updatedAiState = res.data?.aiActive ?? newState;

      setSelectedChat((prev) => (prev ? { ...prev, ai_active: updatedAiState } : null));
      setConversations((prev) =>
        prev.map((c) =>
          cleanPhone(c.chat_phone) === phone ? { ...c, ai_active: updatedAiState } : c
        )
      );

      toast.success(
        updatedAiState
          ? "🤖 Bot de IA ACTIVADO para este chat"
          : "👤 Modo Manual activado. El Bot de IA no responderá automáticamente."
      );
    } catch (err) {
      console.error("Error al cambiar estado de IA:", err);
      toast.error("No se pudo actualizar el estado de la IA");
    } finally {
      setTogglingAi(false);
    }
  };

  // Suggest reply with Gemini
  const handleSuggestReply = async () => {
    if (!selectedChat?.chat_phone || suggestingReply) return;
    const phone = cleanPhone(selectedChat.chat_phone);
    setSuggestingReply(true);

    try {
      const res = await api.get<{ suggestion: string }>(`/api/messages/suggest-reply/${phone}`);
      const text = res.data?.suggestion;

      if (!text || text.toLowerCase().includes("error") || text.includes("402 Payment Required")) {
        toast.warning(
          "No se pudo generar la sugerencia con IA: " + (text || "Cuota no disponible")
        );
      } else {
        setInputText(cleanTextEncoding(text));
        toast.success("✨ Sugerencia generada por Gemini");
      }
    } catch (err) {
      console.error("Error al sugerir respuesta:", err);
      toast.error("Error al conectar con Gemini");
    } finally {
      setSuggestingReply(false);
    }
  };

  // Analyze chat with Gemini
  const handleAnalyzeChat = async () => {
    if (!selectedChat?.chat_phone || analyzingChat) return;
    const phone = cleanPhone(selectedChat.chat_phone);
    setAnalyzingChat(true);

    try {
      const res = await api.get(`/api/messages/analyze-chat/${phone}`);
      let rawData = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      setAnalysisData(cleanTextEncoding(rawData));
      setShowAnalysisModal(true);
    } catch (err) {
      console.error("Error al analizar chat:", err);
      toast.error("No se pudo obtener el análisis del chat");
    } finally {
      setAnalyzingChat(false);
    }
  };

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat?.chat_phone) return;

    const phone = cleanPhone(selectedChat.chat_phone);
    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Enviando archivo por WhatsApp...");

    try {
      const uploadRes = await api.post<{ url: string }>("/api/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fileUrl = uploadRes.data?.url;
      if (!fileUrl) throw new Error("No se obtuvo URL del archivo");

      const isImg = file.type.startsWith("image/");
      const tagPrefix = isImg ? "[IMAGE]" : "[PDF]";

      await api.post("/api/messages", {
        sender: "system",
        receiver: phone,
        messageText: `${tagPrefix}${fileUrl}`,
      });

      toast.success("Archivo enviado exitosamente", { id: toastId });
      loadConversationMessages(phone, true);
    } catch (err) {
      console.error("Error al subir archivo:", err);
      toast.error("No se pudo enviar el archivo", { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (item.contact_name && item.contact_name.toLowerCase().includes(query)) ||
      (item.chat_phone && item.chat_phone.includes(query)) ||
      (item.last_message && item.last_message.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterTab === "unread") return item.status === "RECEIVED";
    if (filterTab === "ai") return item.ai_active === true;
    if (filterTab === "manual") return item.ai_active === false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-170px)] min-h-[520px] max-h-[calc(100vh-170px)] w-full flex bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,application/pdf"
      />

      {/* LEFT PANEL: CONVERSATIONS LIST */}
      <div
        className={`w-full sm:w-[310px] md:w-[330px] lg:w-[350px] shrink-0 h-full min-h-0 flex flex-col border-r border-border bg-card transition-all overflow-hidden ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 p-3 sm:p-3.5 border-b border-border flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">WhatsApp CRM</h2>
                <p className="text-[10px] text-muted-foreground">Meta Cloud API & Gemini</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchConversations()}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Recargar chats"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingChats ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar cliente o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-muted/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <Button
              variant={filterTab === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterTab("all")}
              className="h-6 text-[11px] px-2 rounded-full shrink-0"
            >
              Todos ({conversations.length})
            </Button>
            <Button
              variant={filterTab === "ai" ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterTab("ai")}
              className="h-6 text-[11px] px-2 rounded-full shrink-0 flex items-center gap-0.5"
            >
              <Bot className="h-2.5 w-2.5" />
              IA
            </Button>
            <Button
              variant={filterTab === "manual" ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterTab("manual")}
              className="h-6 text-[11px] px-2 rounded-full shrink-0 flex items-center gap-0.5"
            >
              <User className="h-2.5 w-2.5" />
              Manual
            </Button>
            <Button
              variant={filterTab === "unread" ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterTab("unread")}
              className="h-6 text-[11px] px-2 rounded-full shrink-0"
            >
              Recibidos
            </Button>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/50">
          {loadingChats && conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs">Cargando conversaciones...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-xs font-medium">No se encontraron chats</p>
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isSelected = selectedChat?.chat_phone === item.chat_phone;
              const initials = item.contact_name
                ? item.contact_name.substring(0, 2).toUpperCase()
                : "#";

              return (
                <div
                  key={item.chat_phone}
                  onClick={() => handleSelectChat(item)}
                  className={`p-3 flex items-start gap-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? "bg-muted/80 border-l-3 border-l-primary" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {item.ai_active ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center text-[7px] text-white"
                        title="IA Activa"
                      >
                        <Bot className="h-1.5 w-1.5" />
                      </span>
                    ) : (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-background"
                        title="Modo Manual"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-semibold text-xs truncate leading-tight">
                        {cleanTextEncoding(item.contact_name || item.chat_phone)}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(item.last_timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-[11px] text-muted-foreground truncate leading-normal">
                        {cleanTextEncoding(item.last_message || "Sin mensajes")}
                      </p>
                      {item.ai_active && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 shrink-0"
                        >
                          IA
                        </Badge>
                      )}
                    </div>

                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {item.chat_phone}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: ACTIVE CONVERSATION */}
      <div
        className={`flex-1 h-full min-w-0 min-h-0 flex flex-col bg-muted/10 overflow-hidden ${
          mobileShowChat ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedChat ? (
          <>
            {/* Top Bar */}
            <div className="shrink-0 h-14 px-3 sm:px-4 bg-card border-b border-border flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Back button on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 shrink-0 -ml-1 text-muted-foreground"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {(selectedChat.contact_name || selectedChat.chat_phone).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-xs sm:text-sm truncate leading-tight">
                      {cleanTextEncoding(selectedChat.contact_name || selectedChat.chat_phone)}
                    </h3>
                    {selectedChat.ai_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-full px-1.5 py-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        IA Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground border border-border rounded-full px-1.5 py-0">
                        <User className="h-2.5 w-2.5" />
                        Manual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                    <span>+{selectedChat.chat_phone}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">WhatsApp Oficial</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: AI Control, Suggest Reply, Analyze, Canned */}
              <div className="flex items-center gap-1 shrink-0">
                {/* AI Toggle Button */}
                <Button
                  variant={selectedChat.ai_active ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleAi}
                  disabled={togglingAi}
                  className={`h-7 sm:h-8 text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 flex items-center gap-1 ${
                    selectedChat.ai_active
                      ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                  title={
                    selectedChat.ai_active
                      ? "Pausar bot de IA para responder manualmente"
                      : "Activar bot de IA para que responda con Gemini"
                  }
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">
                    {selectedChat.ai_active ? "Pausar IA" : "Activar IA"}
                  </span>
                </Button>

                {/* Gemini Suggest Reply */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSuggestReply}
                  disabled={suggestingReply}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 flex items-center gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  title="Pedir a Gemini que sugiera una respuesta para el cliente"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${suggestingReply ? "animate-spin" : ""}`} />
                  <span className="hidden xl:inline">Sugerir IA</span>
                </Button>

                {/* Gemini Analyze Chat */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeChat}
                  disabled={analyzingChat}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  title="Analizar intenciones, cotizaciones y pedidos con IA"
                >
                  <Brain className={`h-3.5 w-3.5 ${analyzingChat ? "animate-spin" : ""}`} />
                  <span className="hidden xl:inline">Analizar</span>
                </Button>

                {/* Canned Responses Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" title="Respuestas Rápidas">
                      <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs">Respuestas Rápidas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {DEFAULT_CANNED_RESPONSES.map((canned) => (
                      <DropdownMenuItem
                        key={canned.id}
                        onClick={() => setInputText(canned.text)}
                        className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                      >
                        <span className="font-semibold text-xs">{canned.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate w-full">
                          {canned.text.replace(/\n/g, " ")}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs">Cargando mensajes...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-1.5 text-muted-foreground text-center">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
                  <p className="text-xs font-medium">No hay mensajes previos</p>
                  <p className="text-[11px] text-muted-foreground">Escribe un mensaje para comenzar.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const cleanContactPhone = cleanPhone(selectedChat.chat_phone);
                  const cleanSender = cleanPhone(msg.sender || "");
                  const isClient = cleanSender.endsWith(cleanContactPhone.slice(-8)) || cleanSender === cleanContactPhone;

                  const { images, audios, documents, displayText } = parseMessageContent(msg.messageText);

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-xs text-xs sm:text-[13px] leading-relaxed break-words ${
                          isClient
                            ? "bg-card border border-border text-foreground rounded-tl-sm"
                            : "bg-emerald-600 text-white rounded-tr-sm"
                        }`}
                      >
                        {/* Render images */}
                        {images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {images.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={imgUrl}
                                alt="WhatsApp adjunto"
                                className="rounded-lg max-h-40 max-w-full sm:max-w-[260px] object-cover cursor-pointer hover:opacity-90 transition-opacity bg-black/5"
                                onClick={() => window.open(imgUrl, "_blank")}
                              />
                            ))}
                          </div>
                        )}

                        {/* Render audios */}
                        {audios.length > 0 && (
                          <div className="flex flex-col gap-1 mb-1.5 max-w-full">
                            {audios.map((audioUrl, i) => (
                              <audio key={i} controls className="h-7 w-full max-w-[240px]">
                                <source src={audioUrl} />
                              </audio>
                            ))}
                          </div>
                        )}

                        {/* Render documents */}
                        {documents.length > 0 && (
                          <div className="flex flex-col gap-1 mb-1.5">
                            {documents.map((docUrl, i) => (
                              <a
                                key={i}
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 underline text-xs ${
                                  isClient ? "text-primary" : "text-emerald-100"
                                }`}
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[200px]">Ver documento adjunto</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Render text message */}
                        {displayText && (
                          <div className="whitespace-pre-wrap break-words">
                            {cleanTextEncoding(displayText)}
                          </div>
                        )}

                        {/* Footer with time and status */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${
                            isClient ? "text-muted-foreground" : "text-emerald-100"
                          }`}
                        >
                          <span>{formatTime(msg.timestamp)}</span>
                          {!isClient && (
                            <span>
                              {msg.status === "READ" ? (
                                <CheckCheck className="h-3 w-3 text-cyan-300" />
                              ) : msg.status === "DELIVERED" ? (
                                <CheckCheck className="h-3 w-3 text-emerald-200" />
                              ) : (
                                <Check className="h-3 w-3 text-emerald-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick response pills banner */}
            <div className="shrink-0 px-3 py-1.5 border-t border-border/60 bg-card/70 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                <Flame className="h-3 w-3 text-amber-500" />
                Rápidas:
              </span>
              {DEFAULT_CANNED_RESPONSES.slice(0, 4).map((canned) => (
                <button
                  key={canned.id}
                  onClick={() => setInputText(canned.text)}
                  className="px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                >
                  {canned.title}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="shrink-0 p-2.5 px-3 bg-card border-t border-border flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                title="Adjuntar imagen o archivo"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Input
                type="text"
                placeholder="Escribe un mensaje de WhatsApp (Enter para enviar)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 text-xs sm:text-sm flex-1 bg-muted/30 focus-visible:ring-1"
                disabled={sending}
              />

              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || sending}
                size="icon"
                className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm"
                title="Enviar mensaje de WhatsApp"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          /* Empty state when no chat is selected */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-base text-foreground mb-1">
              WhatsApp CRM & Chat en Vivo
            </h3>
            <p className="text-xs max-w-sm text-muted-foreground mb-4">
              Selecciona una conversación de la lista lateral para responder en tiempo real,
              activar o pausar el bot de IA, y analizar pedidos con Gemini.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
              <Badge variant="outline" className="text-[10px] py-0.5">
                <Bot className="h-3 w-3 mr-1 text-emerald-600" />
                Meta Cloud API
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5">
                <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                Gemini AI
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5">
                <User className="h-3 w-3 mr-1 text-blue-600" />
                Human Takeover
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* AI ANALYSIS DIALOG */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Brain className="h-4 w-4 text-purple-600" />
              Análisis del Chat con IA Gemini
            </DialogTitle>
            <DialogDescription className="text-xs">
              Extracción de intenciones de compra, datos del cliente y cotizaciones.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap leading-relaxed">
            {analysisData || "Sin datos de análisis."}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
