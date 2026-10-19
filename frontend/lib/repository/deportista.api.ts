// lib/repositories/deportista.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

// =====================================================
// Tipos de lectura (lo que devuelve /deportistas)
// =====================================================

export type DeportistaDisciplina = {
  uuid: string;
  nombre: string;
};

export type DeportistaClub = {
  uuid: string;
  nombre: string;
};

/**
 * Record legacy por disciplina (`deportista_record_legacy`).
 * - v = victorias, d = derrotas, e = empates
 * - MySQL puede devolver NUMERIC como string; usar `calcularRecordTotal`
 *   o `_toNum` para normalizar antes de operar.
 */
export type DeportistaRecord = {
  disciplina_uuid: string;
  disciplina_nombre: string;
  v: number | string;
  d: number | string;
  e: number | string;
};

export type Deportista = {
  uuid: string;
  rut: string | null;
  digito_verif: string | null;
  p_nombre: string;
  s_nombre: string | null;
  p_apellido: string;
  s_apellido: string | null;
  alias: string | null;
  nacionalidad: string | null;
  fecha_nacimiento: string;      // 'YYYY-MM-DD'
  genero: string;                // 'M' | 'F' | 'O'
  peso_en_kg: number | string;
  estatura_en_cm: number | string | null;
  activo: boolean;
  fecha_registro: string;
  modificado_en: string | null;
  eliminado_en: string | null;
  clubs: DeportistaClub[];
  disciplinas: DeportistaDisciplina[];
  /** Un record por disciplina. 0..N (puede ser []). */
  records: DeportistaRecord[];
};

/** Record agregado (suma de records de TODAS las disciplinas). */
export type RecordTotal = {
  v: number; // victorias
  d: number; // derrotas
  e: number; // empates
};

// =====================================================
// Tipos de escritura
// =====================================================

export type DeportistaDisciplinaRef = string | { uuid: string };
export type DeportistaClubRef = string | { uuid: string };

export type DeportistaRecordInput = {
  disciplina_uuid: string;
  v: number;
  d: number;
  e: number;
};

/**
 * Creación de deportista.
 *
 * REGLAS DE NEGOCIO:
 *  - `clubs` es **obligatorio con al menos 1 elemento**: un deportista
 *    nace vinculado al club donde se registra. Usar
 *    `crearEnClub(clubUuid, datos)` desde el panel del admin.
 *  - `disciplinas` es **0..N** (un deportista puede estar en varias).
 *  - `records` es **0..N** (uno por disciplina). El método `crear`
 *    auto-completa `disciplinas` a partir de `records[i].disciplina_uuid`
 *    para mantener coherencia.
 *  - El deportista NO tiene usuario asociado en el modelo actual.
 */
export type DeportistaCrearInput = {
  rut: string;
  digito_verif: string;
  p_nombre: string;
  s_nombre?: string | null;
  p_apellido: string;
  s_apellido?: string | null;
  alias?: string | null;
  nacionalidad?: string | null;
  fecha_nacimiento: string;       // 'YYYY-MM-DD'
  genero: string;                 // 'M' | 'F' | 'O'
  peso_en_kg: number;
  estatura_en_cm?: number | null;
  clubs: DeportistaClubRef[];     // obligatorio, length >= 1
  disciplinas?: DeportistaDisciplinaRef[];
  records?: DeportistaRecordInput[];
};

/**
 * PATCH parcial. Semántica de `undefined` vs `[]`:
 *  - `undefined` → no se toca la relación
 *  - `[]`        → se vacía (soft delete de los activos no listados)
 *  - `[items]`   → reemplaza el conjunto actual (upsert + soft delete)
 *
 * El backend actualiza el record existente si la disciplina ya tenía
 * uno (ON DUPLICATE KEY UPDATE → sobrescribe v/d/e).
 */
export type DeportistaActualizarInput = Partial<DeportistaCrearInput>;

// =====================================================
// Helpers puros (sin dependencia de la API)
// =====================================================

function _toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suma el record completo a través de TODAS las disciplinas.
 *
 * Acepta cualquier record con `{ v, d, e }`, por lo que sirve tanto
 * para `DeportistaRecord` (endpoint `/deportistas/:uuid`) como para
 * `ClubDeportistaRecord` (anidado en `club.deportistas`).
 *
 *   const total = calcularRecordTotal(deportista.records);
 *   // → { v: 8, d: 3, e: 1 }
 */
export function calcularRecordTotal(
  records: ReadonlyArray<{ v: number | string; d: number | string; e: number | string }>
): RecordTotal {
  return records.reduce<RecordTotal>(
    (acc, r) => ({
      v: acc.v + _toNum(r.v),
      d: acc.d + _toNum(r.d),
      e: acc.e + _toNum(r.e),
    }),
    { v: 0, d: 0, e: 0 }
  );
}

/** Formatea un record como "V-D-E" (ej: `"8-3-1"`). */
export function formatearRecord(record: RecordTotal): string {
  return `${record.v}-${record.d}-${record.e}`;
}

/** Nombre completo concatenado (omite nulos). */
export function nombreCompleto(
  d: Pick<Deportista, "p_nombre" | "s_nombre" | "p_apellido" | "s_apellido">
): string {
  return [d.p_nombre, d.s_nombre, d.p_apellido, d.s_apellido]
    .filter(Boolean)
    .join(" ");
}

// =====================================================
// API
// =====================================================

const deportistaApi = {
  // GET /deportistas — listado global (para admin del sistema)
  // Para el listado por club, usar `club.deportistas` desde useMiClub()
  // (ya trae cada deportista con sus records resueltos en una sola query).
  async listar(): Promise<Deportista[]> {
    const data = await apiGet<{ deportistas_data: Deportista[] }>(
      "/deportistas"
    );
    return data.deportistas_data;
  },

  // GET /deportistas/:uuid — detalle con records por disciplina
  async buscarPorUuid(uuid: string): Promise<Deportista> {
    const data = await apiGet<{ deportista_data: Deportista }>(
      `/deportistas/${uuid}`
    );
    return data.deportista_data;
  },

  // POST /deportistas — versión "admin de sistema" (exige clubs)
  async crear(datos: DeportistaCrearInput): Promise<Deportista> {
    if (!Array.isArray(datos.clubs) || datos.clubs.length === 0) {
      throw new Error("El deportista debe pertenecer al menos a un club");
    }

    // Auto-completar: cada disciplina referenciada en `records`
    // debe estar también en `disciplinas` para mantener coherencia
    // (el backend no lo exige, pero evita estados raros en el front).
    const discSet = new Set<string>();
    for (const d of datos.disciplinas ?? []) {
      discSet.add(typeof d === "string" ? d : d.uuid);
    }
    for (const r of datos.records ?? []) {
      discSet.add(r.disciplina_uuid);
    }
    const disciplinas = Array.from(discSet);

    const payload: DeportistaCrearInput = { ...datos, disciplinas };
    const data = await apiPost<{ deportista_data: Deportista }>(
      "/deportistas",
      payload
    );
    return data.deportista_data;
  },

  /**
   * POST /deportistas con el club **auto-vinculado**.
   *
   * Pensado para el dashboard de un club (AdminClubModulo).
   * El deportista queda inmediatamente asociado al club `clubUuid`.
   *
   *   deportistaApi.crearEnClub(miClub.uuid, {
   *     rut: "12345678", digito_verif: "9",
   *     p_nombre: "Carlos", p_apellido: "Ramírez",
   *     fecha_nacimiento: "2000-05-12",
   *     genero: "M", peso_en_kg: 70,
   *     records: [
   *       { disciplina_uuid: "uuid-boxeo", v: 2, d: 1, e: 0 },
   *     ],
   *   });
   *
   * Las `disciplinas` no hace falta pasarlas: se derivan de los records.
   * Si quieres asignar disciplinas sin record inicial, agrégalas en
   * `disciplinas: [...]`.
   */
  async crearEnClub(
    clubUuid: string,
    datos: Omit<DeportistaCrearInput, "clubs">
  ): Promise<Deportista> {
    if (!clubUuid) {
      throw new Error("El club es obligatorio para crear un deportista");
    }
    return this.crear({ ...datos, clubs: [clubUuid] });
  },

  // PATCH /deportistas/:uuid
  async actualizar(
    uuid: string,
    datos: DeportistaActualizarInput
  ): Promise<Deportista> {
    const data = await apiPatch<{ deportista_data: Deportista }>(
      `/deportistas/${uuid}`,
      datos
    );
    return data.deportista_data;
  },

  // DELETE /deportistas/:uuid (soft delete)
  async eliminar(uuid: string): Promise<Deportista> {
    const data = await apiDelete<{ deportista_data: Deportista }>(
      `/deportistas/${uuid}`
    );
    return data.deportista_data;
  },
};

export default deportistaApi;