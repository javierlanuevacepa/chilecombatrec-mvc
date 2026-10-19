// lib/SessionService.ts
//
// Único lugar del proyecto que lee/escribe localStorage.
// Guardas de SSR: en el servidor (Next.js) `localStorage` no existe,
// así que todos los accesos devuelven null/[] silenciosamente en SSR.
// Los componentes que lo usan deben ser "use client" o invocarlo dentro
// de useEffect / event handlers.

export type Rol = {
  uuid: string | null;
  codigo: string | null;
  nombre: string | null;
};


/**
 * Contrato de `usuario_data` que devuelve el backend en /login.
 * Coincide con lo que arma `usuarios.service.js` en el back.
 */
export type UsuarioData = {
  uuid: string;
  nombre: string;
  email: string;
  rol: Rol | string; // string por compatibilidad con formatos viejos
};

const PREFIJO = "chilecombatrec_";

// ── Guardas de entorno ────────────────────────────────────────────
function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function safeGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(PREFIJO + key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PREFIJO + key, value);
  } catch {
    /* quota / privacy mode: no-op */
  }
}

function safeRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(PREFIJO + key);
  } catch {
    /* no-op */
  }
}

// ── Servicio ──────────────────────────────────────────────────────
export default class SessionService {
  // ── token ──
  static getToken(): string | null {
    return safeGet("token");
  }
  static setToken(token: string): void {
    safeSet("token", token);
  }

  // ── nombre ──
  static getNombre(): string | null {
    return safeGet("nombre");
  }
  static setNombre(nombre: string): void {
    safeSet("nombre", nombre);
  }

  // ── id de usuario ──
  static getUsuarioId(): string | null {
    return safeGet("usuario_id");
  }
  static setUsuarioId(id: string): void {
    safeSet("usuario_id", id);
  }

  // ── correo ──
  static getEmail(): string | null {
    return safeGet("email");
  }
  static setEmail(email: string): void {
    safeSet("email", email);
  }

  // ── rol ──
  static getRol(): Rol | null {
    const raw = safeGet("rol");
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);

      // Formato nuevo: JSON con { uuid, codigo, nombre }
      if (parsed && typeof parsed === "object") {
        const r = parsed as Partial<Rol>;
        return {
          uuid: r.uuid ?? null,
          codigo: r.codigo ?? null,
          nombre: r.nombre ?? null,
        };
      }

      // JSON válido pero primitivo (número, boolean, string)
      const asString = String(parsed);
      return { uuid: null, codigo: asString, nombre: asString };
    } catch {
      // Formato viejo: string plano ("[object Object]", "admin", …)
      return { uuid: null, codigo: raw, nombre: raw };
    }
  }

  static setRol(rol: Rol | string | null | undefined): void {
    const normalizado: Rol =
      rol && typeof rol === "object"
        ? {
            uuid: rol.uuid ?? null,
            codigo: rol.codigo ?? null,
            nombre: rol.nombre ?? null,
          }
        : { uuid: null, codigo: rol ?? null, nombre: rol ?? null };

    safeSet("rol", JSON.stringify(normalizado));
  }

  // ── helpers de sesión ──
  static hasSession(): boolean {
    return Boolean(this.getToken());
  }

  /**
   * Guarda toda la sesión de una vez. `apps` es opcional para
   * no romper si el backend todavía no devuelve el campo.
   */
  static guardarSesion(usuarioData: UsuarioData, token: string): void {
    this.setToken(token);
    this.setNombre(usuarioData.nombre);
    this.setUsuarioId(usuarioData.uuid);
    this.setEmail(usuarioData.email);
    this.setRol(usuarioData.rol);
  }

  static lockout(): void {
    safeRemove("token");
    safeRemove("nombre");
    safeRemove("usuario_id");
    safeRemove("email");
    safeRemove("rol");
    safeRemove("apps");
  }

  static clearSession(): void {
    this.lockout();
  }
}