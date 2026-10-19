"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  LogOut,
  Mail,
  Plus,
  Swords,
  Users,
} from "lucide-react";

import Avatar from "@/components/backoffice/ui/Avatar";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";

import StudentForm from "@/components/backoffice/adminclub/StudentForm";

import { Student } from "@/components/backoffice/types/student";
import { StudentDraft } from "@/components/backoffice/types/coachdrafts";

import ListRow from "@/components/backoffice/adminclub/ListRow";
import EmptyState from "@/components/backoffice/adminclub/EmptyState";

import { useAuth } from "@/lib/hooks/useAuth";
import { useMiClub } from "@/lib/hooks/useMiClub";
import { useDeportistasClub } from "@/lib/hooks/useDeportistasClub";
import {
  calcularRecordTotal,
  formatearRecord,
} from "@/lib/repository/deportista.api";

/* -------------------------------------------------------------------------- */

/** Ajusta estas rutas a las reales dentro de backoffice/(auth) y (app). */
const LOGIN_ROUTE = "/backoffice/login";
const studentDetailRoute = (id: string) =>
  `/backoffice/modulos/estudianteDetalle/${id}`;

type PendingDelete = {
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

/* ---------------------- Datos del deportista ----------------------------- */

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

function formatearRut(
  rut: string | null | undefined,
  dv: string | null | undefined
): string | null {
  const cuerpo = (rut ?? "").replace(/\D/g, "");
  if (!cuerpo) return null;
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${conPuntos}-${dv.toUpperCase()}` : conPuntos;
}

const formatearPeso = (kg: number) =>
  `${kg.toLocaleString("es-CL", { maximumFractionDigits: 2 })} kg`;

/* -------------------------------------------------------------------------- */
/* Vista de coach                                                              */
/* -------------------------------------------------------------------------- */

export default function CoachModulo() {
  const router = useRouter();
  const uid = useId();
  const { logout } = useAuth();

  const { club, usuario, cargando, error, sinClub, refrescar } = useMiClub();

  const deportistasCrud = useDeportistasClub(club?.uuid ?? null, refrescar);

  /* ------------------------- UI local ------------------------------------- */
  const [studentModal, setStudentModal] = useState<Student | "new" | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState<PendingDelete | null>(
    null
  );

  /* -------------- Registro del coach dentro del club ---------------------- */
  const coachActual =
    club?.entrenadores.find((e) => e.uuid === usuario?.uuid) ?? null;

  const misDisciplinaIds = useMemo(
    () => new Set((coachActual?.disciplinas ?? []).map((d) => d.uuid)),
    [coachActual]
  );

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

  /* ---- Mis estudiantes: los que practican alguna disciplina del coach ---- */
  const misEstudiantes = useMemo(
    () =>
      students.filter((s) =>
        s.disciplinas.some((d) => misDisciplinaIds.has(d.uuid))
      ),
    [students, misDisciplinaIds]
  );

  const nombreCompletoStudent = (s: Student): string =>
    [s.pNombre, s.sNombre, s.pApellido, s.sApellido]
      .filter(Boolean)
      .join(" ");

  /* --------------------- Redirección si no hay sesión --------------------- */
  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace(LOGIN_ROUTE);
    }
  }, [cargando, usuario, router]);

  /* --------- Prefetch del detalle de cada estudiante (UX opcional) ------- */
  // Hace que el click sea instantáneo: Next precarga el RSC cuando el
  // componente está montado. Se hace solo si el usuario ya está cargado.
  useEffect(() => {
    if (!club || misEstudiantes.length === 0) return;
    for (const s of misEstudiantes) {
      router.prefetch(studentDetailRoute(s.id));
    }
  }, [club, misEstudiantes, router]);

  /* ------------------------------ Logout ---------------------------------- */
  const handleLogout = () => {
    logout();
    window.location.href = LOGIN_ROUTE;
  };

  /* ------------------------ Guardar deportista ---------------------------- */
  const saveStudent = async (data: StudentDraft) => {
    if (!club) return;

    const apiData = {
      rut: data.rut,
      digito_verif: data.digitoVerif,
      p_nombre: data.pNombre,
      s_nombre: data.sNombre?.trim() || null,
      p_apellido: data.pApellido,
      s_apellido: data.sApellido?.trim() || null,
      alias: data.alias?.trim() || null,
      nacionalidad: data.nacionalidad?.trim() || null,
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
    try {
      await deportistasCrud.eliminar(confirmDelete.id);
    } catch {
      /* errorGuardado se muestra sobre la lista */
    }
    setConfirmDelete(null);
  };

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

  if (!coachActual) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[color:var(--surface)] px-6 text-center">
        <AlertCircle
          size={36}
          aria-hidden="true"
          className="text-[color:var(--corner)]"
        />
        <div>
          <p className="text-base font-medium">
            No encontramos tu perfil de coach
          </p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)]">
            Tu usuario no figura entre los coaches de {club.nombre}. Pide al
            administrador del club que revise tu registro.
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut size={14} aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    );
  }

  /* ----------------------- Valores derivados para la UI ------------------- */
  const disciplinasDisponibles = club.disciplinas.filter((d) =>
    misDisciplinaIds.has(d.uuid)
  );
  const nombresMisDisciplinas = disciplinasDisponibles
    .map((d) => d.nombre)
    .join(", ");

  const todosLosRecords = misEstudiantes.flatMap((s) => s.records);
  const totalCombates = todosLosRecords.reduce(
    (acc, r) => acc + r.v + r.d + r.e,
    0
  );
  const recordTotal = formatearRecord(calcularRecordTotal(todosLosRecords));

  const stats = [
    { label: "Atletas", value: String(misEstudiantes.length), accent: false },
    { label: "Combates", value: String(totalCombates), accent: false },
    { label: "Récord", value: recordTotal, accent: true },
    {
      label: "Disciplinas",
      value: String(disciplinasDisponibles.length),
      accent: false,
    },
  ];

  const sinDisciplinas = disciplinasDisponibles.length === 0;

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
              <p className="text-[13px] text-[color:var(--muted)]">Coach</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} aria-hidden="true" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-6 pb-10 pt-9 max-[480px]:px-4 max-[480px]:pb-[30px] max-[480px]:pt-7">
        {/* Perfil del coach */}
        <section className="flex items-center gap-4 max-[480px]:items-start">
          <Avatar
            name={coachActual.nombre}
            className="h-16 w-16 shrink-0 text-2xl"
          />
          <div className="min-w-0">
            <span className="inline-block rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)]">
              Coach
            </span>
            <h1 className="mt-1 text-[clamp(26px,5vw,32px)] font-normal leading-[1.05] tracking-[0.005em] text-[color:var(--ink)] [font-family:var(--font-display-stack)]">
              {coachActual.nombre}
            </h1>
            <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[color:var(--muted)]">
              <li className="flex items-center gap-1.5">
                <Users size={14} aria-hidden="true" />
                <span>{club.nombre}</span>
              </li>
              {coachActual.correo_electronico && (
                <li className="flex min-w-0 items-center gap-1.5">
                  <Mail size={14} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">
                    {coachActual.correo_electronico}
                  </span>
                </li>
              )}
              {nombresMisDisciplinas && (
                <li className="flex items-center gap-1.5">
                  <Swords size={14} aria-hidden="true" />
                  <span>{nombresMisDisciplinas}</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Estadísticas */}
        <section aria-label="Resumen de mis estudiantes" className="mt-7">
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
        </section>

        {/* Mis estudiantes */}
        <section aria-labelledby={`${uid}-students`} className="mt-9">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`${uid}-students`}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Award
                size={18}
                aria-hidden="true"
                className="text-[color:var(--corner)]"
              />
              Mis estudiantes
            </h2>
            <Button
              size="sm"
              disabled={sinDisciplinas}
              onClick={() => {
                deportistasCrud.limpiarErrorGuardado();
                setStudentModal("new");
              }}
            >
              <Plus size={14} aria-hidden="true" />
              Nuevo estudiante
            </Button>
          </div>

          {!studentModal && deportistasCrud.errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)]"
            >
              {deportistasCrud.errorGuardado}
            </p>
          )}

          {misEstudiantes.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {misEstudiantes.map((s) => {
                const nombre = nombreCompletoStudent(s);
                const total = calcularRecordTotal(s.records);
                const rut = formatearRut(s.rut, s.digitoVerif) ?? "Sin RUT";
                const edad = yearsSince(s.fechaNacimiento);
                const disciplines = s.disciplinas
                  .map((d) => d.nombre)
                  .join(", ");

                return (
                  <ListRow
                    key={s.id}
                    avatarText={initials(nombre)}
                    title={nombre}
                    subtitle={[
                      s.alias ? `“${s.alias}”` : null,
                      s.pesoEnKg > 0 ? formatearPeso(s.pesoEnKg) : null,
                      edad !== null
                        ? `${edad} ${edad === 1 ? "año" : "años"}`
                        : null,
                      disciplines,
                      rut,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    badge={
                      s.records.length > 0 ? formatearRecord(total) : undefined
                    }
                    // 👇 Navega al detalle del estudiante al clickear la fila
                    onOpen={() => router.push(studentDetailRoute(s.id))}
                    onEdit={() => {
                      deportistasCrud.limpiarErrorGuardado();
                      setStudentModal(s);
                    }}
                    onDelete={() => {
                      deportistasCrud.limpiarErrorGuardado();
                      setConfirmDelete({ id: s.id, name: nombre });
                    }}
                  />
                );
              })}
            </ul>
          ) : (
            <EmptyState>
              {sinDisciplinas
                ? "Todavía no tienes disciplinas asignadas, por eso no puedes registrar estudiantes. Pide al administrador del club que te las asigne."
                : "Aún no tienes estudiantes registrados. Agrega el primero con Nuevo estudiante."}
            </EmptyState>
          )}
        </section>
      </main>

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
            disciplinasDisponibles={disciplinasDisponibles}
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
          onConfirm={() => void doDelete()}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}