const clubesRepository = require("../repositories/clubes.repository");

// ===============================================================
// Validaciones internas
// ===============================================================

function _validarSede(s) {
  if (!s) throw new Error("Cada sede debe ser un objeto");
  if (!s.uuid) {
    // Sede nueva: exige nombre y comuna
    if (!s.nombre) throw new Error("El nombre de la sede es obligatorio");
    if (!s.comuna_uuid)
      throw new Error("La comuna de la sede es obligatoria");
  }
  // Sede existente: el repo valida ownership; aquí solo validamos tipo
  if (s.uuid && typeof s.uuid !== "string") {
    throw new Error("El uuid de la sede debe ser un string");
  }
}

function _validarSedes(sedes) {
  if (!Array.isArray(sedes)) throw new Error("`sedes` debe ser un arreglo");
  sedes.forEach(_validarSede);
}

// ===============================================================
// LISTAR
// ===============================================================
async function listarClubes() {
  const clubes = await clubesRepository.listarTodos();
  return { clubes_data: clubes };
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================
async function buscarPorUuid(uuid) {
  if (!uuid) throw new Error("El uuid del club es obligatorio");

  const club = await clubesRepository.buscarPorUuid(uuid);
  if (!club) throw new Error("Club no encontrado");

  return club;
}

// ===============================================================
// REGISTRAR
// ===============================================================
/**
 * Crea un club con sus relaciones (usuarios, disciplinas, sedes).
 * `usuarios` y `disciplinas` son arreglos de uuid (o {uuid}).
 * `sedes` es un arreglo de objetos: cada nueva sede requiere
 * `nombre` y `comuna_uuid`.
 */
async function registrar(datos) {
  const {
    nombre,
    url_foto,
    descripcion,
    fecha_fundacion,
    correo_institucional,
    telefono,
    usuarios,
    disciplinas,
    sedes,
  } = datos;

  if (!nombre) throw new Error("El nombre del club es obligatorio");

  if (sedes !== undefined) _validarSedes(sedes);

  const club = await clubesRepository.crear({
    nombre,
    url_foto,
    descripcion,
    fecha_fundacion,
    correo_institucional,
    telefono,
    usuarios: usuarios ?? [],
    disciplinas: disciplinas ?? [],
    sedes: sedes ?? [],
  });

  return club;
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
/**
 * PATCH parcial: `undefined` = no tocar, `[]` = vaciar la relación.
 * Las sedes se identifican por `uuid`; las que no lo traen se crean.
 * Las sedes activas que no vengan en el payload se soft-deletean
 * (comportamiento del repo).
 */
async function actualizar(datos) {
  const {
    uuid,
    nombre,
    url_foto,
    descripcion,
    fecha_fundacion,
    correo_institucional,
    telefono,
    usuarios,
    disciplinas,
    sedes,
  } = datos;

  if (!uuid) throw new Error("El uuid del club es obligatorio");

  const hayCambios =
    nombre !== undefined ||
    url_foto !== undefined ||
    descripcion !== undefined ||
    fecha_fundacion !== undefined ||
    correo_institucional !== undefined ||
    telefono !== undefined ||
    usuarios !== undefined ||
    disciplinas !== undefined ||
    sedes !== undefined;

  if (!hayCambios) {
    throw new Error("Debes enviar al menos un campo para actualizar");
  }

  if (sedes !== undefined) _validarSedes(sedes);

  const club = await clubesRepository.actualizar({
    uuid,
    nombre,
    url_foto,
    descripcion,
    fecha_fundacion,
    correo_institucional,
    telefono,
    usuarios,
    disciplinas,
    sedes,
  });

  return club;
}

// ===============================================================
// ELIMINAR
// ===============================================================
async function eliminar({ uuid }) {
  if (!uuid) throw new Error("El uuid del club es obligatorio");

  const club = await clubesRepository.eliminar({ uuid });
  return club;
}

async function listarClubesPorUsuario(usuarioUuid) {
  if (!usuarioUuid) throw new Error("El uuid del usuario es obligatorio");

  const clubes = await clubesRepository.listarPorUsuario(usuarioUuid);
  return { clubes_data: clubes };
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  listarClubes,
  buscarPorUuid,
  registrar,
  actualizar,
  eliminar,
  listarClubesPorUsuario
};