const clubesService = require("../services/clubes.service");
const { exito, error } = require("../utils/respuestaApi");

// ===============================================================
// LISTAR
// ===============================================================
async function listarClubes(req, res) {
  try {
    const resultado = await clubesService.listarClubes();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarClubes:", err.message);
    return error(res, "Error al listar clubes", 500);
  }
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================
async function buscarPorUuid(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    const club = await clubesService.buscarPorUuid(uuid);
    return exito(res, { club_data: club }, 200);
  } catch (err) {
    console.error("Error en buscarPorUuid (club):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al buscar club", 500);
  }
}

// ===============================================================
// REGISTRAR
// ===============================================================
async function registrar(req, res) {
  try {
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
    } = req.body;

    if (!nombre) {
      return error(res, "El nombre del club es obligatorio", 400);
    }

    // `usuarios`, `disciplinas` y `sedes` son opcionales.
    // El service valida la forma de `sedes` antes de ir al repo.
    const club = await clubesService.registrar({
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

    return exito(res, { club_data: club }, 201);
  } catch (err) {
    console.error("Error en registrar (club):", err.message);

    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("debe ser") ||
      err.message.includes("arreglo")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al registrar club", 500);
  }
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
async function actualizar(req, res) {
  try {
    const { uuid } = req.params;
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
    } = req.body;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    // PATCH parcial: al menos un campo debe venir.
    // `usuarios: []`, `disciplinas: []` y `sedes: []` son VÁLIDOS
    // (vaciar relaciones), por eso comparamos con `undefined`.
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
      return error(res, "Debes enviar al menos un campo para actualizar", 400);
    }

    const club = await clubesService.actualizar({
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

    return exito(res, { club_data: club }, 200);
  } catch (err) {
    console.error("Error en actualizar (club):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("no existe") || err.message.includes("no pertenece")) {
      return error(res, err.message, 400);
    }
    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("debe ser") ||
      err.message.includes("arreglo") ||
      err.message.includes("al menos")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al actualizar club", 500);
  }
}

// ===============================================================
// ELIMINAR (soft delete)
// ===============================================================
async function eliminar(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    const club = await clubesService.eliminar({ uuid });
    return exito(res, { club_data: club }, 200);
  } catch (err) {
    console.error("Error en eliminar (club):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("ya estaba eliminado")) {
      return error(res, err.message, 409);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al eliminar club", 500);
  }
}

async function listarClubesPorUsuario(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return error(res, "El uuid del usuario es obligatorio", 400);
    }

    const resultado = await clubesService.listarClubesPorUsuario(uuid);
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarClubesPorUsuario:", err.message);

    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al listar clubes del usuario", 500);
  }
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