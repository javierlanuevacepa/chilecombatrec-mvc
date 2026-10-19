const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usuariosRepository = require("../repositories/usuarios.repository");

const SALT_ROUNDS = 10;

/**
 * Login contra MySQL.
 * - buscarPorCorreo devuelve: uuid, nombre, correo_electronico, clave,
 *   rol (uuid string), rol_codigo, rol_nombre.
 * - La tabla usuario_app NO existe en el esquema actual,
 *   por eso `apps` viaja vacío tanto en el JWT como en usuario_data.
 */
async function login(correo, clave) {
  const usuario = await usuariosRepository.buscarPorCorreo(correo);
  if (!usuario) return null;

  if (!usuario.clave) {
    return { sinPassword: true };
  }

  const claveValida = await bcrypt.compare(clave, usuario.clave);
  if (!claveValida) return null;


  const payload = {
    uuid: usuario.uuid,
    email: usuario.correo_electronico, // contrato externo sigue siendo "email"
    nombre: usuario.nombre,
    rol_uuid: usuario.rol,
    rol_codigo: usuario.rol_codigo
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });

  return {
    token,
    usuario_data: {
      uuid: usuario.uuid,
      nombre: usuario.nombre,
      email: usuario.correo_electronico,
      rol: {
        uuid: usuario.rol,
        codigo: usuario.rol_codigo
      }
    },
  };
}

/**
 * Registra un usuario.
 * - Si viene `password`, se hashea con bcrypt y se guarda en `clave`.
 * - Si no viene, `clave` queda en NULL (coherente con el esquema).
 * - El UUID lo genera MySQL vía DEFAULT (UUID_TO_BIN(UUID(), 1)).
 */
async function registrar({ nombre, email, password, rolCodigo }) {
  if (!email) throw new Error("El correo es obligatorio");

  const correoNormalizado = email.toLowerCase();

  const existente = await usuariosRepository.buscarPorCorreo(correoNormalizado);
  if (existente) {
    throw new Error("Ya existe un usuario registrado con ese correo");
  }

  const rol = await usuariosRepository.obtenerRolPorCodigo(rolCodigo);
  if (!rol) {
    throw new Error(`No se encontró el rol: ${rolCodigo}`);
  }

  const clave = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

  const usuarioCreado = await usuariosRepository.crear({
    nombre,
    correo_electronico: correoNormalizado,
    clave,
    rol: rol.uuid,
  });

  return usuarioCreado;
}

async function actualizar({ uuid, nombre, email, rolCodigo }) {
  // 1. Verificar que el usuario exista y esté activo
  const usuarioActual = await usuariosRepository.buscarPorUuid(uuid);
  if (!usuarioActual) {
    throw new Error("Usuario no encontrado");
  }
  if (usuarioActual.activo === false) {
    throw new Error("El usuario está eliminado");
  }

  // 2. Si viene email, verificar que no lo tenga otro usuario
  let emailNormalizado = null;
  if (email) {
    emailNormalizado = email.toLowerCase();

    if (emailNormalizado !== usuarioActual.correo_electronico) {
      const existente = await usuariosRepository.buscarPorCorreo(emailNormalizado);
      if (existente && existente.uuid !== uuid) {
        throw new Error("Ya existe otro usuario con ese correo");
      }
    }
  }

  // 3. Si viene rolCodigo, resolverlo a uuid
  let rolUuid = null;
  if (rolCodigo) {
    const rol = await usuariosRepository.obtenerRolPorCodigo(rolCodigo);
    if (!rol) {
      throw new Error(`No se encontró el rol: ${rolCodigo}`);
    }
    rolUuid = rol.uuid;
  }

  // 4. Llamar al repository con lo que realmente se quiere actualizar
  const usuarioActualizado = await usuariosRepository.actualizar({
    uuid,
    nombre: nombre ?? null,
    correo_electronico: emailNormalizado,
    rol: rolUuid,
  });

  return usuarioActualizado;
}

async function eliminar({ uuid }) {
  const usuarioActual = await usuariosRepository.buscarPorUuid(uuid);
  if (!usuarioActual) {
    throw new Error("Usuario no encontrado");
  }
  if (usuarioActual.activo === false) {
    throw new Error("El usuario ya estaba eliminado");
  }

  const usuarioEliminado = await usuariosRepository.eliminar({ uuid });
  return usuarioEliminado;
}

/**
 * Lista usuarios activos con su rol.
 * Ya no hay "apps" en el esquema MySQL, así que se devuelven vacías
 * para mantener el contrato externo con los clientes.
 *
 * Requiere que el repository exporte `listarTodosConRol` (ver nota).
 */
async function listarUsuarios() {
  const rows = await usuariosRepository.listarTodosConRol();

  const usuarios = rows.map((r) => ({
    uuid: r.uuid,
    nombre: r.nombre,
    email: r.correo_electronico,
    activo: r.activo,
    fecha_registro: r.fecha_registro,
    rol: {
      uuid: r.rol_uuid,
      codigo: r.rol_codigo
    }
  }));

  return { usuarios_data: usuarios };
}

async function actualizarClave({ uuid, password }) {
  if (!uuid) {
    throw new Error("El uuid del usuario es obligatorio");
  }
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña es obligatoria");
  }
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const usuarioActual = await usuariosRepository.buscarPorUuid(uuid);
  if (!usuarioActual) {
    throw new Error("Usuario no encontrado");
  }
  if (usuarioActual.activo === false) {
    throw new Error("El usuario está eliminado");
  }

  const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

  const usuarioActualizado = await usuariosRepository.actualizarClave({
    uuid,
    password: passwordHasheada,
  });

  return usuarioActualizado;
}

async function buscarPorCorreo(correo) {
  if (!correo) throw new Error("El correo es obligatorio");
  return await usuariosRepository.buscarPorCorreo(correo);
}

async function buscarPorUuid(uuid) {
  if (!uuid) throw new Error("El uuid es obligatorio");
  return await usuariosRepository.buscarPorUuid(uuid);
}

module.exports = {
  login,
  registrar,
  actualizar,
  actualizarClave,
  eliminar,
  buscarPorCorreo,
  buscarPorUuid,
  listarUsuarios,
};