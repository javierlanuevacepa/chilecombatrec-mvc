// hooks/useSuperAdmin.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import superadminApi from "@/lib/repository/superadmin.api";
import type {
  SuperAdminUser,
  SuperAdminClub,
  SuperAdminUserDraft,
} from "@/components/backoffice/types/superadmin";

// =====================================================
// Tipos
// =====================================================

export type RefrescarOpciones = {
  /**
   * `true` → vuelve a pedir las listas SIN poner `cargando = true`.
   * Si el GET falla, conserva el estado actual en vez de mostrar el error.
   * Útil tras acciones puntuales (ej. cambiar estado de un usuario).
   */
  silencioso?: boolean;
};

export type UseSuperAdminReturn = {
  /** Listado completo de usuarios con su rol y club (si tienen) */
  usuarios: SuperAdminUser[];

  /** Listado completo de clubes (para el `<select>` de coaches y para
   *  resolver `clubUuid → club` en las filas del listado) */
  clubes: SuperAdminClub[];

  /** true mientras carga la data inicial */
  cargando: boolean;
  /** Error del GET inicial */
  error: string | null;

  /** true mientras corre una mutación (crear / actualizar / eliminar) */
  guardando: boolean;
  /** Error de la última mutación (independiente del GET) */
  errorGuardado: string | null;
  /** Limpia `errorGuardado` (útil al reabrir un modal o cambiar de tab) */
  limpiarErrorGuardado: () => void;

  /** Re-fetch de usuarios + clubes. Con `{ silencioso: true }` no activa `cargando`. */
  refrescar: (opciones?: RefrescarOpciones) => Promise<void>;

  /**
   * Crea usuario + club (si `rol === "ADMIN_CLUB"`) en una sola
   * transacción del backend. Actualiza `usuarios` y `clubes` con la
   * respuesta. Devuelve el usuario creado o lanza si falla.
   */
  crear: (draft: SuperAdminUserDraft) => Promise<SuperAdminUser>;

  /**
   * PATCH parcial del usuario. Acepta cualquier subconjunto de
   * `SuperAdminUserDraft` (incluye `clubData` y `existingClubUuid`).
   */
  actualizar: (
    uuid: string,
    draft: Partial<SuperAdminUserDraft>
  ) => Promise<SuperAdminUser>;

  /**
   * Toggle activo/inactivo de la cuenta. Atajo sobre `PATCH /superadmin/:uuid/estado`.
   * No envía ningún otro campo.
   */
  cambiarEstado: (uuid: string, activo: boolean) => Promise<SuperAdminUser>;

  /**
   * Soft delete del usuario.
   * @param eliminarClub si `true` y era `ADMIN_CLUB`, borra también su club
   *                     (y desvincula a sus coaches). Si `false`, el club
   *                     queda huérfano pero vivo.
   */
  eliminar: (
    uuid: string,
    eliminarClub?: boolean
  ) => Promise<SuperAdminUser>;
};

// =====================================================
// Helpers internos
// =====================================================

function _mensajeDeError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    if (body?.error) return body.error;
  }
  return fallback;
}

/** Inserta o reemplaza un club en la lista (por `uuid`). */
function _upsertClub(
  list: SuperAdminClub[],
  club: SuperAdminClub
): SuperAdminClub[] {
  const idx = list.findIndex((c) => c.uuid === club.uuid);
  if (idx === -1) return [...list, club];
  const next = list.slice();
  next[idx] = club;
  return next;
}

// =====================================================
// Hook
// =====================================================

export function useSuperAdmin(): UseSuperAdminReturn {
  const [usuarios, setUsuarios] = useState<SuperAdminUser[]>([]);
  const [clubes, setClubes] = useState<SuperAdminClub[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  // Ref para leer el state actual dentro de `eliminar` sin meterlo en deps.
  const usuariosRef = useRef<SuperAdminUser[]>([]);
  useEffect(() => {
    usuariosRef.current = usuarios;
  }, [usuarios]);

  // ── GET inicial + refetch ──────────────────────────
  const cargar = useCallback(async (silencioso = false) => {
    const myId = ++requestIdRef.current;

    if (!silencioso) {
      setCargando(true);
      setError(null);
    }

    try {
      // Ambas llamadas en paralelo: si una falla, no queremos
      // quedarnos con datos parciales (usuarios sin clubes, etc.).
      const [usuariosData, clubesData] = await Promise.all([
        superadminApi.listar(),
        superadminApi.listarClubes(),
      ]);
      if (myId !== requestIdRef.current) return;
      setUsuarios(usuariosData);
      setClubes(clubesData);
    } catch (err) {
      if (myId !== requestIdRef.current) return;
      // Refresco silencioso: no reemplazamos la vista por un error.
      if (silencioso) return;

      console.error("Error al cargar superadmin:", err);
      setError(
        _mensajeDeError(err, "No pudimos cargar los datos del sistema.")
      );
    } finally {
      if (myId === requestIdRef.current) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const refrescar = useCallback(
    async (opciones?: RefrescarOpciones) => {
      await cargar(opciones?.silencioso === true);
    },
    [cargar]
  );

  const limpiarErrorGuardado = useCallback(() => {
    setErrorGuardado(null);
  }, []);

  // ── Crear ──────────────────────────────────────────
  const crear = useCallback(
    async (draft: SuperAdminUserDraft): Promise<SuperAdminUser> => {
      setGuardando(true);
      setErrorGuardado(null);

      try {
        const nuevo = await superadminApi.crear(draft);
        // Update users
        setUsuarios((list) => [...list, nuevo]);
        // Upsert de los clubes que trae el response
        if (nuevo.clubes.length > 0) {
          setClubes((list) =>
            nuevo.clubes.reduce((acc, c) => _upsertClub(acc, c), list)
          );
        }
        return nuevo;
      } catch (err) {
        console.error("Error al crear usuario:", err);
        setErrorGuardado(
          _mensajeDeError(err, "No pudimos crear el usuario.")
        );
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    []
  );

  // ── Actualizar ─────────────────────────────────────
  const actualizar = useCallback(
    async (
      uuid: string,
      draft: Partial<SuperAdminUserDraft>
    ): Promise<SuperAdminUser> => {
      if (!uuid) throw new Error("El uuid del usuario es obligatorio");

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const actualizado = await superadminApi.actualizar(uuid, draft);
        setUsuarios((list) =>
          list.map((u) => (u.uuid === uuid ? actualizado : u))
        );
        if (actualizado.clubes.length > 0) {
          setClubes((list) =>
            actualizado.clubes.reduce((acc, c) => _upsertClub(acc, c), list)
          );
        }
        return actualizado;
      } catch (err) {
        console.error("Error al actualizar usuario:", err);
        setErrorGuardado(
          _mensajeDeError(err, "No pudimos guardar los cambios.")
        );
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    []
  );

  // ── Cambiar estado ─────────────────────────────────
  const cambiarEstado = useCallback(
    async (uuid: string, activo: boolean): Promise<SuperAdminUser> => {
      if (!uuid) throw new Error("El uuid del usuario es obligatorio");

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const actualizado = await superadminApi.cambiarEstado(uuid, activo);
        setUsuarios((list) =>
          list.map((u) => (u.uuid === uuid ? actualizado : u))
        );
        return actualizado;
      } catch (err) {
        console.error("Error al cambiar estado del usuario:", err);
        setErrorGuardado(
          _mensajeDeError(err, "No pudimos cambiar el estado del usuario.")
        );
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    []
  );

  // ── Eliminar ───────────────────────────────────────
  const eliminar = useCallback(
    async (
      uuid: string,
      eliminarClub = false
    ): Promise<SuperAdminUser> => {
      if (!uuid) throw new Error("El uuid del usuario es obligatorio");

      // Capturamos los clubes del usuario ANTES de eliminar, porque el
      // response de DELETE vendrá con `clubes: []` (los clubes también
      // quedan soft-deleted en el backend cuando eliminarClub=true).
      const clubsAEliminar: string[] = eliminarClub
        ? (usuariosRef.current.find((u) => u.uuid === uuid)?.clubes ?? []).map(
            (c) => c.uuid
          )
        : [];

      setGuardando(true);
      setErrorGuardado(null);

      try {
        const eliminado = await superadminApi.eliminar(uuid, eliminarClub);

        setUsuarios((list) => list.filter((u) => u.uuid !== uuid));

        if (clubsAEliminar.length > 0) {
          const set = new Set(clubsAEliminar);
          setClubes((list) => list.filter((c) => !set.has(c.uuid)));
        }

        return eliminado;
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        setErrorGuardado(
          _mensajeDeError(err, "No pudimos eliminar el usuario.")
        );
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    []
  );

  return {
    usuarios,
    clubes,
    cargando,
    error,
    refrescar,
    guardando,
    errorGuardado,
    limpiarErrorGuardado,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
  };
}