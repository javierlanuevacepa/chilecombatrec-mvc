const coachesService = require("../services/coaches.service");
const { exito, error } = require("../utils/respuestaApi");

// ===============================================================
// LISTAR
// ===============================================================
async function listarCoaches(req, res) {
  try {
    const resultado = await coachesService.listarCoaches();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarCoaches:", err.message);
    return error(res, "Error al listar coaches", 500);
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

    const coach = await coachesService.buscarPorUuid(uuid);
    return exito(res, { coach_data: coach }, 200);
  } catch (err) {
    console.error("Error en buscarPorUuid (coach):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al buscar coach", 500);
  }
}

// ===============================================================
// REGISTRAR
// ===============================================================
async function registrar(req, res) {
  try {
    const { nombre, correo_electronico, password, clubs, disciplinas } =
      req.body;

    if (!nombre || !correo_electronico) {
      return error(res, "Nombre y correo_electronico son obligatorios", 400);
    }

    // El uuid del usuario logueado viene del JWT (AuthMiddleware)
    const adminUuid = req.usuario?.uuid ?? null;
  
    const coach = await coachesService.registrar({
      nombre,
      correo_electronico,
      password,
      clubs,          // si viene, se respeta
      disciplinas,
      adminUuid,      // fallback: el service resuelve el club del admin
    });

    return exito(res, { coach_data: coach }, 201);
  } catch (err) {
    console.error("Error en registrar (coach):", err.message);

    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatorio") ||
      err.message.includes("contraseña") ||
      err.message.includes("rol") ||
      err.message.includes("al menos a un club")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al registrar coach", 500);
  }
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
async function actualizar(req, res) {
  try {
    const { uuid } = req.params;
    const { nombre, correo_electronico, password, clubs, disciplinas } =
      req.body;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    // PATCH parcial: al menos un campo debe venir en el body.
    // Ojo: `clubs: []` y `disciplinas: []` son VÁLIDOS (vaciar relaciones),
    // por eso comparamos con `undefined`, no con falsy.
    const hayCambios =
      nombre !== undefined ||
      correo_electronico !== undefined ||
      password !== undefined ||
      clubs !== undefined ||
      disciplinas !== undefined;

    if (!hayCambios) {
      return error(res, "Debes enviar al menos un campo para actualizar", 400);
    }

    const coach = await coachesService.actualizar({
      uuid,
      nombre,
      correo_electronico,
      password,
      clubs,
      disciplinas,
    });

    return exito(res, { coach_data: coach }, 200);
  } catch (err) {
    console.error("Error en actualizar (coach):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("eliminado")
    ) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatorio") ||
      err.message.includes("contraseña") ||
      err.message.includes("al menos")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al actualizar coach", 500);
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

    const coach = await coachesService.eliminar({ uuid });
    return exito(res, { coach_data: coach }, 200);
  } catch (err) {
    console.error("Error en eliminar (coach):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("ya estaba eliminado")) {
      return error(res, err.message, 409);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al eliminar coach", 500);
  }
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