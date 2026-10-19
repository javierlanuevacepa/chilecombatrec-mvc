"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import SessionService from "@/lib/services/SessionService";

type LoginModuloProps = {
  onForgotPassword?: () => void;
};

/**
 * Códigos de rol del backend (parametro.tipo_parametro = ROLES) → ruta del front.
 *  - ADMIN       : admin de sistema        → módulo de admin
 *  - ADMIN_CLUB  : admin de club de combate → módulo de admin
 *  - COACH_CLUB  : entrenador de club      → panel de coach
 * Ajusta el destino si ADMIN va a otro módulo distinto.
 */
const RUTA_POR_ROL: Record<string, string> = {
  ADMIN: "/backoffice/modulos/adminClub",
  ADMIN_CLUB: "/backoffice/modulos/adminClub",
  COACH_CLUB: "/backoffice/modulos/coach",
};

function rutaPorRol(codigo: string | null | undefined): string {
  if (!codigo) return "/";
  return RUTA_POR_ROL[codigo] ?? "/";
}

export default function LoginModulo({ onForgotPassword }: LoginModuloProps) {
  const router = useRouter();
  const { login } = useAuth();

  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const errorId = `${uid}-error`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    setError("");
    setPending(true);

    try {
      const result = await login(email.trim(), password);

      if (!result.ok) {
        // `result.mensaje` cubre: 401 (credenciales), 403 (sinPassword),
        // y errores de red (ya formateados por el hook).
        setError(result.mensaje);
        setPending(false);
        return;
      }

      // El hook ya persistió la sesión en localStorage de forma síncrona
      // dentro de `SessionService.guardarSesion`. Leemos el rol para decidir.
      const rol = SessionService.getRol();
      const destino = rutaPorRol(rol?.codigo);

      // `replace` para no dejar la pantalla de login en el historial
      // cuando el usuario ya está autenticado.
      router.replace(destino);
      // No reseteamos `pending`: el componente se desmonta al navegar.
    } catch (err) {
      // El hook nunca lanza (captura internamente), así que esto solo
      // cubriría fallos exóticos (ej. router roto). Mantener el estado
      // utilizable es mejor que dejar la UI colgada.
      console.error("Error inesperado en login:", err);
      setError("Error inesperado. Intenta nuevamente.");
      setPending(false);
    }
  };

  const hasError = Boolean(error);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-12 [--control-border:#7c8a9c] [background-image:repeating-linear-gradient(125deg,rgba(20,35,58,0.028)_0,rgba(20,35,58,0.028)_1px,transparent_1px,transparent_64px)] max-[480px]:px-[14px] max-[480px]:py-8">
      <div className="mb-8 text-center">
        <Link
          href="/"
          aria-label="ChileCombatREC, ir al inicio"
          className="inline-block text-[length:clamp(34px,9vw,56px)] uppercase leading-[0.95] tracking-[0.01em] text-[color:var(--ink)] [font-family:var(--font-display-stack)] [&>span]:text-[color:var(--corner)]"
        >
          ChileCombat<span>Rec</span>
        </Link>
        <p className="mt-3 text-[15px] text-[color:var(--muted)]">
          Seguimiento de registro de combates en Chile
        </p>
      </div>

      <section
        aria-labelledby={`${uid}-title`}
        className="w-full max-w-[400px] bg-[color:var(--line)] p-px [--cut:18px] [clip-path:polygon(var(--cut)_0,100%_0,100%_calc(100%_-_var(--cut)),calc(100%_-_var(--cut))_100%,0_100%,0_var(--cut))]"
      >
        <div className="bg-[color:var(--surface)] px-7 pb-6 pt-7 [--cut:17px] [clip-path:polygon(var(--cut)_0,100%_0,100%_calc(100%_-_var(--cut)),calc(100%_-_var(--cut))_100%,0_100%,0_var(--cut))] max-[480px]:px-[18px] max-[480px]:pb-5 max-[480px]:pt-6">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h1
              id={`${uid}-title`}
              className="text-[30px] font-normal leading-[1.05] tracking-[0.005em] text-[color:var(--ink)] [font-family:var(--font-display-stack)]"
            >
              Acceso
            </h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <Mail
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 text-[color:var(--muted)]"
                />
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  placeholder="coach@gimnasio.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={hasError && !email.trim()}
                  aria-describedby={hasError ? errorId : undefined}
                  className="w-full rounded-[2px] border border-[color:var(--control-border)] bg-white py-3 pl-10 pr-3 text-base leading-[1.3] text-[color:var(--ink)] outline outline-2 outline-transparent transition-[border-color,box-shadow] duration-150 [font-family:var(--font-sans-stack)] placeholder:text-[#6b7788] focus:border-[color:var(--corner)] focus:shadow-[0_0_0_1px_var(--corner)] aria-[invalid=true]:border-[color:var(--corner)] motion-reduce:transition-none"
                />
              </div>
            </div>

            <div className="mb-[18px]">
              <label htmlFor={passwordId} className="mb-1.5 block text-sm font-medium">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 text-[color:var(--muted)]"
                />
                <input
                  id={passwordId}
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={hasError && !password.trim()}
                  aria-describedby={hasError ? errorId : undefined}
                  className="w-full rounded-[2px] border border-[color:var(--control-border)] bg-white py-3 pl-10 pr-12 text-base leading-[1.3] text-[color:var(--ink)] outline outline-2 outline-transparent transition-[border-color,box-shadow] duration-150 [font-family:var(--font-sans-stack)] placeholder:text-[#6b7788] focus:border-[color:var(--corner)] focus:shadow-[0_0_0_1px_var(--corner)] aria-[invalid=true]:border-[color:var(--corner)] motion-reduce:transition-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPass}
                  className="absolute right-1 grid h-10 w-10 cursor-pointer place-items-center rounded-[2px] border-0 bg-transparent text-[color:var(--muted)] hover:text-[color:var(--ink)]"
                >
                  {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {hasError && (
              <p id={errorId} role="alert" className="mb-1 text-sm text-[color:var(--corner)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-4 w-full cursor-pointer rounded-[2px] border-0 bg-[color:var(--corner)] px-4 py-[13px] text-base font-semibold leading-[1.2] text-white transition-colors duration-150 [font-family:var(--font-sans-stack)] hover:enabled:bg-[color:var(--corner-dark)] disabled:cursor-progress disabled:opacity-70 motion-reduce:transition-none"
            >
              {pending ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {/* <div className="mt-[18px] grid gap-1 text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="cursor-pointer justify-self-center border-0 bg-transparent px-1 py-1.5 text-sm text-[color:var(--ink-soft)] underline underline-offset-[3px] [font-family:var(--font-sans-stack)] hover:text-[color:var(--ink)]"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div> */}
        </div>
      </section>

      <p className="mt-7 text-[13px] text-[color:var(--muted)]">Equipo ChileCombatRec, proyecto de título</p>
    </main>
  );
}