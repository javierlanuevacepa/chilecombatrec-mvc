// hooks/useDeportistasClub.ts
"use client";

import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import deportistaApi, {
  type Deportista,
  type DeportistaActualizarInput,
  type DeportistaCrearInput,
  type DeportistaRecordInput,
} from "@/lib/repository/deportista.api";

// =====================================================
// Tipos
// =====================================================

/**
 * Payload de creación desde el panel del club.
 * Omite `clubs` (lo inyecta el hook con `clubUuid`).
 */
export type CrearDeportistaEnClubInput = Omit<DeportistaCrearInput, "clubs">;

export type UseDeportistasClubReturn = {
  /** true mientras corre cualquier mutación */
  guardando: boolean;
  /** Mensaje del último error de mutación, o null */
  errorGuardado: string | null;
  /** Limpia `errorGuardado` (útil al cerrar un modal) */
  limpiarErrorGuardado: () => void;

  /** Crea un deportista y lo vincula al club del hook. */
  crear: (datos: CrearDeportistaEnClubInput) => Promise<Deportista>;

  /** PATCH parcial sobre un deportista del club. */
  actualizar: (
    uuid: string,
    datos: DeportistaActualizarInput
  ) => Promise<Deportista>;

  /**
   * Atajo para reemplazar SOLO los records del deportista.
   * Por dentro hace `actualizar(uuid, { records })`.
   * - Reemplaza el conjunto completo (upsert + soft delete de los no listados).
   * - `[]` deja al deportista sin records.
   */
  actualizarRecords: (
    uuid: string,
    records: DeportistaRecordInput[]
  ) => Promise<Deportista>;

  /**
   * Activa (`true`) o desactiva (`false`) que el deportista aparezca en la
   * búsqueda de combates y el ranking. Es el único camino para cambiarlo
   * (`actualizar` no lo acepta).
   *
   * Refresca el club en modo silencioso: la pantalla no vuelve a
   * "Cargando…". Devuelve el deportista ya actualizado.
   */
  cambiarAparecerBusqueda: (
    uuid: string,
    aparecerBusqueda: boolean
  ) => Promise<Deportista>;

  /** Soft delete del deportista. */
  eliminar: (uuid: string) => Promise<Deportista>;
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
 * Hook de mutaciones de deportistas **desde el contexto de un club**.
 *
 * - El club (`clubUuid`) lo aporta el panel (viene de `useMiClub().club`).
 * - Después de cada mutación exitosa llama a `onRefresh()`, que
 *   normalmente es `refrescar` de `useMiClub` — así el listado del
 *   panel se actualiza solo, sin volver a pedirlo por otro lado.
 * - No hace GET propio: el listado se lee de `club.deportistas`.
 *
 * @param clubUuid  uuid del club del admin logueado (null si aún no cargó)
 * @param onRefresh callback a ejecutar tras cada éxito (ej. refrescar del club).
 *                  Recibe `{ silencioso: true }` en las acciones que no deben
 *                  mostrar "Cargando…" (ej. el check de búsqueda); `refrescar`
 *                  de `useMiClub` ya lo entiende.
 */
export function useDeportistasClub(
  clubUuid: string | null,
  onRefresh: (opciones?: { silencioso?: boolean }) => Promise<void>
): UseDeportistasClubReturn {
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
   *    (`opciones.silencioso` → refresco sin pantalla de carga)
   */
  const ejecutar = useCallback(
    async <T>(
      operacion: () => Promise<T>,
      fallbackMsg: string,
      opciones?: { silencioso?: boolean }
    ): Promise<T> => {
      if (!clubUuid) {
        throw new Error("No hay club cargado para operar sobre deportistas");
      }

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const result = await operacion();
        if (opciones?.silencioso) {
          await onRefresh({ silencioso: true });
        } else {
          await onRefresh();
        }
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
    (datos: CrearDeportistaEnClubInput) =>
      ejecutar(
        () => deportistaApi.crearEnClub(clubUuid!, datos),
        "No pudimos crear al deportista"
      ),
    [ejecutar, clubUuid]
  );

  // ── Actualizar (parcial) ─────────────────────────────
  const actualizar = useCallback(
    (uuid: string, datos: DeportistaActualizarInput) =>
      ejecutar(
        () => deportistaApi.actualizar(uuid, datos),
        "No pudimos actualizar al deportista"
      ),
    [ejecutar]
  );

  // ── Actualizar solo records ──────────────────────────
  const actualizarRecords = useCallback(
    (uuid: string, records: DeportistaRecordInput[]) =>
      ejecutar(
        () => deportistaApi.actualizar(uuid, { records }),
        "No pudimos actualizar el récord del deportista"
      ),
    [ejecutar]
  );

  // ── Aparecer en búsqueda (activar / desactivar) ──────
  const cambiarAparecerBusqueda = useCallback(
    (uuid: string, aparecerBusqueda: boolean) =>
      ejecutar(
        () => deportistaApi.cambiarAparecerBusqueda(uuid, aparecerBusqueda),
        "No pudimos cambiar la visibilidad en búsqueda",
        { silencioso: true }
      ),
    [ejecutar]
  );

  // ── Eliminar ─────────────────────────────────────────
  const eliminar = useCallback(
    (uuid: string) =>
      ejecutar(
        () => deportistaApi.eliminar(uuid),
        "No pudimos eliminar al deportista"
      ),
    [ejecutar]
  );

  return {
    guardando,
    errorGuardado,
    limpiarErrorGuardado,
    crear,
    actualizar,
    actualizarRecords,
    cambiarAparecerBusqueda,
    eliminar,
  };
}