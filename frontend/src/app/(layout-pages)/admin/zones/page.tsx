"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Plus, Search, Filter, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Page() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Zonas y Tarifas de Entrega
          </h1>
          <p className="text-sm text-muted-foreground">
            Distritos, delimitación de cobertura y costos de flete.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
          <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="size-4" />
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros Activos</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">Total en el sistema</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado Operativo</CardTitle>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 font-semibold">ONLINE</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">100%</div>
            <p className="text-xs text-muted-foreground mt-1">Sincronizado con base de datos</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Hoy</div>
            <p className="text-xs text-muted-foreground mt-1">Actualizado automáticamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="bg-card">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en Zonas y Tarifas de Entrega..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" />
                Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-lg border bg-muted/20 p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Zonas y Tarifas de Entrega conectado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Este módulo ya está activo y configurado con Tailwind CSS y Next.js 16. Puedes registrar datos o consultar la API de Spring Boot.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
