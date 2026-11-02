"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Button from "../ui/Button";
import type {
  ClubDraftData,
  DisciplinaOption,
  RegionOption,
  RolUsuario,
  SuperAdminClub,
  SuperAdminUser,
  SuperAdminUserDraft,
} from "@/components/backoffice/types/superadmin";

type Props = {
  initial: SuperAdminUser | null;
  clubes: SuperAdminClub[];
  disciplinasDisponibles: DisciplinaOption[];
  regiones: RegionOption[];
  onSave: (draft: SuperAdminUserDraft) => void | Promise<void>;
  onCancel: () => void;
};

const ROLES: { value: RolUsuario; label: string; desc: string }[] = [
  {
    value: "ADMIN_CLUB",
    label: "Administrador de club",
    desc: "Gestiona un club. Se crea el club junto con el usuario.",
  },
  {
    value: "COACH_CLUB",
    label: "Entrenador de club",
    desc: "Se asigna a un club existente.",
  },
  {
    value: "ADMIN",
    label: "Super administrador",
    desc: "Acceso total al sistema.",
  },
];

const inputCls =
  "w-full rounded-[2px] border border-[color:var(--control-border,#cbd5e1)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--corner)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)]";
const labelCls = "flex flex-col gap-1";
const spanCls = "text-[13px] font-medium text-[color:var(--ink-soft)]";
const legendCls =
  "mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--muted)]";

export default function SuperAdminUserForm({
  initial,
  clubes,
  disciplinasDisponibles,
  regiones,
  onSave,
  onCancel,
}: Props) {
  const uid = useId();
  const isEdit = Boolean(initial);

  const clubActual = useMemo(
    () => (initial?.clubUuid ? clubes.find((c) => c.uuid === initial.clubUuid) ?? null : null),
    [initial, clubes]
  );

  /* ---- User ---- */
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [rol, setRol] = useState<RolUsuario>(initial?.rol ?? "ADMIN_CLUB");

  /* ---- Club (ADMIN_CLUB) ---- */
  const [clubNombre, setClubNombre] = useState(clubActual?.nombre ?? "");
  const [clubDescripcion, setClubDescripcion] = useState(clubActual?.descripcion ?? "");
  const [clubTelefono, setClubTelefono] = useState(clubActual?.telefono ?? "");
  const [clubCorreo, setClubCorreo] = useState(clubActual?.correo ?? "");
  const [clubUrlFoto, setClubUrlFoto] = useState(clubActual?.urlFoto ?? "");
  const [clubFechaFundacion, setClubFechaFundacion] = useState(clubActual?.fechaFundacion ?? "");
  const [clubDisciplinas, setClubDisciplinas] = useState<string[]>(
    clubActual?.disciplinas ?? []
  );
  const [clubRegion, setClubRegion] = useState(clubActual?.region ?? "");
  const [clubComuna, setClubComuna] = useState(clubActual?.comuna ?? "");

  /* ---- Club (COACH_CLUB) ---- */
  const [existingClubUuid, setExistingClubUuid] = useState(
    initial?.rol === "COACH_CLUB" && initial.clubUuid ? initial.clubUuid : ""
  );

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const comunasDisponibles = useMemo(() => {
    const r = regiones.find((x) => x.nombre === clubRegion);
    return r?.comunas ?? [];
  }, [regiones, clubRegion]);

  const toggleDisciplina = (uuid: string) => {
    setClubDisciplinas((prev) =>
      prev.includes(uuid) ? prev.filter((x) => x !== uuid) : [...prev, uuid]
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("Ingresa un correo válido.");
    if (!isEdit && password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password && password !== password2)
      return setError("Las contraseñas no coinciden.");

    if (rol === "ADMIN_CLUB") {
      if (!clubNombre.trim())
        return setError("El nombre del club es obligatorio.");
      if (clubDisciplinas.length === 0)
        return setError("Selecciona al menos una disciplina para el club.");
      if (clubCorreo && !/^\S+@\S+\.\S+$/.test(clubCorreo.trim()))
        return setError("El correo del club no es válido.");
    }
    if (rol === "COACH_CLUB") {
      if (!existingClubUuid)
        return setError("Selecciona un club para el entrenador.");
    }

    setGuardando(true);
    try {
      const clubData: ClubDraftData | null =
        rol === "ADMIN_CLUB"
          ? {
              nombre: clubNombre.trim(),
              descripcion: clubDescripcion.trim() || null,
              telefono: clubTelefono.trim() || null,
              correo: clubCorreo.trim().toLowerCase() || null,
              urlFoto: clubUrlFoto.trim() || null,
              fechaFundacion: clubFechaFundacion || null,
              disciplinas: clubDisciplinas,
              region: clubRegion || null,
              comuna: clubComuna || null,
            }
          : null;

      void onSave({
        id: initial?.id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: password || undefined,
        rol,
        clubData,
        existingClubUuid: rol === "COACH_CLUB" ? existingClubUuid : null,
      });
    } catch {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
        >
          {error}
        </p>
      )}

      {/* -------------------------- Usuario -------------------------- */}
      <fieldset className="flex flex-col gap-3.5">
        <legend className={legendCls}>Datos del usuario</legend>

        <label className={labelCls}>
          <span className={spanCls}>Nombre completo</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
            placeholder="Ej: Camila Pérez"
            autoFocus
            maxLength={100}
          />
        </label>

        <label className={labelCls}>
          <span className={spanCls}>Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="usuario@club.cl"
            maxLength={100}
          />
        </label>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className={labelCls}>
            <span className={spanCls}>
              Contraseña{" "}
              {isEdit && (
                <em className="font-normal text-[color:var(--muted)]">
                  (dejar vacío para no cambiar)
                </em>
              )}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
              minLength={isEdit ? undefined : 8}
            />
          </label>
          <label className={labelCls}>
            <span className={spanCls}>Confirmar contraseña</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </label>
        </div>

        <label className={labelCls}>
          <span className={spanCls}>Rol</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolUsuario)}
            className={inputCls}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="mt-1 text-[12px] text-[color:var(--muted)]">
            {ROLES.find((r) => r.value === rol)?.desc}
          </span>
        </label>
      </fieldset>

      {/* -------------------- Club (ADMIN_CLUB) ---------------------- */}
      {rol === "ADMIN_CLUB" && (
        <fieldset className="flex flex-col gap-3.5 border-t border-[color:var(--line)] pt-4">
          <legend className={legendCls}>
            Club que administrará
            {clubActual && (
              <span className="ml-1 rounded-[2px] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[11px] font-normal normal-case tracking-normal text-[color:var(--ink-soft)]">
                Existente
              </span>
            )}
          </legend>

          <label className={labelCls}>
            <span className={spanCls}>Nombre del club</span>
            <input
              type="text"
              value={clubNombre}
              onChange={(e) => setClubNombre(e.target.value)}
              className={inputCls}
              placeholder="Ej: Boxeo Talca"
              maxLength={100}
            />
          </label>

          <label className={labelCls}>
            <span className={spanCls}>Descripción</span>
            <textarea
              value={clubDescripcion ?? ""}
              onChange={(e) => setClubDescripcion(e.target.value)}
              className={`${inputCls} min-h-[60px] resize-y`}
              placeholder="Breve descripción del club"
              maxLength={255}
            />
          </label>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className={labelCls}>
              <span className={spanCls}>Teléfono</span>
              <input
                type="tel"
                value={clubTelefono ?? ""}
                onChange={(e) => setClubTelefono(e.target.value)}
                className={inputCls}
                placeholder="+56 9 ..."
                maxLength={20}
              />
            </label>
            <label className={labelCls}>
              <span className={spanCls}>Correo del club</span>
              <input
                type="email"
                value={clubCorreo ?? ""}
                onChange={(e) => setClubCorreo(e.target.value)}
                className={inputCls}
                placeholder="contacto@club.cl"
                maxLength={100}
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className={labelCls}>
              <span className={spanCls}>Fecha de fundación</span>
              <input
                type="date"
                value={clubFechaFundacion ?? ""}
                onChange={(e) => setClubFechaFundacion(e.target.value)}
                className={inputCls}
                max={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className={labelCls}>
              <span className={spanCls}>
                URL de la foto{" "}
                <em className="font-normal text-[color:var(--muted)]">
                  (opcional)
                </em>
              </span>
              <input
                type="url"
                value={clubUrlFoto ?? ""}
                onChange={(e) => setClubUrlFoto(e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className={labelCls}>
              <span className={spanCls}>Región</span>
              <select
                value={clubRegion}
                onChange={(e) => {
                  setClubRegion(e.target.value);
                  setClubComuna("");
                }}
                className={inputCls}
              >
                <option value="">— Sin región —</option>
                {regiones.map((r) => (
                  <option key={r.uuid} value={r.nombre}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              <span className={spanCls}>Comuna</span>
              <select
                value={clubComuna}
                onChange={(e) => setClubComuna(e.target.value)}
                className={inputCls}
                disabled={!clubRegion}
              >
                <option value="">— Sin comuna —</option>
                {comunasDisponibles.map((c) => (
                  <option key={c.uuid} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={spanCls}>Disciplinas</span>
            <div className="flex flex-wrap gap-1.5">
              {disciplinasDisponibles.map((d) => {
                const checked = clubDisciplinas.includes(d.uuid);
                return (
                  <button
                    key={d.uuid}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleDisciplina(d.uuid)}
                    className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                      checked
                        ? "border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] text-[color:var(--corner)]"
                        : "border-[color:var(--control-border,#cbd5e1)] bg-white text-[color:var(--ink-soft)] hover:border-[color:var(--corner)]"
                    }`}
                  >
                    {d.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>
      )}

      {/* -------------------- Club (COACH_CLUB) --------------------- */}
      {rol === "COACH_CLUB" && (
        <fieldset className="flex flex-col gap-3.5 border-t border-[color:var(--line)] pt-4">
          <legend className={legendCls}>Club al que pertenece</legend>
          <label className={labelCls} htmlFor={`${uid}-club`}>
            <span className={spanCls}>Club existente</span>
            <select
              id={`${uid}-club`}
              value={existingClubUuid}
              onChange={(e) => setExistingClubUuid(e.target.value)}
              className={inputCls}
            >
              <option value="">— Selecciona un club —</option>
              {clubes.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.nombre}
                  {[c.comuna, c.region].filter(Boolean).length
                    ? ` · ${[c.comuna, c.region].filter(Boolean).join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando
            ? "Guardando…"
            : isEdit
            ? "Guardar cambios"
            : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}