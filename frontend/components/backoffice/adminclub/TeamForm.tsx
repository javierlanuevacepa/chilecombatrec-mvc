import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type SetStateAction,
} from "react";
import {
  Camera,
  ChevronDown,
  LogOut,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Swords,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {Team} from "@/components/backoffice/types/team";
import Button from "@/components/backoffice/ui/Button";
import Field from "@/components/backoffice/ui/Field";
import TextInput from "@/components/backoffice/ui/TextInput";
import Photo from "@/components/backoffice/ui/Photo";



export default function TeamForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Team;
  onSave: (team: Team) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const phoneId = `${uid}-phone`;

  const [form, setForm] = useState<Team>(initial);
  const [error, setError] = useState("");

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((f) => ({ ...f, photo: url }));
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Ingresa el nombre del equipo.");
      return;
    }
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <form onSubmit={submit}>
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

      <Field label="Nombre del equipo o escuela" htmlFor={nameId} error={error}>
        <TextInput
          id={nameId}
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }));
            if (error) setError("");
          }}
          placeholder="Team Fénix MMA"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${nameId}-error` : undefined}
        />
      </Field>

      <Field label="Teléfono de contacto" htmlFor={phoneId}>
        <TextInput
          id={phoneId}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="+56 9 ...."
        />
      </Field>

      <div className="mt-6 flex gap-2.5">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}
