// hooks/useMiClub.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useAuth, type AuthUsuario } from "./useAuth";
import clubApi, {
  type Club,
  type ClubActualizarInput,
} from "@/lib/repository/club.api";

// =====================================================
// Tipos
// =====================================================

export type RefrescarOpciones = {
  /**
   * `true` → vuelve a pedir el club SIN poner `cargando = true`, así la
   * pantalla no se reemplaza por "Cargando…" ni se desmonta. Si el GET
   * falla, conserva el club actual en vez de mostrar el error.
   * Útil tras acciones pequeñas (ej. el check de "aparecer en búsqueda").
   */
  silencioso?: boolean;
};

export type UseMiClubReturn = {
  /** Club del usuario logueado, o null si no tiene / no cargó */
  club: Club | null;
  /** Usuario logueado, reenviado para redirigir si no hay sesión */
  usuario: AuthUsuario | null;

  /** true mientras carga auth o el GET del club */
  cargando: boolean;
  /** Error del GET del club */
  error: string | null;
  /** Logueado pero sin club asignado */
  sinClub: boolean;

  /** true mientras corre un PATCH */
  guardando: boolean;
  /** Error del PATCH (independiente del de carga) */
  errorGuardado: string | null;
  /** Limpia `errorGuardado` (útil al reabrir un modal o cambiar de pestaña) */
  limpiarErrorGuardado: () => void;

  /** Re-fetch del club (GET). Con `{ silencioso: true }` no activa `cargando`. */
  refrescar: (opciones?: RefrescarOpciones) => Promise<void>;

  /**
   * PATCH del club del usuario.
   * Actualiza el estado interno con la respuesta del backend
   * (que ya viene con el club completo). Devuelve el club actualizado
   * o lanza si falla.
   */
  actualizarClub: (datos: ClubActualizarInput) => Promise<Club>;
};

// =====================================================
// Hook
// =====================================================

export function useMiClub(): UseMiClubReturn {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  // ── GET ────────────────────────────────────────────
  const cargar = useCallback(
    async (usuarioUuid: string, silencioso = false) => {
    const myId = ++requestIdRef.current;

    if (!silencioso) {
      setCargando(true);
      setError(null);
    }

    try {
      const data = await clubApi.obtenerMiClub(usuarioUuid);
      if (myId !== requestIdRef.current) return;
      setClub(data);
    } catch (err) {
      if (myId !== requestIdRef.current) return;
      console.error("Error al obtener el club:", err);

      // Refresco silencioso: no reemplazamos el club visible por un error.
      if (silencioso) return;

      const mensaje = isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setError(mensaje ?? "No pudimos cargar la información del club.");
    } finally {
      // Sin condición por `silencioso`: si este request reemplazó a uno
      // normal que seguía en vuelo, `cargando` no puede quedar en true.
      if (myId === requestIdRef.current) {
        setCargando(false);
      }
    }
    },
    []
  );

  useEffect(() => {
    if (cargandoAuth) return;

    if (!usuario?.uuid) {
      requestIdRef.current++;
      setClub(null);
      setError(null);
      setCargando(false);
      setGuardando(false);
      setErrorGuardado(null);
      return;
    }

    void cargar(usuario.uuid);
  }, [usuario?.uuid, cargandoAuth, cargar]);

  const refrescar = useCallback(
    async (opciones?: RefrescarOpciones) => {
      if (!usuario?.uuid) return;
      await cargar(usuario.uuid, opciones?.silencioso === true);
    },
    [usuario?.uuid, cargar]
  );

  // ── PATCH ──────────────────────────────────────────
  const actualizarClub = useCallback(
    async (datos: ClubActualizarInput): Promise<Club> => {
      if (!club?.uuid) {
        throw new Error("No hay club cargado para actualizar");
      }

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const actualizado = await clubApi.actualizar(club.uuid, datos);
        setClub(actualizado);
        return actualizado;
      } catch (err) {
        console.error("Error al actualizar el club:", err);

        const mensaje = isAxiosError(err)
          ? (err.response?.data as { error?: string } | undefined)?.error
          : undefined;
        const final = mensaje ?? "No pudimos guardar los cambios.";

        setErrorGuardado(final);
        throw err; // el componente decide si muestra toast / alerta
      } finally {
        setGuardando(false);
      }
    },
    [club?.uuid]
  );

  const limpiarErrorGuardado = useCallback(() => {
    setErrorGuardado(null);
  }, []);

  const sinClub = Boolean(usuario) && !cargando && !error && !club;

  return {
    club,
    usuario,
    cargando,
    error,
    sinClub,
    guardando,
    errorGuardado,
    limpiarErrorGuardado,
    refrescar,
    actualizarClub,
  };
}