"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Phone,
  Swords,
  Users,
} from "lucide-react";

import Avatar from "@/components/backoffice/ui/Avatar";
import Button from "../ui/Button";
import Panel from "../ui/Panel";

import EmptyState from "@/components/backoffice/adminclub/EmptyState";

import { Student } from "@/components/backoffice/types/student";

import { useMiClub } from "@/lib/hooks/useMiClub";
import { useRivales } from "@/lib/hooks/useRivales";
import { mapDeportistaToStudent } from  "@/lib/mappers/club.mappers";

/* -------------------------------------------------------------------------- */

/** Ajusta a la ruta real del login y al nombre del segmento dinámico ([id]). */
const LOGIN_ROUTE = "/backoffice/login";

/* ------------------------- Datos del deportista -------------------------- */

const nombreCompleto = (s: Student): string =>
  [s.pNombre, s.sNombre, s.pApellido, s.sApellido].filter(Boolean).join(" ");

/** Edad en años a partir de fecha_nacimiento (YYYY-MM-DD). */
function yearsSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const now = new Date();
  let years = now.getFullYear() - y;
  const mDiff = now.getMonth() - mo;
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < d)) years--;
  return years >= 0 ? years : null;
}

function formatDateDMY(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** 18432109 + "5" -> 18.432.109-5. Devuelve null si no hay RUT. */
function formatearRut(
  rut: string | null | undefined,
  dv: string | null | undefined
): string | null {
  const cuerpo = (rut ?? "").replace(/\D/g, "");
  if (!cuerpo) return null;
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${conPuntos}-${dv.toUpperCase()}` : conPuntos;
}

const formatearNumero = (n: number, unidad: string) =>
  `${n.toLocaleString("es-CL", { maximumFractionDigits: 2 })} ${unidad}`;

const etiquetaGenero = (g: string | null | undefined): string | null => {
  if (!g) return null;
  const c = g.toUpperCase();
  if (c === "M") return "Masculino";
  if (c === "F") return "Femenino";
  return g;
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/* -------------------------------------------------------------------------- */
/* Detalle de estudiante                                                       */
/* -------------------------------------------------------------------------- */

export default function EstudianteDetalleModulo() {
  const router = useRouter();
  const uid = useId();

  const params = useParams<{ id?: string | string[] }>();
  const rawId = params?.id;
  const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { club, usuario, cargando, error, sinClub, refrescar } = useMiClub();
  const { rivales, buscando, error: errorRivales, buscar, limpiar } =
    useRivales();

  /* ------------------------- UI local ------------------------------------- */
  const [disciplinaSel, setDisciplinaSel] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* -------------------- Deportista desde el club -------------------------- */
  const student: Student | null = useMemo(() => {
    const d = club?.deportistas.find((x) => x.uuid === studentId);
    return d ? mapDeportistaToStudent(d) : null;
  }, [club, studentId]);

  /* --------------------- Redirección si no hay sesión --------------------- */
  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace(LOGIN_ROUTE);
    }
  }, [cargando, usuario, router]);

  const volver = () => router.back();

  /* ---------------------------------------------------------------------- */
  /* Estados del hook                                                        */
  /* ---------------------------------------------------------------------- */

  if (cargando) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--surface)] px-6">
        <p className="text-sm text-[color:var(--muted)]">Cargando ficha…</p>
      </div>
    );
  }

  if (!usuario) return null;

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[color:var(--surface)] px-6 text-center">
        <AlertCircle
          size={36}
          aria-hidden="true"
          className="text-[color:var(--corner)]"
        />
        <div>
          <p className="text-base font-medium">No pudimos cargar el club</p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)]">
            {error}
          </p>
        </div>
        <Button onClick={() => void refrescar()}>Reintentar</Button>
      </div>
    );
  }

  if (sinClub || !club || !student) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[color:var(--surface)] px-6 text-center">
        <AlertCircle
          size={36}
          aria-hidden="true"
          className="text-[color:var(--corner)]"
        />
        <div>
          <p className="text-base font-medium">Deportista no encontrado</p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)]">
            No existe un deportista con ese identificador en tu club, o ya no
            está registrado.
          </p>
        </div>
        <Button variant="ghost" onClick={volver}>
          <ArrowLeft size={14} aria-hidden="true" />
          Volver
        </Button>
      </div>
    );
  }

  /* ----------------------- Valores derivados para la UI ------------------- */
  const nombre = nombreCompleto(student);
  const edad = yearsSince(student.fechaNacimiento);
  const nacimiento = formatDateDMY(student.fechaNacimiento);
  const rut = formatearRut(student.rut, student.digitoVerif);

  const disciplinaActiva =
    student.disciplinas.find((d) => d.uuid === disciplinaSel) ??
    student.disciplinas[0] ??
    null;

  const recordActivo = disciplinaActiva
    ? student.records.find((r) => r.disciplina_uuid === disciplinaActiva.uuid)
    : undefined;
  const victorias = recordActivo?.v ?? 0;
  const derrotas = recordActivo?.d ?? 0;
  const empates = recordActivo?.e ?? 0;
  const totalCombates = victorias + derrotas + empates;

  const stats = [
    { label: "Victorias", value: String(victorias), accent: true },
    { label: "Derrotas", value: String(derrotas), accent: false },
    { label: "Empates", value: String(empates), accent: false },
    { label: "Total", value: String(totalCombates), accent: false },
  ];

  const datos = [
    {
      label: "Fecha de nacimiento",
      value: nacimiento
        ? `${nacimiento}${edad !== null ? ` (${edad} ${edad === 1 ? "año" : "años"})` : ""}`
        : null,
    },
    {
      label: "Peso",
      value: student.pesoEnKg > 0 ? formatearNumero(student.pesoEnKg, "kg") : null,
    },
    {
      label: "Estatura",
      value:
        student.estaturaEnCm != null
          ? formatearNumero(student.estaturaEnCm, "cm")
          : null,
    },
    { label: "Género", value: etiquetaGenero(student.genero) },
    { label: "Nacionalidad", value: student.nacionalidad || null },
    { label: "RUT", value: rut, mono: true },
  ].filter((x) => x.value);

  /* ------------------------------ Acciones -------------------------------- */
  const seleccionarDisciplina = (uuid: string) => {
    setDisciplinaSel(uuid);
    limpiar();
  };

  const onTabKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    ev.preventDefault();
    const lista = student.disciplinas;
    const actual = lista.findIndex((x) => x.uuid === disciplinaActiva?.uuid);
    const paso = ev.key === "ArrowRight" ? 1 : -1;
    const siguiente = lista[(actual + paso + lista.length) % lista.length];
    seleccionarDisciplina(siguiente.uuid);
    tabRefs.current[siguiente.uuid]?.focus();
  };

  const handleBuscar = () => {
    if (!disciplinaActiva) return;
    void buscar({
      deportistaId: student.id,
      disciplinaUuid: disciplinaActiva.uuid,
      disciplinaNombre: disciplinaActiva.nombre,
      genero: student.genero,
      pesoEnKg: student.pesoEnKg,
      totalCombates,
    });
  };

  return (
    <div className="min-h-[100dvh] text-[color:var(--ink)] [--control-border:#7c8a9c] [background-image:repeating-linear-gradient(125deg,rgba(20,35,58,0.028)_0,rgba(20,35,58,0.028)_1px,transparent_1px,transparent_64px)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--line)] bg-[rgba(238,241,245,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-6 py-3 max-[480px]:px-4">
          <Button variant="ghost" size="sm" onClick={volver}>
            <ArrowLeft size={14} aria-hidden="true" />
            Volver
          </Button>
          <span className="text-[17px] uppercase leading-none tracking-[0.01em] text-[color:var(--ink)] [font-family:var(--font-display-stack)]">
            ChileCombat<span className="text-[color:var(--corner)]">Rec</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-6 pb-10 pt-9 max-[480px]:px-4 max-[480px]:pb-[30px] max-[480px]:pt-7">
        {/* Perfil */}
        <section className="flex items-center gap-4 max-[480px]:items-start">
          <Avatar name={nombre} className="h-16 w-16 shrink-0 text-2xl" />
          <div className="min-w-0">
            {student.disciplinas.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {student.disciplinas.map((x) => (
                  <li
                    key={x.uuid}
                    className="rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)]"
                  >
                    {x.nombre}
                  </li>
                ))}
              </ul>
            )}
            <h1 className="mt-1 text-[clamp(26px,5vw,32px)] font-normal leading-[1.05] tracking-[0.005em] text-[color:var(--ink)] [font-family:var(--font-display-stack)]">
              {nombre}
            </h1>
            {student.alias && (
              <p className="mt-1 text-[15px] text-[color:var(--ink-soft)]">
                “{student.alias}”
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--muted)]">
              <Users size={14} aria-hidden="true" />
              {club.nombre}
            </p>
          </div>
        </section>

        {/* Datos del deportista */}
        {datos.length > 0 && (
          <section aria-label="Datos del deportista" className="mt-7">
            <Panel innerClassName="px-[18px] py-4">
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4 max-[640px]:grid-cols-2 max-[400px]:grid-cols-1">
                {datos.map((x) => (
                  <div key={x.label} className="min-w-0">
                    <dt className="text-[13px] text-[color:var(--muted)]">
                      {x.label}
                    </dt>
                    <dd
                      className={`mt-0.5 truncate text-[15px] font-medium ${
                        "mono" in x && x.mono
                          ? "[font-family:var(--font-mono-stack)]"
                          : ""
                      }`}
                    >
                      {x.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </section>
        )}

        {/* Récord */}
        <section aria-labelledby={`${uid}-record`} className="mt-9">
          <h2
            id={`${uid}-record`}
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
          >
            <Swords
              size={18}
              aria-hidden="true"
              className="text-[color:var(--corner)]"
            />
            {disciplinaActiva ? `Récord en ${disciplinaActiva.nombre}` : "Récord"}
          </h2>

          {student.disciplinas.length > 1 && (
            <div
              role="tablist"
              aria-label="Disciplina"
              onKeyDown={onTabKeyDown}
              className="mb-5 flex flex-wrap gap-1 border-b border-[color:var(--line)]"
            >
              {student.disciplinas.map((x) => {
                const activa = x.uuid === disciplinaActiva?.uuid;
                return (
                  <button
                    key={x.uuid}
                    ref={(el) => {
                      tabRefs.current[x.uuid] = el;
                    }}
                    id={`${uid}-tab-${x.uuid}`}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    aria-controls={`${uid}-panel`}
                    tabIndex={activa ? 0 : -1}
                    onClick={() => seleccionarDisciplina(x.uuid)}
                    className={`-mb-px cursor-pointer border-b-2 bg-transparent px-3 pb-3 pt-2.5 text-[15px] font-medium transition-colors duration-150 [font-family:var(--font-sans-stack)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none ${
                      activa
                        ? "border-[color:var(--corner)] text-[color:var(--ink)]"
                        : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--ink)]"
                    }`}
                  >
                    {x.nombre}
                  </button>
                );
              })}
            </div>
          )}

          <div
            id={`${uid}-panel`}
            role={student.disciplinas.length > 1 ? "tabpanel" : undefined}
            aria-labelledby={
              student.disciplinas.length > 1 && disciplinaActiva
                ? `${uid}-tab-${disciplinaActiva.uuid}`
                : undefined
            }
          >
            {disciplinaActiva ? (
              <>
                <Panel innerClassName="">
                  <dl className="grid grid-cols-4 divide-x divide-dashed divide-[color:var(--line)] max-[560px]:grid-cols-2 max-[560px]:gap-y-1 max-[560px]:divide-x-0">
                    {stats.map((s) => (
                      <div key={s.label} className="px-4 py-4 text-center">
                        <dd
                          className={`text-xl font-medium [font-family:var(--font-mono-stack)] ${
                            s.accent
                              ? "text-[color:var(--corner)]"
                              : "text-[color:var(--ink)]"
                          }`}
                        >
                          {s.value}
                        </dd>
                        <dt className="mt-1 text-[13px] text-[color:var(--muted)]">
                          {s.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                </Panel>
                <p className="mt-2 text-[13px] text-[color:var(--muted)]">
                  Récord anterior a la plataforma.
                </p>

                <Button 
                  className="mt-6"
                  onClick={handleBuscar}
                  disabled={true}
                >
                  {buscando ? "Buscando rivales…" : "Encontrar rival"}
                </Button>
              </>
            ) : (
              <EmptyState>
                Este deportista todavía no tiene disciplinas ni récord
                registrados.
              </EmptyState>
            )}
          </div>
        </section>

        {/* Rivales sugeridos */}
        <section aria-live="polite" className="mt-8">
          {errorRivales && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              <span>{errorRivales}</span>
              <Button variant="ghost" size="sm" onClick={handleBuscar}  >
                Reintentar
              </Button>
            </div>
          )}

          {rivales && disciplinaActiva && (
            <>
              <h2 className="text-lg font-semibold">
                Rivales sugeridos en {disciplinaActiva.nombre}
              </h2>
              <p className="mb-4 mt-1 text-sm text-[color:var(--muted)]">
                De otras escuelas, con experiencia similar.
              </p>

              {rivales.length === 0 ? (
                <EmptyState>
                  No se encontraron rivales de otras escuelas en esta
                  disciplina.
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {rivales.map((r) => {
                    const total = r.record.v + r.record.d + r.record.e;
                    return (
                      <li
                        key={r.id}
                        className="border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium">
                              {r.nombre}
                            </p>
                            <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                              {r.clubNombre}
                            </p>
                          </div>
                          <span className="inline-block rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)]">
                            {r.disciplinaNombre}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--muted)]">
                          <span>{formatearNumero(r.pesoEnKg, "kg")}</span>
                          <span className="text-[color:var(--ink)] [font-family:var(--font-mono-stack)]">
                            {r.record.v}-{r.record.d}-{r.record.e}
                          </span>
                          <span>
                            {total} {total === 1 ? "combate" : "combates"}
                          </span>
                        </div>

                        {r.clubTelefono && (
                          <a
                            href={telHref(r.clubTelefono)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-[color:var(--ink-soft)] underline underline-offset-[3px] [font-family:var(--font-mono-stack)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)]"
                          >
                            <Phone size={13} aria-hidden="true" />
                            {r.clubTelefono}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
