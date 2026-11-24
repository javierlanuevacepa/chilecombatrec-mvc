"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";

import Avatar from "@/components/backoffice/ui/Avatar";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";

import SuperAdminUserForm from "./SuperAdminUserForm";

import { useAuth } from "@/lib/hooks/useAuth";
import { useSuperAdmin } from "@/lib/hooks/useSuperAdmin";
import { useDisciplinas } from "@/lib/hooks/useDisciplinas";

// Las regiones/comunas todavía no tienen hook propio en el proyecto;
// se siguen tomando del catálogo mock hasta que exista `useRegiones()`.
import { REGIONES_COMUNAS } from "@/lib/mock/superadmin";

import type {
  PendingDelete,
  SuperAdminUser,
  SuperAdminUserDraft,
} from "@/components/backoffice/types/superadmin";

/* ------------------------------ helpers ---------------------------------- */

const rolLabel = (rol: SuperAdminUser["rol"]) => {
  switch (rol) {
    case "ADMIN":
      return "Super administrador";
    case "ADMIN_CLUB":
      return "Administrador de club";
    case "COACH_CLUB":
      return "Entrenador de club";
  }
};

type FiltroCard = "all" | "adminClub" | "coach" | "conClub";

/* -------------------------------------------------------------------------- */
/* Módulo SuperAdmin — gestión de usuarios y su club                         */
/* -------------------------------------------------------------------------- */

export default function SuperAdminModulo() {
  const router = useRouter();
  const uid = useId();

  /* ------------------------------ Auth ----------------------------------- */
  const { usuario, cargando: cargandoAuth, logout } = useAuth();

  /* ------------------------------ Data ----------------------------------- */
  const {
    usuarios,
    clubes,
    cargando: cargandoDatos,
    error,
    refrescar,
    guardando,
    errorGuardado,
    limpiarErrorGuardado,
    crear,
    actualizar,
    eliminar,
  } = useSuperAdmin();

  const { disciplinas: catalogoDisciplinas } = useDisciplinas();

  /* ------------------------------ UI local -------------------------------- */
  const [busqueda, setBusqueda] = useState("");
  const [filtroCard, setFiltroCard] = useState<FiltroCard>("all");
  const [userModal, setUserModal] = useState<SuperAdminUser | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PendingDelete | null>(null);

  /* --------------------------- Redirección ------------------------------- */
  useEffect(() => {
    if (!cargandoAuth && !usuario) {
      router.replace("/backoffice/login");
    }
  }, [cargandoAuth, usuario, router]);

  const handleLogout = () => {
    logout();
    window.location.href = "/backoffice/login";
  };

  /* --------------------------- Modo vista -------------------------------- */
  /** La card "Clubes" cambia la vista: en vez de usuarios, muestra clubes. */
  const esVistaClubes = filtroCard === "conClub";

  /* --------------------------- Derived data ------------------------------ */
  const stats = useMemo(
    () => ({
      totalUsuarios: usuarios.length,
      totalAdmins: usuarios.filter((u) => u.rol === "ADMIN_CLUB").length,
      totalCoaches: usuarios.filter((u) => u.rol === "COACH_CLUB").length,
      totalClubes: clubes.length,
    }),
    [usuarios, clubes]
  );

  /** Mapa inverso club.uuid → admin que lo gestiona.
   *  Solo cuentan usuarios con rol ADMIN_CLUB. Si hubiera varios
   *  (raro: el schema es N:M pero el flujo actual es 1:1), gana el primero. */
  const adminByClubUuid = useMemo(() => {
    const map = new Map<string, SuperAdminUser>();
    usuarios.forEach((u) => {
      if (u.rol !== "ADMIN_CLUB") return;
      u.clubes.forEach((c) => {
        if (!map.has(c.uuid)) map.set(c.uuid, u);
      });
    });
    return map;
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    if (esVistaClubes) return [];
    let lista = usuarios;
    if (filtroCard === "adminClub") {
      lista = lista.filter((u) => u.rol === "ADMIN_CLUB");
    } else if (filtroCard === "coach") {
      lista = lista.filter((u) => u.rol === "COACH_CLUB");
    }

    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((u) => {
      const club = u.clubes[0] ?? null;
      return (
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (club?.nombre.toLowerCase().includes(q) ?? false)
      );
    });
  }, [usuarios, busqueda, filtroCard, esVistaClubes]);

  const clubesFiltrados = useMemo(() => {
    if (!esVistaClubes) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return clubes;
    return clubes.filter((c) => {
      const admin = adminByClubUuid.get(c.uuid);
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.correo?.toLowerCase().includes(q) ?? false) ||
        (c.comuna?.toLowerCase().includes(q) ?? false) ||
        (c.region?.toLowerCase().includes(q) ?? false) ||
        (admin?.nombre.toLowerCase().includes(q) ?? false) ||
        (admin?.email.toLowerCase().includes(q) ?? false)
      );
    });
  }, [esVistaClubes, clubes, adminByClubUuid, busqueda]);

  const hayFiltrosActivos = busqueda.trim() !== "" || filtroCard !== "all";

  const toggleFiltro = (f: FiltroCard) => {
    if (f === "all") {
      setFiltroCard("all");
      return;
    }
    setFiltroCard((prev) => (prev === f ? "all" : f));
  };

  /* ------------------------------ Save ----------------------------------- */
  const saveUser = async (draft: SuperAdminUserDraft) => {
    try {
      if (userModal === "new") {
        await crear(draft);
      } else if (userModal) {
        await actualizar(userModal.uuid, draft);
      }
      setUserModal(null);
    } catch {
      /* errorGuardado ya fue seteado por el hook */
    }
  };

  /* ------------------------------ Delete --------------------------------- */
  const doDelete = async () => {
    if (!confirmDelete) return;
    const eliminarClub =
      confirmDelete.rol === "ADMIN_CLUB" && Boolean(confirmDelete.clubUuid);
    try {
      await eliminar(confirmDelete.uuid, eliminarClub);
      setConfirmDelete(null);
    } catch {
      /* errorGuardado ya fue seteado por el hook */
    }
  };

  /* ------------------------------ Render --------------------------------- */
  if (cargandoAuth || cargandoDatos) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--surface)] px-6">
        <p className="text-sm text-[color:var(--muted)] lg:text-base">
          Cargando panel…
        </p>
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
          <p className="text-base font-medium lg:text-lg">
            No pudimos cargar los datos
          </p>
          <p className="mt-1 max-w-[420px] text-sm text-[color:var(--muted)] lg:text-base">
            {error}
          </p>
        </div>
        <Button onClick={() => void refrescar()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] text-[color:var(--ink)] [--control-border:#7c8a9c] [background-image:repeating-linear-gradient(125deg,rgba(20,35,58,0.028)_0,rgba(20,35,58,0.028)_1px,transparent_1px,transparent_64px)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[color:var(--line)] bg-[rgba(238,241,245,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-6 py-3 max-[480px]:px-4 lg:max-w-[1300px] lg:px-10 lg:py-4 xl:max-w-[1500px] 2xl:max-w-[1600px]">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <Avatar
              name={usuario.nombre}
              photo={null}
              className="h-10 w-10 text-base lg:h-12 lg:w-12 lg:text-lg"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight lg:text-base">
                {usuario.nombre}
              </p>
              <p className="text-[13px] text-[color:var(--muted)] lg:text-sm">
                Super administrador
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} aria-hidden="true" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-6 pb-10 pt-9 max-[480px]:px-4 max-[480px]:pb-[30px] max-[480px]:pt-7 lg:max-w-[1300px] lg:px-10 lg:pb-16 lg:pt-12 xl:max-w-[1500px] 2xl:max-w-[1600px]">
        <h1 className="sr-only">Administración de usuarios</h1>

        {/* Título */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold lg:text-xl">
            <ShieldCheck
              size={18}
              aria-hidden="true"
              className="text-[color:var(--corner)] lg:h-5 lg:w-5"
            />
            Administración del sistema
          </h2>
          <Button
            size="sm"
            onClick={() => {
              limpiarErrorGuardado();
              setUserModal("new");
            }}
          >
            <Plus size={14} aria-hidden="true" />
            {esVistaClubes ? "Nuevo club" : "Nuevo usuario"}
          </Button>
        </div>

        {/* Stats clickeables como filtros */}
        <div
          role="group"
          aria-label="Filtrar usuarios por tipo"
          className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:mb-6 lg:gap-3"
        >
          <StatCard
            icon={<Users size={14} aria-hidden="true" />}
            label="Usuarios"
            value={stats.totalUsuarios}
            active={filtroCard === "all"}
            onClick={() => toggleFiltro("all")}
            ariaLabel="Mostrar todos los usuarios"
          />
          <StatCard
            icon={<Building2 size={14} aria-hidden="true" />}
            label="Admins club"
            value={stats.totalAdmins}
            active={filtroCard === "adminClub"}
            onClick={() => toggleFiltro("adminClub")}
            ariaLabel="Filtrar solo administradores de club"
          />
          <StatCard
            icon={<Swords size={14} aria-hidden="true" />}
            label="Coaches"
            value={stats.totalCoaches}
            active={filtroCard === "coach"}
            onClick={() => toggleFiltro("coach")}
            ariaLabel="Filtrar solo coaches"
          />
          <StatCard
            icon={<ShieldCheck size={14} aria-hidden="true" />}
            label="Clubes"
            value={stats.totalClubes}
            active={filtroCard === "conClub"}
            onClick={() => toggleFiltro("conClub")}
            ariaLabel="Mostrar el listado de clubes"
          />
        </div>

        {/* Buscador */}
        <div className="mb-4 lg:mb-5">
          <div className="relative">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)] lg:left-3 lg:h-4 lg:w-4"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                esVistaClubes
                  ? "Buscar por club, admin, comuna…"
                  : "Buscar por nombre, correo o club…"
              }
              aria-label={esVistaClubes ? "Buscar clubes" : "Buscar usuarios"}
              className="w-full rounded-[2px] border border-[color:var(--control-border,#cbd5e1)] bg-white py-2 pl-8 pr-3 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--corner)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:py-2.5 lg:pl-10 lg:pr-4 lg:text-base"
            />
          </div>
        </div>

        {/* -------------------- Vista: Clubes -------------------- */}
        {esVistaClubes ? (
          clubesFiltrados.length > 0 ? (
            <ul className="flex flex-col gap-2.5 lg:gap-3">
              {clubesFiltrados.map((c) => {
                const admin = adminByClubUuid.get(c.uuid);
                const ubicacion = [c.comuna, c.region]
                  .filter(Boolean)
                  .join(", ");
                const coachesTxt =
                  c.coachesCount === 1
                    ? "1 coach"
                    : `${c.coachesCount} coaches`;
                const depTxt =
                  c.deportistasCount === 1
                    ? "1 deportista"
                    : `${c.deportistasCount} deportistas`;

                return (
                  <li key={c.uuid}>
                    <Panel innerClassName="flex items-start gap-3 px-[14px] py-3 lg:gap-4 lg:px-5 lg:py-4">
                      <Avatar
                        name={c.nombre}
                        photo={c.urlFoto}
                        className="mt-0.5 h-9 w-9 shrink-0 text-[13px] lg:h-11 lg:w-11 lg:text-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-[14px] font-medium lg:text-base">
                            {c.nombre}
                          </p>
                          <span className="shrink-0 rounded-[2px] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--ink-soft)] lg:px-2 lg:py-1 lg:text-[12px]">
                            {coachesTxt} · {depTxt}
                          </span>
                        </div>
                        <p className="truncate text-[13px] text-[color:var(--muted)] lg:text-sm">
                          {admin ? `Admin: ${admin.nombre}` : "Sin administrador"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[color:var(--muted)] lg:text-[13px]">
                          <Building2 size={12} aria-hidden="true" />
                          <span className="truncate">
                            {ubicacion || "Sin ubicación"}
                          </span>
                        </p>
                      </div>
                      {admin && (
                        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              limpiarErrorGuardado();
                              setUserModal(admin);
                            }}
                            aria-label={`Editar club ${c.nombre}`}
                            className="cursor-pointer rounded-[2px] p-1.5 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:p-2"
                          >
                            <Pencil size={14} aria-hidden="true" className="lg:h-4 lg:w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                uuid: admin.uuid,
                                nombre: admin.nombre,
                                rol: admin.rol,
                                clubUuid: c.uuid,
                              })
                            }
                            aria-label={`Eliminar club ${c.nombre}`}
                            className="cursor-pointer rounded-[2px] p-1.5 text-[color:var(--corner)] transition-colors hover:bg-[rgba(220,38,38,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:p-2"
                          >
                            <AlertCircle size={14} aria-hidden="true" className="lg:h-4 lg:w-4" />
                          </button>
                        </div>
                      )}
                    </Panel>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Panel innerClassName="flex flex-col items-center gap-2 px-6 py-10 text-center lg:py-14">
              <Building2
                size={28}
                aria-hidden="true"
                className="text-[color:var(--muted)] lg:h-9 lg:w-9"
              />
              <p className="text-sm text-[color:var(--muted)] lg:text-base">
                {hayFiltrosActivos
                  ? "No encontramos clubes que coincidan con los filtros."
                  : "Aún no hay clubes registrados. Crea un administrador de club para empezar."}
              </p>
              {hayFiltrosActivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroCard("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Panel>
          )
        ) : usuariosFiltrados.length > 0 ? (
          /* -------------------- Vista: Usuarios -------------------- */
          <ul className="flex flex-col gap-2.5 lg:gap-3">
            {usuariosFiltrados.map((u) => {
              const club = u.clubes[0] ?? null;
              const clubNombre = club?.nombre ?? "Sin club";
              const clubUbicacion = club
                ? [club.comuna, club.region].filter(Boolean).join(", ")
                : "";

              return (
                <li key={u.uuid}>
                  <Panel innerClassName="flex items-start gap-3 px-[14px] py-3 lg:gap-4 lg:px-5 lg:py-4">
                    <Avatar
                      name={u.nombre}
                      photo={null}
                      className="mt-0.5 h-9 w-9 shrink-0 text-[13px] lg:h-11 lg:w-11 lg:text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[14px] font-medium lg:text-base">
                          {u.nombre}
                        </p>
                        <span
                          className={`shrink-0 rounded-[2px] px-1.5 py-0.5 text-[11px] font-medium lg:px-2 lg:py-1 lg:text-[12px] ${
                            u.rol === "ADMIN"
                              ? "bg-[color:var(--surface-2)] text-[color:var(--ink-soft)]"
                              : u.rol === "ADMIN_CLUB"
                              ? "bg-[rgba(220,38,38,0.08)] text-[color:var(--corner)]"
                              : "bg-[rgba(20,35,58,0.06)] text-[color:var(--ink-soft)]"
                          }`}
                        >
                          {rolLabel(u.rol)}
                        </span>
                        {!u.activo && (
                          <span className="shrink-0 rounded-[2px] bg-[rgba(20,35,58,0.06)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--muted)] lg:px-2 lg:py-1 lg:text-[12px]">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[13px] text-[color:var(--muted)] lg:text-sm">
                        {u.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[color:var(--muted)] lg:text-[13px]">
                        <Building2 size={12} aria-hidden="true" />
                        <span className="truncate">
                          {clubNombre}
                          {clubUbicacion ? ` · ${clubUbicacion}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          limpiarErrorGuardado();
                          setUserModal(u);
                        }}
                        aria-label={`Editar ${u.nombre}`}
                        className="cursor-pointer rounded-[2px] p-1.5 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:p-2"
                      >
                        <Pencil size={14} aria-hidden="true" className="lg:h-4 lg:w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            uuid: u.uuid,
                            nombre: u.nombre,
                            rol: u.rol,
                            clubUuid: u.clubes[0]?.uuid ?? null,
                          })
                        }
                        aria-label={`Eliminar ${u.nombre}`}
                        className="cursor-pointer rounded-[2px] p-1.5 text-[color:var(--corner)] transition-colors hover:bg-[rgba(220,38,38,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] lg:p-2"
                      >
                        <AlertCircle size={14} aria-hidden="true" className="lg:h-4 lg:w-4" />
                      </button>
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ul>
        ) : (
          <Panel innerClassName="flex flex-col items-center gap-2 px-6 py-10 text-center lg:py-14">
            <Users
              size={28}
              aria-hidden="true"
              className="text-[color:var(--muted)] lg:h-9 lg:w-9"
            />
            <p className="text-sm text-[color:var(--muted)] lg:text-base">
              {hayFiltrosActivos
                ? "No encontramos usuarios que coincidan con los filtros."
                : "Aún no hay usuarios registrados. Crea el primero con Nuevo usuario."}
            </p>
            {hayFiltrosActivos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBusqueda("");
                  setFiltroCard("all");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </Panel>
        )}
      </main>

      {/* Modal usuario */}
      {userModal && (
        <Modal
          title={
            userModal === "new"
              ? esVistaClubes
                ? "Nuevo club"
                : "Nuevo usuario"
              : esVistaClubes
              ? "Editar club"
              : "Editar usuario"
          }
          onClose={() => {
            limpiarErrorGuardado();
            setUserModal(null);
          }}
          wide
        >
          {guardando && (
            <p
              role="status"
              className="mb-3 text-sm text-[color:var(--muted)] lg:text-base"
            >
              Guardando cambios…
            </p>
          )}
          {errorGuardado && (
            <p
              role="alert"
              className="mb-3 rounded-[2px] border border-[color:var(--corner)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[color:var(--corner)] lg:text-base"
            >
              {errorGuardado}
            </p>
          )}
          <SuperAdminUserForm
            initial={userModal === "new" ? null : userModal}
            clubes={clubes}
            disciplinasDisponibles={catalogoDisciplinas}
            regiones={REGIONES_COMUNAS}
            onSave={saveUser}
            onCancel={() => {
              limpiarErrorGuardado();
              setUserModal(null);
            }}
          />
        </Modal>
      )}

      {/* Confirmar eliminación */}
      {confirmDelete && (
        <ConfirmModal
          title="Confirmar eliminación"
          message={
            confirmDelete.rol === "ADMIN_CLUB" && confirmDelete.clubUuid
              ? `Se eliminará al usuario “${confirmDelete.nombre}” y su club asociado. Esta acción no se puede deshacer.`
              : `¿Seguro que quieres eliminar al usuario “${confirmDelete.nombre}”? Esta acción no se puede deshacer.`
          }
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/* ------------------------- Subcomponente StatCard ------------------------ */

function StatCard({
  icon,
  label,
  value,
  active = false,
  onClick,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const inner = (
    <Panel
      innerClassName={`px-3 py-3 transition-colors duration-150 lg:px-4 lg:py-4 ${
        active
          ? "!border-[color:var(--corner)] !bg-[color:var(--corner)]"
          : ""
      }`}
    >
      <div
        className={`flex items-center gap-1.5 transition-colors duration-150 ${
          active ? "text-white/85" : "text-[color:var(--muted)]"
        }`}
      >
        {icon}
        <span className="text-[12px] font-medium uppercase tracking-wide lg:text-[13px]">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 text-xl font-semibold transition-colors duration-150 lg:text-2xl ${
          active ? "text-white" : "text-[color:var(--ink)]"
        }`}
      >
        {value}
      </p>
    </Panel>
  );

  if (!onClick) return inner;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      className={`block w-full cursor-pointer rounded-[2px] text-left transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none ${
        active ? "" : "hover:-translate-y-px"
      }`}
    >
      {inner}
    </button>
  );
}