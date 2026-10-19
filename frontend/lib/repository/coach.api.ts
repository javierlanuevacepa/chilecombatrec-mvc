// lib/repositories/coach.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";
import type { Rol } from "@/lib/services/SessionService";

// =====================================================
// Constantes de validación (alineadas con el backend)
// =====================================================

/** Mínimo de caracteres que exige el backend para `password` / `clave`. */
const PASSWORD_MIN_LENGTH = 8;

// =====================================================
// Tipos de lectura (lo que devuelve /coaches)
// =====================================================

export type CoachClub = {
  uuid: string;
  nombre: string;
  /** Teléfono del coach EN ese club (usuario_entrenador.telefono) */
  telefono: string | null;
};

export type CoachDisciplina = {
  uuid: string;
  nombre: string;
};

export type Coach = {
  uuid: string;
  nombre: string;
  correo_electronico: string;
  activo: boolean;
  fecha_registro: string;
  modificado_en: string | null;
  eliminado_en: string | null;
  rol: Rol;
  /** Clubes donde el coach está activo. Mínimo 1 mientras exista. */
  clubes: CoachClub[];
  /** Disciplinas que entrena. **Puede tener varias** (0..N). */
  disciplinas: CoachDisciplina[];
};

// =====================================================
// Tipos de escritura
// =====================================================

/**
 * Referencia a un club para asociar al coach.
 * - string              → `{ uuid }` sin teléfono (telefono = null)
 * - { uuid, telefono? } → con teléfono específico en ese club
 */
export type CoachClubRef =
  | string
  | { uuid: string; telefono?: string | null };

/** Referencia a una disciplina. Solo importa el uuid. */
export type CoachDisciplinaRef = string | { uuid: string };

/**
 * Creación de coach.
 *
 * REGLAS DE NEGOCIO:
 *  - `clubs` es **obligatorio con al menos 1 elemento**: un coach no
 *    existe sin club. Al crearse desde el dashboard del club, usar
 *    `crearEnClub(clubUuid, datos)` (ver abajo).
 *  - `disciplinas` es **0..N** (un coach puede entrenar varias).
 *    `undefined` y `[]` son equivalentes: sin disciplinas asignadas.
 *  - `password` la fija el **administrador** al crear al coach. Si la
 *    envía (>=8 chars), el coach puede ingresar directo con ella. Si
 *    la omite (undefined o ""), `clave = NULL` y el coach pasa por el
 *    flujo "genera tu contraseña" en su primer ingreso.
 */
export type CoachCrearInput = {
  nombre: string;
  correo_electronico: string;
  /**
   * Contraseña inicial del coach (mínimo 8 caracteres).
   * La fija el administrador desde el panel.
   *
   * - Presente y válida → `clave = bcrypt(password)`.
   * - `undefined` o `""` → `clave = NULL`; el coach la genera después.
   */
  telefono?:string;
  password?: string;
  clubs: CoachClubRef[];              // obligatorio, length >= 1
  disciplinas?: CoachDisciplinaRef[]; // opcional, 0..N
};

/**
 * PATCH parcial.
 *
 * Semántica de `undefined` vs `[]` (crítica):
 *  - `clubs: undefined`        → NO se tocan los clubes actuales
 *  - `clubs: []`               → se desactivan TODOS los clubes del coach
 *  - `clubs: [{ uuid }]`       → reemplaza el conjunto (soft delete de los no listados)
 * Lo mismo aplica a `disciplinas`.
 *
 * Si no quieres cambiar la contraseña, NO envíes `password: ""`.
 * Omite la clave (undefined). Enviar "" se interpreta como "no cambiar".
 */
export type CoachActualizarInput = Partial<CoachCrearInput>;

// =====================================================
// Validaciones locales (fail-fast, mismo criterio que el backend)
// =====================================================

function _validarPassword(password: string | undefined): void {
  // "" y undefined se tratan como "sin contraseña" (el service ignora "" por falsy).
  if (password && password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
    );
  }
}

// =====================================================
// API
// =====================================================

const coachApi = {
  // GET /coaches
  async listar(): Promise<Coach[]> {
    const data = await apiGet<{ coaches_data: Coach[] }>("/coaches");
    return data.coaches_data;
  },

  // GET /coaches/:uuid
  async buscarPorUuid(uuid: string): Promise<Coach> {
    const data = await apiGet<{ coach_data: Coach }>(`/coaches/${uuid}`);
    return data.coach_data;
  },

  // POST /coaches — versión "admin de sistema" (exige clubs explícitos)
  async crear(datos: CoachCrearInput): Promise<Coach> {
    if (!Array.isArray(datos.clubs) || datos.clubs.length === 0) {
      throw new Error("El coach debe pertenecer al menos a un club");
    }
    _validarPassword(datos.password);

    const data = await apiPost<{ coach_data: Coach }>("/coaches", datos);
    return data.coach_data;
  },

  /**
   * POST /coaches con el club **auto-vinculado**.
   *
   * Pensado para el dashboard de un club (AdminClubModulo):
   *   coachApi.crearEnClub(miClub.uuid, {
   *     nombre: "…",
   *     correo_electronico: "…",
   *     password: "claveInicial123",        // admin la fija aquí
   *     disciplinas: ["uuid-mma", "uuid-boxeo"], // 0..N
   *   });
   *
   * El coach queda inmediatamente asociado al club `clubUuid`. Si el
   * admin omite `password`, el coach usa el flujo "genera tu contraseña"
   * (mismo que usuarios).
   */
  async crearEnClub(
    clubUuid: string,
    datos: Omit<CoachCrearInput, "clubs"> & { telefono?: string | null }
  ): Promise<Coach> {
    if (!clubUuid) {
      throw new Error("El club es obligatorio para crear un coach");
    }
    _validarPassword(datos.password);
    const { telefono, ...rest } = datos;
    return this.crear({ ...rest,
    clubs: [{ uuid: clubUuid, telefono: telefono ?? null }], });
  },

  // PATCH /coaches/:uuid
  async actualizar(
    uuid: string,
    datos: CoachActualizarInput
  ): Promise<Coach> {
    _validarPassword(datos.password);

    const data = await apiPatch<{ coach_data: Coach }>(
      `/coaches/${uuid}`,
      datos
    );
    return data.coach_data;
  },

  /**
   * Cambio de contraseña desde el panel del admin.
   * Atajo sobre `actualizar(uuid, { password })` con validación explícita.
   *
   * Si el admin necesita asignarle una clave a un coach que fue creado
   * sin contraseña (`clave = NULL`), este es el método.
   */
  async actualizarPassword(uuid: string, password: string): Promise<Coach> {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      );
    }
    return this.actualizar(uuid, { password });
  },

  // DELETE /coaches/:uuid (soft delete)
  async eliminar(uuid: string): Promise<Coach> {
    const data = await apiDelete<{ coach_data: Coach }>(`/coaches/${uuid}`);
    return data.coach_data;
  },
};

export default coachApi;