export type Rival = {
  id: string;
  nombre: string;
  clubNombre: string;
  clubTelefono: string | null;
  disciplinaNombre: string;
  pesoEnKg: number;
  record: { v: number; d: number; e: number };
};
