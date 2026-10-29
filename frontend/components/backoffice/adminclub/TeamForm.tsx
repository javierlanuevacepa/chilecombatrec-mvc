"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check } from "lucide-react";
import type { Team } from "@/components/backoffice/types/team";
import Button from "@/components/backoffice/ui/Button";
import Field from "@/components/backoffice/ui/Field";
import TextInput from "@/components/backoffice/ui/TextInput";
import Photo from "@/components/backoffice/ui/Photo";
import type { DisciplinaOption } from "./CoachForm";

/** Límites según la tabla `club`. */
const NOMBRE_MAX = 100;
const DESCRIPCION_MAX = 255;
const CORREO_MAX = 100;
const TELEFONO_MAX = 20;

/**
 * Valor que entrega el formulario. Extiende `Team` (name, phone, photo)
 * con el resto de los campos editables del club.
 * `foundationDate` va en formato YYYY-MM-DD.
 * `disciplinas` es la lista de uuids que el club entrena.
 */
export type TeamInput = Team & {
  description: string | null;
  foundationDate: string | null;
  email: string | null;
  disciplinas: string[];
};

type FieldKey = "name" | "email" | "foundationDate" | "description";
type Errors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fecha de hoy en hora local, como YYYY-MM-DD (para el `max` del input date). */
function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function TeamForm({
  initial,
  disciplinasDisponibles,
  onSave,
  onCancel,
}: {
  initial: TeamInput;
  /** Catálogo de disciplinas que se pueden asignar al club. */
  disciplinasDisponibles: DisciplinaOption[];
  onSave: (team: TeamInput) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const ids: Record<FieldKey | "phone", string> = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    phone: `${uid}-phone`,
    foundationDate: `${uid}-foundation`,
    description: `${uid}-description`,
  };

  const [form, setForm] = useState({
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    photo: initial.photo ?? null,
    description: initial.description ?? "",
    foundationDate: (initial.foundationDate ?? "").slice(0, 10),
    email: initial.email ?? "",
    disciplinas: initial.disciplinas ?? [],
  });
  const [errors, setErrors] = useState<Errors>({});

  const set =
    (key: "name" | "email" | "phone" | "foundationDate") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const setDescription = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, description: value }));
    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((f) => ({ ...f, photo: url }));
    }
  };

  const toggleDisciplina = (uuid: string) => {
    setForm((f) => ({
      ...f,
      disciplinas: f.disciplinas.includes(uuid)
        ? f.disciplinas.filter((d) => d !== uuid)
        : [...f.disciplinas, uuid],
    }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) next.name = "Ingresa el nombre del equipo.";
    else if (name.length > NOMBRE_MAX)
      next.name = `Máximo ${NOMBRE_MAX} caracteres.`;

    if (email && (!EMAIL_RE.test(email) || email.length > CORREO_MAX))
      next.email = "Ingresa un correo válido.";

    if (form.foundationDate && form.foundationDate > hoyISO())
      next.foundationDate = "La fecha de fundación no puede ser futura.";

    if (form.description.trim().length > DESCRIPCION_MAX)
      next.description = `Máximo ${DESCRIPCION_MAX} caracteres.`;

    return next;
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);

    const firstInvalid = (
      ["name", "email", "foundationDate", "description"] as FieldKey[]
    ).find((k) => found[k]);
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }

    onSave({
      ...initial,
      name: form.name.trim(),
      phone: form.phone.trim(),
      photo: form.photo,
      description: form.description.trim() || null,
      foundationDate: form.foundationDate || null,
      email: form.email.trim().toLowerCase() || null,
      disciplinas: form.disciplinas,
    });
  };

  const a11y = (key: FieldKey) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${ids[key]}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-5 flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[2px] border border-dashed border-[color:var(--control-border)] bg-[color:var(--surface-2)]">
          {form.photo ? (
            <Photo src={form.photo} alt="Foto del equipo" />
          ) : (
            <Camera size={20} aria-hidden="true" className="text-[color:var(--muted)]" />
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[color:var(--ink)] px-3.5 py-2 text-sm font-semibold text-[color:var(--ink)] [font-family:var(--font-sans-stack)] hover:bg-[color:var(--surface-2)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--corner)]">
          <Camera size={14} aria-hidden="true" />
          Cambiar foto
          <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
        </label>
      </div>

      <Field label="Nombre del equipo o escuela" htmlFor={ids.name} error={errors.name}>
        <TextInput
          id={ids.name}
          value={form.name}
          onChange={set("name")}
          maxLength={NOMBRE_MAX}
          placeholder="Team Fénix MMA"
          {...a11y("name")}
        />
      </Field>

      <Field label="Descripción (opcional)" htmlFor={ids.description} error={errors.description}>
        <textarea
          id={ids.description}
          value={form.description}
          onChange={setDescription}
          rows={3}
          maxLength={DESCRIPCION_MAX}
          placeholder="Cuenta en pocas palabras qué hace tu equipo."
          {...a11y("description")}
          className="w-full resize-y rounded-[2px] border border-[color:var(--control-border)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] [font-family:var(--font-sans-stack)] placeholder:text-[color:var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)]"
        />
        <p className="mt-1 text-right text-xs text-[color:var(--muted)]">
          {form.description.length}/{DESCRIPCION_MAX}
        </p>
      </Field>

      <Field label="Correo institucional (opcional)" htmlFor={ids.email} error={errors.email}>
        <TextInput
          id={ids.email}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          maxLength={CORREO_MAX}
          placeholder="contacto@club.cl"
          {...a11y("email")}
        />
      </Field>

      <Field label="Teléfono de contacto" htmlFor={ids.phone}>
        <TextInput
          id={ids.phone}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={set("phone")}
          maxLength={TELEFONO_MAX}
          placeholder="+56 9 ...."
        />
      </Field>

      <Field
        label="Fecha de fundación (opcional)"
        htmlFor={ids.foundationDate}
        error={errors.foundationDate}
      >
        <TextInput
          id={ids.foundationDate}
          type="date"
          value={form.foundationDate}
          onChange={set("foundationDate")}
          max={hoyISO()}
          {...a11y("foundationDate")}
        />
      </Field>

      <Field label="Disciplinas" htmlFor="">
        {disciplinasDisponibles.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            No hay disciplinas disponibles para asignar.
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Disciplinas que ofrece el club"
              className="flex flex-wrap gap-2"
            >
              {disciplinasDisponibles.map((d) => {
                const selected = form.disciplinas.includes(d.uuid);
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
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Los coaches y estudiantes solo pueden elegir entre las disciplinas
              que marques aquí.
            </p>
          </>
        )}
      </Field>

      <div className="mt-6 flex gap-2.5">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}