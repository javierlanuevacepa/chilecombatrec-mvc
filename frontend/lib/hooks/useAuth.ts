// hooks/useAuth.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import SessionService, { type Rol } from "@/lib/services/SessionService";
import usuarioApi from "@/lib/repository/usuario.api";

// =====================================================
// Tipos
// =====================================================

export type AuthUsuario = {
  uuid: string | null;
  nombre: string;
  email: string | null;
  rol: Rol | null;
};

/** Resultado de `login()`. Unión discriminada para que el consumidor
 *  pueda hacer `if (r.ok) … else r.mensaje` sin casts. */
export type LoginResult =
  | { ok: true }
  | { ok: false; mensaje: string };

export type UseAuthReturn = {
  usuario: AuthUsuario | null;
  cargando: boolean;
  login: (correo: string, clave: string) => Promise<LoginResult>;
  logout: () => void;
};

// =====================================================
// Hook
// =====================================================

export function useAuth(): UseAuthReturn {
  const [nombre, setNombreState] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Hidratación inicial: lee la sesión ya guardada en localStorage.
  // `useState(null)` en SSR y en cliente inicial coinciden → no hay
  // hydration mismatch. El efecto corre después de hidratar.
  useEffect(() => {
    if (SessionService.hasSession()) {
      setNombreState(SessionService.getNombre());
    }
    setCargando(false);
  }, []);

  const login = useCallback(
    async (correo: string, clave: string): Promise<LoginResult> => {
      try {
        const respuesta = await usuarioApi.login(correo, clave);

        // Credenciales inválidas (401)
        if (respuesta === null) {
          return { ok: false, mensaje: "Usuario o clave incorrectos." };
        }

        // Usuario sin contraseña (403) — la unión discriminada
        // permite este chequeo con autocompletado
        if ("sinPassword" in respuesta) {
          return { ok: false, mensaje: respuesta.mensaje };
        }

        // Login OK
        SessionService.guardarSesion(
          respuesta.usuario_data,
          respuesta.token
        );
        setNombreState(respuesta.usuario_data.nombre);
        return { ok: true };
      } catch (err) {
        console.error("Error en login:", err);
        return {
          ok: false,
          mensaje: "Error al iniciar sesión. Intenta nuevamente.",
        };
      }
    },
    []
  );

  const logout = useCallback(() => {
    SessionService.lockout();
    setNombreState(null);
  }, []);

  // `nombre` actúa como "señal" de que la sesión cambió:
  // cualquier cambio en SessionService pasa por login/logout,
  // y ambos actualizan `nombre`. Los demás campos se leen de
  // localStorage en el mismo memo, sin volver a suscribirse.
  const usuario = useMemo<AuthUsuario | null>(() => {
    if (!nombre) return null;
    return {
      uuid: SessionService.getUsuarioId(),
      nombre,
      email: SessionService.getEmail(),
      rol: SessionService.getRol(),
    };
  }, [nombre]);

  return { usuario, cargando, login, logout };
}