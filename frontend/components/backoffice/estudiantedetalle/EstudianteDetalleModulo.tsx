"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Swords,
  Users,
} from "lucide-react";

import Avatar from "@/components/backoffice/ui/Avatar";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import Modal from "../ui/Modal";

import EmptyState from "@/components/backoffice/adminclub/EmptyState";

import { Student } from "@/components/backoffice/types/student";

import { useMiClub } from "@/lib/hooks/useMiClub";
import { useDeportistasClub } from "@/lib/hooks/useDeportistasClub";
import { useBusquedaCombate } from "@/lib/hooks/useBusquedaCombate";
import deportistaApi from "@/lib/repository/deportista.api";
import type { BusquedaCombateCandidato } from "@/lib/repository/busqueda.combate.api";
import { mapDeportistaToStudent } from "@/lib/mappers/club.mappers";

/* -------------------------------------------------------------------------- */

const LOGIN_ROUTE = "/backoffice/login";
const LIMITE_CANDIDATOS = 4;

/* ------------------------- Datos del deportista -------------------------- */

const nombreCompleto = (s: Student): string =>
  [s.pNombre, s.sNombre, s.pApellido, s.sApellido].filter(Boolean).join(" ");

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

function leerBooleano(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

function nombreCandidato(c: BusquedaCombateCandidato): string {
  return [c.p_nombre, c.s_nombre, c.p_apellido, c.s_apellido]
    .filter(Boolean)
    .join(" ");
}

/**
 * Extrae el teléfono/correo "del club" del candidato:
 * prioriza los datos institucionales del club; si no hay,
 * toma el primer coach con ese dato.
 */
function contactoClub(c: BusquedaCombateCandidato): {
  clubNombre: string | null;
  telefono: string | null;
  correo: string | null;
  contactoEsCoach: boolean;
} {
  const club = c.clubs[0];
  if (!club) {
    return { clubNombre: null, telefono: null, correo: null, contactoEsCoach: false };
  }

  if (club.telefono || club.correo_institucional) {
    return {
      clubNombre: club.nombre,
      telefono: club.telefono,
      correo: club.correo_institucional,
      contactoEsCoach: false,
    };
  }

  const coachConTel = club.coaches.find((co) => co.telefono);
  const coachConCorreo = club.coaches.find((co) => co.correo);
  const coach = coachConTel ?? coachConCorreo;

  return {
    clubNombre: club.nombre,
    telefono: coach?.telefono ?? null,
    correo: coach?.correo ?? null,
    contactoEsCoach: Boolean(coach),
  };
}

/* -------------------------------------------------------------------------- */

export default function EstudianteDetalleModulo() {
  const router = useRouter();
  const uid = useId();

  const params = useParams<{ id?: string | string[] }>();
  const rawId = params?.id;
  const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { club, usuario, cargando, error, sinClub, refrescar } = useMiClub();
  const deportistasCrud = useDeportistasClub(club?.uuid ?? null, refrescar);

  const {
    candidatos,
    buscando,
    error: errorBusqueda,
    busquedaHecha,
    buscar,
    limpiar: limpiarBusqueda,
  } = useBusquedaCombate();

  /* ------------------------- UI local ------------------------------------- */
  const [disciplinaSel, setDisciplinaSel] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [confirmDesactivar, setConfirmDesactivar] = useState(false);
  const [confirmActivar, setConfirmActivar] = useState(false);

  /* -------------------- Deportista desde el club -------------------------- */
  const deportistaRaw = useMemo(
    () => club?.deportistas.find((x) => x.uuid === studentId) ?? null,
    [club, studentId]
  );

  const student: Student | null = useMemo(
    () => (deportistaRaw ? mapDeportistaToStudent(deportistaRaw) : null),
    [deportistaRaw]
  );

  /* ------------- Aparecer en búsqueda: valor y respaldo -------------------- */
  const busquedaDelClub = leerBooleano(deportistaRaw?.aparecer_busqueda);
  const [busquedaServidor, setBusquedaServidor] = useState<boolean | null>(null);
  const [busquedaCargando, setBusquedaCargando] = useState(true);
  const faltaBusquedaEnClub =
    deportistaRaw != null && busquedaDelClub === undefined;

  useEffect(() => {
    if (!studentId || !faltaBusquedaEnClub) return;
    let activo = true;
    setBusquedaCargando(true);
    deportistaApi
      .buscarPorUuid(studentId)
      .then((d) => {
        if (activo) setBusquedaServidor(leerBooleano(d.aparecer_busqueda) ?? null);
      })
      .catch((err) => {
        console.error("No se pudo leer aparecer_busqueda:", err);
      })
      .finally(() => {
        if (activo) setBusquedaCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [studentId, faltaBusquedaEnClub]);

  /* --------------------- Redirección si no hay sesión --------------------- */
  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace(LOGIN_ROUTE);
    }
  }, [cargando, usuario, router]);

  const volver = () => router.back();

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
        <AlertCircle size={36} aria-hidden="true" className="text-[color:var(--corner)]" />
        <div>
          <p className="text-base font-medium">No pudimos cargar el club</p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)]">{error}</p>
        </div>
        <Button onClick={() => void refrescar()}>Reintentar</Button>
      </div>
    );
  }

  if (sinClub || !club || !student) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[color:var(--surface)] px-6 text-center">
        <AlertCircle size={36} aria-hidden="true" className="text-[color:var(--corner)]" />
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

  const aparecerBusqueda = busquedaServidor ?? busquedaDelClub;
  const busquedaDisponible = aparecerBusqueda !== undefined;
  const busquedaHabilitada = aparecerBusqueda === true;

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
    limpiarBusqueda();
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

  const guardarBusqueda = async (valor: boolean) => {
    const actualizado = await deportistasCrud.cambiarAparecerBusqueda(
      student.id,
      valor
    );
    setBusquedaServidor(leerBooleano(actualizado.aparecer_busqueda) ?? valor);
  };

  const onToggleBusqueda = (ev: ChangeEvent<HTMLInputElement>) => {
    deportistasCrud.limpiarErrorGuardado();
    if (ev.target.checked) {
      setConfirmActivar(true);
      return;
    }
    setConfirmDesactivar(true);
  };

  const cerrarConfirmActivar = () => {
    if (deportistasCrud.guardando) return;
    deportistasCrud.limpiarErrorGuardado();
    setConfirmActivar(false);
  };

  const confirmarActivar = async () => {
    try {
      await guardarBusqueda(true);
      setConfirmActivar(false);
    } catch {
      /* errorGuardado se muestra dentro del modal, que queda abierto */
    }
  };

  const cerrarConfirmDesactivar = () => {
    if (deportistasCrud.guardando) return;
    deportistasCrud.limpiarErrorGuardado();
    setConfirmDesactivar(false);
  };

  const confirmarDesactivar = async () => {
    try {
      await guardarBusqueda(false);
      setConfirmDesactivar(false);
      limpiarBusqueda();
    } catch {
      /* errorGuardado se muestra dentro del modal, que queda abierto */
    }
  };

  const handleBuscar = () => {
    if (!disciplinaActiva) return;
    if (!busquedaHabilitada) return;
    void buscar(student.id, {
      disciplinaUuid: disciplinaActiva.uuid,
      limite: LIMITE_CANDIDATOS,
    }).catch(() => {
      /* el error ya vive en `errorBusqueda` */
    });
  };

  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-[100dvh] text-[color:var(--ink)] [--control-border:#7c8a9c] [background-image:repeating-linear-gradient(125deg,rgba(20,35,58,0.028)_0,rgba(20,35,58,0.028)_1px,transparent_1px,transparent_64px)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--line)] bg-[rgba(238,241,245,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-6 py-3 max-[480px]:px-4 lg:max-w-[1300px] lg:px-10 lg:py-4 xl:max-w-[1500px] 2xl:max-w-[1600px]">
          <Button variant="ghost" size="sm" onClick={volver}>
            <ArrowLeft size={14} aria-hidden="true" />
            Volver
          </Button>
          <span className="text-[17px] uppercase leading-none tracking-[0.01em] text-[color:var(--ink)] [font-family:var(--font-display-stack)] lg:text-[20px]">
            ChileCombat<span className="text-[color:var(--corner)]">Rec</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-6 pb-10 pt-9 max-[480px]:px-4 max-[480px]:pb-[30px] max-[480px]:pt-7 lg:max-w-[1300px] lg:px-10 lg:pb-16 lg:pt-12 xl:max-w-[1500px] 2xl:max-w-[1600px]">
        {/* Perfil */}
        <section className="flex items-center gap-4 max-[480px]:items-start lg:gap-6">
          <Avatar
            name={nombre}
            className="h-16 w-16 shrink-0 text-2xl lg:h-20 lg:w-20 lg:text-3xl"
          />
          <div className="min-w-0">
            {student.disciplinas.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {student.disciplinas.map((x) => (
                  <li
                    key={x.uuid}
                    className="rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)] lg:px-2.5 lg:py-0.5 lg:text-sm"
                  >
                    {x.nombre}
                  </li>
                ))}
              </ul>
            )}
            <h1 className="mt-1 text-[clamp(26px,5vw,32px)] font-normal leading-[1.05] tracking-[0.005em] text-[color:var(--ink)] [font-family:var(--font-display-stack)] lg:text-[clamp(32px,3vw,40px)]">
              {nombre}
            </h1>
            {student.alias && (
              <p className="mt-1 text-[15px] text-[color:var(--ink-soft)] lg:text-base">
                “{student.alias}”
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--muted)] lg:text-base">
              <Users size={14} aria-hidden="true" />
              {club.nombre}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--muted)] lg:text-base">
              Codigo de deportista: {student.codigo_interno}
            </p>
          </div>
        </section>

        {/* Datos del deportista */}
        {datos.length > 0 && (
          <section aria-label="Datos del deportista" className="mt-7 lg:mt-9">
            <Panel innerClassName="px-[18px] py-4 lg:px-6 lg:py-5">
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4 max-[640px]:grid-cols-2 max-[400px]:grid-cols-1 lg:gap-x-8 lg:gap-y-5">
                {datos.map((x) => (
                  <div key={x.label} className="min-w-0">
                    <dt className="text-[13px] text-[color:var(--muted)] lg:text-sm">
                      {x.label}
                    </dt>
                    <dd
                      className={`mt-0.5 truncate text-[15px] font-medium lg:text-base ${
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

        {/* Aparecer en búsqueda */}
        <section aria-label="Visibilidad del deportista" className="mt-4 lg:mt-5">
          <Panel innerClassName="px-[18px] py-4 lg:px-6 lg:py-5">
            <div className="flex items-start gap-3">
              <span className="relative mt-px inline-flex h-6 w-11 shrink-0">
                <input
                  id={`${uid}-busqueda`}
                  type="checkbox"
                  role="switch"
                  checked={aparecerBusqueda === true}
                  onChange={onToggleBusqueda}
                  disabled={!busquedaDisponible || deportistasCrud.guardando}
                  aria-describedby={`${uid}-busqueda-desc`}
                  className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 rounded-full transition-colors duration-200 peer-disabled:opacity-60 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ink)] motion-reduce:transition-none ${
                    busquedaDisponible
                      ? "bg-[color:var(--corner)] peer-checked:bg-[#16a34a]"
                      : "bg-[#9ca3af]"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 peer-checked:translate-x-5 motion-reduce:transition-none"
                />
              </span>
              <div className="min-w-0">
                <label
                  htmlFor={`${uid}-busqueda`}
                  className="cursor-pointer text-[15px] font-medium lg:text-base"
                >
                  Aparecer en algoritmos de búsqueda de combate y ranking
                </label>
                <p
                  id={`${uid}-busqueda-desc`}
                  className="mt-0.5 text-[13px] text-[color:var(--muted)] lg:max-w-[720px] lg:text-sm"
                >
                  Si está activado, el deportista puede ser considerado en la
                  búsqueda de rivales para combates y aparecer en el ranking.
                </p>

                {!busquedaDisponible && (
                  <p className="mt-1 text-[13px] text-[color:var(--muted)] lg:text-sm">
                    {busquedaCargando
                      ? "Cargando…"
                      : "No pudimos leer este dato por ahora."}
                  </p>
                )}
                {deportistasCrud.guardando && !confirmDesactivar && !confirmActivar && (
                  <p role="status" className="mt-1 text-[13px] text-[color:var(--muted)] lg:text-sm">
                    Guardando…
                  </p>
                )}
                {deportistasCrud.errorGuardado && !confirmDesactivar && !confirmActivar && (
                  <p
                    role="alert"
                    className="mt-2 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)] lg:text-base"
                  >
                    {deportistasCrud.errorGuardado}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </section>

        {/* Récord */}
        <section aria-labelledby={`${uid}-record`} className="mt-9 lg:mt-12">
          <h2
            id={`${uid}-record`}
            className="mb-4 flex items-center gap-2 text-lg font-semibold lg:mb-5 lg:text-xl"
          >
            <Swords size={18} aria-hidden="true" className="text-[color:var(--corner)] lg:h-5 lg:w-5" />
            {disciplinaActiva ? `Récord en ${disciplinaActiva.nombre}` : "Récord"}
          </h2>

          {student.disciplinas.length > 1 && (
            <div
              role="tablist"
              aria-label="Disciplina"
              onKeyDown={onTabKeyDown}
              className="mb-5 flex flex-wrap gap-1 border-b border-[color:var(--line)] lg:mb-6"
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
                    className={`-mb-px cursor-pointer border-b-2 bg-transparent px-3 pb-3 pt-2.5 text-[15px] font-medium transition-colors duration-150 [font-family:var(--font-sans-stack)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none lg:px-4 lg:text-base ${
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
                      <div
                        key={s.label}
                        className="px-4 py-4 text-center lg:px-6 lg:py-6"
                      >
                        <dd
                          className={`text-xl font-medium [font-family:var(--font-mono-stack)] lg:text-2xl ${
                            s.accent
                              ? "text-[color:var(--corner)]"
                              : "text-[color:var(--ink)]"
                          }`}
                        >
                          {s.value}
                        </dd>
                        <dt className="mt-1 text-[13px] text-[color:var(--muted)] lg:text-sm">
                          {s.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                </Panel>
                <p className="mt-2 text-[13px] text-[color:var(--muted)] lg:text-sm">
                  Récord anterior a la plataforma.
                </p>

                <Button
                  className="mt-6"
                  onClick={handleBuscar}
                  disabled={!busquedaHabilitada || buscando}
                  title={
                    !busquedaHabilitada
                      ? "Activa 'Aparecer en búsqueda de combate' para poder buscar rivales"
                      : undefined
                  }
                >
                  {buscando ? (
                    <>
                      <Loader2
                        size={14}
                        aria-hidden="true"
                        className="animate-spin motion-reduce:animate-none"
                      />
                      Buscando rivales…
                    </>
                  ) : (
                    <>
                      <Swords size={14} aria-hidden="true" />
                      Encontrar rival
                    </>
                  )}
                </Button>

                {!busquedaHabilitada && busquedaDisponible && (
                  <p className="mt-2 max-w-[520px] text-[13px] text-[color:var(--muted)] lg:text-sm">
                    Activa la opción{" "}
                    <span className="font-medium text-[color:var(--ink-soft)]">
                      “Aparecer en algoritmos de búsqueda de combate y ranking”
                    </span>{" "}
                    arriba para poder buscar rivales.
                  </p>
                )}
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
        <section aria-live="polite" className="mt-8 lg:mt-10">
          {errorBusqueda && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)] lg:text-base"
            >
              <span>{errorBusqueda}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBuscar}
                disabled={!busquedaHabilitada}
              >
                Reintentar
              </Button>
            </div>
          )}

          {buscando && disciplinaActiva && (
            <>
              <h2 className="flex items-center gap-2 text-lg font-semibold lg:text-xl">
                <Loader2
                  size={18}
                  aria-hidden="true"
                  className="animate-spin text-[color:var(--corner)] motion-reduce:animate-none lg:h-5 lg:w-5"
                />
                Buscando rivales en {disciplinaActiva.nombre}…
              </h2>
              <p className="mb-4 mt-1 text-sm text-[color:var(--muted)] lg:text-base">
                Comparando edad, peso, experiencia y tiempo de entrenamiento.
              </p>
              <ul className="flex flex-col gap-2.5">
                {Array.from({ length: LIMITE_CANDIDATOS }).map((_, i) => (
                  <li
                    key={`sk-${i}`}
                    className="animate-pulse rounded-[2px] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3.5 motion-reduce:animate-none lg:px-5 lg:py-4"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-full bg-[color:var(--line)] lg:h-12 lg:w-12" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-[color:var(--line)]" />
                        <div className="h-3 w-1/2 rounded bg-[color:var(--line)]" />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-3">
                      <div className="h-3 w-16 rounded bg-[color:var(--line)]" />
                      <div className="h-3 w-16 rounded bg-[color:var(--line)]" />
                      <div className="h-3 w-24 rounded bg-[color:var(--line)]" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!buscando && !errorBusqueda && busquedaHecha && disciplinaActiva && (
            <>
              <h2 className="text-lg font-semibold lg:text-xl">
                Rivales sugeridos en {disciplinaActiva.nombre}
              </h2>
              <p className="mb-4 mt-1 text-sm text-[color:var(--muted)] lg:text-base">
                De otras escuelas, con experiencia y contextura similares.
              </p>

              {candidatos.length === 0 ? (
                <EmptyState>
                  No se encontraron rivales compatibles en esta disciplina.
                  Prueba más tarde o revisa el récord del deportista.
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-2.5 lg:gap-3">
                  {candidatos.map((c) => {
                    const nombreRival = nombreCandidato(c);
                    const { clubNombre, telefono, correo, contactoEsCoach } =
                      contactoClub(c);
                    const sinContacto = !telefono && !correo;
                    const totalC = c.total_peleas;

                    return (
                      <li
                        key={c.uuid}
                        className="border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3.5 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:px-5 lg:py-4"
                      >
                        {/* Cabecera: avatar + nombre + alias + club */}
                        <div className="flex items-start gap-3 lg:min-w-0 lg:flex-1">
                          <Avatar
                            name={nombreRival}
                            className="h-11 w-11 shrink-0 text-base lg:h-12 lg:w-12"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <p className="text-[15px] font-medium lg:text-base">
                                {nombreRival}
                              </p>
                              {c.alias && (
                                <span className="text-[13px] text-[color:var(--ink-soft)] lg:text-sm">
                                  “{c.alias}”
                                </span>
                              )}
                            </div>
                            {clubNombre && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[color:var(--muted)] lg:text-base">
                                <Users size={12} aria-hidden="true" />
                                {clubNombre}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats: peso · edad · récord (V-D-E) · total */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--muted)] lg:mt-0 lg:shrink-0 lg:text-base">
                          <span>{formatearNumero(c.peso_en_kg, "kg")}</span>
                          <span>
                            {c.edad} {c.edad === 1 ? "año" : "años"}
                          </span>

                          {/* Récord del rival: V-D-E en mono, con total al lado */}
                          <span
                            className="inline-flex items-baseline gap-1.5"
                            title="Récord: victorias-derrotas-empates"
                          >
                            <span
                              aria-label={`Récord ${c.total_v} victorias, ${c.total_d} derrotas, ${c.total_e} empates`}
                              className="text-[color:var(--ink)] [font-family:var(--font-mono-stack)]"
                            >
                              {c.total_v}-{c.total_d}-{c.total_e}
                            </span>
                            <span>
                              ({totalC} {totalC === 1 ? "combate" : "combates"})
                            </span>
                          </span>
                        </div>

                        {/* Contacto del club */}
                        {!sinContacto ? (
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 lg:mt-0 lg:shrink-0">
                            {telefono && (
                              <a
                                href={telHref(telefono)}
                                className="inline-flex items-center gap-1.5 text-sm text-[color:var(--ink-soft)] underline underline-offset-[3px] [font-family:var(--font-mono-stack)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:text-base"
                                title={
                                  contactoEsCoach
                                    ? "Teléfono del coach de contacto"
                                    : "Teléfono del club"
                                }
                              >
                                <Phone size={12} aria-hidden="true" />
                                {telefono}
                              </a>
                            )}
                            {correo && (
                              <a
                                href={`mailto:${correo}`}
                                className="inline-flex items-center gap-1.5 text-sm text-[color:var(--ink-soft)] underline underline-offset-[3px] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:text-base"
                                title={
                                  contactoEsCoach
                                    ? "Correo del coach de contacto"
                                    : "Correo del club"
                                }
                              >
                                <Mail size={12} aria-hidden="true" />
                                {correo}
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2.5 text-[13px] text-[color:var(--muted)] lg:mt-0 lg:shrink-0 lg:text-sm">
                            Sin datos de contacto del club.
                          </p>
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

      {confirmActivar && (
        <Modal title="Activar aparición en búsquedas" onClose={cerrarConfirmActivar}>
          {deportistasCrud.errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              {deportistasCrud.errorGuardado}
            </p>
          )}
          <p className="text-sm text-[color:var(--ink-soft)]">
            Si lo activas, “{nombre}” podrá aparecer en los algoritmos de
            búsqueda de combate y ranking. ¿Quieres continuar?
          </p>
          <div className="mt-6 flex gap-2.5">
            <Button
              variant="ghost"
              type="button"
              onClick={cerrarConfirmActivar}
              disabled={deportistasCrud.guardando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void confirmarActivar()}
              disabled={deportistasCrud.guardando}
            >
              {deportistasCrud.guardando ? "Guardando…" : "Activar"}
            </Button>
          </div>
        </Modal>
      )}

      {confirmDesactivar && (
        <Modal
          title="Desactivar aparición en búsquedas"
          onClose={cerrarConfirmDesactivar}
        >
          {deportistasCrud.errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              {deportistasCrud.errorGuardado}
            </p>
          )}
          <p className="text-sm text-[color:var(--ink-soft)]">
            Si lo desactivas, “{nombre}” dejará de aparecer en los algoritmos
            de búsqueda de combate y ranking. ¿Quieres continuar?
          </p>
          <div className="mt-6 flex gap-2.5">
            <Button
              variant="ghost"
              type="button"
              onClick={cerrarConfirmDesactivar}
              disabled={deportistasCrud.guardando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void confirmarDesactivar()}
              disabled={deportistasCrud.guardando}
            >
              {deportistasCrud.guardando ? "Guardando…" : "Desactivar"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}