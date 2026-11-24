"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  Star,
  Bot,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Direccion {
  idDireccion?: number;
  nombreUbicacion?: string;
  codigoUbigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccionCompleta?: string;
  referencia?: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface Contact {
  id: number;
  tipoPersona: "NATURAL" | "EMPRESA";
  tipoDocumento: string;
  numeroDocumento: string;
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  nombreDisplay?: string;
  telefonoPrincipal: string;
  telefonoSecundario?: string | null;
  email?: string | null;
  empresaId?: number | null;
  empresaNombre?: string | null;
  starred?: boolean;
  aiActive?: boolean;
  dateCreated?: string;
  referencia?: string | null;
  status?: string;
  direcciones?: Direccion[];
}

export default function ContactsDirectoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "NATURAL" | "EMPRESA">("ALL");
  const [filterStarred, setFilterStarred] = useState(false);
  const [filterAi, setFilterAi] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Detail Modal State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [contactOrders, setContactOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Load Contacts from API
  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/contacts");
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error loading contacts:", err);
      toast.error(err.response?.data?.message || "Error al cargar la lista de contactos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Filter Contacts
  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return contacts.filter((c) => {
      const displayName = (
        c.tipoPersona === "NATURAL"
          ? `${c.nombres || ""} ${c.apellidos || ""}`
          : c.razonSocial || ""
      ).toLowerCase();

      const matchTerm =
        !term ||
        displayName.includes(term) ||
        (c.numeroDocumento && c.numeroDocumento.includes(term)) ||
        (c.telefonoPrincipal && c.telefonoPrincipal.includes(term)) ||
        (c.telefonoSecundario && c.telefonoSecundario.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.empresaNombre && c.empresaNombre.toLowerCase().includes(term)) ||
        (c.direcciones &&
          c.direcciones.some(
            (d) =>
              (d.direccionCompleta && d.direccionCompleta.toLowerCase().includes(term)) ||
              (d.distrito && d.distrito.toLowerCase().includes(term))
          ));

      const matchType = filterType === "ALL" || c.tipoPersona === filterType;
      const matchStarred = !filterStarred || !!c.starred;
      const matchAi = !filterAi || !!c.aiActive;

      return matchTerm && matchType && matchStarred && matchAi;
    });
  }, [contacts, searchTerm, filterType, filterStarred, filterAi]);

  // Star Toggle
  const handleToggleStar = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/contacts/${contact.id}/star`);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, starred: !c.starred } : c))
      );
      toast.success(
        contact.starred ? "Removido de favoritos" : "Agregado a favoritos"
      );
    } catch (err) {
      toast.error("No se pudo cambiar estado de favorito.");
    }
  };

  // AI Toggle
  const handleToggleAi = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/contacts/${contact.id}/toggle-ai`);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, aiActive: !c.aiActive } : c))
      );
      toast.success(
        contact.aiActive
          ? "Bot IA desactivado para este contacto"
          : "Bot IA activado para este contacto"
      );
    } catch (err) {
      toast.error("No se pudo cambiar estado de IA.");
    }
  };

  // Delete Contact
  const handleDeleteContact = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const name = contact.nombreDisplay || contact.razonSocial || "este contacto";
    if (!confirm(`¿Estás seguro de eliminar a "${name}"?`)) return;

    try {
      await api.delete(`/api/contacts/${contact.id}`);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success("Contacto eliminado con éxito.");
      if (selectedContact?.id === contact.id) {
        setShowDetailModal(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo eliminar el contacto.");
    }
  };

  // Open Contact Details
  const handleOpenDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
    setLoadingOrders(true);
    try {
      const res = await api.get(`/api/contacts/${contact.id}/pedidos`);
      setContactOrders(res.data?.pedidos || res.data || []);
    } catch (err) {
      setContactOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Open WhatsApp Link
  const openWhatsApp = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.startsWith("51") ? clean : `51${clean}`;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-5 sm:size-6 text-emerald-600 shrink-0" />
            Directorio de Contactos & Clientes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestión centralizada de personas, empresas, direcciones registradas y configuración de IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-3.5" />
              Tarjetas
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="size-3.5" />
              Tabla
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={loadContacts}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            asChild
          >
            <Link href="/contactos/create">
              <UserPlus className="size-3.5" />
              Nuevo Contacto
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full min-w-0">
        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Contactos</span>
            <Users className="size-4 sm:size-5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{contacts.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Base de clientes</p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Empresas (RUC)</span>
            <Building className="size-4 sm:size-5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-blue-600">
            {contacts.filter((c) => c.tipoPersona === "EMPRESA").length}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Cuentas corporativas</p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Personas Naturales</span>
            <User className="size-4 sm:size-5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600">
            {contacts.filter((c) => c.tipoPersona === "NATURAL").length}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Clientes particulares</p>
        </Card>

        <Card className="bg-card shadow-xs p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Con IA Activa</span>
            <Bot className="size-4 sm:size-5 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-indigo-600">
            {contacts.filter((c) => c.aiActive).length}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-respuesta WhatsApp</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-card p-3 shadow-xs w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento, teléfono, empresa o dirección..."
              className="pl-9 h-9 text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={filterType === "ALL" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("ALL")}
            >
              Todos
            </Button>
            <Button
              variant={filterType === "NATURAL" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("NATURAL")}
            >
              Naturales
            </Button>
            <Button
              variant={filterType === "EMPRESA" ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs sm:text-sm px-3"
              onClick={() => setFilterType("EMPRESA")}
            >
              Empresas
            </Button>

            <Button
              variant={filterStarred ? "secondary" : "outline"}
              size="sm"
              className={`h-9 text-xs sm:text-sm gap-1.5 px-3 ${filterStarred ? "text-amber-500 font-bold" : ""}`}
              onClick={() => setFilterStarred(!filterStarred)}
            >
              <Star className={`size-4 ${filterStarred ? "fill-amber-500 text-amber-500" : ""}`} />
              Favoritos
            </Button>

            <Button
              variant={filterAi ? "secondary" : "outline"}
              size="sm"
              className={`h-9 text-xs sm:text-sm gap-1.5 px-3 ${filterAi ? "text-indigo-600 font-bold" : ""}`}
              onClick={() => setFilterAi(!filterAi)}
            >
              <Bot className="size-4 text-indigo-600" />
              IA Activa
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-medium">Cargando contactos...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="bg-card p-12 text-center text-muted-foreground">
          <Users className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-foreground text-sm">No se encontraron contactos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Prueba ajustando los filtros o registra un nuevo contacto.
          </p>
          <Button
            size="sm"
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            asChild
          >
            <Link href="/contactos/create">
              <UserPlus className="size-3.5" />
              Crear Nuevo Contacto
            </Link>
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 w-full min-w-0">
          {filteredContacts.map((contact) => {
            const isEmpresa = contact.tipoPersona === "EMPRESA";
            const name =
              contact.nombreDisplay ||
              (isEmpresa
                ? contact.razonSocial
                : `${contact.nombres || ""} ${contact.apellidos || ""}`.trim()) ||
              "Sin Nombre";

            const primaryAddress = contact.direcciones?.[0];

            return (
              <Card
                key={contact.id}
                onClick={() => router.push(`/contactos/view?id=${contact.id}`)}
                className="bg-card hover:shadow-md transition-all border p-4 flex flex-col justify-between gap-3 cursor-pointer group"
              >
                {/* Top: Avatar, Name & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isEmpresa
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isEmpresa ? <Building className="size-5" /> : <User className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-emerald-600 transition-colors">
                        {name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal uppercase"
                        >
                          {contact.tipoDocumento || (isEmpresa ? "RUC" : "DNI")}
                        </Badge>
                        <span className="truncate font-mono">{contact.numeroDocumento || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleToggleStar(contact, e)}
                    >
                      <Star
                        className={`size-4 ${
                          contact.starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
                        }`}
                      />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs sm:text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/contactos/view?id=${contact.id}`}>
                            <ExternalLink className="size-4 mr-2 text-emerald-600" />
                            Ver Ficha
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/contactos/create?edit_id=${contact.id}`}>
                            <Edit className="size-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleToggleAi(contact, e)}>
                          <Bot className="size-4 mr-2 text-indigo-600" />
                          {contact.aiActive ? "Desactivar IA" : "Activar IA"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteContact(contact, e)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Middle: Details */}
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground py-1.5 border-y">
                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-xs sm:text-sm font-medium text-foreground">{contact.telefonoPrincipal}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 gap-1 font-medium"
                      onClick={(e) => openWhatsApp(contact.telefonoPrincipal, e)}
                    >
                      <MessageSquare className="size-3.5" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Address */}
                  {primaryAddress ? (
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <MapPin className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="truncate">
                        {primaryAddress.direccionCompleta}
                        {primaryAddress.distrito ? ` (${primaryAddress.distrito})` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs italic text-muted-foreground/70">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>Sin dirección registrada</span>
                    </div>
                  )}

                  {/* Company link if person */}
                  {contact.empresaNombre && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Building className="size-3.5 text-blue-500 shrink-0" />
                      <span className="truncate text-foreground font-medium">{contact.empresaNombre}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Tags & Badges */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[11px] px-2 py-0.5 font-medium ${
                        isEmpresa
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {isEmpresa ? "Empresa" : "Persona"}
                    </Badge>
                    {contact.aiActive && (
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1 font-medium"
                      >
                        <Bot className="size-3" />
                        IA
                      </Badge>
                    )}
                  </div>

                  {contact.direcciones && contact.direcciones.length > 1 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      +{contact.direcciones.length - 1} dir.
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="bg-card shadow-xs w-full max-w-full min-w-0 overflow-x-auto smooth-scroll">
          <CardContent className="p-0">
            <div className="min-w-[760px]">
              <Table>
              <TableHeader>
                <TableRow className="text-xs sm:text-sm font-semibold">
                  <TableHead className="w-10 text-center"></TableHead>
                  <TableHead className="text-xs sm:text-sm">Nombre / Razón Social</TableHead>
                  <TableHead className="text-xs sm:text-sm">Tipo / Documento</TableHead>
                  <TableHead className="text-xs sm:text-sm">Teléfono</TableHead>
                  <TableHead className="text-xs sm:text-sm">Dirección Principal</TableHead>
                  <TableHead className="text-xs sm:text-sm">IA Bot</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const isEmpresa = contact.tipoPersona === "EMPRESA";
                  const name =
                    contact.nombreDisplay ||
                    (isEmpresa
                      ? contact.razonSocial
                      : `${contact.nombres || ""} ${contact.apellidos || ""}`.trim()) ||
                    "Sin Nombre";
                  const primaryAddress = contact.direcciones?.[0];

                  return (
                    <TableRow
                      key={contact.id}
                      className="text-xs sm:text-sm cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/contactos/view?id=${contact.id}`)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleToggleStar(contact, e)}
                        >
                          <Star
                            className={`size-4 ${
                              contact.starred
                                ? "fill-amber-400 text-amber-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm">{name}</span>
                          {contact.empresaNombre && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {contact.empresaNombre}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] px-1.5 py-0.5 font-medium ${
                              isEmpresa
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {contact.tipoDocumento || (isEmpresa ? "RUC" : "DNI")}
                          </Badge>
                          <span className="font-mono text-xs sm:text-sm">{contact.numeroDocumento || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm">
                          <span>{contact.telefonoPrincipal}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-emerald-600"
                            onClick={(e) => openWhatsApp(contact.telefonoPrincipal, e)}
                          >
                            <MessageSquare className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-xs sm:text-sm">
                        {primaryAddress
                          ? `${primaryAddress.direccionCompleta} ${
                              primaryAddress.distrito ? `(${primaryAddress.distrito})` : ""
                            }`
                          : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={contact.aiActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`h-6 text-xs px-2.5 gap-1 font-medium ${
                            contact.aiActive
                              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                              : "text-muted-foreground"
                          }`}
                          onClick={(e) => handleToggleAi(contact, e)}
                        >
                          <Bot className="size-3.5" />
                          {contact.aiActive ? "Activo" : "Off"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" asChild title="Ver Ficha">
                            <Link href={`/contactos/view?id=${contact.id}`}>
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Editar">
                            <Link href={`/contactos/create?edit_id=${contact.id}`}>
                              <Edit className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => handleDeleteContact(contact, e)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETAIL MODAL */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedContact && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase ${
                      selectedContact.tipoPersona === "EMPRESA"
                        ? "bg-blue-500/15 text-blue-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {selectedContact.tipoPersona} • {selectedContact.tipoDocumento}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-emerald-600 gap-1"
                    onClick={() => openWhatsApp(selectedContact.telefonoPrincipal)}
                  >
                    <MessageSquare className="size-3.5" />
                    Abrir WhatsApp
                  </Button>
                </div>
                <DialogTitle className="text-lg">
                  {selectedContact.nombreDisplay ||
                    selectedContact.razonSocial ||
                    `${selectedContact.nombres || ""} ${selectedContact.apellidos || ""}`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedContact.tipoDocumento}: {selectedContact.numeroDocumento} • Registrado{" "}
                  {selectedContact.dateCreated?.substring(0, 10)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2 text-xs">
                {/* Contact info grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border rounded-lg">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Teléfono Principal:</span>
                    <span className="font-mono font-medium">{selectedContact.telefonoPrincipal}</span>
                  </div>
                  {selectedContact.telefonoSecundario && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Teléfono Secundario:</span>
                      <span className="font-mono font-medium">{selectedContact.telefonoSecundario}</span>
                    </div>
                  )}
                  {selectedContact.email && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Correo Electrónico:</span>
                      <span className="font-medium truncate">{selectedContact.email}</span>
                    </div>
                  )}
                  {selectedContact.empresaNombre && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Empresa Vinculada:</span>
                      <span className="font-medium">{selectedContact.empresaNombre}</span>
                    </div>
                  )}
                </div>

                {/* Direcciones registradas */}
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-600" />
                    Direcciones de Entrega Registradas ({selectedContact.direcciones?.length || 0})
                  </span>

                  {(!selectedContact.direcciones || selectedContact.direcciones.length === 0) ? (
                    <div className="p-3 border rounded text-muted-foreground text-center">
                      No hay direcciones registradas para este contacto.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedContact.direcciones.map((d, i) => (
                        <div key={i} className="p-2.5 bg-card border rounded flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {d.nombreUbicacion || `Dirección #${i + 1}`}
                            </span>
                            {d.latitud && d.longitud && (
                              <a
                                href={`https://www.google.com/maps?q=${d.latitud},${d.longitud}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Ver Mapa
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-muted-foreground">{d.direccionCompleta}</p>
                          {(d.distrito || d.provincia) && (
                            <span className="text-[10px] text-muted-foreground">
                              Ubigeo: {d.distrito ? `${d.distrito}, ` : ""}{d.provincia || ""}
                            </span>
                          )}
                          {d.referencia && (
                            <span className="text-[10px] text-muted-foreground italic">
                              Ref: {d.referencia}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de pedidos y compras */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShoppingBag className="size-3.5 text-emerald-600" />
                    Historial de Pedidos y Despachos
                  </span>

                  {loadingOrders ? (
                    <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>Cargando historial...</span>
                    </div>
                  ) : contactOrders.length === 0 ? (
                    <div className="p-3 border rounded text-muted-foreground text-center">
                      Este contacto aún no registra pedidos ni compras en el sistema.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {contactOrders.map((ord: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded border bg-card text-[11px]"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {ord.numero_pedido || `PEDIDO #${ord.id}`}
                            </span>
                            <span className="text-muted-foreground">
                              {ord.fecha_entrega || ord.created_at?.substring(0, 10)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">
                              {ord.estado_pago || ord.etapa_nombre || "Despacho"}
                            </Badge>
                            <span className="font-bold text-emerald-600">
                              S/ {Number(ord.total || ord.monto || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive text-xs"
                  onClick={() => handleDeleteContact(selectedContact)}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Eliminar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    asChild
                  >
                    <Link href={`/contactos/create?edit_id=${selectedContact.id}`}>
                      <Edit className="size-3.5 mr-1" />
                      Editar Contacto
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
