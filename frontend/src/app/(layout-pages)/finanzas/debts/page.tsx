"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  CreditCard,
  Percent,
  Edit,
  RotateCcw,
  Check,
  Calculator,
  ArrowRight,
  ShieldAlert,
  Building,
  FileSpreadsheet,
} from "lucide-react";

interface LoanItem {
  id: number;
  entidad_bancaria: string;
  numero_prestamo?: string | null;
  monto_prestado: number;
  moneda: string;
  fecha_inicio: string;
  cuotas_totales: number;
  cuotas_pendientes?: number;
  saldo_pendiente?: number;
  tcea?: number;
  estado: string; // 'Activa' | 'Liquidada'
  notas?: string | null;
  notes?: string | null;
}

interface InstallmentItem {
  id: number;
  deuda_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_cuota: number;
  capital: number;
  interes: number;
  seguro_comisiones?: number;
  estado: "Pendiente" | "Pagado";
  fecha_pago?: string | null;
  gasto_id?: number | null;
  entidad_bancaria?: string;
  numero_prestamo?: string | null;
  moneda?: string;
  tcea?: number;
  dias_restantes?: number;
}

export default function DebtsPage() {
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState<InstallmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [activeTab, setActiveTab] = useState("prestamos");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterBank, setFilterBank] = useState<string>("all");
  const [filterMoneda, setFilterMoneda] = useState<string>("all");

  // Schedule / Details Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null);
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Pay Installment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentItem | null>(null);
  const [payMethod, setPayMethod] = useState("Transferencia");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Edit Installment Modal
  const [editInstallmentModalOpen, setEditInstallmentModalOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<InstallmentItem | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCapital, setEditCapital] = useState<number>(0);
  const [editInteres, setEditInteres] = useState<number>(0);
  const [editSeguro, setEditSeguro] = useState<number>(0);
  const [savingInstallment, setSavingInstallment] = useState(false);

  // Edit Loan Modal
  const [editLoanModalOpen, setEditLoanModalOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<LoanItem | null>(null);
  const [editLoanBank, setEditLoanBank] = useState("");
  const [editLoanNumber, setEditLoanNumber] = useState("");
  const [editLoanNotes, setEditLoanNotes] = useState("");
  const [savingEditLoan, setSavingEditLoan] = useState(false);

  // New Loan Modal
  const [newLoanModalOpen, setNewLoanModalOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({
    entidad_bancaria: "BCP",
    custom_banco: "",
    tipo_deuda: "Préstamo Comercial / Capital de Trabajo",
    numero_prestamo: "",
    monto_prestado: 10000,
    moneda: "PEN",
    fecha_inicio: new Date().toISOString().split("T")[0],
    cuotas_totales: 12,
    tcea: 14.5,
    metodo_recepcion: "Transferencia",
    notas: "",
  });
  const [savingLoan, setSavingLoan] = useState(false);

  // Live Simulator state
  const [simMonto, setSimMonto] = useState<number>(20000);
  const [simPlazo, setSimPlazo] = useState<number>(12);
  const [simTcea, setSimTcea] = useState<number>(15.0);

  // Load all loans
  const fetchLoans = async () => {
    try {
      setLoading(true);
      const [loansRes, upRes] = await Promise.all([
        api.get("/api/deudas"),
        api.get("/api/deudas/proximas-cuotas").catch(() => ({ data: [] })),
      ]);
      setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
      setUpcomingInstallments(Array.isArray(upRes.data) ? upRes.data : []);
    } catch (err: any) {
      console.error("Error al cargar deudas:", err);
      toast.error("Error al cargar préstamos bancarios. Verifique la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Open schedule modal
  const handleOpenSchedule = async (loan: LoanItem) => {
    setSelectedLoan(loan);
    setScheduleModalOpen(true);
    setLoadingSchedule(true);
    try {
      const res = await api.get(`/api/deudas/${loan.id}`);
      if (res.data) {
        if (res.data.loan) setSelectedLoan(res.data.loan);
        setInstallments(res.data.installments || []);
      }
    } catch (err: any) {
      toast.error("Error al cargar cronograma de cuotas.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Open pay installment modal
  const handleOpenPay = (inst: InstallmentItem, loanRef?: LoanItem) => {
    setSelectedInstallment(inst);
    if (loanRef) {
      setSelectedLoan(loanRef);
    } else if (inst.entidad_bancaria) {
      setSelectedLoan({
        id: inst.deuda_id,
        entidad_bancaria: inst.entidad_bancaria,
        numero_prestamo: inst.numero_prestamo,
        monto_prestado: 0,
        moneda: inst.moneda || "PEN",
        fecha_inicio: "",
        cuotas_totales: 0,
        estado: "Activa",
      });
    }
    setPayMethod("Transferencia");
    setPayModalOpen(true);
  };

  // Submit payment
  const handleConfirmPay = async () => {
    if (!selectedInstallment) return;
    try {
      setSubmittingPayment(true);
      const res = await api.post(`/api/deudas/cuotas/pagar/${selectedInstallment.id}`, {
        metodo_pago: payMethod,
      });
      toast.success(res.data.message || "Cuota pagada con éxito. Registrado en Tesorería y Gastos.");
      setPayModalOpen(false);

      if (selectedLoan && scheduleModalOpen) {
        handleOpenSchedule(selectedLoan);
      }
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al pagar la cuota.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open edit installment modal
  const handleOpenEditInstallment = (inst: InstallmentItem) => {
    setInstallmentToEdit(inst);
    setEditDueDate(inst.fecha_vencimiento ? inst.fecha_vencimiento.substring(0, 10) : "");
    setEditAmount(inst.monto_cuota || 0);
    setEditCapital(inst.capital || 0);
    setEditInteres(inst.interes || 0);
    setEditSeguro(inst.seguro_comisiones || 0);
    setEditInstallmentModalOpen(true);
  };

  // Save edited installment
  const handleSaveInstallment = async () => {
    if (!installmentToEdit || !selectedLoan) return;
    if (!editDueDate || editAmount <= 0) {
      toast.error("Fecha y monto de cuota válidos son requeridos.");
      return;
    }
    try {
      setSavingInstallment(true);
      const res = await api.put(`/api/deudas/cuotas/update/${installmentToEdit.id}`, {
        fecha_vencimiento: editDueDate,
        monto_cuota: editAmount,
        capital: editCapital,
        interes: editInteres,
        seguro_comisiones: editSeguro,
      });
      toast.success(res.data.message || "Cuota actualizada correctamente.");
      setEditInstallmentModalOpen(false);
      handleOpenSchedule(selectedLoan);
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al actualizar la cuota.");
    } finally {
      setSavingInstallment(false);
    }
  };

  // Annul paid installment
  const handleAnnulInstallment = async (inst: InstallmentItem) => {
    if (!confirm(`¿Está seguro de anular el pago de la Cuota #${inst.numero_cuota}? Se revertirá el egreso contable y la salida de fondos de Tesorería.`)) return;
    try {
      const res = await api.post(`/api/deudas/cuotas/anular/${inst.id}`);
      toast.success(res.data.message || "Pago de cuota anulado correctamente.");
      if (selectedLoan) {
        handleOpenSchedule(selectedLoan);
      }
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al anular pago.");
    }
  };

  // Open edit loan modal
  const handleOpenEditLoan = (loan: LoanItem) => {
    setLoanToEdit(loan);
    setEditLoanBank(loan.entidad_bancaria || "");
    setEditLoanNumber(loan.numero_prestamo || "");
    setEditLoanNotes(loan.notas || loan.notes || "");
    setEditLoanModalOpen(true);
  };

  // Save edited loan
  const handleSaveEditLoan = async () => {
    if (!loanToEdit) return;
    if (!editLoanBank.trim()) {
      toast.error("La entidad bancaria es requerida.");
      return;
    }
    try {
      setSavingEditLoan(true);
      const res = await api.post("/api/deudas/save", {
        id: loanToEdit.id,
        entidad_bancaria: editLoanBank.trim(),
        numero_prestamo: editLoanNumber.trim(),
        notas: editLoanNotes.trim(),
        notes: editLoanNotes.trim(),
        monto_prestado: loanToEdit.monto_prestado,
        fecha_inicio: loanToEdit.fecha_inicio ? loanToEdit.fecha_inicio.substring(0, 10) : new Date().toISOString().split("T")[0],
        cuotas_totales: loanToEdit.cuotas_totales,
      });
      toast.success(res.data?.message || "Préstamo actualizado.");
      setEditLoanModalOpen(false);
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al actualizar préstamo.");
    } finally {
      setSavingEditLoan(false);
    }
  };

  // Delete loan
  const handleDeleteLoan = async (loan: LoanItem) => {
    if (!confirm(`¿Eliminar definitivamente el préstamo de ${loan.entidad_bancaria} (${loan.numero_prestamo || "S.N."})? Esto revertirá el ingreso inicial de tesorería.`)) return;
    try {
      const res = await api.delete(`/api/deudas/${loan.id}`);
      toast.success(res.data.message || "Préstamo eliminado exitosamente.");
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo eliminar el préstamo.");
    }
  };

  // Create new loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const bank = loanForm.entidad_bancaria === "OTRO" ? loanForm.custom_banco.trim() : loanForm.entidad_bancaria;
    if (!bank) {
      toast.error("Debe ingresar la entidad bancaria o financiera.");
      return;
    }
    if (loanForm.monto_prestado <= 0) {
      toast.error("El monto prestado debe ser mayor a 0.");
      return;
    }
    if (loanForm.cuotas_totales <= 0) {
      toast.error("Las cuotas totales deben ser al menos 1.");
      return;
    }

    try {
      setSavingLoan(true);
      const combinedNotes = `[${loanForm.tipo_deuda}] ${loanForm.notas || ""}`.trim();
      const res = await api.post("/api/deudas/save", {
        entidad_bancaria: bank,
        numero_prestamo: loanForm.numero_prestamo.trim(),
        monto_prestado: Number(loanForm.monto_prestado),
        moneda: loanForm.moneda,
        fecha_inicio: loanForm.fecha_inicio,
        cuotas_totales: Number(loanForm.cuotas_totales),
        tcea: Number(loanForm.tcea || 0),
        metodo_recepcion: loanForm.metodo_recepcion,
        notas: combinedNotes,
        notes: combinedNotes,
      });
      toast.success(res.data.message || "Préstamo registrado exitosamente.");
      setNewLoanModalOpen(false);
      setLoanForm({
        entidad_bancaria: "BCP",
        custom_banco: "",
        tipo_deuda: "Préstamo Comercial / Capital de Trabajo",
        numero_prestamo: "",
        monto_prestado: 10000,
        moneda: "PEN",
        fecha_inicio: new Date().toISOString().split("T")[0],
        cuotas_totales: 12,
        tcea: 14.5,
        metodo_recepcion: "Transferencia",
        notas: "",
      });
      fetchLoans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al registrar el préstamo.");
    } finally {
      setSavingLoan(false);
    }
  };

  // Calculate simulated installment in loanForm live
  const formSimulatedQuota = useMemo(() => {
    const p = Number(loanForm.monto_prestado) || 0;
    const n = Number(loanForm.cuotas_totales) || 1;
    const rate = Number(loanForm.tcea) || 0;
    if (p <= 0 || n <= 0) return { cuota: 0, totalInteres: 0 };
    if (rate <= 0) {
      return { cuota: p / n, totalInteres: 0 };
    }
    const monthlyRate = Math.pow(1.0 + rate / 100.0, 1.0 / 12.0) - 1.0;
    const cuota = (p * (monthlyRate * Math.pow(1.0 + monthlyRate, n))) / (Math.pow(1.0 + monthlyRate, n) - 1.0);
    const totalPagar = cuota * n;
    return {
      cuota: Math.round(cuota * 100) / 100,
      totalInteres: Math.round((totalPagar - p) * 100) / 100,
    };
  }, [loanForm.monto_prestado, loanForm.cuotas_totales, loanForm.tcea]);

  // Simulator tab calculation
  const simulatorCalc = useMemo(() => {
    const p = simMonto || 0;
    const n = simPlazo || 1;
    const rate = simTcea || 0;
    if (p <= 0 || n <= 0) return { cuota: 0, totalInteres: 0, totalPagar: 0, schedule: [] };

    let cuota = p / n;
    let totalInteres = 0;
    const schedule: any[] = [];

    if (rate > 0) {
      const monthlyRate = Math.pow(1.0 + rate / 100.0, 1.0 / 12.0) - 1.0;
      cuota = (p * (monthlyRate * Math.pow(1.0 + monthlyRate, n))) / (Math.pow(1.0 + monthlyRate, n) - 1.0);
      let balance = p;
      for (let i = 1; i <= n; i++) {
        const interes = balance * monthlyRate;
        const capital = i === n ? balance : cuota - interes;
        balance = Math.max(0, balance - capital);
        totalInteres += interes;
        schedule.push({
          num: i,
          cuota: Math.round((capital + interes) * 100) / 100,
          capital: Math.round(capital * 100) / 100,
          interes: Math.round(interes * 100) / 100,
          saldo: Math.round(balance * 100) / 100,
        });
      }
    } else {
      for (let i = 1; i <= n; i++) {
        schedule.push({
          num: i,
          cuota: Math.round((p / n) * 100) / 100,
          capital: Math.round((p / n) * 100) / 100,
          interes: 0,
          saldo: Math.round((p - (p / n) * i) * 100) / 100,
        });
      }
    }

    return {
      cuota: Math.round(cuota * 100) / 100,
      totalInteres: Math.round(totalInteres * 100) / 100,
      totalPagar: Math.round((p + totalInteres) * 100) / 100,
      schedule,
    };
  }, [simMonto, simPlazo, simTcea]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLoans.length === 0) {
      toast.error("No hay préstamos para exportar.");
      return;
    }

    // Sheet 1: Loans
    const dataLoans = filteredLoans.map((l) => {
      const pagadas = (l.cuotas_totales || 0) - (l.cuotas_pendientes || 0);
      return {
        "ID": l.id,
        "Entidad Bancaria": l.entidad_bancaria,
        "Nº Operación / Préstamo": l.numero_prestamo || "S.N.",
        "Moneda": l.moneda,
        "Monto Desembolsado": Number(l.monto_prestado),
        "Cuotas Totales": l.cuotas_totales,
        "Cuotas Pagadas": pagadas,
        "Cuotas Pendientes": l.cuotas_pendientes || 0,
        "Saldo Pendiente": Number(l.saldo_pendiente || 0),
        "TCEA (%)": Number(l.tcea || 0),
        "Fecha Desembolso": l.fecha_inicio ? l.fecha_inicio.substring(0, 10) : "",
        "Estado": l.estado,
        "Notas": l.notas || l.notes || "",
      };
    });

    // Sheet 2: Upcoming installments
    const dataInstallments = upcomingInstallments.map((inst) => ({
      "ID Cuota": inst.id,
      "Entidad": inst.entidad_bancaria,
      "Nº Préstamo": inst.numero_prestamo || "S.N.",
      "Cuota Nº": inst.numero_cuota,
      "Fecha Vencimiento": inst.fecha_vencimiento ? inst.fecha_vencimiento.substring(0, 10) : "",
      "Monto Cuota": Number(inst.monto_cuota),
      "Capital": Number(inst.capital || 0),
      "Interés": Number(inst.interes || 0),
      "Moneda": inst.moneda || "PEN",
      "Estado": inst.estado,
      "Días Restantes": inst.dias_restantes,
    }));

    const wb = XLSX.utils.book_new();
    const wsLoans = XLSX.utils.json_to_sheet(dataLoans);
    XLSX.utils.book_append_sheet(wb, wsLoans, "Resumen_Prestamos");

    if (dataInstallments.length > 0) {
      const wsInst = XLSX.utils.json_to_sheet(dataInstallments);
      XLSX.utils.book_append_sheet(wb, wsInst, "Proximas_Cuotas");
    }

    XLSX.writeFile(wb, `Deudas_Financieras_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel de deudas y cronogramas exportado correctamente.");
  };

  // Unique banks list
  const banksList = useMemo(() => {
    const list = Array.from(new Set(loans.map((l) => l.entidad_bancaria).filter(Boolean)));
    return list.sort();
  }, [loans]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const matchSearch =
        searchTerm === "" ||
        (l.entidad_bancaria && l.entidad_bancaria.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.numero_prestamo && l.numero_prestamo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.notas && l.notas.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchEstado = filterEstado === "all" || l.estado.toLowerCase() === filterEstado.toLowerCase();
      const matchBank = filterBank === "all" || l.entidad_bancaria === filterBank;
      const matchMoneda = filterMoneda === "all" || l.moneda === filterMoneda;

      return matchSearch && matchEstado && matchBank && matchMoneda;
    });
  }, [loans, searchTerm, filterEstado, filterBank, filterMoneda]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPrestadoPEN = loans.filter(l => l.moneda === "PEN" || !l.moneda).reduce((acc, l) => acc + (Number(l.monto_prestado) || 0), 0);
    const totalPrestadoUSD = loans.filter(l => l.moneda === "USD").reduce((acc, l) => acc + (Number(l.monto_prestado) || 0), 0);

    const totalSaldoPEN = loans.filter(l => l.moneda === "PEN" || !l.moneda).reduce((acc, l) => acc + (Number(l.saldo_pendiente) || 0), 0);
    const totalSaldoUSD = loans.filter(l => l.moneda === "USD").reduce((acc, l) => acc + (Number(l.saldo_pendiente) || 0), 0);

    const cuotasPendientesCount = loans.reduce((acc, l) => acc + (Number(l.cuotas_pendientes) || 0), 0);
    const activasCount = loans.filter((l) => l.estado === "Activa").length;
    const liquidadasCount = loans.filter((l) => l.estado === "Liquidada").length;

    // Check overdue installments
    const cuotasVencidas = upcomingInstallments.filter((i) => i.dias_restantes !== undefined && i.dias_restantes < 0).length;
    const proximaCuota = upcomingInstallments.length > 0 ? upcomingInstallments[0] : null;

    return {
      totalPrestadoPEN,
      totalPrestadoUSD,
      totalSaldoPEN,
      totalSaldoUSD,
      cuotasPendientesCount,
      activasCount,
      liquidadasCount,
      cuotasVencidas,
      proximaCuota,
    };
  }, [loans, upcomingInstallments]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="size-6 text-primary" />
            Deudas Bancarias & Financiamiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de obligaciones crediticias, amortizaciones bancarias, cronogramas y enlace con Tesorería.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchLoans} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
            <Download className="size-4" />
            Exportar Excel
          </Button>
          <Button size="sm" onClick={() => setNewLoanModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
            <Plus className="size-4" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital Financiado</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Landmark className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              S/ {kpis.totalPrestadoPEN.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {kpis.totalPrestadoUSD > 0 && (
              <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                + $ {kpis.totalPrestadoUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })} USD
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Líneas de crédito totales activadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendiente de Pago</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              S/ {kpis.totalSaldoPEN.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {kpis.totalSaldoUSD > 0 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                + $ {kpis.totalSaldoUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })} USD
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.cuotasPendientesCount} cuotas vivas por amortizar
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Vencimiento</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Calendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {kpis.proximaCuota ? (
              <div>
                <div className="text-lg font-bold text-foreground truncate">
                  {kpis.proximaCuota.fecha_vencimiento?.substring(0, 10)}
                </div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  S/ {Number(kpis.proximaCuota.monto_cuota).toLocaleString("es-PE", { minimumFractionDigits: 2 })} &bull; {kpis.proximaCuota.entidad_bancaria}
                </p>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground py-1">Al día sin cuotas pendientes</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Fecha de pago más próxima</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Líneas Activas / Liquidadas</CardTitle>
            <div className={`p-2 rounded-lg ${kpis.cuotasVencidas > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
              {kpis.cuotasVencidas > 0 ? (
                <AlertCircle className="size-4 animate-pulse" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.activasCount} <span className="text-sm font-normal text-muted-foreground">/ {kpis.liquidadasCount} liq.</span>
            </div>
            {kpis.cuotasVencidas > 0 ? (
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <ShieldAlert className="size-3.5" /> {kpis.cuotasVencidas} cuota(s) con vencimiento pasado!
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Créditos al día sin mora registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="prestamos" className="gap-2 text-xs sm:text-sm py-2 px-4">
            <Building className="size-4" />
            Líneas de Crédito & Préstamos ({loans.length})
          </TabsTrigger>
          <TabsTrigger value="vencimientos" className="gap-2 text-xs sm:text-sm py-2 px-4 relative">
            <Calendar className="size-4" />
            Calendario de Vencimientos ({upcomingInstallments.length})
            {kpis.cuotasVencidas > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full font-bold">
                {kpis.cuotasVencidas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="simulador" className="gap-2 text-xs sm:text-sm py-2 px-4">
            <Calculator className="size-4" />
            Simulador de Cuotas & TCEA
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Préstamos Registrados */}
        <TabsContent value="prestamos" className="mt-4 space-y-4">
          <Card className="bg-card shadow-xs">
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar banco, n° préstamo, notas..."
                    className="pl-9 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Filter className="size-3.5" />
                    <span>Estado:</span>
                  </div>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="h-9 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="activa">Activa</option>
                    <option value="liquidada">Liquidada</option>
                  </select>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                    <span>Banco:</span>
                  </div>
                  <select
                    value={filterBank}
                    onChange={(e) => setFilterBank(e.target.value)}
                    className="h-9 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todos los bancos</option>
                    {banksList.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                    <span>Moneda:</span>
                  </div>
                  <select
                    value={filterMoneda}
                    onChange={(e) => setFilterMoneda(e.target.value)}
                    className="h-9 px-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todas</option>
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold text-xs">Entidad Financiera</TableHead>
                      <TableHead className="font-semibold text-xs">Desembolso</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Monto Contratado</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Progreso de Pago</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Saldo Pendiente</TableHead>
                      <TableHead className="font-semibold text-xs text-center">TCEA</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                      <TableHead className="font-semibold text-xs text-right pr-4">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                          Cargando préstamos bancarios y cronogramas...
                        </TableCell>
                      </TableRow>
                    ) : filteredLoans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Landmark className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                          No se encontraron préstamos bancarios registrados.
                          <div className="mt-2">
                            <Button size="sm" onClick={() => setNewLoanModalOpen(true)} className="gap-2">
                              <Plus className="size-4" />
                              Registrar Primer Préstamo
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLoans.map((loan) => {
                        const pagadas = (loan.cuotas_totales || 0) - (loan.cuotas_pendientes || 0);
                        const pct = loan.cuotas_totales > 0 ? Math.round((pagadas / loan.cuotas_totales) * 100) : 0;
                        const isPEN = loan.moneda === "PEN" || !loan.moneda;
                        const symbol = isPEN ? "S/" : "$";

                        return (
                          <TableRow key={loan.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                                  <Landmark className="size-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground text-sm">{loan.entidad_bancaria}</div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {loan.numero_prestamo ? `Op: ${loan.numero_prestamo}` : "Sin Nº asignado"}
                                  </div>
                                  {loan.notas && (
                                    <div className="text-[11px] text-muted-foreground/80 line-clamp-1 max-w-[200px]">
                                      {loan.notas}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {loan.fecha_inicio ? loan.fecha_inicio.substring(0, 10) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <div className="text-sm font-bold text-foreground">
                                {symbol} {Number(loan.monto_prestado).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {loan.moneda || "PEN"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-xs font-semibold">
                                  {pagadas} de {loan.cuotas_totales} cuotas ({pct}%)
                                </span>
                                <div className="w-28 bg-muted rounded-full h-2 mt-1 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      pct === 100 ? "bg-emerald-500" : "bg-primary"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400">
                              {symbol} {Number(loan.saldo_pendiente || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center text-xs font-semibold">
                              {loan.tcea ? `${loan.tcea}%` : "0%"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className={
                                  loan.estado === "Activa"
                                    ? "bg-amber-500/15 text-amber-600 font-semibold dark:bg-amber-500/20"
                                    : "bg-emerald-500/15 text-emerald-600 font-semibold dark:bg-emerald-500/20"
                                }
                              >
                                {loan.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                                  onClick={() => handleOpenSchedule(loan)}
                                >
                                  <Eye className="size-3.5" />
                                  Cronograma
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Editar Préstamo"
                                  onClick={() => handleOpenEditLoan(loan)}
                                >
                                  <Edit className="size-3.5" />
                                </Button>
                                {pagadas === 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    title="Eliminar Préstamo"
                                    onClick={() => handleDeleteLoan(loan)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
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

        {/* Tab 2: Calendario de Vencimientos */}
        <TabsContent value="vencimientos" className="mt-4 space-y-4">
          <Card className="bg-card shadow-xs">
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="size-5 text-blue-600" />
                    Cronograma Consolidado de Próximas Cuotas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Listado cronológico de las cuotas pendientes por amortizar en todas las entidades bancarias.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {upcomingInstallments.length} cuotas programadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold text-xs">Vencimiento</TableHead>
                      <TableHead className="font-semibold text-xs">Entidad / Préstamo</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Nº Cuota</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Monto Cuota</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Capital</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Interés</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Urgencia</TableHead>
                      <TableHead className="font-semibold text-xs text-right pr-4">Acción Inmediata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingInstallments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500" />
                          No hay cuotas pendientes por pagar en este momento. Todas las obligaciones están al día.
                        </TableCell>
                      </TableRow>
                    ) : (
                      upcomingInstallments.map((inst) => {
                        const days = inst.dias_restantes ?? 0;
                        const isOverdue = days < 0;
                        const isUrgent = days >= 0 && days <= 7;
                        const symbol = inst.moneda === "USD" ? "$" : "S/";

                        return (
                          <TableRow
                            key={inst.id}
                            className={`hover:bg-muted/20 ${
                              isOverdue
                                ? "bg-red-50/40 dark:bg-red-950/20"
                                : isUrgent
                                ? "bg-amber-50/30 dark:bg-amber-950/15"
                                : ""
                            }`}
                          >
                            <TableCell className="font-bold text-xs">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-muted-foreground" />
                                <span>{inst.fecha_vencimiento ? inst.fecha_vencimiento.substring(0, 10) : "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-semibold text-foreground">{inst.entidad_bancaria}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {inst.numero_prestamo ? `Op: ${inst.numero_prestamo}` : "Préstamo"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-xs">
                              Cuota #{inst.numero_cuota}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm text-foreground">
                              {symbol} {Number(inst.monto_cuota).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {symbol} {Number(inst.capital || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {symbol} {Number(inst.interes || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {isOverdue ? (
                                <Badge className="bg-red-600 text-white font-bold text-[10px]">
                                  Vencida ({Math.abs(days)}d)
                                </Badge>
                              ) : isUrgent ? (
                                <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                                  En {days} días
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  En {days} días
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                onClick={() => handleOpenPay(inst)}
                              >
                                <Check className="size-3" />
                                Pagar Cuota
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

        {/* Tab 3: Simulador Financiero */}
        <TabsContent value="simulador" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Control Panel */}
            <Card className="bg-card shadow-xs lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calculator className="size-5 text-primary" />
                  Parámetros de Simulación
                </CardTitle>
                <CardDescription className="text-xs">
                  Cálculo de cuota mensual y amortización francesa estándar para créditos comerciales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monto a Financiar (S/)</Label>
                  <Input
                    type="number"
                    step="100"
                    min="500"
                    value={simMonto}
                    onChange={(e) => setSimMonto(Number(e.target.value))}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Plazo de Pago (Meses)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={simPlazo}
                    onChange={(e) => setSimPlazo(Number(e.target.value))}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tasa de Costo Efectivo Anual (TCEA %)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={simTcea}
                    onChange={(e) => setSimTcea(Number(e.target.value))}
                    className="h-9"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cuota Mensual Estimada:</span>
                    <span className="font-bold text-base text-primary">
                      S/ {simulatorCalc.cuota.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Intereses:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      S/ {simulatorCalc.totalInteres.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t font-bold">
                    <span>Monto Total a Devolver:</span>
                    <span>
                      S/ {simulatorCalc.totalPagar.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={() => {
                    setLoanForm((prev) => ({
                      ...prev,
                      monto_prestado: simMonto,
                      cuotas_totales: simPlazo,
                      tcea: simTcea,
                    }));
                    setNewLoanModalOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Trasladar y Registrar Préstamo
                </Button>
              </CardContent>
            </Card>

            {/* Simulated Schedule Table */}
            <Card className="bg-card shadow-xs lg:col-span-2">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold">
                  Cronograma de Amortización Proyectado ({simPlazo} cuotas)
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribución mensual de capital e intereses generados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 max-h-[460px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold text-xs text-center w-16">Mes</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Cuota Fija</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Amort. Capital</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Interés</TableHead>
                      <TableHead className="font-semibold text-xs text-right pr-4">Saldo Restante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulatorCalc.schedule.map((row: any) => (
                      <TableRow key={row.num} className="hover:bg-muted/20">
                        <TableCell className="text-center font-bold text-xs">#{row.num}</TableCell>
                        <TableCell className="text-right font-bold text-xs text-foreground">
                          S/ {row.cuota.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          S/ {row.capital.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs text-amber-600 dark:text-amber-400">
                          S/ {row.interes.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold pr-4">
                          S/ {row.saldo.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Ver Cronograma y Gestión de Cuotas de un Préstamo */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Landmark className="size-5 text-primary" />
              Cronograma de Amortización: {selectedLoan?.entidad_bancaria}
            </DialogTitle>
            <DialogDescription>
              {selectedLoan?.numero_prestamo ? `Operación Nº ${selectedLoan.numero_prestamo}` : "Préstamo Bancario"} |
              Monto: {selectedLoan?.moneda === "USD" ? "$" : "S/"} {Number(selectedLoan?.monto_prestado || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })} |
              Saldo pendiente: {selectedLoan?.moneda === "USD" ? "$" : "S/"} {Number(selectedLoan?.saldo_pendiente || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingSchedule ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                Cargando cuotas del préstamo...
              </div>
            ) : installments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay cuotas registradas para este préstamo.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 font-semibold text-xs text-center">Nº Cuota</TableHead>
                      <TableHead className="font-semibold text-xs">Vencimiento</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Monto Cuota</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Capital</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Interés</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                      <TableHead className="font-semibold text-xs">Fecha Pago</TableHead>
                      <TableHead className="font-semibold text-xs text-right pr-4">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((inst) => {
                      const isPaid = inst.estado === "Pagado";
                      const symbol = selectedLoan?.moneda === "USD" ? "$" : "S/";

                      return (
                        <TableRow key={inst.id} className={isPaid ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""}>
                          <TableCell className="text-center font-bold text-xs">
                            #{inst.numero_cuota}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {inst.fecha_vencimiento ? inst.fecha_vencimiento.substring(0, 10) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {symbol} {Number(inst.monto_cuota).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {symbol} {Number(inst.capital || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {symbol} {Number(inst.interes || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={
                                isPaid
                                  ? "bg-emerald-500/15 text-emerald-600 font-semibold dark:bg-emerald-500/20"
                                  : "bg-amber-500/15 text-amber-600 font-semibold dark:bg-amber-500/20"
                              }
                            >
                              {inst.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inst.fecha_pago ? inst.fecha_pago.substring(0, 10) : "-"}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              {!isPaid ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
                                    onClick={() => handleOpenPay(inst, selectedLoan || undefined)}
                                  >
                                    <Check className="size-3" />
                                    Pagar Cuota
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    title="Modificar Cuota"
                                    onClick={() => handleOpenEditInstallment(inst)}
                                  >
                                    <Edit className="size-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  title="Anular pago y revertir egreso de caja"
                                  onClick={() => handleAnnulInstallment(inst)}
                                >
                                  <RotateCcw className="size-3" />
                                  Anular Pago
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Pagar Cuota */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-lg max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-emerald-600" />
              Pagar Cuota #{selectedInstallment?.numero_cuota}
            </DialogTitle>
            <DialogDescription>
              Se registrará el egreso del gasto financiero y la salida de fondos de Tesorería.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-muted/40 rounded-xl space-y-2 text-sm border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entidad Bancaria:</span>
                <span className="font-semibold text-foreground">{selectedLoan?.entidad_bancaria || selectedInstallment?.entidad_bancaria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha Vencimiento:</span>
                <span className="font-medium">{selectedInstallment?.fecha_vencimiento ? selectedInstallment.fecha_vencimiento.substring(0, 10) : "-"}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base font-bold text-foreground">
                <span>Monto a Amortizar:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {selectedInstallment?.moneda === "USD" ? "$" : "S/"} {Number(selectedInstallment?.monto_cuota || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Medio de Pago (Salida de Tesorería)</Label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Efectivo">Efectivo / Caja Chica</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Tarjeta">Tarjeta Débito/Crédito</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPay}
              disabled={submittingPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-xs"
            >
              <Check className="size-4" />
              {submittingPayment ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Cuota */}
      <Dialog open={editInstallmentModalOpen} onOpenChange={setEditInstallmentModalOpen}>
        <DialogContent className="sm:max-w-lg max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5 text-primary" />
              Editar Cuota #{installmentToEdit?.numero_cuota}
            </DialogTitle>
            <DialogDescription>
              Ajuste los valores de acuerdo al cronograma oficial del banco.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha de Vencimiento</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Monto Total de la Cuota</Label>
              <Input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(Number(e.target.value))}
                className="h-10 text-sm font-semibold"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Capital</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editCapital}
                  onChange={(e) => setEditCapital(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Interés</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editInteres}
                  onChange={(e) => setEditInteres(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Seguros / Otros</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editSeguro}
                  onChange={(e) => setEditSeguro(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setEditInstallmentModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInstallment}
              disabled={savingInstallment}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold"
            >
              {savingInstallment ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Préstamo */}
      <Dialog open={editLoanModalOpen} onOpenChange={setEditLoanModalOpen}>
        <DialogContent className="sm:max-w-lg max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5 text-primary" />
              Editar Información del Préstamo
            </DialogTitle>
            <DialogDescription>
              Modifique la entidad bancaria, número de operación o notas informativas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Entidad Financiera *</Label>
              <Input
                value={editLoanBank}
                onChange={(e) => setEditLoanBank(e.target.value)}
                placeholder="Ej: BCP, BBVA, Interbank"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nº de Préstamo / Operación</Label>
              <Input
                value={editLoanNumber}
                onChange={(e) => setEditLoanNumber(e.target.value)}
                placeholder="Ej: 193-4920491-0-12"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas / Destino de los Fondos</Label>
              <Textarea
                rows={3}
                value={editLoanNotes}
                onChange={(e) => setEditLoanNotes(e.target.value)}
                placeholder="Detalle o propósito del financiamiento..."
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setEditLoanModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditLoan}
              disabled={savingEditLoan}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {savingEditLoan ? "Actualizando..." : "Actualizar Préstamo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Nuevo Préstamo */}
      <Dialog open={newLoanModalOpen} onOpenChange={setNewLoanModalOpen}>
        <DialogContent className="sm:max-w-4xl max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="size-5 text-primary" />
              Registrar Financiamiento / Préstamo Bancario
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete los datos del financiamiento. Se generará el cronograma de amortización mensual y se registrará automáticamente el desembolso en Tesorería.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Entidad Financiera *</Label>
                <select
                  value={loanForm.entidad_bancaria}
                  onChange={(e) => setLoanForm({ ...loanForm, entidad_bancaria: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="BCP">Banco de Crédito del Perú (BCP)</option>
                  <option value="BBVA">BBVA Perú</option>
                  <option value="Interbank">Interbank</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="BanBif">BanBif</option>
                  <option value="Banco Pichincha">Banco Pichincha</option>
                  <option value="Caja Huancayo">Caja Huancayo</option>
                  <option value="Caja Arequipa">Caja Arequipa</option>
                  <option value="Caja Piura">Caja Piura</option>
                  <option value="Caja Cusco">Caja Cusco</option>
                  <option value="Préstamo de Accionistas">Préstamo de Accionistas / Socios</option>
                  <option value="OTRO">Otro Banco / Entidad</option>
                </select>
              </div>

              {loanForm.entidad_bancaria === "OTRO" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nombre de la Entidad *</Label>
                  <Input
                    placeholder="Ej: Financiera Confianza"
                    value={loanForm.custom_banco}
                    onChange={(e) => setLoanForm({ ...loanForm, custom_banco: e.target.value })}
                    className="h-10 text-sm"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Financiamiento</Label>
                <select
                  value={loanForm.tipo_deuda}
                  onChange={(e) => setLoanForm({ ...loanForm, tipo_deuda: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Préstamo Comercial / Capital de Trabajo">Capital de Trabajo</option>
                  <option value="Línea de Crédito Rotativa">Línea de Crédito Rotativa</option>
                  <option value="Leasing / Arrendamiento">Leasing Financiero</option>
                  <option value="Pagaré Bancario">Pagaré Bancario</option>
                  <option value="Préstamo de Accionista">Préstamo de Accionista / Socios</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nº de Préstamo / Operación</Label>
                <Input
                  placeholder="Ej: 193-94829302-0-12"
                  value={loanForm.numero_prestamo}
                  onChange={(e) => setLoanForm({ ...loanForm, numero_prestamo: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Monto Desembolsado *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={loanForm.monto_prestado}
                  onChange={(e) => setLoanForm({ ...loanForm, monto_prestado: Number(e.target.value) })}
                  className="h-10 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Moneda</Label>
                <select
                  value={loanForm.moneda}
                  onChange={(e) => setLoanForm({ ...loanForm, moneda: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PEN">Soles (PEN - S/)</option>
                  <option value="USD">Dólares (USD - $)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fecha de Desembolso *</Label>
                <Input
                  type="date"
                  value={loanForm.fecha_inicio}
                  onChange={(e) => setLoanForm({ ...loanForm, fecha_inicio: e.target.value })}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Número de Cuotas Mensuales *</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={loanForm.cuotas_totales}
                  onChange={(e) => setLoanForm({ ...loanForm, cuotas_totales: Number(e.target.value) })}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tasa TCEA Anual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="14.5"
                  value={loanForm.tcea}
                  onChange={(e) => setLoanForm({ ...loanForm, tcea: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recepción de Fondos en Tesorería</Label>
                <select
                  value={loanForm.metodo_recepcion}
                  onChange={(e) => setLoanForm({ ...loanForm, metodo_recepcion: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo / Caja</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs font-semibold">Notas / Destino de los Fondos</Label>
                <Textarea
                  rows={2}
                  placeholder="Ej: Inversión en equipamiento, ampliación de red o capital de trabajo operativo..."
                  value={loanForm.notas}
                  onChange={(e) => setLoanForm({ ...loanForm, notas: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-4 bg-muted/40 border rounded-xl text-xs sm:text-sm space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Calculator className="size-4 text-primary" />
                Proyección Automática del Cronograma Bancario:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-2.5 bg-background rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Ingreso en Tesorería</span>
                  <span className="font-bold text-sm text-foreground">
                    {loanForm.moneda === "USD" ? "$" : "S/"} {Number(loanForm.monto_prestado).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 bg-background rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Cuota Mensual Aprox.</span>
                  <span className="font-bold text-sm text-primary">
                    {loanForm.moneda === "USD" ? "$" : "S/"} {formSimulatedQuota.cuota.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 bg-background rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Plazo de Pago</span>
                  <span className="font-bold text-sm text-foreground">
                    {loanForm.cuotas_totales} meses
                  </span>
                </div>
                <div className="p-2.5 bg-background rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Interés Total Proyectado</span>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    {loanForm.moneda === "USD" ? "$" : "S/"} {formSimulatedQuota.totalInteres.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setNewLoanModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingLoan}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-xs"
              >
                {savingLoan ? "Registrando..." : "Registrar Préstamo y Generar Cuotas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
