"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Printer,
  ArrowLeft,
  Edit,
  Building2,
  Phone,
  Mail,
  Globe,
  FileCheck2,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { CorporateQuoteTable } from "@/components/opportunities/CorporateQuoteTable";

function PrintQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oppId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    opportunity: any;
    addresses: any[];
    settings: Record<string, string>;
    subcontacts?: any[];
  } | null>(null);

  useEffect(() => {
    if (!oppId) return;
    const fetchOpportunity = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/opportunities/${oppId}`);
        setData(res.data);
        if (res.data?.opportunity) {
          const o = res.data.opportunity;
          const code = `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(o.id).padStart(4, "0")}`;
          const client = (o.razon_social || o.contacto_nombre_completo || o.titulo || "Cliente")
            .replace(/[/\\?%*:|"<>]/g, "")
            .trim();
          document.title = `Cotización ${code} - ${client}`;
        }
      } catch (err) {
        console.error("Error fetching opportunity for print:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunity();
  }, [oppId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground text-sm">
        <RefreshCw className="size-6 animate-spin text-emerald-600" />
        Generando propuesta comercial formal...
      </div>
    );
  }

  if (!data || !data.opportunity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="size-10 text-red-500" />
        <h2 className="text-lg font-bold">Oportunidad no encontrada</h2>
        <Button asChild variant="outline">
          <Link href="/opportunities/view">Volver al Pipeline</Link>
        </Button>
      </div>
    );
  }

  const { opportunity: opp, settings, addresses, subcontacts = [] } = data;

  // Resolve Contact Person ("Atención:") - NEVER the company name!
  const companyName = (opp.razon_social || "").trim().toLowerCase();
  let contactPerson = (opp.contacto_persona || opp.contacto_persona_calculado || "").trim();

  // If empty or equal to company name, resolve from subcontacts or natural person
  if (!contactPerson || (companyName && contactPerson.toLowerCase() === companyName)) {
    if (subcontacts && subcontacts.length > 0 && subcontacts[0]?.nombre_completo) {
      contactPerson = subcontacts[0].nombre_completo;
    } else if (opp.nombres && opp.nombres.trim()) {
      contactPerson = `${opp.nombres} ${opp.apellidos || ""}`.trim();
    } else {
      contactPerson = "Representante Legal / Gerencia";
    }
  }

  // Find subcontact if matching to show their phone/email
  const matchedSub = subcontacts?.find(
    (sc: any) => sc.nombre_completo?.trim().toLowerCase() === contactPerson.toLowerCase()
  );
  const contactPhone = matchedSub?.telefono_principal || opp.telefono_movil || "---";
  const contactEmail = matchedSub?.email || opp.contacto_email || "---";

  // Parse items
  let items: any[] = [];
  try {
    if (opp.detalles_json && opp.detalles_json.trim()) {
      items = JSON.parse(opp.detalles_json);
    } else if (opp.productos_json && opp.productos_json.trim()) {
      const parsedProds = JSON.parse(opp.productos_json);
      items = parsedProds.map((p: any) => ({
        tipo: "propuesto",
        sede: addresses[0]?.direccion_completa || "Sede Principal",
        codigo_circuito: "",
        descripcion: p.nombre,
        ancho_banda: "Estándar",
        plazo: opp.plazo_acuerdo || 12,
        cantidad: p.cantidad || 1,
        precio: p.precio || 0,
        instalacion: 0,
        moneda: opp.moneda || "Soles",
      }));
    }
  } catch (e) {
    console.error("Error parsing items:", e);
  }

  const isRenewal = opp.tipo_propuesta === "renovacion";
  const currencySymbol = opp.moneda === "Dólares" ? "$" : "S/";

  // Financial calculations
  const proposedItems = items.filter((i) => !isRenewal || i.tipo === "propuesto");
  const actualItems = items.filter((i) => isRenewal && i.tipo === "actual");

  const totalProposedMonthly = proposedItems.reduce(
    (acc, curr) => acc + (Number(curr.precio) || 0) * (Number(curr.cantidad) || 1),
    0
  );
  const totalInstallation = proposedItems.reduce(
    (acc, curr) => acc + (Number(curr.instalacion) || 0) * (Number(curr.cantidad) || 1),
    0
  );
  const totalActualMonthly = actualItems.reduce(
    (acc, curr) => acc + (Number(curr.precio) || 0) * (Number(curr.cantidad) || 1),
    0
  );

  const monthlySavings = totalActualMonthly - totalProposedMonthly;
  const savingsPercent =
    totalActualMonthly > 0 ? ((monthlySavings / totalActualMonthly) * 100).toFixed(1) : 0;

  // Format date
  const dateFormatted = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const quoteCode = `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(opp.id).padStart(4, "0")}`;

  const cleanMediaUrl = (url?: string) => {
    if (!url) return "";
    let clean = url.trim();
    if (clean.includes("/uploads/")) {
      clean = clean.substring(clean.indexOf("/uploads/"));
    } else if (clean.includes("/productos/")) {
      clean = clean.substring(clean.indexOf("/productos/"));
    }
    return clean;
  };

  const getMediaUrl = (url?: string) => {
    if (!url) return "";
    const clean = cleanMediaUrl(url);
    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) return clean;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return `${base}${clean.startsWith("/") ? "" : "/"}${clean}`;
  };

  // Resolve Hoja Membrete background image URL
  const isMembreteActive = settings["cotizacion.usar_hoja_membrete"] !== "false";
  const mostrarDatosEmpresa = settings["cotizacion.mostrar_datos_empresa"] === "true";
  const rawMembreteUrl = cleanMediaUrl(settings["cotizacion.hoja_membrete_url"] || "");
  const rawImageUrl = cleanMediaUrl(settings["cotizacion.hoja_membrete_imagen_url"] || "");

  let resolvedMembreteBg = "";
  if (isMembreteActive) {
    if (rawImageUrl) {
      resolvedMembreteBg = rawImageUrl;
    } else if (["png", "jpg", "jpeg", "webp"].some((ext) => rawMembreteUrl.toLowerCase().endsWith(ext))) {
      resolvedMembreteBg = rawMembreteUrl;
    } else if (rawMembreteUrl.toLowerCase().endsWith(".pdf")) {
      resolvedMembreteBg = "/uploads/membrete_a4.png";
    }
  }

  return (
    <div className="bg-slate-100 min-h-screen pb-12 print:bg-white print:p-0 print:m-0 print:min-h-0">
      {/* Explicit Print isolation styles for A4 exact dimensions */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print, [class*="print:hidden"], header, footer, aside, nav, [data-sidebar], #theme-customizer {
                display: none !important;
              }
              .print-document-wrapper {
                width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
              }
              .a4-page {
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                box-sizing: border-box !important;
                margin: 0 auto !important;
                position: relative !important;
                overflow: hidden !important;
                background-color: #ffffff !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-shadow: none !important;
                border: none !important;
              }
              .a4-page-1 {
                page-break-after: always !important;
                break-after: page !important;
              }
              .a4-page-2 {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Top action toolbar - Hidden on Print */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 py-2.5 shadow-xs print:hidden mb-6 no-print">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/opportunities/view">
              <ArrowLeft className="size-4" />
              Pipeline
            </Link>
          </Button>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-semibold text-gray-700">
            Cotización #{opp.id} &bull; {opp.contacto_nombre_completo || opp.titulo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {settings["cotizacion.hoja_membrete_url"] && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs gap-1.5 border-emerald-600 text-emerald-700 bg-emerald-50/50"
            >
              <a href={getMediaUrl(settings["cotizacion.hoja_membrete_url"])} target="_blank" rel="noreferrer">
                <FileCheck2 className="size-3.5 text-emerald-600" />
                Membrete ({settings["cotizacion.hoja_membrete_tipo"]?.toUpperCase() || "DOC"})
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs gap-1.5"
          >
            <Link href={`/opportunities/create?edit_id=${opp.id}`}>
              <Edit className="size-3.5" />
              Editar Cotización
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const client = (opp.razon_social || opp.contacto_nombre_completo || opp.titulo || "Cliente")
                .replace(/[/\\?%*:|"<>]/g, "")
                .trim();
              document.title = `Cotización ${quoteCode} - ${client}`;
              window.print();
            }}
            className="h-8 text-xs gap-1.5 bg-[#082653] hover:bg-[#0c3774] text-white shadow-xs font-semibold"
          >
            <Printer className="size-3.5" />
            Imprimir / Guardar como PDF
          </Button>
        </div>
      </div>

      {/* Print Document Container - 2 Pages A4 */}
      <div className="print-document-wrapper max-w-[820px] mx-auto print:max-w-none print:w-[210mm] space-y-6 print:space-y-0 print:m-0 print:p-0">
        {/* ========================================================= */}
        {/* PAGE 1: COMMERCIAL PROPOSAL & SERVICE TABLE (A4)          */}
        {/* ========================================================= */}
        <div className={`a4-page a4-page-1 bg-white shadow-md print:shadow-none border print:border-none min-h-[1080px] flex flex-col justify-between relative text-gray-900 font-sans overflow-hidden ${resolvedMembreteBg ? "pt-28 sm:pt-30 pb-20 sm:pb-24 px-8 sm:px-12 print:pt-[27mm] print:pb-[22mm] print:px-[15mm]" : "p-8 sm:p-10 print:pt-[15mm] print:pb-[15mm] print:px-[15mm]"}`}>
          {/* Hoja Membrete background full A4 */}
          {resolvedMembreteBg && (
            <img
              src={getMediaUrl(resolvedMembreteBg)}
              alt="Hoja Membrete Oficial"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
            />
          )}
          <div className="space-y-4 relative z-10 bg-transparent">
            {/* Page 1 Header (Cotización & Fecha con fondo transparente) */}
            <div className={`flex items-start justify-between border-b border-gray-300 pb-3 bg-transparent`}>
              <div className="space-y-1">
                {mostrarDatosEmpresa ? (
                  <>
                    {settings["cotizacion.logo_url"] ? (
                      <img
                        src={getMediaUrl(settings["cotizacion.logo_url"])}
                        alt="Logo Empresa"
                        className="h-12 max-w-[220px] object-contain"
                      />
                    ) : (
                      <div className="text-xl font-black text-emerald-800 tracking-tight">
                        {settings["cotizacion.empresa_nombre"] || "EMPRESA PROVEEDORA"}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 leading-tight">
                      <p>{settings["cotizacion.empresa_direccion"] || "Sede Central Corporativa"}</p>
                      <p>
                        RUC: {settings["cotizacion.empresa_ruc"] || "20000000000"} &bull; Web:{" "}
                        {settings["cotizacion.empresa_web"] || "www.empresa.com"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#082653] tracking-wider uppercase block">
                      PROPUESTA COMERCIAL &bull; SERVICIOS CORPORATIVOS
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Suministro y Prestación de Servicios de Conectividad B2B
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right space-y-0.5 bg-transparent">
                <div className="text-xs font-bold text-[#082653] tracking-tight">
                  {quoteCode}
                </div>
                <div className="text-[11px] text-gray-600 pt-0.5">
                  Fecha: <span className="font-semibold text-gray-800">{dateFormatted}</span>
                </div>
                <div className="text-[10px] text-gray-500">Modalidad: {isRenewal ? "Renovación Comercial" : "Venta Estándar"}</div>
              </div>
            </div>

            {/* Recipient / Client Block (Fondo Transparente, Sin Plomo) */}
            <div className="bg-transparent border border-gray-300 rounded-lg p-3 text-xs grid grid-cols-2 gap-3 leading-relaxed">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Cliente / Razón Social:
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  {opp.razon_social || opp.contacto_nombre_completo || "Cliente No Asignado"}
                </span>
                <div className="text-gray-700 text-[11px]">
                  RUC / Doc: <span className="font-semibold">{opp.numero_documento || "---"}</span>
                </div>
                <div className="text-gray-700 text-[11px]">
                  Dirección: {addresses[0]?.direccion_con_ubigeo || addresses[0]?.direccion_completa || "Dirección según contrato"}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Atención / Contacto Clave:
                </span>
                <span className="font-semibold text-gray-800">
                  {contactPerson}
                </span>
                <div className="text-gray-700 text-[11px]">
                  Teléfono: {contactPhone} &bull; Email: {contactEmail}
                </div>
                <div className="text-gray-700 text-[11px]">
                  Vigencia de Oferta: <span className="font-semibold text-[#082653]">15 días calendario</span>
                </div>
              </div>
            </div>

            {/* Greeting */}
            <div className="text-xs text-gray-800 leading-relaxed bg-transparent">
              Estimados Señores:
              <br />
              Por medio de la presente nos complace presentarles nuestra propuesta técnico-económica para el suministro de los servicios requeridos por su representada, conforme a los términos y especificaciones detalladas a continuación:
            </div>

            {/* Table of Services - Formato Corporativo Formal 4 Columnas (Azul Marino #082653) */}
            <CorporateQuoteTable
              items={items}
              currency={opp.moneda || "Soles"}
              editable={false}
            />

            {/* Commercial Conditions (Clauses 1 to 9) - Jala de la plantilla */}
            <div className="space-y-1 pt-1 bg-transparent">
              <div className="text-[10px] font-bold text-[#082653] uppercase tracking-wider border-b border-gray-300 pb-0.5">
                CONDICIONES COMERCIALES Y DE SERVICIO:
              </div>
              <div className="text-[10px] text-gray-700 leading-normal whitespace-pre-line space-y-0.5 bg-transparent">
                {settings["cotizacion.condiciones_defecto"] ||
                  opp.condiciones_comerciales ||
                  "1. Los precios indicados incluyen IGV (18%).\n2. Oferta comercial válida por 15 días calendario a partir de su emisión.\n3. Plazo del acuerdo: Según lo indicado en la tabla.\n4. Facturación inicia a la firma del Acta de Entrega del Servicio (AES).\n5. Asistencia y soporte técnico 24/7 incluido."}
              </div>
            </div>
          </div>

          {/* Page 1 Footer stamp */}
          <div className="border-t border-gray-300 pt-2 flex items-center justify-between text-[9px] text-gray-400 mt-4 bg-transparent">
            <span>{settings["cotizacion.empresa_nombre"] || "NextLead CRM"} &bull; Documento Oficial</span>
            <span>Página 1 de 2</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAGE 2: EXCLUSIONS, LEGAL NOTICE, SIGNATURES & BANNER (A4) */}
        {/* ========================================================= */}
        <div className={`a4-page a4-page-2 bg-white shadow-md print:shadow-none border print:border-none min-h-[1080px] flex flex-col justify-between relative text-gray-900 font-sans overflow-hidden ${resolvedMembreteBg ? "pt-28 sm:pt-30 pb-20 sm:pb-24 px-8 sm:px-12 print:pt-[27mm] print:pb-[22mm] print:px-[15mm]" : "p-8 sm:p-10 print:pt-[15mm] print:pb-[15mm] print:px-[15mm]"}`}>
          {/* Hoja Membrete background full A4 */}
          {resolvedMembreteBg && (
            <img
              src={getMediaUrl(resolvedMembreteBg)}
              alt="Hoja Membrete Oficial"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
            />
          )}
          <div className="space-y-5 relative z-10 bg-transparent">
            {/* Header Mini */}
            <div className="flex items-center justify-between border-b border-gray-300 pb-2 text-[10px] text-gray-500 bg-transparent">
              <span className="font-bold text-gray-700">{settings["cotizacion.empresa_nombre"] || "EMPRESA PROVEEDORA"}</span>
              <span>{quoteCode} &bull; Hoja de Conformidad y Premisas Técnicas</span>
            </div>

            {/* Clause 10: Technical Exclusions */}
            <div className="space-y-1.5 bg-transparent">
              <div className="text-xs font-bold text-[#082653] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-[#082653]" />
                10. EXCLUSIONES Y PREMISAS TÉCNICAS:
              </div>
              <div className="text-[10px] text-gray-700 leading-relaxed bg-transparent border border-gray-300 p-3 rounded-md whitespace-pre-line">
                {settings["cotizacion.exclusiones_defecto"] ||
                  "No se incluye obras civiles extraordinarias, ductería especial ni cableado interno fuera de la zona de demarcación establecida. El cliente suministrará toma de corriente estabilizada y espacio adecuado para el equipamiento de telecomunicaciones."}
              </div>
            </div>

            {/* Formal Legal Acceptance Notice */}
            <div className="text-xs text-gray-800 leading-relaxed bg-transparent border border-gray-300 p-3.5 rounded-lg">
              <span className="font-bold text-[#082653] block mb-1">
                Aceptación de la Propuesta Comercial:
              </span>
              La firma de la presente propuesta comercial implica la conformidad íntegra del cliente con las especificaciones técnicas, precios, plazos y condiciones comerciales descritas. El presente documento servirá como sustento formal para la emisión de la orden de instalación y el respectivo contrato de prestación de servicios.
            </div>

            {/* Dual Signatures Box */}
            <div className="grid grid-cols-2 gap-8 pt-6 bg-transparent">
              {/* Executive / Seller Signature */}
              <div className="border border-gray-300 rounded-lg p-4 bg-transparent text-center flex flex-col justify-between min-h-[160px]">
                <div className="h-20 border-b border-dashed border-gray-400 flex items-end justify-center pb-2">
                  <span className="text-[10px] text-gray-400 italic">Suscrito Comercialmente</span>
                </div>
                <div className="pt-2 text-xs">
                  <div className="font-bold text-gray-900">
                    {opp.firma_nombre || settings["cotizacion.firma_nombre_defecto"] || opp.vendedor_nombre || "Asesor Comercial"}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {opp.firma_cargo || settings["cotizacion.firma_cargo_defecto"] || "Ejecutivo de Cuentas B2B"}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {opp.firma_celular || settings["cotizacion.firma_celular_defecto"] || ""} &bull;{" "}
                    {opp.firma_email || settings["cotizacion.firma_email_defecto"] || ""}
                  </div>
                </div>
              </div>

              {/* Client Acceptance Signature */}
              <div className="border border-gray-300 rounded-lg p-4 bg-transparent text-center flex flex-col justify-between min-h-[160px]">
                <div className="h-20 border-b border-dashed border-gray-400 flex items-end justify-center pb-2">
                  <span className="text-[10px] text-gray-400 italic">Firma y Sello de Recepción / Aceptación</span>
                </div>
                <div className="pt-2 text-xs">
                  <div className="font-bold text-gray-900">
                    {contactPerson}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    Representante Legal / Cliente Autorizado &bull; DNI / CE: {matchedSub?.numero_documento || "______________________"}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    Razón Social: {opp.razon_social || opp.contacto_nombre_completo || "Cliente"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 Bottom Footer Banner / Image */}
          <div className="space-y-3 pt-4 relative z-10 bg-transparent">
            {mostrarDatosEmpresa && settings["cotizacion.pie_pagina_url"] ? (
              <img
                src={getMediaUrl(settings["cotizacion.pie_pagina_url"])}
                alt="Banner Pie de Página"
                className="w-full h-16 object-contain rounded-md"
              />
            ) : null}

            <div className="flex items-center justify-between text-[9px] text-gray-400 border-t border-gray-300 pt-2 bg-transparent">
              <span>{settings["cotizacion.empresa_nombre"] || "NextLead CRM"} &bull; Cotizador B2B Generado Digitalmente</span>
              <span>Página 2 de 2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintQuotationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-sm text-muted-foreground">
          Cargando cotización...
        </div>
      }
    >
      <PrintQuotationContent />
    </Suspense>
  );
}
