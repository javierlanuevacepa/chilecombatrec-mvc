// lib/repositories/club.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";
import type { Rol } from "@/lib/services/SessionService";

// =====================================================
// Tipos de lectura (lo que devuelve el backend)
// =====================================================

export type ClubUsuario = {
  uuid: string;
  nombre: string;
  correo_electronico: string;
  rol: Rol;
};

export type ClubDisciplina = {
  uuid: string;
  nombre: string;
};

export type ClubSedeComuna = {
  uuid: string;
  nombre: string;
};

export type ClubSedeRegion = {
  uuid: string;
  nombre: string;
};

export type ClubSede = {
  uuid: string;
  nombre: string;
  direccion: string | null;
  comuna: ClubSedeComuna;
  region: ClubSedeRegion;
};

export type ClubEntrenador = {
  uuid: string;
  nombre: string;
  correo_electronico: string;
  telefono: string | null;
  rol: Rol;
  disciplinas: ClubDisciplina[];
};
export type ClubDeportistaRecord = {
  disciplina_uuid: string;
  disciplina_nombre: string;
  /** MySQL puede devolver NUMERIC como string; normalizar con calcularRecordTotal */
  v: number | string;
  d: number | string;
  e: number | string;
};

export type ClubDeportista = {
  uuid: string;
  rut: string | null;
  digito_verif: string | null;
  codigo_interno: string;
  p_nombre: string;
  s_nombre: string | null;
  p_apellido: string;
  s_apellido: string | null;
  alias: string | null;
  nacionalidad: string | null;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  genero: string;            // 'M' | 'F' | 'O'
  peso_en_kg: number | string;
  estatura_en_cm: number | string | null;
  activo: boolean;
  aparecer_busqueda: boolean;
  /** Record legacy por disciplina. 0..N (puede ser []). */
  records: ClubDeportistaRecord[];
};
export type Club = {
  uuid: string;
  nombre: string;
  url_foto: string | null;
  descripcion: string | null;
  fecha_fundacion: string | null;
  correo_institucional: string | null;
  telefono: string | null;
  activo: boolean;
  fecha_registro: string;
  modificado_en: string | null;
  eliminado_en: string | null;
  usuarios: ClubUsuario[];
  disciplinas: ClubDisciplina[];
  sedes: ClubSede[];
  entrenadores: ClubEntrenador[];
  deportistas: ClubDeportista[];
};

// =====================================================
// Tipos de escritura (lo que se envía al backend)
// =====================================================

/** usuarios / disciplinas: acepta string suelto o { uuid } */
export type RefUuid = string | { uuid: string };

/** Sede en el payload de creación/actualización.
 *  - Con `uuid` → se actualiza
 *  - Sin `uuid` → se crea (requiere `nombre` y `comuna_uuid`) */
export type ClubSedeInput = {
  uuid?: string;
  nombre?: string;
  direccion?: string | null;
  comuna_uuid?: string;
};

export type ClubCrearInput = {
  nombre: string;
  url_foto?: string | null;
  descripcion?: string | null;
  fecha_fundacion?: string | null;         // 'YYYY-MM-DD'
  correo_institucional?: string | null;
  telefono?: string | null;
  usuarios?: RefUuid[];
  disciplinas?: RefUuid[];
  sedes?: ClubSedeInput[];
};

/** PATCH parcial: cualquier subconjunto de `ClubCrearInput`.
 *  `[]` en usuarios/disciplinas/sedes = vaciar la relación. */
export type ClubActualizarInput = Partial<ClubCrearInput>;

// =====================================================
// Helpers de normalización
// =====================================================

/**
 * MySQL devuelve los BOOLEAN dentro de JSON_OBJECT como 1/0.
 * Convierte números a boolean y deja `undefined` como está, para que un
 * campo que el backend NO envía siga siendo visible como `undefined`
 * (en vez de aparecer disfrazado de `false`).
 */
function _aBool(v: unknown): boolean {
  return (typeof v === "number" ? v !== 0 : v) as boolean;
}

function _normalizarDeportista(d: ClubDeportista): ClubDeportista {
  return {
    ...d,
    activo: _aBool(d.activo),
    aparecer_busqueda: _aBool(d.aparecer_busqueda),
  };
}

/** Deja los booleanos del club (y de sus deportistas) como true/false reales. */
function _normalizarClub(c: Club): Club {
  return {
    ...c,
    activo: _aBool(c.activo),
    deportistas: (c.deportistas ?? []).map(_normalizarDeportista),
  };
}

// =====================================================
// API
// =====================================================

const clubApi = {
  // GET /clubes
  async listar(): Promise<Club[]> {
    const data = await apiGet<{ clubes_data: Club[] }>("/clubes");
    return data.clubes_data.map(_normalizarClub);
  },

  // GET /clubes/por-usuario/:uuid
  // Devuelve todos los clubes donde el usuario está vinculado.
  // En el modelo actual, un ADMIN_CLUB tiene exactamente uno;
  // usa `obtenerMiClub` si solo necesitas ese único club.
  async listarPorUsuario(usuarioUuid: string): Promise<Club[]> {
    const data = await apiGet<{ clubes_data: Club[] }>(
      `/clubes/por-usuario/${usuarioUuid}`
    );
    return data.clubes_data.map(_normalizarClub);
  },

  // GET /clubes/por-usuario/:uuid → primer club o null
  // Pensado para ADMIN_CLUB (1 club por usuario).
  // - Devuelve `null` si el usuario no tiene club asignado.
  // - Si por inconsistencia de datos tuviera más de uno, devuelve el primero
  //   (la regla de negocio es 1; el backend no lo impone con UNIQUE).
  async obtenerMiClub(usuarioUuid: string): Promise<Club | null> {
    const clubes = await this.listarPorUsuario(usuarioUuid);
    return clubes[0] ?? null;
  },

  // GET /clubes/:uuid
  async buscarPorUuid(uuid: string): Promise<Club> {
    const data = await apiGet<{ club_data: Club }>(`/clubes/${uuid}`);
    return _normalizarClub(data.club_data);
  },

  // POST /clubes
  async crear(datos: ClubCrearInput): Promise<Club> {
    const data = await apiPost<{ club_data: Club }>("/clubes", datos);
    return _normalizarClub(data.club_data);
  },

  // PATCH /clubes/:uuid
  async actualizar(
    uuid: string,
    datos: ClubActualizarInput
  ): Promise<Club> {
    const data = await apiPatch<{ club_data: Club }>(
      `/clubes/${uuid}`,
      datos
    );
    return _normalizarClub(data.club_data);
  },

  // DELETE /clubes/:uuid (soft delete)
  async eliminar(uuid: string): Promise<Club> {
    const data = await apiDelete<{ club_data: Club }>(`/clubes/${uuid}`);
    return _normalizarClub(data.club_data);
  },
};

export default clubApi;