// hooks/useCoachesClub.ts
"use client";

import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import coachApi, {
  type Coach,
  type CoachActualizarInput,
  type CoachCrearInput,
} from "@/lib/repository/coach.api";

// =====================================================
// Tipos
// =====================================================

/**
 * Payload de creación desde el panel del club.
 * Omite `clubs` (lo inyecta el hook con `clubUuid`) y `password`
 * queda opcional (admin la fija o deja vacío).
 */
export type CrearCoachEnClubInput = Omit<CoachCrearInput, "clubs">;

export type UseCoachesClubReturn = {
  /** true mientras corre cualquier mutación (crear/actualizar/eliminar) */
  guardando: boolean;
  /** Mensaje del último error de mutación, o null */
  errorGuardado: string | null;
  /** Limpia `errorGuardado` (útil al cerrar un modal) */
  limpiarErrorGuardado: () => void;

  /** Crea un coach y lo vincula al club del hook. Devuelve el coach creado. */
  crear: (datos: CrearCoachEnClubInput) => Promise<Coach>;

  /** PATCH parcial sobre un coach del club. */
  actualizar: (uuid: string, datos: CoachActualizarInput) => Promise<Coach>;

  /** Atajo explícito para resetear la contraseña del coach. */
  actualizarPassword: (uuid: string, password: string) => Promise<Coach>;

  /** Soft delete del coach. */
  eliminar: (uuid: string) => Promise<Coach>;
};

// =====================================================
// Helpers
// =====================================================

function extraerMensaje(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    if (body?.error) return body.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// =====================================================
// Hook
// =====================================================

/**
 * Hook de mutaciones de coaches **desde el contexto de un club**.
 *
 * - El club (`clubUuid`) lo aporta el panel (viene de `useMiClub().club`).
 * - Después de cada mutación exitosa llama a `onRefresh()`, que
 *   normalmente es `refrescar` de `useMiClub` — así el listado del
 *   panel se actualiza solo, sin volver a pedirlo por otro lado.
 * - No hace GET propio: el listado se lee de `club.entrenadores`.
 *
 * @param clubUuid  uuid del club del admin logueado (null si aún no cargó)
 * @param onRefresh callback a ejecutar tras cada éxito (ej. refrescar del club)
 */
export function useCoachesClub(
  clubUuid: string | null,
  onRefresh: () => Promise<void>
): UseCoachesClubReturn {
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const limpiarErrorGuardado = useCallback(() => {
    setErrorGuardado(null);
  }, []);

  /**
   * Envuelve una operación con:
   *  - verificación de `clubUuid`
   *  - estado `guardando`
   *  - captura + normalización de error a `errorGuardado`
   *  - `onRefresh` solo si la operación fue exitosa
   */
  const ejecutar = useCallback(
    async <T>(operacion: () => Promise<T>, fallbackMsg: string): Promise<T> => {
      if (!clubUuid) {
        throw new Error("No hay club cargado para operar sobre coaches");
      }

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const result = await operacion();
        await onRefresh();
        return result;
      } catch (err) {
        const mensaje = extraerMensaje(err, fallbackMsg);
        setErrorGuardado(mensaje);
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    [clubUuid, onRefresh]
  );

  // ── Crear ────────────────────────────────────────────
  const crear = useCallback(
    (datos: CrearCoachEnClubInput) =>
      ejecutar(
        () => coachApi.crearEnClub(clubUuid!, datos),
        "No pudimos crear al coach"
      ),
    [ejecutar, clubUuid]
  );

  // ── Actualizar (parcial) ─────────────────────────────
  const actualizar = useCallback(
    (uuid: string, datos: CoachActualizarInput) =>
      ejecutar(
        () => coachApi.actualizar(uuid, datos),
        "No pudimos actualizar al coach"
      ),
    [ejecutar]
  );

  // ── Cambio de contraseña ─────────────────────────────
  const actualizarPassword = useCallback(
    (uuid: string, password: string) =>
      ejecutar(
        () => coachApi.actualizarPassword(uuid, password),
        "No pudimos actualizar la contraseña del coach"
      ),
    [ejecutar]
  );

  // ── Eliminar ─────────────────────────────────────────
  const eliminar = useCallback(
    (uuid: string) =>
      ejecutar(
        () => coachApi.eliminar(uuid),
        "No pudimos eliminar al coach"
      ),
    [ejecutar]
  );

  return {
    guardando,
    errorGuardado,
    limpiarErrorGuardado,
    crear,
    actualizar,
    actualizarPassword,
    eliminar,
  };
}