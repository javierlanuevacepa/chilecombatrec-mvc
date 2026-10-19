import type { useMiClub } from "@/lib/hooks/useMiClub";
import { Student } from "@/components/backoffice/types/student";

type ClubData = NonNullable<ReturnType<typeof useMiClub>["club"]>;
export type DeportistaApi = ClubData["deportistas"][number];

/**
 * Convierte un deportista de la API al tipo Student de la UI.
 * Es el mismo mapeo que hace AdminClubModulo y CoachModulo; pueden importarlo
 * desde aquí en lugar de repetirlo.
 */
export function mapDeportistaToStudent(d: DeportistaApi): Student {
  const records = d.records.map((r) => ({
    disciplina_uuid: r.disciplina_uuid,
    disciplina_nombre: r.disciplina_nombre,
    v: Number(r.v) || 0,
    d: Number(r.d) || 0,
    e: Number(r.e) || 0,
  }));

  return {
    id: d.uuid,
    rut: d.rut,
    digitoVerif: d.digito_verif,
    pNombre: d.p_nombre,
    sNombre: d.s_nombre,
    pApellido: d.p_apellido,
    sApellido: d.s_apellido,
    alias: d.alias,
    nacionalidad: d.nacionalidad,
    fechaNacimiento: d.fecha_nacimiento,
    genero: d.genero,
    pesoEnKg: Number(d.peso_en_kg) || 0,
    estaturaEnCm: d.estatura_en_cm != null ? Number(d.estatura_en_cm) : null,
    // Las disciplinas viven en deportista_disciplina y el record en
    // deportista_record_legacy. Aquí se derivan de los records (como en el
    // admin); si la API devuelve las disciplinas por separado, úsalas aquí.
    disciplinas: records.map((r) => ({
      uuid: r.disciplina_uuid,
      nombre: r.disciplina_nombre,
    })),
    records,
  };
}
