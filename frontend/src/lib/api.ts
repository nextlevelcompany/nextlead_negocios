import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token JWT si existe en localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
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

export default api;
