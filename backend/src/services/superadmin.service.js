const bcrypt = require("bcrypt");
const superadminRepository = require("../repositories/superadmin.repository");

// ===============================================================
// Constantes
// ===============================================================

const ROLES_VALIDOS = new Set(["ADMIN", "ADMIN_CLUB", "COACH_CLUB"]);
const PASSWORD_MIN_LEN = 8;

// ===============================================================
// Helpers de validación
// ===============================================================

function _validarUsuario({ nombre, correo_electronico, password }, { requerirPassword } = {}) {
  if (!nombre || !nombre.trim()) {
    throw new Error("El nombre es obligatorio");
  }
  if (!correo_electronico || !/^\S+@\S+\.\S+$/.test(correo_electronico)) {
    throw new Error("El correo electrónico no es válido");
  }
  if (requerirPassword) {
    if (!password || password.length < PASSWORD_MIN_LEN) {
      throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`);
    }
  } else if (password && password.length < PASSWORD_MIN_LEN) {
    throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`);
  }
}

function _validarClub(club) {
  if (!club || !club.nombre || !club.nombre.trim()) {
    throw new Error("El nombre del club es obligatorio");
  }
  if (club.fecha_fundacion && club.fecha_fundacion > new Date().toISOString().slice(0, 10)) {
    throw new Error("La fecha de fundación no puede ser futura");
  }
  if (Array.isArray(club.disciplinas) && club.disciplinas.length === 0) {
    throw new Error("Debes seleccionar al menos una disciplina del club");
  }
  if (club.correo_institucional && !/^\S+@\S+\.\S+$/.test(club.correo_institucional)) {
    throw new Error("El correo institucional del club no es válido");
  }
}

async function _hashearClave(password) {
  // TODO: si ya tienes un util de hashing (bcrypt/argon2) reemplaza esta línea
  return bcrypt.hash(password, 10);
}

// ===============================================================
// Serialización para el frontend (camelCase)
// ===============================================================

function _mapRol(raw) {
  return raw?.codigo ?? "ADMIN";
}

function _mapClub(raw) {
  if (!raw) return null;
  const sede = raw.sedes?.[0];
  return {
    id:              raw.uuid,
    uuid:            raw.uuid,
    nombre:          raw.nombre,
    descripcion:     raw.descripcion ?? null,
    telefono:        raw.telefono ?? null,
    correo:          raw.correo_institucional ?? null,
    urlFoto:         raw.url_foto ?? null,
    fechaFundacion:  raw.fecha_fundacion ?? null,
    disciplinas:     (raw.disciplinas ?? []).map((d) => d.uuid),
    disciplinasData: raw.disciplinas ?? [],
    region:          sede?.region?.nombre ?? null,
    comuna:          sede?.comuna?.nombre ?? null,
    sedes:           raw.sedes ?? [],
    administradores: raw.administradores ?? [],
    coachesCount:    Number(raw.coaches_count ?? 0),
    deportistasCount:Number(raw.deportistas_count ?? 0),
  };
}

function _serializarUsuario(raw) {
  if (!raw) return null;
  const clubes = (raw.clubes ?? []).map(_mapClub);
  return {
    id:             raw.uuid,
    uuid:           raw.uuid,
    nombre:         raw.nombre,
    email:          raw.correo_electronico,
    activo:         !!raw.activo,
    fechaRegistro:  raw.fecha_registro,
    rol:            _mapRol(raw.rol),
    clubUuid:       clubes[0]?.uuid ?? null,
    clubes,
  };
}

// ===============================================================
// LISTAR
// ===============================================================

async function listarUsuarios() {
  const raw = await superadminRepository.listarUsuarios();
  return { usuarios_data: raw.map(_serializarUsuario) };
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================

async function buscarUsuarioPorUuid(uuid) {
  if (!uuid) throw new Error("El uuid del usuario es obligatorio");
  const raw = await superadminRepository.buscarUsuarioPorUuid(uuid);
  if (!raw) throw new Error("Usuario no encontrado");
  return _serializarUsuario(raw);
}

// ===============================================================
// REGISTRAR (usuario + club atómico)
// ===============================================================

/**
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.correo_electronico
 * @param {string} datos.password
 * @param {string} datos.rol             "ADMIN" | "ADMIN_CLUB" | "COACH_CLUB"
 * @param {object} [datos.club]          requerido si rol = ADMIN_CLUB
 * @param {string} [datos.club_uuid]     requerido si rol = COACH_CLUB
 * @param {string} [datos.telefono]      opcional para COACH_CLUB
 */
async function registrarUsuario(datos) {
  const {
    nombre,
    correo_electronico,
    password,
    rol,
    club,
    club_uuid,
    telefono,
  } = datos ?? {};

  if (!ROLES_VALIDOS.has(rol)) {
    throw new Error("Rol inválido");
  }
  _validarUsuario({ nombre, correo_electronico, password }, { requerirPassword: true });

  const claveHash = await _hashearClave(password);
  const usuario = {
    nombre:             nombre.trim(),
    correo_electronico: correo_electronico.trim().toLowerCase(),
    clave:              claveHash,
  };

  let raw;
  if (rol === "ADMIN_CLUB") {
    _validarClub(club);
    raw = await superadminRepository.crearUsuarioConClub({ usuario, club });
  } else if (rol === "COACH_CLUB") {
    if (!club_uuid) throw new Error("Debes asignar un club al entrenador");
    raw = await superadminRepository.crearUsuarioCoach({ usuario, clubUuid: club_uuid, telefono });
  } else {
    raw = await superadminRepository.crearUsuarioAdmin({ usuario });
  }

  return _serializarUsuario(raw);
}

// ===============================================================
// ACTUALIZAR
// ===============================================================

/**
 * PATCH parcial. Solo se actualiza lo que venga.
 * @param {object} datos
 * @param {string} datos.uuid
 * @param {object} [datos.nombre]
 * @param {object} [datos.correo_electronico]
 * @param {object} [datos.password]        opcional; si viene, se rehashea
 * @param {object} [datos.rol]             permite cambio de rol
 * @param {object} [datos.activo]
 * @param {object} [datos.club]            datos del club (ADMIN_CLUB)
 * @param {string} [datos.club_uuid]       uuid del club (COACH_CLUB)
 */
async function actualizarUsuario(datos) {
  const { uuid, password, nombre, correo_electronico, rol, activo, club, club_uuid } = datos ?? {};
  if (!uuid) throw new Error("El uuid del usuario es obligatorio");

  const hayCambios =
    nombre !== undefined ||
    correo_electronico !== undefined ||
    password !== undefined ||
    rol !== undefined ||
    activo !== undefined ||
    club !== undefined ||
    club_uuid !== undefined;
  if (!hayCambios) throw new Error("Debes enviar al menos un campo para actualizar");

  if (rol !== undefined && !ROLES_VALIDOS.has(rol)) {
    throw new Error("Rol inválido");
  }

  const usuario = {};
  if (nombre !== undefined) usuario.nombre = String(nombre).trim();
  if (correo_electronico !== undefined) {
    _validarUsuario({ nombre: "tmp", correo_electronico, password: null });
    usuario.correo_electronico = String(correo_electronico).trim().toLowerCase();
  }
  if (password !== undefined && password !== null && password !== "") {
    if (password.length < PASSWORD_MIN_LEN) {
      throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`);
    }
    usuario.clave = await _hashearClave(password);
  }
  if (rol !== undefined) usuario.rol = rol;
  if (activo !== undefined) usuario.activo = !!activo;

  if (club !== undefined && club !== null) _validarClub(club);

  const raw = await superadminRepository.actualizarUsuario({
    uuid,
    usuario,
    club: club ?? undefined,
    clubExistenteUuid: club_uuid ?? undefined,
  });

  return _serializarUsuario(raw);
}

// ===============================================================
// CAMBIAR ESTADO
// ===============================================================

async function cambiarEstadoUsuario({ uuid, activo }) {
  if (!uuid) throw new Error("El uuid del usuario es obligatorio");
  if (typeof activo !== "boolean") throw new Error("`activo` debe ser booleano");

  const raw = await superadminRepository.cambiarEstadoUsuario({ uuid, activo });
  return _serializarUsuario(raw);
}

// ===============================================================
// ELIMINAR
// ===============================================================

async function eliminarUsuario({ uuid, eliminar_club }) {
  if (!uuid) throw new Error("El uuid del usuario es obligatorio");

  const raw = await superadminRepository.eliminarUsuario({
    uuid,
    eliminarClub: !!eliminar_club,
  });
  return _serializarUsuario(raw);
}

// ===============================================================
// EXPORTS
// ===============================================================

module.exports = {
  listarUsuarios,
  buscarUsuarioPorUuid,
  registrarUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
};