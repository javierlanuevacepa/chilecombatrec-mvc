const deportistasService = require("../services/deportistas.service");
const { exito, error } = require("../utils/respuestaApi");

// ===============================================================
// LISTAR
// ===============================================================
async function listarDeportistas(req, res) {
  try {
    const resultado = await deportistasService.listarDeportistas();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarDeportistas:", err.message);
    return error(res, "Error al listar deportistas", 500);
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

    const deportista = await deportistasService.buscarPorUuid(uuid);
    return exito(res, { deportista_data: deportista }, 200);
  } catch (err) {
    console.error("Error en buscarPorUuid (deportista):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al buscar deportista", 500);
  }
}

// ===============================================================
// REGISTRAR
// ===============================================================
async function registrar(req, res) {
  try {
    const {
      rut,
      digito_verif,
      p_nombre,
      s_nombre,
      p_apellido,
      s_apellido,
      alias,
      nacionalidad,
      fecha_nacimiento,
      genero,
      peso_en_kg,
      estatura_en_cm,
      clubs,
      disciplinas,
      records,
    } = req.body;

    // Validación mínima de presencia: el service valida reglas de negocio
    if (
      !rut ||
      !digito_verif ||
      !p_nombre ||
      !p_apellido ||
      !fecha_nacimiento ||
      !genero ||
      peso_en_kg == null
    ) {
      return error(
        res,
        "RUT, dígito verificador, primer nombre, primer apellido, fecha de nacimiento, género y peso son obligatorios",
        400
      );
    }

    const deportista = await deportistasService.registrar({
      rut,
      digito_verif,
      p_nombre,
      s_nombre,
      p_apellido,
      s_apellido,
      alias,
      nacionalidad,
      fecha_nacimiento,
      genero,
      peso_en_kg,
      estatura_en_cm,
      clubs,
      disciplinas,
      records,
    });

    return exito(res, { deportista_data: deportista }, 201);
  } catch (err) {
    console.error("Error en registrar (deportista):", err.message);

    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("debe ser") ||
      err.message.includes("mayor a")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al registrar deportista", 500);
  }
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
async function actualizar(req, res) {
  try {
    const { uuid } = req.params;
    const {
      rut,
      digito_verif,
      p_nombre,
      s_nombre,
      p_apellido,
      s_apellido,
      alias,
      nacionalidad,
      fecha_nacimiento,
      genero,
      peso_en_kg,
      estatura_en_cm,
      clubs,
      disciplinas,
      records,
    } = req.body;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    // PATCH parcial: al menos un campo debe venir.
    // `clubs: []`, `disciplinas: []` y `records: []` son VÁLIDOS
    // (vaciar relaciones), por eso comparamos con `undefined`.
    const hayCambios =
      rut !== undefined ||
      digito_verif !== undefined ||
      p_nombre !== undefined ||
      s_nombre !== undefined ||
      p_apellido !== undefined ||
      s_apellido !== undefined ||
      alias !== undefined ||
      nacionalidad !== undefined ||
      fecha_nacimiento !== undefined ||
      genero !== undefined ||
      peso_en_kg !== undefined ||
      estatura_en_cm !== undefined ||
      clubs !== undefined ||
      disciplinas !== undefined ||
      records !== undefined;

    if (!hayCambios) {
      return error(res, "Debes enviar al menos un campo para actualizar", 400);
    }

    const deportista = await deportistasService.actualizar({
      uuid,
      rut,
      digito_verif,
      p_nombre,
      s_nombre,
      p_apellido,
      s_apellido,
      alias,
      nacionalidad,
      fecha_nacimiento,
      genero,
      peso_en_kg,
      estatura_en_cm,
      clubs,
      disciplinas,
      records,
    });

    return exito(res, { deportista_data: deportista }, 200);
  } catch (err) {
    console.error("Error en actualizar (deportista):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("debe ser") ||
      err.message.includes("mayor a") ||
      err.message.includes("al menos")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al actualizar deportista", 500);
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

    const deportista = await deportistasService.eliminar({ uuid });
    return exito(res, { deportista_data: deportista }, 200);
  } catch (err) {
    console.error("Error en eliminar (deportista):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("ya estaba eliminado")) {
      return error(res, err.message, 409);
    }
    if (err.message.includes("obligatorio")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al eliminar deportista", 500);
  }
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  listarDeportistas,
  buscarPorUuid,
  registrar,
  actualizar,
  eliminar,
};