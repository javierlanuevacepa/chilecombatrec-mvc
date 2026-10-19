
export type CoachDraft = {
  /** Presente al editar un coach existente */
  id?: string;
  name: string;
  email: string;
  phone?: string;
  /** Opcional: contraseña inicial (crear) o nueva (editar) */
  password?: string;
  /** uuids de disciplinas que entrena. 0..N */
  disciplinas: string[];
};

export type StudentRecordDraft = {
  disciplina_uuid: string;
  v: number;
  d: number;
  e: number;
};

export type StudentDraft = {
  id?: string;
  rut: string;
  digitoVerif: string;
  pNombre: string;
  sNombre?: string | null;
  pApellido: string;
  sApellido?: string | null;
  alias?: string | null;
  nacionalidad?: string | null;
  fechaNacimiento: string;
  genero: string;
  pesoEnKg: number;
  estaturaEnCm?: number | null;
  /** uuids de disciplinas seleccionadas. Se alinea con `records`. */
  disciplinas: string[];
  records: StudentRecordDraft[];
};