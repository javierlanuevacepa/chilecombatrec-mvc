// lib/repository/disciplina.api.ts
//
// ⚠️ Ajusta estas dos cosas a como lo hacen club.api.ts / coach.api.ts:
//   1. el import del cliente axios (aquí `api`)
//   2. la ruta del endpoint (aquí GET /disciplinas)
import api from "./api";

// =====================================================
// Tipos
// =====================================================

export type Disciplina = {
  uuid: string;
  nombre: string;
};

// =====================================================
// API
// =====================================================

type DisciplinasResponse = {
  success: boolean;
  data: { disciplinas_data: Disciplina[] };
};

const disciplinaApi = {
  /** Catálogo de disciplinas activas, ordenadas por nombre. */
  async listar(): Promise<Disciplina[]> {
    const { data: body } = await api.get<DisciplinasResponse>("/disciplinas");
    const lista = body.data?.disciplinas_data ?? [];
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
  },
};

export default disciplinaApi;