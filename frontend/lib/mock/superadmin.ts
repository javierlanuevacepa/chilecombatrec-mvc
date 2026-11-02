import type {

  DisciplinaOption,
  RegionOption,
} from "@/components/backoffice/types/superadmin";

export const DISCIPLINAS: DisciplinaOption[] = [
  { uuid: "d1", nombre: "Boxeo" },
  { uuid: "d2", nombre: "Kickboxing K-1" },
  { uuid: "d3", nombre: "Muay Thai" }
];

export const REGIONES_COMUNAS: RegionOption[] = [
  {
    uuid: "r7",
    nombre: "Metropolitana de Santiago",
    comunas: [
      { uuid: "c7-1", nombre: "Santiago" },
      { uuid: "c7-2", nombre: "Providencia" },
      { uuid: "c7-3", nombre: "Las Condes" },
      { uuid: "c7-4", nombre: "Maipú" },
      { uuid: "c7-5", nombre: "Puente Alto" },
      { uuid: "c7-6", nombre: "Ñuñoa" },
    ],
  },
  {
    uuid: "r6",
    nombre: "Valparaíso",
    comunas: [
      { uuid: "c6-1", nombre: "Valparaíso" },
      { uuid: "c6-2", nombre: "Viña del Mar" },
      { uuid: "c6-3", nombre: "Quilpué" },
      { uuid: "c6-4", nombre: "Villa Alemana" },
      { uuid: "c6-5", nombre: "San Antonio" },
    ],
  },
  {
    uuid: "r9",
    nombre: "Maule",
    comunas: [
      { uuid: "c9-1", nombre: "Talca" },
      { uuid: "c9-2", nombre: "Curicó" },
      { uuid: "c9-3", nombre: "Linares" },
      { uuid: "c9-4", nombre: "Cauquenes" },
    ],
  },
  {
    uuid: "r11",
    nombre: "Biobío",
    comunas: [
      { uuid: "c11-1", nombre: "Concepción" },
      { uuid: "c11-2", nombre: "Talcahuano" },
      { uuid: "c11-3", nombre: "Los Ángeles" },
      { uuid: "c11-4", nombre: "Coronel" },
    ],
  },
  {
    uuid: "r8",
    nombre: "Libertador General Bernardo O'Higgins",
    comunas: [
      { uuid: "c8-1", nombre: "Rancagua" },
      { uuid: "c8-2", nombre: "San Fernando" },
      { uuid: "c8-3", nombre: "Santa Cruz" },
    ],
  },
  {
    uuid: "r12",
    nombre: "La Araucanía",
    comunas: [
      { uuid: "c12-1", nombre: "Temuco" },
      { uuid: "c12-2", nombre: "Villarrica" },
      { uuid: "c12-3", nombre: "Angol" },
    ],
  },
];

