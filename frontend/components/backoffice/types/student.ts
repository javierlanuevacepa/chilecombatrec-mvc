export type StudentDisciplina = {
  uuid: string;
  nombre: string;
};

export type StudentRecord = {
  disciplina_uuid: string;
  disciplina_nombre: string;
  v: number;
  d: number;
  e: number;
};

export type Student = {
  id: string;
  codigo_interno: string;
  rut: string | null;
  digitoVerif: string | null;
  pNombre: string;
  sNombre: string | null;
  pApellido: string;
  sApellido: string | null;
  alias: string | null;
  nacionalidad: string | null;
  fechaNacimiento: string;   // YYYY-MM-DD
  genero: string;            // 'M' | 'F' | 'O'
  pesoEnKg: number;
  aparecer_busqueda: boolean;
  estaturaEnCm: number | null;
  disciplinas: StudentDisciplina[];
  records: StudentRecord[];
};