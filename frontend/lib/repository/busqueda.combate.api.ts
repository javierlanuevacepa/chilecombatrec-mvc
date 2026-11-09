// lib/repositories/busqueda.combate.api.ts
import { apiGet } from "./api";

// =====================================================
// Tipos de lectura (lo que devuelve el backend)
// =====================================================

/** Entrenador de contacto dentro de un club. */
export type BusquedaCombateCoach = {
  uuid: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
};

/** Club al que pertenece un candidato, con datos de contacto. */
export type BusquedaCombateClub = {
  uuid: string;
  nombre: string;
  correo_institucional: string | null;
  telefono: string | null;
  coaches: BusquedaCombateCoach[];
};

export type BusquedaCombateDisciplina = {
  uuid: string;
  nombre: string;
};

/**
 * Candidato devuelto por el algoritmo de matchmaking.
 * Las diferencias `diferencia_*` permiten al frontend mostrar
 * un score de afinidad o reordenar sin recalcular.
 */
export type BusquedaCombateCandidato = {
  // Identidad pública (sin RUT)
  uuid: string;
  codigo_interno: string;
  p_nombre: string;
  s_nombre: string | null;
  p_apellido: string;
  s_apellido: string | null;
  alias: string | null;
  nacionalidad: string | null;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  genero: string;           // 'M' | 'F' | 'O'

  // Datos físicos
  peso_en_kg: number;
  estatura_en_cm: number | null;

  // Métricas calculadas por el backend
  edad: number;
  total_peleas: number;
  total_v: number;
  total_d: number;
  total_e: number;
  meses_entrenando: number;

  // Diferencias contra el solicitante (para ordenar por afinidad)
  diferencia_peso: number;
  diferencia_edad: number;
  diferencia_peleas: number;
  diferencia_meses_entrenando: number;

  // Relaciones
  clubs: BusquedaCombateClub[];
  disciplinas: BusquedaCombateDisciplina[];
};

// =====================================================
// Tipos de entrada (parámetros de la búsqueda)
// =====================================================

export type BusquedaCombateOpciones = {
  /** UUID de la disciplina (recomendado). Si se omite, se agrega todo el historial. */
  disciplinaUuid?: string;
  /** Máximo de candidatos (1..100). El backend usa 20 por defecto. */
  limite?: number;
};

// =====================================================
// Tipos internos crudos
// MySQL puede devolver NUMERIC/DECIMAL/SUM como string dentro
// de JSON_OBJECT; los tipamos como `number | string` y los
// normalizamos antes de devolverlos al consumidor.
// =====================================================

type _Numish = number | string;
type _NumishOrNull = number | string | null;

type _CandidatoCrudo = Omit<
  BusquedaCombateCandidato,
  | "peso_en_kg"
  | "estatura_en_cm"
  | "edad"
  | "total_peleas"
  | "total_v"
  | "total_d"
  | "total_e"
  | "meses_entrenando"
  | "diferencia_peso"
  | "diferencia_edad"
  | "diferencia_peleas"
  | "diferencia_meses_entrenando"
> & {
  peso_en_kg: _Numish;
  estatura_en_cm: _NumishOrNull;
  edad: _Numish;
  total_peleas: _Numish;
  total_v: _Numish;
  total_d: _Numish;
  total_e: _Numish;
  meses_entrenando: _Numish;
  diferencia_peso: _Numish;
  diferencia_edad: _Numish;
  diferencia_peleas: _Numish;
  diferencia_meses_entrenando: _Numish;
};

// =====================================================
// Helpers de normalización
// =====================================================

function _aNum(v: _Numish | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function _aNumOrNull(v: _NumishOrNull | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function _normalizarCandidato(c: _CandidatoCrudo): BusquedaCombateCandidato {
  return {
    ...c,
    peso_en_kg: _aNum(c.peso_en_kg),
    estatura_en_cm: _aNumOrNull(c.estatura_en_cm),
    edad: _aNum(c.edad),
    total_peleas: _aNum(c.total_peleas),
    total_v: _aNum(c.total_v),
    total_d: _aNum(c.total_d),
    total_e: _aNum(c.total_e),
    meses_entrenando: _aNum(c.meses_entrenando),
    diferencia_peso: _aNum(c.diferencia_peso),
    diferencia_edad: _aNum(c.diferencia_edad),
    diferencia_peleas: _aNum(c.diferencia_peleas),
    diferencia_meses_entrenando: _aNum(c.diferencia_meses_entrenando),
    clubs: c.clubs ?? [],
    disciplinas: c.disciplinas ?? [],
  };
}

// =====================================================
// Helpers de UI
// =====================================================

export type ContactoCandidato = {
  tipo: "club" | "coach";
  nombre: string;
  correo: string | null;
  telefono: string | null;
  club_nombre: string;
};

/**
 * Aplana todos los contactos disponibles de un candidato
 * (datos del club + datos de cada coach), omitiendo los que
 * no tengan ni correo ni teléfono.
 *
 * Útil para renderizar una lista de "formas de contacto"
 * sin recorrer el árbol `clubs → coaches` a mano.
 */
export function obtenerContactos(
  candidato: BusquedaCombateCandidato
): ContactoCandidato[] {
  const contactos: ContactoCandidato[] = [];

  for (const club of candidato.clubs) {
    if (club.correo_institucional || club.telefono) {
      contactos.push({
        tipo: "club",
        nombre: club.nombre,
        correo: club.correo_institucional,
        telefono: club.telefono,
        club_nombre: club.nombre,
      });
    }

    for (const coach of club.coaches) {
      if (coach.correo || coach.telefono) {
        contactos.push({
          tipo: "coach",
          nombre: coach.nombre,
          correo: coach.correo,
          telefono: coach.telefono,
          club_nombre: club.nombre,
        });
      }
    }
  }

  return contactos;
}

// =====================================================
// API
// =====================================================

const busquedaCombateApi = {
  /**
   * GET /busqueda-combate/:deportistaUuid
   *
   * Devuelve candidatos compatibles para combatir contra el deportista,
   * aplicando las reglas de matchmaking en el backend (edad, peso, peleas,
   * meses de entrenamiento). Solo incluye deportistas con
   * `aparecer_busqueda = true`.
   *
   * @param deportistaUuid UUID del deportista que busca rival.
   * @param opciones       `disciplinaUuid` (recomendado) y `limite`.
   */
  async buscarCandidatos(
    deportistaUuid: string,
    opciones: BusquedaCombateOpciones = {}
  ): Promise<BusquedaCombateCandidato[]> {
    if (!deportistaUuid) {
      throw new Error("El uuid del deportista es obligatorio");
    }

    const { disciplinaUuid, limite } = opciones;

    const data = await apiGet<{ candidatos: _CandidatoCrudo[] }>(
      `/busqueda-combate/${deportistaUuid}`,
      {
        params: {
          ...(disciplinaUuid ? { disciplinaUuid } : {}),
          ...(limite ? { limite } : {}),
        },
      }
    );

    return (data.candidatos ?? []).map(_normalizarCandidato);
  },
};

export default busquedaCombateApi;