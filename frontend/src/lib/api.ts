import axios from "axios";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
    // Si contiene localhost o 127.0.0.1 pero la página se visita desde una IP remota o dominio,
    // forzar ruta relativa vacía para pasar obligatoriamente por el proxy de Next.js
    if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return "";
      }
    }
    return envUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || "";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token JWT si existe en localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Forzar que nunca intente llamar a localhost desde un cliente remoto
      if (config.baseURL && (config.baseURL.includes("localhost") || config.baseURL.includes("127.0.0.1"))) {
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
          config.baseURL = "";
        }
      }
      // Nunca enviar Authorization previo al endpoint de login
      if (config.url && config.url.includes("/auth/login")) {
        if (config.headers) {
          delete config.headers.Authorization;
        }
        return config;
      }

      const token = localStorage.getItem("token") || localStorage.getItem("jwt_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores 401 (no autorizado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && typeof window !== "undefined") {
      // Evitar loop infinito si ya estamos en /login
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/auth")) {
        localStorage.removeItem("token");
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("crm_active_user");
        document.cookie = "crm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Resuelve URLs de recursos multimedia (/uploads, /productos, etc.) de forma segura.
 * NUNCA antepone localhost o 127.0.0.1 cuando el sitio se navega desde un dominio o IP remota,
 * evitando que Chrome/Edge bloqueen la petición o muestren avisos de "Permiso para acceder a otros dispositivos" (Local Network Access).
 */
export const getMediaUrl = (url?: string): string => {
  if (!url) return "";
  let clean = url.trim();

  // Si ya es un data URI o blob, retornar tal cual
  if (clean.startsWith("data:") || clean.startsWith("blob:")) {
    return clean;
  }

  // Normalizar rutas que contengan /uploads/ o /productos/
  if (clean.includes("/uploads/")) {
    clean = clean.substring(clean.indexOf("/uploads/"));
  } else if (clean.includes("/productos/")) {
    clean = clean.substring(clean.indexOf("/productos/"));
  }

  // Si ya es una URL externa completa
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    if (typeof window !== "undefined" && (clean.includes("localhost") || clean.includes("127.0.0.1"))) {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        if (clean.includes("/uploads/")) return clean.substring(clean.indexOf("/uploads/"));
        if (clean.includes("/productos/")) return clean.substring(clean.indexOf("/productos/"));
        return "";
      }
    }
    return clean;
  }

  // Tanto en local como en producción con Next.js, las rutas /uploads/... y /productos/...
  // se sirven por el proxy rewrite interno de Next.js de manera segura y sin CORS
  return clean.startsWith("/") ? clean : `/${clean}`;
};

export default api;
