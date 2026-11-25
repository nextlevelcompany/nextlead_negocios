"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";

export interface ModulePermissions {
  dashboard: {
    ver_analitica: boolean;
    ver_metricas: boolean;
  };
  whatsapp: {
    chat: boolean;
    integraciones_ia: boolean;
  };
  clientes: {
    ver_todos: boolean;
    crear: boolean;
    chatear_whatsapp: boolean;
    exportar: boolean;
    asignar_cartera: boolean;
  };
  oportunidades: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    exportar: boolean;
    configurar: boolean;
  };
  ventas: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    instalar: boolean;
    anular: boolean;
    reasignar: boolean;
    exportar: boolean;
  };
  pedidos: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    anular: boolean;
    despachar: boolean;
  };
  productos: {
    ver_catalogo: boolean;
    gestionar_productos: boolean;
    gestionar_categorias: boolean;
  };
  finanzas: {
    ver_flujo: boolean;
    registrar_movimiento: boolean;
    ver_cuentas_bancarias: boolean;
    anular_movimiento: boolean;
    compras: boolean;
    gastos: boolean;
    deudas: boolean;
  };
  rentabilidad: {
    ver_margenes: boolean;
    ver_costos: boolean;
    simulador: boolean;
    configurar_perfiles: boolean;
  };
  payroll: {
    ver_personal: boolean;
    gestionar_personal: boolean;
    asistencia: boolean;
    ver_liquidaciones: boolean;
    pagar_comisiones: boolean;
  };
  admin: {
    gestionar_usuarios: boolean;
    gestionar_roles: boolean;
    ajustes_sistema: boolean;
  };
}

export const DEFAULT_ROLE_PERMS: Record<string, ModulePermissions> = {
  ADMIN: {
    dashboard: { ver_analitica: true, ver_metricas: true },
    whatsapp: { chat: true, integraciones_ia: true },
    clientes: { ver_todos: true, crear: true, chatear_whatsapp: true, exportar: true, asignar_cartera: true },
    oportunidades: { ver: true, crear: true, editar: true, eliminar: true, exportar: true, configurar: true },
    ventas: { ver: true, crear: true, editar: true, instalar: true, anular: true, reasignar: true, exportar: true },
    pedidos: { ver: true, crear: true, editar: true, anular: true, despachar: true },
    productos: { ver_catalogo: true, gestionar_productos: true, gestionar_categorias: true },
    finanzas: { ver_flujo: true, registrar_movimiento: true, ver_cuentas_bancarias: true, anular_movimiento: true, compras: true, gastos: true, deudas: true },
    rentabilidad: { ver_margenes: true, ver_costos: true, simulador: true, configurar_perfiles: true },
    payroll: { ver_personal: true, gestionar_personal: true, asistencia: true, ver_liquidaciones: true, pagar_comisiones: true },
    admin: { gestionar_usuarios: true, gestionar_roles: true, ajustes_sistema: true },
  },
  SUPERVISOR: {
    dashboard: { ver_analitica: true, ver_metricas: true },
    whatsapp: { chat: true, integraciones_ia: false },
    clientes: { ver_todos: true, crear: true, chatear_whatsapp: true, exportar: true, asignar_cartera: true },
    oportunidades: { ver: true, crear: true, editar: true, eliminar: false, exportar: true, configurar: false },
    ventas: { ver: true, crear: true, editar: true, instalar: true, anular: false, reasignar: true, exportar: true },
    pedidos: { ver: true, crear: true, editar: true, anular: false, despachar: false },
    productos: { ver_catalogo: true, gestionar_productos: false, gestionar_categorias: false },
    finanzas: { ver_flujo: false, registrar_movimiento: false, ver_cuentas_bancarias: false, anular_movimiento: false, compras: false, gastos: false, deudas: false },
    rentabilidad: { ver_margenes: true, ver_costos: false, simulador: true, configurar_perfiles: false },
    payroll: { ver_personal: true, gestionar_personal: false, asistencia: true, ver_liquidaciones: true, pagar_comisiones: false },
    admin: { gestionar_usuarios: false, gestionar_roles: false, ajustes_sistema: false },
  },
  VENDEDOR: {
    dashboard: { ver_analitica: true, ver_metricas: false },
    whatsapp: { chat: true, integraciones_ia: false },
    clientes: { ver_todos: false, crear: true, chatear_whatsapp: true, exportar: false, asignar_cartera: false },
    oportunidades: { ver: true, crear: true, editar: true, eliminar: false, exportar: false, configurar: false },
    ventas: { ver: true, crear: true, editar: true, instalar: false, anular: false, reasignar: false, exportar: false },
    pedidos: { ver: false, crear: false, editar: false, anular: false, despachar: false },
    productos: { ver_catalogo: true, gestionar_productos: false, gestionar_categorias: false },
    finanzas: { ver_flujo: false, registrar_movimiento: false, ver_cuentas_bancarias: false, anular_movimiento: false, compras: false, gastos: false, deudas: false },
    rentabilidad: { ver_margenes: false, ver_costos: false, simulador: false, configurar_perfiles: false },
    payroll: { ver_personal: false, gestionar_personal: false, asistencia: false, ver_liquidaciones: false, pagar_comisiones: false },
    admin: { gestionar_usuarios: false, gestionar_roles: false, ajustes_sistema: false },
  },
  FINANZAS: {
    dashboard: { ver_analitica: true, ver_metricas: true },
    whatsapp: { chat: false, integraciones_ia: false },
    clientes: { ver_todos: true, crear: false, chatear_whatsapp: false, exportar: true, asignar_cartera: false },
    oportunidades: { ver: false, crear: false, editar: false, eliminar: false, exportar: false, configurar: false },
    ventas: { ver: true, crear: false, editar: false, instalar: false, anular: false, reasignar: false, exportar: true },
    pedidos: { ver: true, crear: false, editar: false, anular: false, despachar: false },
    productos: { ver_catalogo: true, gestionar_productos: false, gestionar_categorias: false },
    finanzas: { ver_flujo: true, registrar_movimiento: true, ver_cuentas_bancarias: true, anular_movimiento: true, compras: true, gastos: true, deudas: true },
    rentabilidad: { ver_margenes: true, ver_costos: true, simulador: true, configurar_perfiles: true },
    payroll: { ver_personal: true, gestionar_personal: true, asistencia: false, ver_liquidaciones: true, pagar_comisiones: true },
    admin: { gestionar_usuarios: false, gestionar_roles: false, ajustes_sistema: false },
  },
  OPERACIONES: {
    dashboard: { ver_analitica: true, ver_metricas: false },
    whatsapp: { chat: true, integraciones_ia: false },
    clientes: { ver_todos: true, crear: false, chatear_whatsapp: true, exportar: false, asignar_cartera: false },
    oportunidades: { ver: false, crear: false, editar: false, eliminar: false, exportar: false, configurar: false },
    ventas: { ver: true, crear: false, editar: false, instalar: true, anular: false, reasignar: false, exportar: false },
    pedidos: { ver: true, crear: true, editar: true, anular: false, despachar: true },
    productos: { ver_catalogo: true, gestionar_productos: true, gestionar_categorias: true },
    finanzas: { ver_flujo: false, registrar_movimiento: false, ver_cuentas_bancarias: false, anular_movimiento: false, compras: true, gastos: false, deudas: false },
    rentabilidad: { ver_margenes: false, ver_costos: false, simulador: false, configurar_perfiles: false },
    payroll: { ver_personal: true, gestionar_personal: false, asistencia: true, ver_liquidaciones: false, pagar_comisiones: false },
    admin: { gestionar_usuarios: false, gestionar_roles: false, ajustes_sistema: false },
  },
};

export function getCachedRolePermissions(role: string): ModulePermissions | null {
  if (typeof window === "undefined") return null;
  const upper = (role || "").toUpperCase();
  const cached = localStorage.getItem(`crm_role_perms_${upper}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return DEFAULT_ROLE_PERMS[upper] || null;
}

export function saveRolePermissionsCache(role: string, perms: ModulePermissions) {
  if (typeof window === "undefined") return;
  const upper = (role || "").toUpperCase();
  localStorage.setItem(`crm_role_perms_${upper}`, JSON.stringify(perms));
  window.dispatchEvent(
    new CustomEvent("role-permissions-updated", {
      detail: { role: upper, permisos: perms },
    })
  );
}

/**
 * Hook reactivo para obtener los permisos vigentes del usuario autenticado
 */
export function useRolePermissions() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<ModulePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Cargar usuario activo y permisos iniciales de caché
  useEffect(() => {
    const loadSession = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("crm_active_user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          const role = (user.role || "ADMIN").toUpperCase();
          const cached = getCachedRolePermissions(role);
          if (cached) {
            setRolePermissions(cached);
          } else if (DEFAULT_ROLE_PERMS[role]) {
            setRolePermissions(DEFAULT_ROLE_PERMS[role]);
          }
        } catch {}
      }
    };

    loadSession();

    const handleUserChange = () => loadSession();
    const handlePermsChange = (e: any) => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("crm_active_user");
      let activeRole = "ADMIN";
      if (stored) {
        try {
          activeRole = (JSON.parse(stored).role || "ADMIN").toUpperCase();
        } catch {}
      }
      if (e.detail?.role?.toUpperCase() === activeRole && e.detail?.permisos) {
        setRolePermissions(e.detail.permisos);
      }
    };

    window.addEventListener("crm-user-changed", handleUserChange);
    window.addEventListener("role-permissions-updated", handlePermsChange);
    window.addEventListener("storage", handleUserChange);

    return () => {
      window.removeEventListener("crm-user-changed", handleUserChange);
      window.removeEventListener("role-permissions-updated", handlePermsChange);
      window.removeEventListener("storage", handleUserChange);
    };
  }, []);

  // 2. Sincronizar desde la base de datos de forma asíncrona
  useEffect(() => {
    const role = (currentUser?.role || "ADMIN").toUpperCase();
    if (!role) return;

    let isMounted = true;
    api
      .get(`/api/admin/roles/${encodeURIComponent(role)}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data && res.data.permisos) {
          const fresh =
            typeof res.data.permisos === "string"
              ? JSON.parse(res.data.permisos)
              : res.data.permisos;
          setRolePermissions(fresh);
          if (typeof window !== "undefined") {
            localStorage.setItem(`crm_role_perms_${role}`, JSON.stringify(fresh));
          }
        }
      })
      .catch(() => {
        // Fallback a default si el rol aún no existe o hay timeout
        if (isMounted && !rolePermissions && DEFAULT_ROLE_PERMS[role]) {
          setRolePermissions(DEFAULT_ROLE_PERMS[role]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.role]);

  const role = (currentUser?.role || "ADMIN").toUpperCase();
  const isAdmin = role === "ADMIN";

  // Permisos efectivos con fallback
  const perms = rolePermissions || DEFAULT_ROLE_PERMS[role] || DEFAULT_ROLE_PERMS.ADMIN;

  /**
   * Verifica si el usuario tiene permiso para una acción específica en un módulo
   */
  const can = useMemo(() => {
    return (moduleName: keyof ModulePermissions, action: string): boolean => {
      if (isAdmin) return true;
      const mod = perms[moduleName] as any;
      if (!mod) return false;
      return Boolean(mod[action]);
    };
  }, [isAdmin, perms]);

  /**
   * Verifica si el módulo completo debe mostrarse en el menú
   */
  const hasModule = useMemo(() => {
    return (moduleName: keyof ModulePermissions): boolean => {
      if (isAdmin) return true;
      const mod = perms[moduleName] as any;
      if (!mod) return false;

      switch (moduleName) {
        case "dashboard":
          return Boolean(mod.ver_analitica || mod.ver_metricas);
        case "whatsapp":
          return Boolean(mod.chat || mod.integraciones_ia);
        case "clientes":
          return Boolean(mod.ver_todos || mod.crear || role === "VENDEDOR" || role === "SUPERVISOR");
        case "oportunidades":
          return Boolean(mod.ver || mod.crear);
        case "ventas":
          return Boolean(mod.ver || mod.crear);
        case "pedidos":
          return Boolean(mod.ver || mod.crear);
        case "productos":
          return Boolean(mod.ver_catalogo || mod.gestionar_productos);
        case "finanzas":
          return Boolean(
            mod.ver_flujo ||
            mod.registrar_movimiento ||
            mod.compras ||
            mod.gastos ||
            mod.deudas
          );
        case "rentabilidad":
          return Boolean(
            mod.ver_margenes ||
            mod.simulador ||
            mod.ver_costos ||
            mod.configurar_perfiles
          );
        case "payroll":
          return Boolean(
            mod.ver_personal ||
            mod.asistencia ||
            mod.ver_liquidaciones ||
            mod.pagar_comisiones
          );
        case "admin":
          return Boolean(
            mod.gestionar_usuarios ||
            mod.gestionar_roles ||
            mod.ajustes_sistema
          );
        default:
          return false;
      }
    };
  }, [isAdmin, perms, role]);

  return {
    currentUser,
    role,
    isAdmin,
    permissions: perms,
    can,
    hasModule,
    loading,
  };
}
