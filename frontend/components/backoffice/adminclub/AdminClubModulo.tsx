"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";

import Avatar from "@/components/backoffice/ui/Avatar";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";

import TeamForm, { type TeamInput } from "./TeamForm";
import CoachForm from "./CoachForm";
import StudentForm from "./StudentForm";

import { Coach } from "@/components/backoffice/types/coach";
import { Student } from "@/components/backoffice/types/student";
import { Team } from "@/components/backoffice/types/team";
import {
  CoachDraft,
  StudentDraft,
} from "@/components/backoffice/types/coachdrafts";

import ListRow from "./ListRow";
import EmptyState from "./EmptyState";

import { useAuth } from "@/lib/hooks/useAuth";
import { useMiClub } from "@/lib/hooks/useMiClub";
import { useCoachesClub } from "@/lib/hooks/useCoachesClub";
import { useDeportistasClub } from "@/lib/hooks/useDeportistasClub";
import type { ClubActualizarInput } from "@/lib/repository/club.api";
import {
  calcularRecordTotal,
  formatearRecord,
} from "@/lib/repository/deportista.api";
import { useDisciplinas } from "@/lib/hooks/useDisciplinas";

/* -------------------------------------------------------------------------- */

type Tab = "coaches" | "students";

type PendingDelete = {
  type: "coach" | "student";
  id: string;
  name: string;
};



const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

/* ------------------------------ Fechas ----------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Vista de administrador de club                                              */
/* -------------------------------------------------------------------------- */

export default function AdminClubModulo() {
  const router = useRouter();
  const { logout } = useAuth();

  const {
    club,
    usuario,
    cargando,
    error,
    limpiarErrorGuardado,
    sinClub,
    guardando,
    errorGuardado,
    actualizarClub,
    refrescar,
  } = useMiClub();
  const { disciplinas: catalogo } = useDisciplinas();

  /* -------------------- Disciplinas ----------------------------- */
  const disciplinasCatalogo = useMemo(() => {
  const map = new Map(catalogo.map((d) => [d.uuid, { uuid: d.uuid, nombre: d.nombre }]));
  club?.disciplinas.forEach((d) => {
    if (!map.has(d.uuid)) map.set(d.uuid, { uuid: d.uuid, nombre: d.nombre });
  });
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}, [catalogo, club]);


  const coachesCrud = useCoachesClub(club?.uuid ?? null, refrescar);
  const deportistasCrud = useDeportistasClub(club?.uuid ?? null, refrescar);

  /* ------------------------- UI local ------------------------------------- */
  const uid = useId();
  const [tab, setTab] = useState<Tab>("coaches");
  const [coachModal, setCoachModal] = useState<Coach | "new" | null>(null);
  const [studentModal, setStudentModal] = useState<Student | "new" | null>(
    null
  );
  const [teamModal, setTeamModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PendingDelete | null>(
    null
  );
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    coaches: null,
    students: null,
  });

  


  /* -------------------- Coaches desde el club ----------------------------- */
  const coaches: Coach[] = useMemo(() => {
    if (!club) return [];
    return club.entrenadores.map((e) => ({
      id: e.uuid,
      name: e.nombre,
      email: e.correo_electronico,
      phone: e.telefono ?? "",
      disciplinas: e.disciplinas.map((d) => d.uuid),
    }));
  }, [club]);

  /* -------------------- Deportistas desde el club ------------------------- */
  const students: Student[] = useMemo(() => {
    if (!club) return [];
    return club.deportistas.map((d) => {
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
        codigo_interno: d.codigo_interno,
        aparecer_busqueda: d.aparecer_busqueda,
        pesoEnKg: Number(d.peso_en_kg) || 0,
        estaturaEnCm:
          d.estatura_en_cm != null ? Number(d.estatura_en_cm) : null,
        disciplinas: records.map((r) => ({
          uuid: r.disciplina_uuid,
          nombre: r.disciplina_nombre,
        })),
        records,
      };
    });
  }, [club]);

  /* --------------- Nombre completo + record total para la lista ---------- */
  const nombreCompletoStudent = (s: Student): string =>
    [s.pNombre, s.sNombre, s.pApellido, s.sApellido]
      .filter(Boolean)
      .join(" ");

  const recordTotalStudent = (s: Student) => calcularRecordTotal(s.records);

  /* --------------- Nombres de disciplinas (para coach) -------------------- */
  const nombresDisciplinas = (uuids: string[]): string => {
    if (!club || uuids.length === 0) return "";
    return uuids
      .map((uuid) => club.disciplinas.find((d) => d.uuid === uuid)?.nombre)
      .filter(Boolean)
      .join(", ");
  };

  /* --------------------- Redirección si no hay sesión --------------------- */
  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/backoffice/login");
    }
  }, [cargando, usuario, router]);

  /* ------------------------------ Logout ---------------------------------- */
  const handleLogout = () => {
    logout();
    window.location.href = "/backoffice/login";
  };

  /* ---------------------- Mapeo Club → Team para UI ----------------------- */
  const team: TeamInput = {
  name: club?.nombre ?? "",
  phone: club?.telefono ?? "",
  photo: club?.url_foto ?? null,
  description: club?.descripcion ?? null,
  foundationDate: club?.fecha_fundacion?.slice(0, 10) ?? null,
  email: club?.correo_institucional ?? null,
  disciplinas: club?.disciplinas.map((d) => d.uuid) ?? [],
};

  /* ----------------------------- Guardar equipo --------------------------- */
const saveTeam = (input: TeamInput) => {
  void (async () => {
    try {
      const patch: ClubActualizarInput = {
        nombre: input.name,
        telefono: input.phone || null,
        url_foto: input.photo,
        descripcion: input.description,
        fecha_fundacion: input.foundationDate,
        correo_institucional: input.email,
        disciplinas: input.disciplinas,
      };
      await actualizarClub(patch);
      setTeamModal(false);
    } catch {
      /* errorGuardado ya fue seteado por el hook */
    }
  })();
};

  /* ------------------------ Guardar coach (real) -------------------------- */
  const saveCoach = async (data: CoachDraft) => {
    if (!club) return;
    try {
      if (data.id) {
        await coachesCrud.actualizar(data.id, {
          nombre: data.name,
          correo_electronico: data.email,
          clubs: [{ uuid: club.uuid, telefono: data.phone || null }],
          disciplinas: data.disciplinas,
          ...(data.password ? { password: data.password } : {}),
        });
      } else {
        await coachesCrud.crear({
          nombre: data.name,
          correo_electronico: data.email,
          password: data.password || undefined,
          disciplinas: data.disciplinas,
          telefono: data.phone,
        });
      }
      setCoachModal(null);
    } catch {
      /* coachesCrud.errorGuardado ya fue seteado */
    }
  };

  /* ------------------------ Guardar deportista (real) --------------------- */
  const saveStudent = async (data: StudentDraft) => {
    if (!club) return;

    const apiData = {
      rut: data.rut,
      digito_verif: data.digitoVerif,
      p_nombre: data.pNombre,
      s_nombre: data.sNombre ?? null,
      p_apellido: data.pApellido,
      s_apellido: data.sApellido ?? null,
      alias: data.alias ?? null,
      nacionalidad: data.nacionalidad ?? null,
      fecha_nacimiento: data.fechaNacimiento,
      genero: data.genero,
      peso_en_kg: data.pesoEnKg,
      estatura_en_cm: data.estaturaEnCm ?? null,
      disciplinas: data.disciplinas,
      records: data.records,
    };

    try {
      if (data.id) {
        await deportistasCrud.actualizar(data.id, apiData);
      } else {
        await deportistasCrud.crear(apiData);
      }
      setStudentModal(null);
    } catch {
      /* deportistasCrud.errorGuardado ya fue seteado */
    }
  };

  /* --------------------------- Eliminar ---------------------------------- */
  const doDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === "coach") {
      try {
        await coachesCrud.eliminar(confirmDelete.id);
      } catch {
        /* errorGuardado */
      }
      setConfirmDelete(null);
    } else {
      try {
        await deportistasCrud.eliminar(confirmDelete.id);
      } catch {
        /* errorGuardado */
      }
      setConfirmDelete(null);
    }
  };

  /* -------------------------------- Tabs ---------------------------------- */
  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Tab = tab === "coaches" ? "students" : "coaches";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: "coaches", label: "Coaches" },
    { value: "students", label: "Estudiantes" },
  ];

  /* ---------------------------------------------------------------------- */
  /* Estados del hook                                                        */
  /* ---------------------------------------------------------------------- */

  if (cargando) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--surface)] px-6">
        <p className="text-sm text-[color:var(--muted)]">Cargando panel…</p>
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

  if (sinClub || !club) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[color:var(--surface)] px-6 text-center">
        <AlertCircle
          size={36}
          aria-hidden="true"
          className="text-[color:var(--corner)]"
        />
        <div>
          <p className="text-base font-medium">Sin club asignado</p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)]">
            Tu usuario todavía no tiene un club vinculado. Contacta al
            administrador del sistema para que te asigne uno.
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut size={14} aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    );
  }

  const fundacion = formatDateDMY(club.fecha_fundacion);
  const anos = yearsSince(club.fecha_fundacion);

  return (
    <div className="min-h-[100dvh] text-[color:var(--ink)] [--control-border:#7c8a9c] [background-image:repeating-linear-gradient(125deg,rgba(20,35,58,0.028)_0,rgba(20,35,58,0.028)_1px,transparent_1px,transparent_64px)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--line)] bg-[rgba(238,241,245,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-6 py-3 max-[480px]:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={club.nombre}
              photo={club.url_foto}
              className="h-10 w-10 text-base"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {club.nombre}
              </p>
              <p className="text-[13px] text-[color:var(--muted)]">
                Administrador
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} aria-hidden="true" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-6 pb-10 pt-9 max-[480px]:px-4 max-[480px]:pb-[30px] max-[480px]:pt-7">
        <h1 className="sr-only">Panel de administración</h1>

        {/* Datos del equipo */}
        <section aria-labelledby={`${uid}-team`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`${uid}-team`}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <ShieldCheck
                size={18}
                aria-hidden="true"
                className="text-[color:var(--corner)]"
              />
              Datos del equipo
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTeamModal(true)}
            >
              <Pencil size={13} aria-hidden="true" />
              Editar
            </Button>
          </div>

          <Panel innerClassName="flex items-start gap-4 px-[18px] py-4">
            <Avatar
              name={club.nombre}
              photo={club.url_foto}
              className="mt-0.5 h-[52px] w-[52px] shrink-0 text-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium">{club.nombre}</p>

              {club.descripcion ? (
                <p className="mt-1 text-sm leading-snug text-[color:var(--muted)]">
                  {club.descripcion}
                </p>
              ) : (
                <p className="mt-1 text-sm italic text-[color:var(--muted)]">
                  Sin descripción registrada
                </p>
              )}

              <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[color:var(--muted)]">
                {club.telefono && (
                  <li className="flex items-center gap-1.5 [font-family:var(--font-mono-stack)]">
                    <Phone size={13} aria-hidden="true" />
                    <span>{club.telefono}</span>
                  </li>
                )}

                {club.correo_institucional && (
                  <li className="flex min-w-0 items-center gap-1.5">
                    <Mail size={13} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">
                      {club.correo_institucional}
                    </span>
                  </li>
                )}

                {fundacion && (
                  <li className="flex items-center gap-1.5">
                    <Calendar size={13} aria-hidden="true" />
                    <span className="flex items-center gap-1.5">
                      Fundado el {fundacion}
                      {anos !== null && (
                        <span
                          className="inline-flex items-center rounded-[2px] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[12px] font-medium text-[color:var(--ink-soft)]"
                          title={`${anos} ${anos === 1 ? "año" : "años"} desde su fundación`}
                        >
                          {anos} {anos === 1 ? "año" : "años"}
                        </span>
                      )}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </Panel>
        </section>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Gestión del club"
          onKeyDown={onTabKeyDown}
          className="mb-5 mt-9 flex gap-1 border-b border-[color:var(--line)]"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              ref={(el) => {
                tabRefs.current[t.value] = el;
              }}
              id={`${uid}-tab-${t.value}`}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              aria-controls={`${uid}-panel-${t.value}`}
              tabIndex={tab === t.value ? 0 : -1}
              onClick={() => setTab(t.value)}
              className={`-mb-px cursor-pointer border-b-2 bg-transparent px-3 pb-3 pt-2.5 text-[15px] font-medium transition-colors duration-150 [font-family:var(--font-sans-stack)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none ${
                tab === t.value
                  ? "border-[color:var(--corner)] text-[color:var(--ink)]"
                  : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--ink)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel Coaches */}
        {tab === "coaches" ? (
          <section
            id={`${uid}-panel-coaches`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-coaches`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users
                  size={18}
                  aria-hidden="true"
                  className="text-[color:var(--corner)]"
                />
                Coaches
              </h2>
              <Button
                size="sm"
                onClick={() => {
                  coachesCrud.limpiarErrorGuardado();
                  setCoachModal("new");
                }}
              >
                <Plus size={14} aria-hidden="true" />
                Nuevo coach
              </Button>
            </div>

            {coaches.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {coaches.map((c) => (
                  <ListRow
                    key={c.id}
                    avatarText={initials(c.name)}
                    title={c.name}
                    subtitle={c.email}
                    badge={nombresDisciplinas(c.disciplinas) || undefined}
                    onEdit={() => {
                      coachesCrud.limpiarErrorGuardado();
                      setCoachModal(c);
                    }}
                    onDelete={() =>
                      setConfirmDelete({
                        type: "coach",
                        id: c.id,
                        name: c.name,
                      })
                    }
                  />
                ))}
              </ul>
            ) : (
              <EmptyState>
                Aún no hay coaches registrados. Agrega el primero con Nuevo
                coach.
              </EmptyState>
            )}
          </section>
        ) : (
          <section
            id={`${uid}-panel-students`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-students`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Swords
                  size={18}
                  aria-hidden="true"
                  className="text-[color:var(--corner)]"
                />
                Estudiantes
              </h2>
              <Button
                size="sm"
                onClick={() => {
                  deportistasCrud.limpiarErrorGuardado();
                  setStudentModal("new");
                }}
              >
                <Plus size={14} aria-hidden="true" />
                Nuevo estudiante
              </Button>
            </div>
            {students.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {students.map((s) => {
                  const nombre = nombreCompletoStudent(s);
                  const total = recordTotalStudent(s);
                  const rut = s.rut
                    ? `${s.rut}${s.digitoVerif ? "-" + s.digitoVerif : ""}`
                    : "Sin RUT";
                  const disciplines = s.disciplinas
                    .map((d) => d.nombre)
                    .join(", ");
                  return (
                    <ListRow
                      key={s.id}
                      avatarText={initials(nombre)}
                      title={nombre}
                      subtitle={[rut, disciplines]
                        .filter(Boolean)
                        .join(" · ")}
                      badge={
                        s.records.length > 0
                          ? formatearRecord(total)
                          : undefined
                      }
                      onEdit={() => {
                        deportistasCrud.limpiarErrorGuardado();
                        setStudentModal(s);
                      }}
                      onDelete={() =>
                        setConfirmDelete({
                          type: "student",
                          id: s.id,
                          name: nombre,
                        })
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <EmptyState>
                Aún no hay estudiantes registrados. Agrega el primero con Nuevo
                estudiante.
              </EmptyState>
            )}
          </section>
        )}
      </main>

      {/* Modal equipo */}
      {teamModal && (
  <Modal
    title="Editar equipo"
    onClose={() => {
      limpiarErrorGuardado();
      setTeamModal(false);
    }}
  >
    {guardando && (
      <p role="status" className="mb-3 text-sm text-[color:var(--muted)]">
        Guardando cambios…
      </p>
    )}
    {errorGuardado && (
      <p
        role="alert"
        className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
      >
        {errorGuardado}
      </p>
    )}
    <TeamForm
      initial={team}
      disciplinasDisponibles={disciplinasCatalogo}
      onSave={saveTeam}
      onCancel={() => {
        limpiarErrorGuardado();
        setTeamModal(false);
      }}
    />
  </Modal>
)}

      {/* Modal coach */}
      {coachModal && (
        <Modal
          title={coachModal === "new" ? "Nuevo coach" : "Editar coach"}
          onClose={() => {
            coachesCrud.limpiarErrorGuardado();
            setCoachModal(null);
          }}
        >
          {coachesCrud.guardando && (
            <p role="status" className="mb-3 text-sm text-[color:var(--muted)]">
              Guardando cambios…
            </p>
          )}
          {coachesCrud.errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              {coachesCrud.errorGuardado}
            </p>
          )}
          <CoachForm
            initial={coachModal === "new" ? null : coachModal}
            disciplinasDisponibles={club.disciplinas}
            onSave={saveCoach}
            onCancel={() => {
              coachesCrud.limpiarErrorGuardado();
              setCoachModal(null);
            }}
          />
        </Modal>
      )}

      {/* Modal deportista */}
      {studentModal && (
        <Modal
          title={
            studentModal === "new" ? "Nuevo estudiante" : "Editar estudiante"
          }
          onClose={() => {
            deportistasCrud.limpiarErrorGuardado();
            setStudentModal(null);
          }}
          wide
        >
          {deportistasCrud.guardando && (
            <p role="status" className="mb-3 text-sm text-[color:var(--muted)]">
              Guardando cambios…
            </p>
          )}
          {deportistasCrud.errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              {deportistasCrud.errorGuardado}
            </p>
          )}
          <StudentForm
            initial={studentModal === "new" ? null : studentModal}
            disciplinasDisponibles={club.disciplinas}
            onSave={saveStudent}
            onCancel={() => {
              deportistasCrud.limpiarErrorGuardado();
              setStudentModal(null);
            }}
          />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Confirmar eliminación"
          message={`¿Seguro que quieres eliminar a “${confirmDelete.name}”? Esta acción no se puede deshacer.`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}