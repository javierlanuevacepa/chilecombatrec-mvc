// lib/repositories/usuario.api.ts
import { isAxiosError } from "axios";
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";
import type { Rol, UsuarioData } from "@/lib/services/SessionService";

// =====================================================
// Tipos
// =====================================================

export type LoginResult = {
  token: string;
  usuario_data: UsuarioData;
};

export type LoginSinPassword = {
  sinPassword: true;
  mensaje: string;
};

/**
 * - `null`               → credenciales inválidas (401)
 * - `{ sinPassword }`    → el usuario no tiene clave (403)
 * - `{ token, usuario_data }` → login OK
 */
export type LoginResponse =
  | LoginResult
  | LoginSinPassword
  | null;

/** Item que devuelve `GET /usuarios` (formato "listado") */
export type UsuarioListItem = {
  uuid: string;
  nombre: string;
  email: string;
  activo: boolean;
  fecha_registro: string;
  rol: Rol;
  apps: unknown[];
};

/**
 * Lo que devuelven registrar / actualizar / eliminar.
 * El backend no normaliza la forma entre métodos (registrar trae `rol`,
 * actualizar/eliminar traen además `rol_codigo` y `rol_nombre`),
 * por eso los campos opcionales.
 */
export type UsuarioCrudResult = {
  uuid: string;
  nombre: string;
  correo_electronico: string;
  rol: string;
  rol_codigo?: string;
  rol_nombre?: string;
  activo?: boolean;
  fecha_registro?: string;
  modificado_en?: string | null;
  eliminado_en?: string | null;
};

export type UsuarioCrearInput = {
  nombre: string;
  email: string;
  /** Opcional: si no viene, `clave` queda NULL y el usuario la genera después */
  password?: string;
  /** Código del rol, ej: "ADMIN_CLUB" */
  rol: string;
};

export type UsuarioActualizarInput = {
  nombre?: string;
  email?: string;
  /** Código del rol, ej: "ADMIN_CLUB" */
  rol?: string;
};

// =====================================================
// API
// =====================================================

const usuarioApi = {
  // ── Login ─────────────────────────────────────────
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      return await apiPost<LoginResult>("/usuarios/login", {
        correo: email,
        clave: password,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          return null;
        }
        if (error.response?.status === 403) {
          const body = error.response.data as
            | { error?: string; message?: string }
            | undefined;
          return {
            sinPassword: true,
            mensaje:
              body?.error ??
              body?.message ??
              "Tu cuenta aún no tiene contraseña.",
          };
        }
      }
      throw error;
    }
  },

  // ── Listar ────────────────────────────────────────
  async listar(): Promise<UsuarioListItem[]> {
    const data = await apiGet<{ usuarios_data: UsuarioListItem[] }>(
      "/usuarios"
    );
    return data.usuarios_data;
  },

  // ── Crear ─────────────────────────────────────────
  async crear(datos: UsuarioCrearInput): Promise<UsuarioCrudResult> {
    const data = await apiPost<{ usuario_data: UsuarioCrudResult }>(
      "/usuarios/registrar",
      datos
    );
    return data.usuario_data;
  },

  // ── Actualizar (PATCH parcial) ────────────────────
  async actualizar(
    uuid: string,
    datos: UsuarioActualizarInput
  ): Promise<UsuarioCrudResult> {
    const data = await apiPatch<{ usuario_data: UsuarioCrudResult }>(
      `/usuarios/${uuid}`,
      datos
    );
    return data.usuario_data;
  },

  // ── Cambiar clave ─────────────────────────────────
  async actualizarClave(
    uuid: string,
    password: string
  ): Promise<UsuarioCrudResult> {
    const data = await apiPatch<{ usuario_data: UsuarioCrudResult }>(
      `/usuarios/${uuid}/clave`,
      { password }
    );
    return data.usuario_data;
  },

  // ── Eliminar (soft delete) ────────────────────────
  async eliminar(uuid: string): Promise<UsuarioCrudResult> {
    const data = await apiDelete<{ usuario_data: UsuarioCrudResult }>(
      `/usuarios/${uuid}`
    );
    return data.usuario_data;
  },

  // ── Pendientes de implementar en el backend ───────
  //
  // async buscarPorUuid(uuid: string): Promise<UsuarioCrudResult> {
  //   // Requiere añadir `router.get("/:uuid", ctrl.buscarPorUuid)` en
  //   // routes/usuarios.routes.js y el handler en el controller.
  //   // `usuariosService.buscarPorUuid` ya existe en el service; solo
  //   // falta exponerlo por HTTP.
  // },
  //
  // async recuperarClave(email: string): Promise<void> {
  //   // Requiere crear el endpoint + servicio de recuperación
  //   // (token por correo, tabla de tokens, etc.). No existe aún.
  // },
};

export default usuarioApi;