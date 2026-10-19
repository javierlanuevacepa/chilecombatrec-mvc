const usuariosService = require("../services/usuarios.service");
const { exito, error } = require("../utils/respuestaApi");

async function login(req, res, next) {
  try {
    const { correo, clave } = req.body;

    if (!correo || !clave) {
      return error(res, "Correo y clave son obligatorios", 400);
    }

    const resultado = await usuariosService.login(correo, clave);

    if (!resultado) {
      return error(res, "Usuario o clave incorrectos", 401);
    }

    if (resultado.sinPassword) {
      return error(
        res,
        'Tu cuenta aún no tiene contraseña. Usa la opción "¿Usuario nuevo? genera tu contraseña" para crearla.',
        403
      );
    }

    return exito(res, resultado, 200);
  } catch (err) {
    next(err);
  }
}

async function registrar(req, res) {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !rol) {
      return error(res, "Nombre, email y rol son obligatorios", 400);
    }

    // `password` es opcional: si viene, el service lo hashea con bcrypt
    // y lo guarda en `clave`. Si no viene, `clave` queda NULL.
    const usuario = await usuariosService.registrar({
      nombre,
      email,
      password,
      rolCodigo: rol,
    });

    return exito(res, { usuario_data: usuario }, 201);
  } catch (err) {
    console.error("Error en registrar:", err.message);

    if (err.message.includes("Ya existe")) {
      return error(res, err.message, 409);
    }

    if (err.message.includes("rol")) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al registrar usuario", 500);
  }
}

async function actualizar(req, res) {
  try {
    const { uuid } = req.params;
    const { nombre, email, rol } = req.body;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    // Al menos un campo actualizable debe venir.
    // NOTA: `password` se ignora aquí a propósito; para cambiarla
    // existe el endpoint dedicado `actualizarClave`.
    if (!nombre && !email && !rol) {
      return error(
        res,
        "Debes enviar al menos un campo para actualizar (nombre, email o rol)",
        400
      );
    }

    const usuario = await usuariosService.actualizar({
      uuid,
      nombre,
      email,
      rolCodigo: rol,
    });

    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en actualizar:", err.message);

    if (
      err.message.includes("no encontrado") ||
      err.message.includes("no se encontró")
    ) {
      return error(res, err.message, 404);
    }

    if (err.message.includes("Ya existe") || err.message.includes("eliminado")) {
      return error(res, err.message, 409);
    }

    return error(res, "Error al actualizar usuario", 500);
  }
}

async function eliminar(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    const usuario = await usuariosService.eliminar({ uuid });

    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en eliminar:", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }

    if (err.message.includes("ya estaba eliminado")) {
      return error(res, err.message, 409);
    }

    return error(res, "Error al eliminar usuario", 500);
  }
}

async function actualizarClave(req, res) {
  try {
    const { uuid } = req.params;
    const { password } = req.body;

    if (!uuid) {
      return error(res, "El uuid es obligatorio", 400);
    }

    if (!password) {
      return error(res, "La contraseña es obligatoria", 400);
    }

    const usuario = await usuariosService.actualizarClave({ uuid, password });

    return exito(res, { usuario_data: usuario }, 200);
  } catch (err) {
    console.error("Error en actualizarClave:", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }

    if (err.message.includes("eliminado")) {
      return error(res, err.message, 409);
    }

    if (
      err.message.includes("obligatoria") ||
      err.message.includes("al menos")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al actualizar la contraseña", 500);
  }
}

/**
 * Lista usuarios activos con su rol.
 * En el esquema MySQL actual no existe `usuario_app`, por eso
 * `apps` viene siempre como arreglo vacío desde el service.
 */
async function listarUsuarios(req, res) {
  try {
    const resultado = await usuariosService.listarUsuarios();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarUsuarios:", err.message);
    return error(res, "Error al listar usuarios", 500);
  }
}

module.exports = {
  login,
  registrar,
  actualizar,
  actualizarClave,
  eliminar,
  listarUsuarios,
};