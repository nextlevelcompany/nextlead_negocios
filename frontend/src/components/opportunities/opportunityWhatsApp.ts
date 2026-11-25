export interface OpportunityWhatsAppParams {
  id?: number | string | null;
  titulo?: string;
  empresa?: string;
  ruc?: string;
  direccion?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  tipo_propuesta?: string;
  plazo_acuerdo?: number | string;
  moneda?: string;
  items?: Array<{
    titulo?: string;
    descripcion?: string;
    cantidad?: number;
    precio?: number;
    instalacion?: number;
    direccion?: string;
  }>;
  total_mensual?: number;
  total_instalacion?: number;
  asesor_nombre?: string;
  asesor_cargo?: string;
  asesor_celular?: string;
  asesor_email?: string;
  condiciones?: string;
  notas?: string;
}

export function buildOpportunityWhatsAppMessage(p: OpportunityWhatsAppParams): string {
  const currencySymbol = p.moneda === "Dólares" ? "$" : "S/";
  const fmt = (num?: number) =>
    (num || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines: string[] = [];

  lines.push("💼 *DETALLES DE LA OPORTUNIDAD COMERCIAL*");
  if (p.id) lines.push(`*Código de Oportunidad:* #${p.id}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");

  lines.push("🏢 *DATOS DEL CLIENTE / EMPRESA*");
  lines.push(`• *Empresa / Razón Social:* ${p.empresa || "No especificada"}`);
  if (p.ruc) lines.push(`• *RUC / Documento:* ${p.ruc}`);
  if (p.direccion) lines.push(`• *Dirección Fiscal / Sede:* ${p.direccion}`);
  if (p.contacto) lines.push(`• *Persona de Contacto:* ${p.contacto}`);
  if (p.telefono) lines.push(`• *Teléfono / Celular:* ${p.telefono}`);
  if (p.correo) lines.push(`• *Correo Electrónico:* ${p.correo}`);

  lines.push("");
  lines.push("📋 *DETALLE DE LA PROPUESTA*");
  lines.push(`• *Título:* ${p.titulo || "Cotización Comercial"}`);
  lines.push(
    `• *Tipo de Propuesta:* ${
      p.tipo_propuesta === "renovacion" ? "Renovación de Contrato" : "Venta Nueva"
    }`
  );
  if (p.plazo_acuerdo) lines.push(`• *Plazo de Acuerdo:* ${p.plazo_acuerdo} meses`);
  lines.push(`• *Moneda:* ${p.moneda || "Soles"}`);

  if (p.items && p.items.length > 0) {
    lines.push("");
    lines.push("📦 *SERVICIOS Y PRODUCTOS COTIZADOS*");
    p.items.forEach((it, idx) => {
      const nom = it.titulo || it.descripcion || `Servicio ${idx + 1}`;
      const cant = it.cantidad || 1;
      const precio = fmt(it.precio);
      const inst =
        Number(it.instalacion || 0) > 0 ? ` | Instalación: ${currencySymbol} ${fmt(it.instalacion)}` : "";
      lines.push(`${idx + 1}. *${nom}* (Cantidad: ${cant})`);
      lines.push(`   └ Mensualidad: ${currencySymbol} ${precio}/mes${inst}`);
      if (it.direccion && it.direccion !== "Dirección de Sede Principal") {
        lines.push(`   └ Sede de Entrega: ${it.direccion}`);
      }
    });
  }

  lines.push("");
  lines.push("💰 *RESUMEN ECONÓMICO*");
  lines.push(`• *Total Mensual (Inc. IGV):* ${currencySymbol} ${fmt(p.total_mensual)}`);
  if (Number(p.total_instalacion || 0) > 0) {
    lines.push(`• *Total Instalación (Inc. IGV):* ${currencySymbol} ${fmt(p.total_instalacion)}`);
  }

  if (p.asesor_nombre) {
    lines.push("");
    lines.push("👤 *ASESOR COMERCIAL ASIGNADO*");
    lines.push(`• *Asesor:* ${p.asesor_nombre}${p.asesor_cargo ? ` (${p.asesor_cargo})` : ""}`);
    if (p.asesor_celular) lines.push(`• *Celular:* ${p.asesor_celular}`);
    if (p.asesor_email) lines.push(`• *Correo:* ${p.asesor_email}`);
  }

  if (p.condiciones) {
    lines.push("");
    lines.push("📝 *Condiciones Comerciales:*");
    lines.push(p.condiciones);
  }

  if (p.notas) {
    lines.push("");
    lines.push("📌 *Notas Adicionales:*");
    lines.push(p.notas);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("✨ _Generado desde NextLead Negocios_");

  return lines.join("\n");
}

export async function copyOpportunityToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, fallback to execCommand", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}

export function openOpportunityWhatsApp(phone: string | undefined, text: string) {
  if (typeof window === "undefined") return;
  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
  const encodedText = encodeURIComponent(text);

  let targetUrl = "";
  if (cleanPhone) {
    // Si tiene 9 dígitos (formato celular peruano), anteponer código país 51
    const fullPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
    targetUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  } else {
    // Abrir WhatsApp con el texto listo para enviar a cualquier destinatario
    targetUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(targetUrl, "_blank", "noopener,noreferrer");
}
