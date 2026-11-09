// hooks/useBusquedaCombate.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import busquedaCombateApi, {
  type BusquedaCombateCandidato,
  type BusquedaCombateOpciones,
} from "@/lib/repository/busqueda.combate.api";

// =====================================================
// Tipos
// =====================================================

export type UseBusquedaCombateReturn = {
  /** Candidatos del último `buscar()` exitoso. `[]` si aún no hay búsqueda. */
  candidatos: BusquedaCombateCandidato[];

  /** true mientras corre la búsqueda */
  buscando: boolean;

  /** Mensaje de error de la última búsqueda, o null */
  error: string | null;

  /**
   * `false` hasta que el usuario ejecuta una búsqueda (exitosa o fallida).
   * Sirve para diferenciar la pantalla "presiona buscar" de la pantalla
   * "sin resultados". Cuando `error != null`, el error tiene prioridad
   * sobre `busquedaHecha` en el render.
   */
  busquedaHecha: boolean;

  /** Limpia `error` (útil al cerrar un toast / modal). */
  limpiarError: () => void;

  /**
   * Resetea todo: candidatos, error, buscando y busquedaHecha.
   * Invalida cualquier request en vuelo (no la pisa al volver).
   */
  limpiar: () => void;

  /**
   * Ejecuta la búsqueda de candidatos contra el backend.
   * Devuelve el array de candidatos por si el caller quiere encadenar
   * (ej. mostrar un toast "X rivales encontrados").
   *
   * @param deportistaUuid UUID del deportista que busca rival.
   * @param opciones       `disciplinaUuid` y `limite` (opcionales).
   */
  buscar: (
    deportistaUuid: string,
    opciones?: BusquedaCombateOpciones
  ) => Promise<BusquedaCombateCandidato[]>;
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
 * Hook de **búsqueda de combate** (matchmaking) para el panel del club.
 *
 * - Trigger **manual**: la búsqueda se dispara con `buscar()`. No hace
 *   fetch automático al montar.
 * - Si el usuario clickea "Buscar" varias veces, solo se aplica la
 *   respuesta del último llamado (las intermedias se descartan con
 *   `requestIdRef`, igual que en `useMiClub`).
 * - No conoce auth ni club: recibe el `deportistaUuid` en cada llamada.
 * - El backend ya devuelve `clubs → coaches` con datos de contacto, así
 *   que el UI no necesita otra llamada para mostrarlos.
 */
export function useBusquedaCombate(): UseBusquedaCombateReturn {
  const [candidatos, setCandidatos] = useState<BusquedaCombateCandidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const requestIdRef = useRef(0);

  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  const limpiar = useCallback(() => {
    requestIdRef.current++; // invalida cualquier request en vuelo
    setCandidatos([]);
    setError(null);
    setBuscando(false);
    setBusquedaHecha(false);
  }, []);

  // ── Buscar ────────────────────────────────────────────
  const buscar = useCallback(
    async (
      deportistaUuid: string,
      opciones: BusquedaCombateOpciones = {}
    ): Promise<BusquedaCombateCandidato[]> => {
      if (!deportistaUuid) {
        const msg = "El uuid del deportista es obligatorio";
        setError(msg);
        throw new Error(msg);
      }

      const myId = ++requestIdRef.current;

      setBuscando(true);
      setError(null);
      setBusquedaHecha(false);
      setCandidatos([]); // limpia resultados anteriores al iniciar

      try {
        const data = await busquedaCombateApi.buscarCandidatos(
          deportistaUuid,
          opciones
        );

        // Si otra búsqueda reemplazó esta, no toques el estado.
        if (myId !== requestIdRef.current) return [];

        setCandidatos(data);
        setBusquedaHecha(true);
        return data;
      } catch (err) {
        // Igual: si ya hay una búsqueda más nueva en vuelo, ignora este error.
        if (myId !== requestIdRef.current) return [];

        const mensaje = extraerMensaje(err, "No pudimos buscar rivales.");
        setError(mensaje);
        setCandidatos([]);
        setBusquedaHecha(true); // se "intentó"; el UI mostrará el error
        throw err; // el componente decide si muestra toast / alerta
      } finally {
        if (myId === requestIdRef.current) {
          setBuscando(false);
        }
      }
    },
    []
  );

  return {
    candidatos,
    buscando,
    error,
    busquedaHecha,
    limpiarError,
    limpiar,
    buscar,
  };
}