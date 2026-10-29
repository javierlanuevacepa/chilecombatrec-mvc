// hooks/useDisciplinas.ts
"use client";

import { useEffect, useState } from "react";

import disciplinaApi, { type Disciplina } from "@/lib/repository/disciplina.api";

export type UseDisciplinasReturn = {
  /** Catálogo completo de disciplinas del sistema */
  disciplinas: Disciplina[];
  cargando: boolean;
  error: string | null;
};

/** Carga una sola vez el catálogo global de disciplinas. */
export function useDisciplinas(): UseDisciplinasReturn {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    disciplinaApi
      .listar()
      .then((data) => {
        if (activo) setDisciplinas(data);
      })
      .catch((err) => {
        console.error("Error al obtener las disciplinas:", err);
        if (activo) setError("No pudimos cargar las disciplinas.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { disciplinas, cargando, error };
}
