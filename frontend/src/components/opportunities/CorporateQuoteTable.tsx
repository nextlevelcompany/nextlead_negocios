"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CorporateQuoteItem {
  id?: number | string;
  tipo?: "propuesto" | "actual";
  sede?: string;
  direccion?: string;
  codigo_circuito?: string;
  titulo?: string;
  descripcion?: string;
  especificaciones?: string;
  ancho_banda?: string;
  plazo?: number;
  cantidad?: number;
  precio?: number; // mensual con IGV incluido
  instalacion?: number; // cargo unico con IGV incluido
  moneda?: string;
}

interface CorporateQuoteTableProps {
  items: CorporateQuoteItem[];
  currency?: string;
  editable?: boolean;
  onUpdateItem?: (index: number, field: string, value: any) => void;
  onRemoveItem?: (index: number) => void;
  availableAddresses?: string[];
  transparent?: boolean;
}

const NAVY_COLOR = "#082653";

export function CorporateQuoteTable({
  items,
  currency = "Soles",
  editable = false,
  onUpdateItem,
  onRemoveItem,
  availableAddresses = [],
}: CorporateQuoteTableProps) {
  const currencySymbol = currency === "Dólares" ? "$" : "S/";

  // Financial calculations: Product prices ALREADY include IGV (18%)
  const totalInstalacion = items.reduce(
    (acc, curr) => acc + (Number(curr.instalacion) || 0) * (Number(curr.cantidad) || 1),
    0
  );
  const totalMensual = items.reduce(
    (acc, curr) => acc + (Number(curr.precio) || 0) * (Number(curr.cantidad) || 1),
    0
  );

  // Desglose fiscal exacto: Base Imponible = Total / 1.18, IGV = Total - Base
  const subtotalInstalacion = totalInstalacion > 0 ? totalInstalacion / 1.18 : 0;
  const igvInstalacion = totalInstalacion - subtotalInstalacion;

  const subtotalMensual = totalMensual > 0 ? totalMensual / 1.18 : 0;
  const igvMensual = totalMensual - subtotalMensual;

  const formatMoney = (amount: number) => {
    if (isNaN(amount) || amount === 0) return "-";
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="w-full overflow-x-auto my-3 rounded-lg border border-slate-300 overflow-hidden bg-white select-text shadow-2xs">
      <table
        className="w-full text-slate-900 border-collapse"
        style={{
          fontFamily: "'Segoe UI', Arial, Inter, sans-serif",
          borderCollapse: "collapse",
        }}
      >
        {/* ========================================================= */}
        {/* 1. THEAD: Azul Marino Sólido (#082653), Texto Blanco      */}
        {/* ========================================================= */}
        <thead>
          <tr style={{ backgroundColor: NAVY_COLOR, color: "#FFFFFF" }}>
            <th
              style={{
                width: "7%",
                padding: "9px 6px",
                textAlign: "center",
                verticalAlign: "middle",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                borderRight: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              ITEM
            </th>
            <th
              style={{
                width: editable ? "55%" : "63%",
                padding: "9px 14px",
                textAlign: "left",
                verticalAlign: "middle",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                borderRight: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              DESCRIPCIÓN
            </th>
            <th
              style={{
                width: "15%",
                padding: "9px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                fontWeight: 700,
                fontSize: "11px",
                lineHeight: "1.2",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                borderRight: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              INSTALACIÓN (*)
            </th>
            <th
              style={{
                width: "15%",
                padding: "9px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                fontWeight: 700,
                fontSize: "11px",
                lineHeight: "1.2",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                ...(editable ? { borderRight: "1px solid rgba(255, 255, 255, 0.15)" } : {}),
              }}
            >
              PRECIO MENSUAL
            </th>
            {editable && (
              <th
                style={{
                  width: "7%",
                  padding: "9px 4px",
                  textAlign: "center",
                  verticalAlign: "middle",
                  fontWeight: 700,
                  fontSize: "10px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                }}
              >
                ACCIÓN
              </th>
            )}
          </tr>
        </thead>

        {/* ========================================================= */}
        {/* 2. TBODY: Fondo Blanco, Separadores Horizontales Discretos */}
        {/* ========================================================= */}
        <tbody className="divide-y divide-slate-200">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={editable ? 5 : 4}
                style={{
                  padding: "28px",
                  textAlign: "center",
                  color: "#64748B",
                  fontStyle: "italic",
                  fontSize: "12px",
                }}
              >
                No se han registrado ítems en la propuesta. Agrega servicios desde el catálogo o de forma manual.
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const tituloServicio = item.titulo || item.descripcion || "Servicio Corporativo";
              const parrafo =
                item.especificaciones ||
                item.ancho_banda ||
                "Acceso a internet de alta disponibilidad con velocidad garantizada al 70%, IP Pública fija y soporte técnico 24/7.";
              const plazoAcuerdo = item.plazo ? `${item.plazo} meses` : "24 meses";
              const direccionServicio = item.direccion || item.sede || "Dirección de Sede Principal";

              const instalacionMonto = Number(item.instalacion) || 0;
              const precioMonto = Number(item.precio) || 0;

              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: "#FFFFFF",
                    verticalAlign: "top",
                  }}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* COLUMNA 1: ITEM */}
                  <td
                    style={{
                      padding: "12px 6px",
                      textAlign: "center",
                      verticalAlign: "top",
                      fontWeight: 700,
                      fontSize: "12px",
                      color: NAVY_COLOR,
                      borderRight: "1px solid #F1F5F9",
                    }}
                  >
                    {index + 1}
                  </td>

                  {/* COLUMNA 2: DESCRIPCIÓN CON ESTILO CORPORATIVO AZUL MARINO */}
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "left",
                      verticalAlign: "top",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      borderRight: "1px solid #F1F5F9",
                    }}
                  >
                    {editable ? (
                      <div className="space-y-2">
                        {/* Título del servicio */}
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                            Título del Servicio / Plan:
                          </label>
                          <input
                            type="text"
                            value={tituloServicio}
                            onChange={(e) => onUpdateItem?.(index, "descripcion", e.target.value)}
                            placeholder="Ej. Internet Dedicado - 20 Mbps"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                          />
                        </div>

                        {/* Párrafo descriptivo */}
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                            Párrafo Descriptivo / Especificaciones:
                          </label>
                          <textarea
                            rows={2}
                            value={item.especificaciones || item.ancho_banda || ""}
                            onChange={(e) => onUpdateItem?.(index, "especificaciones", e.target.value)}
                            placeholder="Acceso a internet Dedicado con overbooking de 1:1, simétrico..."
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
                          />
                        </div>

                        {/* Bloque 3: Acuerdo de Servicios */}
                        <div className="pt-1.5 border-t border-slate-100">
                          <label className="text-[10px] text-slate-700 font-bold block mb-0.5">
                            Acuerdo de Servicios:
                          </label>
                          <select
                            value={item.plazo || 24}
                            onChange={(e) => onUpdateItem?.(index, "plazo", Number(e.target.value))}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-semibold bg-white text-slate-900"
                          >
                            <option value={12}>Acuerdo de Servicios: 12 meses</option>
                            <option value={24}>Acuerdo de Servicios: 24 meses</option>
                            <option value={36}>Acuerdo de Servicios: 36 meses</option>
                            <option value={6}>Acuerdo de Servicios: 6 meses</option>
                          </select>
                        </div>

                        {/* Bloque 4: Dirección de Instalación / Sede */}
                        <div className="pt-1.5 border-t border-slate-100">
                          <label className="text-[10px] text-slate-700 font-bold block mb-0.5">
                            Dirección de Instalación / Sede:
                          </label>
                          {availableAddresses.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                value={direccionServicio}
                                onChange={(e) => onUpdateItem?.(index, "direccion", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium text-slate-900"
                              >
                                {availableAddresses.map((addr, aIdx) => (
                                  <option key={aIdx} value={addr}>
                                    {addr}
                                  </option>
                                ))}
                                <option value="__custom__">-- Otra Dirección / Personalizada --</option>
                              </select>
                              <input
                                type="text"
                                value={direccionServicio}
                                onChange={(e) => onUpdateItem?.(index, "direccion", e.target.value)}
                                placeholder="Ej. Av. Juan de Arona 151, San Isidro, Lima"
                                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-900"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={direccionServicio}
                              onChange={(e) => onUpdateItem?.(index, "direccion", e.target.value)}
                              placeholder="Ej. Av. Juan de Arona 151, San Isidro, Lima"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900"
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-slate-900">
                        {/* 1. Nombre del servicio en negrita y azul marino (#082653) */}
                        <div style={{ fontWeight: 700, fontSize: "13px", color: NAVY_COLOR, letterSpacing: "-0.2px" }}>
                          {tituloServicio}
                        </div>

                        {/* 2. Descripción del servicio en texto negro */}
                        <div style={{ fontWeight: 400, fontSize: "11.5px", color: "#1E293B", lineHeight: "1.45" }}>
                          {parrafo}
                        </div>

                        {/* 3. Información adicional organizada debajo */}
                        <div className="pt-1 space-y-0.5 text-[11px] text-slate-700">
                          <div>
                            <span style={{ fontWeight: 700, color: NAVY_COLOR }}>Acuerdo de Servicios: </span>
                            <span>{plazoAcuerdo}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: NAVY_COLOR }}>Dirección: </span>
                            <span>{direccionServicio}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* COLUMNA 3: INSTALACIÓN (*) (Formato contable flexbox justify-between) */}
                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      fontSize: "12px",
                      borderRight: "1px solid #F1F5F9",
                    }}
                  >
                    {editable ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-700">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.instalacion}
                            onChange={(e) =>
                              onUpdateItem?.(index, "instalacion", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 text-right px-1 py-0.5 text-xs border border-slate-300 rounded font-semibold text-slate-900"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block text-right">Inc. IGV</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          fontWeight: 500,
                          color: "#1E293B",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: NAVY_COLOR }}>{currencySymbol}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(instalacionMonto)}</span>
                      </div>
                    )}
                  </td>

                  {/* COLUMNA 4: PRECIO MENSUAL (En negrita y destacado) */}
                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      fontSize: "12px",
                      ...(editable ? { borderRight: "1px solid #F1F5F9" } : {}),
                    }}
                  >
                    {editable ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-700">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precio}
                            onChange={(e) =>
                              onUpdateItem?.(index, "precio", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 text-right px-1 py-0.5 text-xs border border-slate-300 rounded font-bold text-slate-900"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block text-right">Inc. IGV</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          fontWeight: 700,
                          color: NAVY_COLOR,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: NAVY_COLOR }}>{currencySymbol}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(precioMonto)}</span>
                      </div>
                    )}
                  </td>

                  {/* ACCIÓN (Solo en modo editable) */}
                  {editable && (
                    <td
                      style={{
                        padding: "12px 4px",
                        textAlign: "center",
                        verticalAlign: "top",
                      }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem?.(index)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        title="Eliminar este ítem"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>

        {/* ========================================================= */}
        {/* 3. TFOOT: TOTAL NO INC IGV, I.G.V. (18%), TOTAL INC IGV   */}
        {/* ========================================================= */}
        <tfoot>
          {/* FILA 1: TOTAL NO INC IGV (Fondo gris muy claro #F8FAFC) */}
          <tr
            style={{
              backgroundColor: "#F8FAFC",
              borderTop: "2px solid #CBD5E1",
              borderBottom: "1px solid #E2E8F0",
              fontSize: "11.5px",
            }}
          >
            <td
              colSpan={2}
              style={{
                padding: "8px 14px",
                borderRight: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <span style={{ fontStyle: "italic", fontSize: "10px", color: "#64748B", fontWeight: 400 }}>
                  (*) Pago por única vez
                </span>
                <span style={{ fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  TOTAL NO INC IGV
                </span>
              </div>
            </td>
            {/* Instalación Subtotal */}
            <td
              style={{
                padding: "8px 10px",
                borderRight: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 700,
                  color: "#0F172A",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(subtotalInstalacion)}</span>
              </div>
            </td>
            {/* Precio Mensual Subtotal */}
            <td
              style={{
                padding: "8px 10px",
                ...(editable ? { borderRight: "1px solid #E2E8F0" } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 700,
                  color: "#0F172A",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(subtotalMensual)}</span>
              </div>
            </td>
            {editable && <td style={{ borderLeft: "1px solid #E2E8F0" }}></td>}
          </tr>

          {/* FILA 2: I.G.V. (18%) (Fondo blanco #FFFFFF) */}
          <tr
            style={{
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #CBD5E1",
              fontSize: "11px",
            }}
          >
            <td
              colSpan={2}
              style={{
                padding: "7px 14px",
                textAlign: "right",
                fontWeight: 700,
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                borderRight: "1px solid #E2E8F0",
              }}
            >
              I.G.V. (18%)
            </td>
            {/* IGV Instalación */}
            <td
              style={{
                padding: "7px 10px",
                borderRight: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(igvInstalacion)}</span>
              </div>
            </td>
            {/* IGV Mensual */}
            <td
              style={{
                padding: "7px 10px",
                ...(editable ? { borderRight: "1px solid #E2E8F0" } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(igvMensual)}</span>
              </div>
            </td>
            {editable && <td style={{ borderLeft: "1px solid #E2E8F0" }}></td>}
          </tr>

          {/* FILA 3: TOTAL INC IGV (Fondo Azul Marino Sólido #082653, Texto Blanco y Mayor Tamaño) */}
          <tr
            style={{
              backgroundColor: NAVY_COLOR,
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <td
              colSpan={2}
              style={{
                padding: "10px 14px",
                textAlign: "right",
                fontWeight: 800,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderRight: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              TOTAL INC IGV
            </td>
            {/* Total Instalación Inc IGV */}
            <td
              style={{
                padding: "10px 10px",
                borderRight: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 800,
                  color: "#FFFFFF",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(totalInstalacion)}</span>
              </div>
            </td>
            {/* Total Mensual Inc IGV */}
            <td
              style={{
                padding: "10px 10px",
                ...(editable ? { borderRight: "1px solid rgba(255, 255, 255, 0.15)" } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  fontSize: "14px",
                }}
              >
                <span>{currencySymbol}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(totalMensual)}</span>
              </div>
            </td>
            {editable && <td style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.15)" }}></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default CorporateQuoteTable;
