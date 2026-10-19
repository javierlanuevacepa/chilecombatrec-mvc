"use client";

import { FormEvent, useId, useState } from "react";
import { Check } from "lucide-react";
import Button from "@/components/backoffice/ui/Button";
import Field from "@/components/backoffice/ui/Field";
import TextInput from "@/components/backoffice/ui/TextInput";
import { CoachDraft } from "@/components/backoffice/types/coachdrafts";

export type DisciplinaOption = {
  uuid: string;
  nombre: string;
};

export default function CoachForm({
  initial,
  disciplinasDisponibles,
  onSave,
  onCancel,
}: {
  initial: CoachDraft | null;
  disciplinasDisponibles: DisciplinaOption[];
  onSave: (coach: CoachDraft) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const phoneId = `${uid}-phone`;
  const passId = `${uid}-pass`;
  const errorId = `${uid}-error`;

  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState<CoachDraft>(
    initial ?? {
      name: "",
      email: "",
      phone: "",
      password: "",
      disciplinas: [],
    }
  );
  const [error, setError] = useState("");

  const set = (key: "name" | "email" | "phone" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (error) setError("");
    };

  const toggleDisciplina = (uuid: string) => {
    setForm((f) => {
      const selected = f.disciplinas.includes(uuid);
      return {
        ...f,
        disciplinas: selected
          ? f.disciplinas.filter((d) => d !== uuid)
          : [...f.disciplinas, uuid],
      };
    });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Ingresa el nombre del coach.");
      return;
    }
    if (!form.email.trim()) {
      setError("Ingresa el correo del coach.");
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password?.trim() ? form.password : undefined,
    });
  };

  return (
    <form onSubmit={submit}>
      <Field
        label="Nombre completo"
        htmlFor={nameId}
        error={error || undefined}
      >
        <TextInput
          id={nameId}
          value={form.name}
          onChange={set("name")}
          placeholder="Nombre del coach"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </Field>

      <Field label="Correo" htmlFor={emailId}>
        <TextInput
          id={emailId}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          placeholder="correo@club.cl"
        />
      </Field>

      <Field label="Teléfono" htmlFor={phoneId}>
        <TextInput
          id={phoneId}
          type="tel"
          autoComplete="tel"
          value={form.phone ?? ""}
          onChange={set("phone")}
          placeholder="+56 9 ...."
        />
      </Field>

      <Field
        label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña inicial (opcional)"}
        htmlFor={passId}
      >
        <TextInput
          id={passId}
          type="password"
          autoComplete="new-password"
          value={form.password ?? ""}
          onChange={set("password")}
          placeholder="Mínimo 8 caracteres"
        />
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {isEdit
            ? "Déjala vacía para no cambiarla."
            : "Si la dejas vacía, el coach la generará en su primer ingreso."}
        </p>
      </Field>

      <Field label="Disciplinas" htmlFor="">
        {disciplinasDisponibles.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            El club aún no tiene disciplinas registradas. Agrega al menos una
            en “Datos del equipo” primero.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Disciplinas que entrena el coach"
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
        )}
      </Field>

      <div className="mt-6 flex gap-2.5">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}