// lib/repositories/superadmin.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";
import clubApi, { type Club } from "./club.api";
import type {
  SuperAdminUser,
  SuperAdminClub,
  SuperAdminUserDraft,
  ClubDraftData,
} from "@/components/backoffice/types/superadmin";

// =====================================================
// Constantes de validación (alineadas con el service)
// =====================================================

const PASSWORD_MIN_LENGTH = 8;

// =====================================================
// Payloads que espera el backend (snake_case)
// =====================================================

type BackendClubPayload = {
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  correo_institucional: string | null;
  url_foto: string | null;
  fecha_fundacion: string | null;
  disciplinas: string[];
  region: string | null;
  comuna: string | null;
};

type BackendUserCreatePayload = {
  nombre: string;
  correo_electronico: string;
  password: string;
  rol: string;
  club?: BackendClubPayload;
  club_uuid?: string;
  telefono?: string;
};

type BackendUserUpdatePayload = {
  nombre?: string;
  correo_electronico?: string;
  password?: string;
  rol?: string;
  activo?: boolean;
  club?: BackendClubPayload;
  club_uuid?: string;
};

// =====================================================
// Transformers (frontend ↔ backend)
// =====================================================

function _clubDraftToPayload(draft: ClubDraftData): BackendClubPayload {
  return {
    nombre: draft.nombre,
    descripcion: draft.descripcion,
    telefono: draft.telefono,
    correo_institucional: draft.correo,
    url_foto: draft.urlFoto,
    fecha_fundacion: draft.fechaFundacion,
    disciplinas: draft.disciplinas,
    region: draft.region,
    comuna: draft.comuna,
  };
}

function _toCreatePayload(draft: SuperAdminUserDraft): BackendUserCreatePayload {
  const payload: BackendUserCreatePayload = {
    nombre: draft.nombre,
    correo_electronico: draft.email,
    password: draft.password ?? "",
    rol: draft.rol,
  };

  if (draft.rol === "ADMIN_CLUB" && draft.clubData) {
    payload.club = _clubDraftToPayload(draft.clubData);
  }
  if (draft.rol === "COACH_CLUB" && draft.existingClubUuid) {
    payload.club_uuid = draft.existingClubUuid;
  }

  return payload;
}

function _toUpdatePayload(
  draft: Partial<SuperAdminUserDraft>
): BackendUserUpdatePayload {
  const payload: BackendUserUpdatePayload = {};

  if (draft.nombre !== undefined) payload.nombre = draft.nombre;
  if (draft.email !== undefined) payload.correo_electronico = draft.email;
  if (draft.password !== undefined && draft.password !== "") {
    payload.password = draft.password;
  }
  if (draft.rol !== undefined) payload.rol = draft.rol;

  if (draft.rol === "ADMIN_CLUB" && draft.clubData) {
    payload.club = _clubDraftToPayload(draft.clubData);
  }
  if (draft.rol === "COACH_CLUB" && draft.existingClubUuid) {
    payload.club_uuid = draft.existingClubUuid;
  }

  return payload;
}

/**
 * Convierte la forma que devuelve `/clubes` (club.api.ts → `Club`)
 * al shape que usa el frontend del superadmin (`SuperAdminClub`).
 *
 * Reglas:
 *  - `region` / `comuna` se toman de la primera sede (así las guarda
 *    el backend al crear el club desde el superadmin).
 *  - `coachesCount` / `deportistasCount` se derivan de los arrays
 *    que ya vienen en la respuesta de `/clubes`.
 */
function _backendClubToSuperAdmin(c: Club): SuperAdminClub {
  const sede = c.sedes?.[0];
  return {
    uuid: c.uuid,
    nombre: c.nombre,
    descripcion: c.descripcion,
    telefono: c.telefono,
    correo: c.correo_institucional,
    urlFoto: c.url_foto,
    fechaFundacion: c.fecha_fundacion,
    disciplinas: (c.disciplinas ?? []).map((d) => d.uuid),
    region: sede?.region?.nombre ?? null,
    comuna: sede?.comuna?.nombre ?? null,
    coachesCount: c.entrenadores?.length ?? 0,
    deportistasCount: c.deportistas?.length ?? 0,
  };
}

// =====================================================
// API
// =====================================================

const superadminApi = {
  /**
   * GET /superadmin
   * Listado global de usuarios con su rol y club (si tienen).
   * El backend ya devuelve el shape `SuperAdminUser` en camelCase.
   */
  async listar(): Promise<SuperAdminUser[]> {
    const data = await apiGet<{ usuarios_data: SuperAdminUser[] }>(
      "/superadmin"
    );
    return data.usuarios_data;
  },

  /**
   * GET /superadmin/:uuid
   * Detalle de un usuario (mismo shape que `listar()[i]`).
   */
  async buscarPorUuid(uuid: string): Promise<SuperAdminUser> {
    if (!uuid) throw new Error("El uuid del usuario es obligatorio");
    const data = await apiGet<{ usuario_data: SuperAdminUser }>(
      `/superadmin/${uuid}`
    );
    return data.usuario_data;
  },

  /**
   * POST /superadmin
   *
   * Crea el usuario **y** su club (si `rol === "ADMIN_CLUB"`) en una
   * sola transacción del lado del backend. Para `COACH_CLUB` vincula
   * al club indicado en `existingClubUuid`. Para `ADMIN` no requiere
   * club.
   */
  async crear(draft: SuperAdminUserDraft): Promise<SuperAdminUser> {
    if (!draft.password || draft.password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      );
    }
    if (draft.rol === "ADMIN_CLUB" && !draft.clubData) {
      throw new Error("Los datos del club son obligatorios para ADMIN_CLUB");
    }
    if (draft.rol === "COACH_CLUB" && !draft.existingClubUuid) {
      throw new Error("Debes asignar un club al entrenador");
    }

    const payload = _toCreatePayload(draft);
    const data = await apiPost<{ usuario_data: SuperAdminUser }>(
      "/superadmin",
      payload
    );
    return data.usuario_data;
  },

  /**
   * PATCH /superadmin/:uuid
   *
   * Actualización parcial. Si cambias el rol a `ADMIN_CLUB`, debes
   * enviar `clubData` (o el backend usará el club existente si el
   * usuario ya tenía uno).
   */
  async actualizar(
    uuid: string,
    draft: Partial<SuperAdminUserDraft>
  ): Promise<SuperAdminUser> {
    if (!uuid) throw new Error("El uuid del usuario es obligatorio");
    if (draft.password && draft.password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      );
    }

    const payload = _toUpdatePayload(draft);
    const data = await apiPatch<{ usuario_data: SuperAdminUser }>(
      `/superadmin/${uuid}`,
      payload
    );
    return data.usuario_data;
  },

  /**
   * PATCH /superadmin/:uuid/estado
   *
   * Activa (`true`) o suspende (`false`) la cuenta. Útil para el
   * toggle "Activo" que se puede agregar en la fila del listado.
   */
  async cambiarEstado(uuid: string, activo: boolean): Promise<SuperAdminUser> {
    if (!uuid) throw new Error("El uuid del usuario es obligatorio");
    if (typeof activo !== "boolean") {
      throw new Error("`activo` debe ser booleano");
    }
    const data = await apiPatch<{ usuario_data: SuperAdminUser }>(
      `/superadmin/${uuid}/estado`,
      { activo }
    );
    return data.usuario_data;
  },

  /**
   * DELETE /superadmin/:uuid?eliminar_club=true
   *
   * Soft delete del usuario. Si `eliminarClub === true` y el usuario
   * era `ADMIN_CLUB`, también elimina su club (y desvincula a sus
   * coaches). Coincide con el comportamiento actual del frontend
   * (`ConfirmModal` avisa "se eliminará su club asociado").
   */
  async eliminar(
    uuid: string,
    eliminarClub = false
  ): Promise<SuperAdminUser> {
    if (!uuid) throw new Error("El uuid del usuario es obligatorio");
    const url = eliminarClub
      ? `/superadmin/${uuid}?eliminar_club=true`
      : `/superadmin/${uuid}`;
    const data = await apiDelete<{ usuario_data: SuperAdminUser }>(url);
    return data.usuario_data;
  },

  /**
   * GET /clubes (delegado a `clubApi.listar()`).
   *
   * Lo expone el módulo de superadmin porque el `<select>` de
   * coaches necesita la lista de clubes existentes, y el listado de
   * usuarios necesita resolver `clubUuid → club` para mostrar
   * nombre + ubicación.
   *
   * Devuelve el shape `SuperAdminClub` (camelCase) listo para
   * alimentar el estado del `SuperAdminModulo`.
   */
  async listarClubes(): Promise<SuperAdminClub[]> {
    const clubes = await clubApi.listar();
    return clubes.map(_backendClubToSuperAdmin);
  },
};

export default superadminApi;