"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  RefreshCw,
  Search,
  Filter,
  Download,
  DollarSign,
  Calendar,
  Award,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Building2,
  Sliders,
  FileSpreadsheet,
  Info,
} from "lucide-react";

export default function PayrollCommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPerfil, setFilterPerfil] = useState("all");

  const now = new Date();
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(now.getFullYear());

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/payroll/commissions?mes=${selectedMes}&anio=${selectedAnio}`);
      setData(res.data);
    } catch (err: any) {
      console.error("Error al cargar comisiones de personal:", err);
      toast.error("Error al cargar comisiones del personal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [selectedMes, selectedAnio]);

  const kpis = data?.indicadores || {
    total_colaboradores: 0,
    total_altas_equipo: 0,
    total_comisiones: 0,
    total_bonos: 0,
    total_sueldos_base: 0,
    total_a_pagar: 0,
  };

  const arpu = data?.arpu || 168.64;
  const list: any[] = data?.detalles || [];

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const full = `${item.nombre_completo} ${item.dni || ""} ${item.rol_operativo || ""}`.toLowerCase();
      const matchSearch = full.includes(searchTerm.toLowerCase());
      const matchPerfil =
        filterPerfil === "all" ||
        (item.perfil_nombre && item.perfil_nombre.toLowerCase() === filterPerfil.toLowerCase()) ||
        (item.rol_operativo && item.rol_operativo.toLowerCase() === filterPerfil.toLowerCase());

      return matchSearch && matchPerfil;
    });
  }, [list, searchTerm, filterPerfil]);

  const handleExportExcel = () => {
    if (list.length === 0) {
      toast.error("No hay registros para exportar.");
      return;
    }
    try {
      const rows = filteredList.map((item) => ({
        Colaborador: item.nombre_completo,
        DNI: item.dni || "",
        "Rol Operativo": item.rol_operativo || "",
        "Perfil Comisional": item.perfil_nombre || item.rol_operativo || "",
        "Altas Logradas": item.altas,
        "Factor Comis. (%)": `${(item.factor_comision * 100).toFixed(0)}%`,
        "Rango de Metas": item.rango_nombre || "",
        "Sueldo Base (S/)": item.sueldo_base,
        "Comisión Generada (S/)": item.comision_monto,
        "Bono Fijo (S/)": item.bono_individual,
        "Gastos Adicionales (S/)": item.gastos_adicionales,
        "Total a Pagar (S/)": item.total_a_pagar,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Comisiones_Personal");
      XLSX.writeFile(wb, `Comisiones_Personal_${mesesNombres[selectedMes - 1]}_${selectedAnio}.xlsx`);
      toast.success("Archivo Excel exportado con éxito.");
    } catch (e: any) {
      console.error("Error al exportar:", e);
      toast.error("Error al exportar a Excel.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/payroll/staff" className="hover:text-primary transition-colors">
              Personal
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Comisiones de Ventas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="size-7 text-emerald-600" />
            Comisiones de Personal
          </h1>
          <p className="text-sm text-muted-foreground">
            Cálculo individual de comisiones por metas, ARPU y bonos escalonados según el rol del empleado.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 shadow-2xs">
            <Calendar className="size-4 text-muted-foreground ml-2" />
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="h-8 text-xs bg-transparent border-0 focus:ring-0 font-medium cursor-pointer"
            >
              {mesesNombres.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              className="h-8 text-xs bg-transparent border-0 focus:ring-0 font-medium cursor-pointer"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/payroll/staff">
              <Users className="size-4 text-blue-600" />
              <span>Directorio Empleados</span>
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
            <Link href="/rentabilidad/comisiones">
              <TrendingUp className="size-4 text-indigo-600" />
              <span>Liquidaciones Dealer</span>
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchCommissions} disabled={loading} className="gap-1.5 shadow-xs">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-xs"
          >
            <Download className="size-4" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Fuerza Comercial</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total_colaboradores}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Colaboradores comisionistas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Altas Totales Equipo</CardTitle>
            <Award className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{kpis.total_altas_equipo}</div>
            <p className="text-[11px] text-muted-foreground mt-1">ARPU Ref: S/ {Number(arpu).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Comisiones Generadas</CardTitle>
            <DollarSign className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              S/ {Number(kpis.total_comisiones).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Por factor sobre el ARPU</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Bonos por Tramo</CardTitle>
            <Award className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              S/ {Number(kpis.total_bonos).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Premios fijos por rango</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Planilla + Comisiones</CardTitle>
            <DollarSign className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              S/ {Number(kpis.total_a_pagar).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">A pagar a los empleados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado o DNI..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={filterPerfil}
                onChange={(e) => setFilterPerfil(e.target.value)}
                className="h-9 text-xs bg-card border rounded-md px-2.5 font-medium cursor-pointer shadow-2xs"
              >
                <option value="all">Todos los Perfiles</option>
                <option value="Full Time">Full Time</option>
                <option value="Medio Tiempo">Medio Tiempo</option>
                <option value="Freelance">Freelance</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="font-semibold">Colaborador</TableHead>
                  <TableHead className="font-semibold">Rol / Perfil</TableHead>
                  <TableHead className="text-center font-semibold">Altas Logradas</TableHead>
                  <TableHead className="text-center font-semibold">% Comisión (Factor)</TableHead>
                  <TableHead className="font-semibold">Rango Alcanzado</TableHead>
                  <TableHead className="text-right font-semibold">Sueldo Base (S/)</TableHead>
                  <TableHead className="text-right font-semibold">Comisión (S/)</TableHead>
                  <TableHead className="text-right font-semibold">Bono (S/)</TableHead>
                  <TableHead className="text-right font-semibold">Total a Pagar (S/)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredList.map((item, idx) => {
                  const factorPct = (Number(item.factor_comision || 0) * 100).toFixed(0);
                  const isSupervisor = (item.rol_operativo || "").toLowerCase().includes("supervisor");
                  return (
                    <TableRow key={item.id || idx} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">
                        <div className="flex flex-col">
                          <span>{item.nombre_completo}</span>
                          <span className="text-[11px] text-muted-foreground font-mono font-normal">
                            DNI: {item.dni || "-"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isSupervisor
                              ? "bg-purple-50 text-purple-700 border-purple-300 font-semibold"
                              : "bg-indigo-50/60 text-indigo-700 border-indigo-200 font-medium"
                          }
                        >
                          {item.perfil_nombre || item.rol_operativo}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <Badge variant="secondary" className="font-bold text-xs">
                          {item.altas} {isSupervisor ? "(Equipo)" : "altas"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-mono font-medium">
                        {factorPct}% ({item.factor_comision})
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[11px] bg-background font-normal">
                          {item.rango_nombre || "0 Ventas"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-mono text-muted-foreground">
                        S/ {Number(item.sueldo_base || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-emerald-600">
                        S/ {Number(item.comision_monto || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-amber-600">
                        S/ {Number(item.bono_individual || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                        S/ {Number(item.total_a_pagar || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                      No hay colaboradores comisionistas registrados para este período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Explanatory Info Card */}
      <Card className="shadow-xs border bg-muted/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                Regla de Liquidación: Sueldo Base + (Altas x ARPU S/ {Number(arpu).toFixed(2)} x Factor) + Bono de Rango
              </p>
              <p>
                Los supervisores comisionan sobre el total consolidado de altas del equipo. La información está directamente sincronizada con el módulo de Rentabilidad y el directorio de Empleados.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5 shadow-xs">
            <Link href="/rentabilidad/configuracion">
              <Sliders className="size-3.5 text-primary" />
              <span>Configurar Escalas</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
