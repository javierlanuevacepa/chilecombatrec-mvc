"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Button from "@/components/backoffice/ui/Button";
import Field from "@/components/backoffice/ui/Field";
import SelectInput from "@/components/backoffice/ui/SelectInput";
import TextInput from "@/components/backoffice/ui/TextInput";
import type { Student } from "@/components/backoffice/types/student";
import type {
  StudentDraft,
  StudentRecordDraft,
} from "@/components/backoffice/types/coachdrafts";
import {
  calcularRecordTotal,
  formatearRecord,
} from "@/lib/repository/deportista.api";

export type DisciplinaOption = {
  uuid: string;
  nombre: string;
};

const GENEROS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "O", label: "Otro" },
];

/** Valor que se envía al backend cuando el deportista no tiene RUT. */
const SIN_RUT = "SIN RUT";

const IDENTIFICACION = [
  { value: "si", label: "Tiene RUT" },
  { value: "no", label: "No posee RUT" },
];

/** Largo máximo del cuerpo del RUT (sin DV). */
const RUT_MAX_DIGITOS = 8;
/** Largo mínimo aceptado del cuerpo del RUT. */
const RUT_MIN_DIGITOS = 7;

/** Deja solo dígitos y corta al máximo permitido. */
const limpiarRut = (v: string) =>
  v.replace(/\D/g, "").slice(0, RUT_MAX_DIGITOS);

/** Deja solo un carácter: dígito o K (en mayúscula). */
const limpiarDv = (v: string) =>
  v
    .replace(/[^0-9kK]/g, "")
    .toUpperCase()
    .slice(-1);

/** Calcula el dígito verificador de un RUT (algoritmo módulo 11). */
function calcularDv(cuerpo: string): string {
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/**
 * Nacionalidades de Sudamérica. Solo es una ayuda del front:
 * al backend siempre se envía como texto libre (columna VARCHAR).
 */
const NACIONALIDADES = [
  "Argentina",
  "Boliviana",
  "Brasileña",
  "Chilena",
  "Colombiana",
  "Ecuatoriana",
  "Guyanesa",
  "Paraguaya",
  "Peruana",
  "Surinamesa",
  "Uruguaya",
  "Venezolana",
];
const NACIONALIDAD_DEFAULT = "Chilena";
/** Valor interno de la opción "Otro" (no se envía al backend). */
const NACIONALIDAD_OTRO = "__otro__";

const normalizar = (s: string) =>
  s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Traduce el texto guardado a (opción del select, texto libre para "Otro"). */
function parseNacionalidad(valor?: string | null): {
  sel: string;
  otro: string;
} {
  const v = (valor ?? "").trim();
  if (!v) return { sel: NACIONALIDAD_DEFAULT, otro: "" };
  const match = NACIONALIDADES.find((n) => normalizar(n) === normalizar(v));
  return match
    ? { sel: match, otro: "" }
    : { sel: NACIONALIDAD_OTRO, otro: v };
}

type FormState = {
  /** "si" | "no": si el deportista posee RUT */
  tieneRut: string;
  rut: string;
  digitoVerif: string;
  pNombre: string;
  sNombre: string;
  pApellido: string;
  sApellido: string;
  alias: string;
  /** Opción elegida en el select (una de NACIONALIDADES o NACIONALIDAD_OTRO) */
  nacionalidadSel: string;
  /** Texto libre, solo se usa cuando nacionalidadSel === NACIONALIDAD_OTRO */
  nacionalidadOtro: string;
  fechaNacimiento: string;
  genero: string;
  pesoEnKg: string;
  estaturaEnCm: string;
  records: Record<string, { v: string; d: string; e: string }>;
};

export default function StudentForm({
  initial,
  disciplinasDisponibles,
  onSave,
  onCancel,
}: {
  initial: Student | null;
  disciplinasDisponibles: DisciplinaOption[];
  onSave: (draft: StudentDraft) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      const records: FormState["records"] = {};
      for (const r of initial.records) {
        records[r.disciplina_uuid] = {
          v: String(r.v),
          d: String(r.d),
          e: String(r.e),
        };
      }
      // Incluye disciplinas sin record como 0/0/0
      for (const d of initial.disciplinas) {
        if (!records[d.uuid]) {
          records[d.uuid] = { v: "0", d: "0", e: "0" };
        }
      }

      const rutGuardado = (initial.rut ?? "").trim();
      const poseeRut =
        rutGuardado !== "" && rutGuardado.toUpperCase() !== SIN_RUT;
      const nac = parseNacionalidad(initial.nacionalidad);

      return {
        tieneRut: poseeRut ? "si" : "no",
        rut: poseeRut ? limpiarRut(rutGuardado) : "",
        digitoVerif: poseeRut ? limpiarDv(initial.digitoVerif ?? "") : "",
        pNombre: initial.pNombre,
        sNombre: initial.sNombre ?? "",
        pApellido: initial.pApellido,
        sApellido: initial.sApellido ?? "",
        alias: initial.alias ?? "",
        nacionalidadSel: nac.sel,
        nacionalidadOtro: nac.otro,
        fechaNacimiento: initial.fechaNacimiento,
        genero: initial.genero,
        pesoEnKg: String(initial.pesoEnKg),
        estaturaEnCm:
          initial.estaturaEnCm != null ? String(initial.estaturaEnCm) : "",
        records,
      };
    }
    return {
      tieneRut: "si",
      rut: "",
      digitoVerif: "",
      pNombre: "",
      sNombre: "",
      pApellido: "",
      sApellido: "",
      alias: "",
      nacionalidadSel: NACIONALIDAD_DEFAULT,
      nacionalidadOtro: "",
      fechaNacimiento: "",
      genero: "M",
      pesoEnKg: "",
      estaturaEnCm: "",
      records: {},
    };
  });

  const [error, setError] = useState("");

  const poseeRut = form.tieneRut === "si";
  const esOtraNacionalidad = form.nacionalidadSel === NACIONALIDAD_OTRO;

  // Mapa uuid → nombre de disciplina (incluye las del initial aunque no estén en club.disciplinas)
  const discByUuid = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of disciplinasDisponibles) m.set(d.uuid, d.nombre);
    if (initial) {
      for (const d of initial.disciplinas) {
        if (!m.has(d.uuid)) m.set(d.uuid, d.nombre);
      }
    }
    return m;
  }, [disciplinasDisponibles, initial]);

  const selectedUuids = Object.keys(form.records);

  const total = useMemo(
    () =>
      calcularRecordTotal(
        Object.values(form.records).map((r) => ({
          v: Number(r.v) || 0,
          d: Number(r.d) || 0,
          e: Number(r.e) || 0,
        }))
      ),
    [form.records]
  );

  const setText =
    (key: keyof Omit<FormState, "records">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (error) setError("");
    };

  /**
   * RUT: solo dígitos, máximo RUT_MAX_DIGITOS. Si el usuario pega un RUT
   * completo con guion (ej. "12.345.678-5"), el DV se separa solo.
   */
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const guion = raw.lastIndexOf("-");

    if (guion >= 0) {
      const cuerpo = limpiarRut(raw.slice(0, guion));
      const dv = limpiarDv(raw.slice(guion + 1));
      setForm((f) => ({
        ...f,
        rut: cuerpo,
        digitoVerif: dv || f.digitoVerif,
      }));
    } else {
      setForm((f) => ({ ...f, rut: limpiarRut(raw) }));
    }
    if (error) setError("");
  };

  /** DV: un solo carácter, dígito o K. */
  const handleDvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dv = limpiarDv(e.target.value);
    setForm((f) => ({ ...f, digitoVerif: dv }));
    if (error) setError("");
  };

  const toggleDisciplina = (uuid: string) => {
    setForm((f) => {
      if (f.records[uuid]) {
        const next = { ...f.records };
        delete next[uuid];
        return { ...f, records: next };
      }
      return {
        ...f,
        records: { ...f.records, [uuid]: { v: "0", d: "0", e: "0" } },
      };
    });
  };

  const setRecordField = (
    uuid: string,
    field: "v" | "d" | "e",
    value: string
  ) => {
    setForm((f) => ({
      ...f,
      records: {
        ...f.records,
        [uuid]: { ...f.records[uuid], [field]: value },
      },
    }));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (poseeRut) {
      const fallaRut = (msg: string, campo: "rut" | "dv") => {
        setError(msg);
        document.getElementById(`${uid}-${campo}`)?.focus();
      };

      const cuerpo = form.rut.trim();
      const dv = form.digitoVerif.trim().toUpperCase();

      if (!cuerpo) return fallaRut("Ingresa el RUT.", "rut");
      if (!/^\d+$/.test(cuerpo))
        return fallaRut("El RUT solo puede contener números.", "rut");
      if (
        cuerpo.length < RUT_MIN_DIGITOS ||
        cuerpo.length > RUT_MAX_DIGITOS
      )
        return fallaRut(
          `El RUT debe tener entre ${RUT_MIN_DIGITOS} y ${RUT_MAX_DIGITOS} dígitos.`,
          "rut"
        );
      if (!dv) return fallaRut("Ingresa el dígito verificador.", "dv");
      if (!/^[0-9K]$/.test(dv))
        return fallaRut(
          "El dígito verificador debe ser un número o la letra K.",
          "dv"
        );
      if (calcularDv(cuerpo) !== dv)
        return fallaRut(
          "El RUT no es válido: el dígito verificador no corresponde.",
          "dv"
        );
    }
    if (!form.pNombre.trim()) return setError("Ingresa el primer nombre.");
    if (!form.pApellido.trim())
      return setError("Ingresa el primer apellido.");
    if (esOtraNacionalidad && !form.nacionalidadOtro.trim())
      return setError("Escribe la nacionalidad.");
    if (!form.fechaNacimiento)
      return setError("Ingresa la fecha de nacimiento.");
    if (!form.pesoEnKg) return setError("Ingresa el peso.");

    const peso = Number(form.pesoEnKg);
    if (!Number.isFinite(peso) || peso <= 0)
      return setError("El peso debe ser mayor a 0.");

    const estatura = form.estaturaEnCm ? Number(form.estaturaEnCm) : null;
    if (estatura != null && (!Number.isFinite(estatura) || estatura <= 0)) {
      return setError("La estatura debe ser mayor a 0.");
    }

    setError("");

    const records: StudentRecordDraft[] = selectedUuids.map((uuid) => ({
      disciplina_uuid: uuid,
      v: Number(form.records[uuid].v) || 0,
      d: Number(form.records[uuid].d) || 0,
      e: Number(form.records[uuid].e) || 0,
    }));

    const nacionalidad = esOtraNacionalidad
      ? form.nacionalidadOtro.trim()
      : form.nacionalidadSel;

    const draft: StudentDraft = {
      id: initial?.id,
      rut: poseeRut ? form.rut.trim() : SIN_RUT,
      digitoVerif: poseeRut ? form.digitoVerif.trim().toUpperCase() : "",
      pNombre: form.pNombre.trim(),
      sNombre: form.sNombre.trim() || null,
      pApellido: form.pApellido.trim(),
      sApellido: form.sApellido.trim() || null,
      alias: form.alias.trim() || null,
      nacionalidad: nacionalidad || null,
      fechaNacimiento: form.fechaNacimiento,
      genero: form.genero,
      pesoEnKg: peso,
      estaturaEnCm: estatura,
      disciplinas: selectedUuids,
      records,
    };

    onSave(draft);
  };

  const errorId = `${uid}-error`;

  return (
    <form onSubmit={submit}>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
        >
          {error}
        </p>
      )}

      {/* Identificación */}
      <Field label="Identificación" htmlFor={`${uid}-ident`}>
        <SelectInput
          id={`${uid}-ident`}
          value={form.tieneRut}
          onChange={setText("tieneRut")}
        >
          {IDENTIFICACION.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      {/* RUT */}
      <div
        className={`grid grid-cols-[2fr_1fr] gap-x-3 max-[480px]:grid-cols-1 ${
          poseeRut
            ? ""
            : "[&_input:disabled]:cursor-not-allowed [&_input:disabled]:border-[#d1d5db] [&_input:disabled]:bg-[#e5e7eb] [&_input:disabled]:text-[#6b7280] [&_input:disabled]:opacity-100 [&_input:disabled]:[-webkit-text-fill-color:#6b7280] [&_input:disabled]:placeholder:text-[#9ca3af] [&_label]:text-[#9ca3af]"
        }`}
      >
        <Field label="RUT" htmlFor={`${uid}-rut`}>
          <TextInput
            id={`${uid}-rut`}
            value={poseeRut ? form.rut : SIN_RUT}
            onChange={handleRutChange}
            placeholder="12345678"
            inputMode="numeric"
            autoComplete="off"
            disabled={!poseeRut}
          />
          {poseeRut && (
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Solo números, sin puntos ni guion (7 u 8 dígitos).
            </p>
          )}
        </Field>
        <Field label="DV" htmlFor={`${uid}-dv`}>
          <TextInput
            id={`${uid}-dv`}
            value={poseeRut ? form.digitoVerif : ""}
            onChange={handleDvChange}
            placeholder="9 o K"
            autoComplete="off"
            autoCapitalize="characters"
            disabled={!poseeRut}
          />
        </Field>
      </div>

      {/* Nombres */}
      <div className="grid grid-cols-2 gap-x-3 max-[480px]:grid-cols-1">
        <Field label="Primer nombre" htmlFor={`${uid}-pn`}>
          <TextInput
            id={`${uid}-pn`}
            value={form.pNombre}
            onChange={setText("pNombre")}
            placeholder="Carlos"
          />
        </Field>
        <Field label="Segundo nombre" htmlFor={`${uid}-sn`}>
          <TextInput
            id={`${uid}-sn`}
            value={form.sNombre}
            onChange={setText("sNombre")}
            placeholder="(opcional)"
          />
        </Field>
        <Field label="Primer apellido" htmlFor={`${uid}-pa`}>
          <TextInput
            id={`${uid}-pa`}
            value={form.pApellido}
            onChange={setText("pApellido")}
            placeholder="Ramírez"
          />
        </Field>
        <Field label="Segundo apellido" htmlFor={`${uid}-sa`}>
          <TextInput
            id={`${uid}-sa`}
            value={form.sApellido}
            onChange={setText("sApellido")}
            placeholder="(opcional)"
          />
        </Field>
      </div>

      {/* Alias / Nacionalidad */}
      <div className="grid grid-cols-2 gap-x-3 max-[480px]:grid-cols-1">
        <Field label="Alias" htmlFor={`${uid}-alias`}>
          <TextInput
            id={`${uid}-alias`}
            value={form.alias}
            onChange={setText("alias")}
            placeholder="El Toro"
          />
        </Field>
        <Field label="Nacionalidad" htmlFor={`${uid}-nac`}>
          <SelectInput
            id={`${uid}-nac`}
            value={form.nacionalidadSel}
            onChange={setText("nacionalidadSel")}
          >
            {NACIONALIDADES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={NACIONALIDAD_OTRO}>Otro</option>
          </SelectInput>
          {esOtraNacionalidad && (
            <div className="mt-2">
              <TextInput
                id={`${uid}-nac-otro`}
                aria-label="Especifica la nacionalidad"
                value={form.nacionalidadOtro}
                onChange={setText("nacionalidadOtro")}
                placeholder="Ej: Mexicana"
                maxLength={100}
              />
            </div>
          )}
        </Field>
      </div>

      {/* Fecha / Género */}
      <div className="grid grid-cols-2 gap-x-3 max-[480px]:grid-cols-1">
        <Field label="Fecha de nacimiento" htmlFor={`${uid}-fn`}>
          <TextInput
            id={`${uid}-fn`}
            type="date"
            value={form.fechaNacimiento}
            onChange={setText("fechaNacimiento")}
          />
        </Field>
        <Field label="Género" htmlFor={`${uid}-gen`}>
          <SelectInput
            id={`${uid}-gen`}
            value={form.genero}
            onChange={setText("genero")}
          >
            {GENEROS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      {/* Peso / Estatura */}
      <div className="grid grid-cols-2 gap-x-3 max-[480px]:grid-cols-1">
        <Field label="Peso (kg)" htmlFor={`${uid}-peso`}>
          <TextInput
            id={`${uid}-peso`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={form.pesoEnKg}
            onChange={setText("pesoEnKg")}
            placeholder="75.5"
          />
        </Field>
        <Field label="Estatura (cm)" htmlFor={`${uid}-est`}>
          <TextInput
            id={`${uid}-est`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={form.estaturaEnCm}
            onChange={setText("estaturaEnCm")}
            placeholder="178.5"
          />
        </Field>
      </div>

      {/* Chips de disciplinas */}
      <Field label="Disciplinas" htmlFor="">
        {disciplinasDisponibles.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            El club aún no tiene disciplinas registradas. Agrega al menos una
            en “Datos del equipo” primero.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Disciplinas del deportista"
            className="flex flex-wrap gap-2"
          >
            {disciplinasDisponibles.map((d) => {
              const selected = form.records[d.uuid] !== undefined;
              return (
                <button
                  key={d.uuid}
                  type="button"
                  onClick={() => toggleDisciplina(d.uuid)}
                  aria-pressed={selected}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
                    selected
                      ? "border-[color:var(--corner)] bg-[color:var(--corner)] text-white"
                      : "border-[color:var(--control-border)] bg-white text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  {selected && <Check size={13} aria-hidden="true" />}
                  {d.nombre}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      {/* Records por disciplina */}
      {selectedUuids.length > 0 && (
        <fieldset className="m-0 mb-[18px] min-w-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-medium">
            Récord por disciplina <span className="text-[color:var(--muted)]">(V / D / E)</span>
          </legend>
          <div className="flex flex-col gap-2">
            {selectedUuids.map((uuid) => {
              const nombre = discByUuid.get(uuid) ?? "Disciplina";
              return (
                <div
                  key={uuid}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[2px] border border-[color:var(--line)] bg-white px-3 py-2"
                >
                  <span className="truncate text-sm font-medium">{nombre}</span>
                  <div className="flex items-center gap-1.5">
                    {(["v", "d", "e"] as const).map((field) => (
                      <div key={field} className="flex items-center gap-1">
                        <label
                          htmlFor={`${uid}-${uuid}-${field}`}
                          className="text-[11px] font-semibold uppercase text-[color:var(--muted)]"
                        >
                          {field}
                        </label>
                        <input
                          id={`${uid}-${uuid}-${field}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={form.records[uuid][field]}
                          onChange={(e) =>
                            setRecordField(uuid, field, e.target.value)
                          }
                          className="w-14 rounded-[2px] border border-[color:var(--control-border)] bg-white px-1.5 py-1 text-sm text-center outline outline-2 outline-transparent focus:border-[color:var(--corner)]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Record total */}
      <div className="mb-5 flex items-center justify-between rounded-[2px] border border-dashed border-[color:var(--control-border)] px-3 py-2 text-sm">
        <span className="text-[color:var(--muted)]">Récord total</span>
        <span className="inline-flex items-center rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)]">
          {formatearRecord(total)}
        </span>
      </div>

      <div className="mt-6 flex gap-2.5">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {isEdit ? "Guardar cambios" : "Agregar deportista"}
        </Button>
      </div>
    </form>
  );
}