const superadminService = require("../services/superadmin.service");
const { exito, error } = require("../utils/respuestaApi");

// ===============================================================
// LISTAR
// ===============================================================
async function listarUsuarios(req, res) {
  try {
    const resultado = await superadminService.listarUsuarios();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarUsuarios:", err.message);
    return error(res, "Error al listar usuarios", 500);
  }
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================
async function buscarUsuarioPorUuid(req, res) {
  try {
    const { uuid } = req.params;
    if (!uuid) return error(res, "El uuid es obligatorio", 400);

    const usuario = await superadminService.buscarUsuarioPorUuid(uuid);
    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en buscarUsuarioPorUuid:", err.message);

    if (err.message.includes("no encontrado")) return error(res, err.message, 404);
    if (err.message.includes("obligatorio")) return error(res, err.message, 400);

    return error(res, "Error al buscar usuario", 500);
  }
}

// ===============================================================
// REGISTRAR
// ===============================================================
async function registrarUsuario(req, res) {
  try {
    const usuario = await superadminService.registrarUsuario(req.body);
    return exito(res, { usuario_data: usuario }, 201);
  } catch (err) {
    console.error("Error en registrarUsuario:", err.message);

    if (err.message.includes("Ya existe") || err.message.includes("Duplicate")) {
      return error(res, "El correo electrónico ya está registrado", 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("inválid") ||
      err.message.includes("válido") ||
      err.message.includes("al menos") ||
      err.message.includes("Rol")
    ) {
      return error(res, err.message, 400);
    }
    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }

    return error(res, "Error al registrar usuario", 500);
  }
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
async function actualizarUsuario(req, res) {
  try {
    const { uuid } = req.params;
    if (!uuid) return error(res, "El uuid es obligatorio", 400);

    const usuario = await superadminService.actualizarUsuario({
      uuid,
      ...req.body,
    });
    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en actualizarUsuario:", err.message);

    if (err.message.includes("no encontrado")) return error(res, err.message, 404);
    if (err.message.includes("Ya existe") || err.message.includes("Duplicate")) {
      return error(res, "El correo electrónico ya está registrado", 409);
    }
    if (
      err.message.includes("obligatori") ||
      err.message.includes("inválid") ||
      err.message.includes("válido") ||
      err.message.includes("al menos") ||
      err.message.includes("Rol")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al actualizar usuario", 500);
  }
}

// ===============================================================
// CAMBIAR ESTADO
// ===============================================================
async function cambiarEstadoUsuario(req, res) {
  try {
    const { uuid } = req.params;
    const { activo } = req.body;
    if (!uuid) return error(res, "El uuid es obligatorio", 400);

    const usuario = await superadminService.cambiarEstadoUsuario({ uuid, activo });
    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en cambiarEstadoUsuario:", err.message);

    if (err.message.includes("no encontrado")) return error(res, err.message, 404);
    if (err.message.includes("obligatorio") || err.message.includes("booleano")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al cambiar estado del usuario", 500);
  }
}

// ===============================================================
// ELIMINAR
// ===============================================================
async function eliminarUsuario(req, res) {
  try {
    const { uuid } = req.params;
    const { eliminar_club } = req.query;
    if (!uuid) return error(res, "El uuid es obligatorio", 400);

    const usuario = await superadminService.eliminarUsuario({
      uuid,
      eliminar_club: eliminar_club === "true" || eliminar_club === true,
    });
    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en eliminarUsuario:", err.message);

    if (err.message.includes("no encontrado")) return error(res, err.message, 404);
    if (err.message.includes("ya estaba eliminado")) return error(res, err.message, 409);
    if (err.message.includes("obligatorio")) return error(res, err.message, 400);

    return error(res, "Error al eliminar usuario", 500);
  }
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