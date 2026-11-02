export type RolUsuario = "ADMIN" | "ADMIN_CLUB" | "COACH_CLUB";

export type SuperAdminClub = {
  uuid: string;
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  correo: string | null;
  urlFoto: string | null;
  fechaFundacion: string | null;
  disciplinas: string[];
  region: string | null;
  comuna: string | null;
  coachesCount: number;
  deportistasCount: number;
};

export type SuperAdminUser = {
  uuid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  fechaRegistro: string; // YYYY-MM-DD
  /**
   * Club asociado (para ADMIN_CLUB y COACH_CLUB). Array por si en el
   * futuro un usuario pertenece a más de uno (el schema N:M lo permite
   * vía club_usuario / usuario_entrenador). Hoy el backend devuelve 0 o 1.
   */
  clubes: SuperAdminClub[];
};

export type ClubDraftData = {
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  correo: string | null;
  urlFoto: string | null;
  fechaFundacion: string | null;
  disciplinas: string[];
  region: string | null;
  comuna: string | null;
};

export type SuperAdminUserDraft = {
  uuid?: string;
  nombre: string;
  email: string;
  password?: string;
  rol: RolUsuario;
  /** Sólo cuando rol = ADMIN_CLUB. Se crea (si el user es nuevo o no tenía club) o se actualiza. */
  clubData?: ClubDraftData | null;
  /** Sólo cuando rol = COACH_CLUB. */
  existingClubUuid?: string | null;
};

export type PendingDelete = {
  uuid: string;
  nombre: string;
  rol: RolUsuario;
  /** Club que se eliminará junto con el usuario (solo si rol = ADMIN_CLUB) */
  clubUuid: string | null;
};

export type DisciplinaOption = { uuid: string; nombre: string };
export type RegionOption = {
  uuid: string;
  nombre: string;
  comunas: { uuid: string; nombre: string }[];
};