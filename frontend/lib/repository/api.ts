// lib/api.ts
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import SessionService from "@/lib/services/SessionService";

// =====================================================
// Tipos del envelope del backend
// =====================================================
// El backend siempre responde:
//   éxito:  { success: true,  data: T }
//   error:  { success: false, error: string }

export type ApiSuccess<T> = { success: true; data: T };
export type ApiErrorBody = { success: false; error: string };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorBody;

// =====================================================
// Instancia axios
// =====================================================
export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = SessionService.getToken();
      if (token) {
        // axios >= 1.x: `headers` es AxiosHeaders, se usa .set()
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthEndpoint = error.config?.url?.includes("/usuarios/login");

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !isAuthEndpoint
    ) {
      SessionService.clearSession();

      if (window.location.pathname !== "/login") {
        window.location.href = "backoffice/login";
      }
    }

    return Promise.reject(error);
  }
);

// =====================================================
// Helpers tipados (opcionales pero recomendados)
// =====================================================
// Devuelven ya `T` (el `data` interno), no el envelope completo.
// Así los repos del front quedan limpios:
//   const club = await apiGet<Club>(`/clubes/${uuid}`);

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url, config);
  return res.data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, body, config);
  return res.data.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.patch<ApiSuccess<T>>(url, body, config);
  return res.data.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.delete<ApiSuccess<T>>(url, config);
  return res.data.data;
}

export default api;