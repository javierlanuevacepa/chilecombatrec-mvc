"use client";

import { useCallback, useState } from "react";
import type { Rival } from "@/components/backoffice/types/rival";

export type BuscarRivalesInput = {
  /** Con estos dos ids la API real debería poder resolver la búsqueda sola. */
  deportistaId: string;
  disciplinaUuid: string;
  /** Contexto extra que solo usa el mock. */
  disciplinaNombre: string;
  genero: string;
  pesoEnKg: number;
  totalCombates: number;
};

/* -------------------------------------------------------------------------- */
/* MOCK: reemplazar por la llamada a la API cuando exista el endpoint.         */
/* Se mantiene la lógica original de App.jsx (misma disciplina, experiencia    */
/* similar, otras escuelas) y se agrega género y peso, porque el esquema       */
/* ya los tiene (genero y peso_en_kg son obligatorios).                        */
/* -------------------------------------------------------------------------- */

type RivalMock = Rival & { genero: string };

const RIVALES_MOCK: RivalMock[] = [
  { id: "r1", nombre: "Matías Contreras", clubNombre: "Combate Norte", clubTelefono: "+56 9 8765 4321", disciplinaNombre: "MMA", genero: "M", pesoEnKg: 70, record: { v: 10, d: 3, e: 1 } },
  { id: "r2", nombre: "Josefa Álvarez", clubNombre: "Combate Norte", clubTelefono: "+56 9 8765 4321", disciplinaNombre: "Kickboxing", genero: "F", pesoEnKg: 58, record: { v: 7, d: 2, e: 0 } },
  { id: "r3", nombre: "Diego Vargas", clubNombre: "Gimnasio Andes MMA", clubTelefono: "+56 9 5555 1212", disciplinaNombre: "MMA", genero: "M", pesoEnKg: 71, record: { v: 14, d: 5, e: 1 } },
  { id: "r4", nombre: "Antonia Silva", clubNombre: "Gimnasio Andes MMA", clubTelefono: "+56 9 5555 1212", disciplinaNombre: "Boxeo", genero: "F", pesoEnKg: 62, record: { v: 5, d: 1, e: 0 } },
  { id: "r5", nombre: "Cristóbal Muñoz", clubNombre: "Escuela Valparaíso Boxing", clubTelefono: "+56 9 4444 7890", disciplinaNombre: "MMA", genero: "M", pesoEnKg: 68, record: { v: 9, d: 2, e: 0 } },
  { id: "r6", nombre: "Trinidad Vera", clubNombre: "Escuela Valparaíso Boxing", clubTelefono: "+56 9 4444 7890", disciplinaNombre: "Kickboxing", genero: "F", pesoEnKg: 57, record: { v: 11, d: 3, e: 2 } },
];

const totalCombates = (r: { v: number; d: number; e: number }) => r.v + r.d + r.e;

function buscarRivalesMock(input: BuscarRivalesInput): Rival[] {
  return RIVALES_MOCK.filter(
    (r) =>
      r.disciplinaNombre.toLowerCase() === input.disciplinaNombre.toLowerCase() &&
      r.genero.toUpperCase() === input.genero.toUpperCase()
  )
    .sort(
      (a, b) =>
        Math.abs(totalCombates(a.record) - input.totalCombates) -
          Math.abs(totalCombates(b.record) - input.totalCombates) ||
        Math.abs(a.pesoEnKg - input.pesoEnKg) - Math.abs(b.pesoEnKg - input.pesoEnKg)
    )
    .slice(0, 4)
    .map(({ genero: _genero, ...rival }) => rival);
}

/* -------------------------------------------------------------------------- */

export function useRivales() {
  const [rivales, setRivales] = useState<Rival[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async (input: BuscarRivalesInput) => {
    setBuscando(true);
    setError(null);
    setRivales(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setRivales(buscarRivalesMock(input));
    } catch {
      setError("No pudimos buscar rivales. Intenta nuevamente.");
    } finally {
      setBuscando(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setRivales(null);
    setError(null);
  }, []);

  return { rivales, buscando, error, buscar, limpiar };
}
