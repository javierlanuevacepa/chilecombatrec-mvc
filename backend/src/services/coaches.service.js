const bcrypt = require("bcrypt");
const coachesRepository = require("../repositories/coach.repository");

const SALT_ROUNDS = 10;
const ROL_COACH = "COACH_CLUB";
const PASSWORD_MIN_LENGTH = 8;

// ===============================================================
// LISTAR
// ===============================================================
async function listarCoaches() {
  const coaches = await coachesRepository.listarTodos();
  return { coaches_data: coaches };
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================
async function buscarPorUuid(uuid) {
  if (!uuid) throw new Error("El uuid del coach es obligatorio");

  const coach = await coachesRepository.buscarPorUuid(uuid);
  if (!coach) throw new Error("Coach no encontrado");

  return coach;
}

// ===============================================================
// REGISTRAR
// ===============================================================
/**
 * - `password` es opcional: si viene, se hashea y va a `clave`.
 *   Si no viene, `clave` queda NULL (coach creado por admin sin
 *   clave, luego el coach la genera).
 * - `clubs` y `disciplinas` son opcionales (arreglos).
 * - El UUID lo genera MySQL vía DEFAULT (UUID_TO_BIN(UUID(), 1)).
 */
async function registrar({
  nombre,
  correo_electronico,
  password,
  clubs,
  disciplinas,
  adminUuid,
}) {
  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!correo_electronico) throw new Error("El correo es obligatorio");

  let clave = null;
  if (password) {
    if (typeof password !== "string" || password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }
    clave = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const coach = await coachesRepository.crear({
    nombre,
    correo_electronico,
    clave,
    rolCodigo: "COACH_CLUB",
    clubs,           // puede ser undefined → el repo resuelve por adminUuid
    disciplinas: disciplinas ?? [],
    adminUuid,
  });

  return coach;
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
/**
 * Reglas:
 *  - Debe venir al menos un campo (`undefined` = "no tocar").
 *  - Si `password` viene, se hashea.
 *  - Si `clubs` / `disciplinas` vienen `undefined`, no se tocan.
 *  - Si vienen `[]`, se desactivan todas las relaciones actuales.
 *  - Pre-check sólo cuando se va a hashear (evita gastar ~100ms
 *    de bcrypt si el coach no existe o está eliminado).
 */
async function actualizar({
  uuid,
  nombre,
  correo_electronico,
  password,
  clubs,
  disciplinas,
}) {
  if (!uuid) throw new Error("El uuid del coach es obligatorio");

  const hayCambios =
    nombre !== undefined ||
    correo_electronico !== undefined ||
    password !== undefined ||
    clubs !== undefined ||
    disciplinas !== undefined;

  if (!hayCambios) {
    throw new Error("Debes enviar al menos un campo para actualizar");
  }

  let clave;
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      );
    }

    const existente = await coachesRepository.buscarPorUuid(uuid);
    if (!existente) throw new Error("Coach no encontrado");
    if (existente.activo === false) throw new Error("El coach está eliminado");

    clave = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const coach = await coachesRepository.actualizar({
    uuid,
    nombre,
    correo_electronico,
    clave,
    clubs,
    disciplinas,
  });

  return coach;
}

// ===============================================================
// ELIMINAR
// ===============================================================
async function eliminar({ uuid }) {
  if (!uuid) throw new Error("El uuid del coach es obligatorio");

  const coach = await coachesRepository.eliminar({ uuid });
  return coach;
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  listarCoaches,
  buscarPorUuid,
  registrar,
  actualizar,
  eliminar,
};