const pool = require("../config/db"); // debe ser mysql2/promise (const [rows] = await pool.query(...))

/**
 * IMPORTANTE sobre UUIDs en este proyecto:
 *   - El esquema MySQL usa:  DEFAULT (UUID_TO_BIN(UUID(), 1))
 *     Es decir, UUID v1 con swap flag = 1 (optimiza localidad de índice).
 *   - Por eso SIEMPRE:
 *       · al escribir / filtrar:  UUID_TO_BIN(?, 1)
 *       · al leer:                BIN_TO_UUID(col, 1)
 *   - No envolver la columna en BIN_TO_UUID() dentro del WHERE (rompe el índice).
 *   - No usar randomUUID() de Node: desperdicia el swap flag (es v4, no v1).
 */

// ---------------------------------------------------------------
// Buscar usuario por correo (devuelve clave para validar en servicio)
// ---------------------------------------------------------------
async function buscarPorCorreo(correo) {
  const consulta = `
    SELECT
      BIN_TO_UUID(u.uuid, 1)       AS uuid,
      u.nombre,
      u.correo_electronico,
      u.clave,
      BIN_TO_UUID(u.rol_uuid, 1)   AS rol,
      p.codigo                     AS rol_codigo,
      p.nombre                     AS rol_nombre
    FROM usuario u
    LEFT JOIN parametro p ON u.rol_uuid = p.uuid
    WHERE u.correo_electronico = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(consulta, [correo.toLowerCase()]);
  return rows[0] || null;
}

// ---------------------------------------------------------------
// Obtener un rol por su código (dentro del tipo ROLES)
// ---------------------------------------------------------------
async function obtenerRolPorCodigo(codigo) {
  const query = `
    SELECT
      BIN_TO_UUID(p.uuid, 1) AS uuid,
      p.codigo,
      p.nombre
    FROM parametro p
    INNER JOIN tipo_parametro tp ON p.tipo_parametro_uuid = tp.uuid
    WHERE tp.codigo = 'ROLES'
      AND p.codigo = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(query, [codigo]);
  return rows[0] || null;
}

// ---------------------------------------------------------------
// Obtener el rol de un usuario
// ---------------------------------------------------------------
async function obtenerRolUsuario(uuid_usuario) {
  const query = `
    SELECT
      BIN_TO_UUID(u.uuid, 1)      AS usuario_uuid,
      u.nombre,
      u.correo_electronico,
      BIN_TO_UUID(p.uuid, 1)      AS rol_uuid,
      p.codigo                    AS rol_codigo
    FROM usuario u
    LEFT JOIN parametro p ON u.rol_uuid = p.uuid
    WHERE u.uuid = UUID_TO_BIN(?, 1)
  `;
  const [rows] = await pool.query(query, [uuid_usuario]);
  return rows[0] || null;
}

// ---------------------------------------------------------------
// Crear usuario
// MySQL genera el UUID vía DEFAULT (UUID_TO_BIN(UUID(), 1)).
// Como MySQL no tiene RETURNING, recuperamos por la columna UNIQUE
// (correo_electronico), que garantiza que encontramos exactamente
// la fila recién insertada.
// ---------------------------------------------------------------
async function crear({ nombre, correo_electronico, clave, rol }) {
  const correo = correo_electronico.toLowerCase();

  await pool.query(
    `INSERT INTO usuario (nombre, correo_electronico, clave, rol_uuid)
     VALUES (?, ?, ?, UUID_TO_BIN(?, 1))`,
    [nombre, correo, clave, rol]
  );

  const [rows] = await pool.query(
    `SELECT
       BIN_TO_UUID(u.uuid, 1)      AS uuid,
       u.nombre,
       u.correo_electronico,
       p.codigo                    AS rol_codigo
     FROM usuario u
     LEFT JOIN parametro p ON u.rol_uuid = p.uuid
     WHERE correo_electronico = ?`,
    [correo]
  );
  return rows[0];
}

// ---------------------------------------------------------------
// Actualizar usuario (COALESCE para mantener lo que no venga)
// ---------------------------------------------------------------
async function actualizar({ uuid, nombre, correo_electronico, password, rol }) {
  const [result] = await pool.query(
    `UPDATE usuario
     SET nombre             = COALESCE(?, nombre),
         correo_electronico = COALESCE(?, correo_electronico),
         clave              = COALESCE(?, clave),
         rol_uuid           = COALESCE(UUID_TO_BIN(?, 1), rol_uuid),
         modificado_en      = CURRENT_TIMESTAMP
     WHERE uuid = UUID_TO_BIN(?, 1)`,
    [
      nombre ?? null,
      correo_electronico ? correo_electronico.toLowerCase() : null,
      password ?? null,
      rol ?? null,
      uuid,
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error("Usuario no encontrado");
  }

  const [rows] = await pool.query(
    `SELECT
       BIN_TO_UUID(u.uuid, 1)     AS uuid,
       u.nombre,
       u.correo_electronico,
       BIN_TO_UUID(u.rol_uuid, 1) AS rol,
       p.codigo                   AS rol_codigo,
       p.nombre                   AS rol_nombre
     FROM usuario u
     LEFT JOIN parametro p ON u.rol_uuid = p.uuid
     WHERE u.uuid = UUID_TO_BIN(?, 1)`,
    [uuid]
  );
  return rows[0];
}

// ---------------------------------------------------------------
// Cambiar solo la clave
// ---------------------------------------------------------------
async function actualizarClave({ uuid, password }) {
  const [result] = await pool.query(
    `UPDATE usuario
     SET clave = ?,
         modificado_en = CURRENT_TIMESTAMP
     WHERE uuid = UUID_TO_BIN(?, 1)`,
    [password, uuid]
  );

  if (result.affectedRows === 0) {
    throw new Error("Usuario no encontrado");
  }

  const [rows] = await pool.query(
    `SELECT
       BIN_TO_UUID(uuid, 1)      AS uuid,
       nombre,
       correo_electronico,
       BIN_TO_UUID(rol_uuid, 1)  AS rol
     FROM usuario
     WHERE uuid = UUID_TO_BIN(?, 1)`,
    [uuid]
  );
  return rows[0];
}

// ---------------------------------------------------------------
// Eliminar (soft delete)
// ---------------------------------------------------------------
async function eliminar({ uuid }) {
  const [result] = await pool.query(
    `UPDATE usuario
     SET activo = false,
         modificado_en = CURRENT_TIMESTAMP,
         eliminado_en  = CURRENT_TIMESTAMP
     WHERE uuid = UUID_TO_BIN(?, 1)
       AND activo = true`,
    [uuid]
  );

  if (result.affectedRows === 0) {
    throw new Error("Usuario no encontrado o ya estaba eliminado");
  }

  const [rows] = await pool.query(
    `SELECT
       BIN_TO_UUID(u.uuid, 1)     AS uuid,
       u.nombre,
       u.correo_electronico,
       BIN_TO_UUID(u.rol_uuid, 1) AS rol,
       p.codigo                   AS rol_codigo,
       p.nombre                   AS rol_nombre
     FROM usuario u
     LEFT JOIN parametro p ON u.rol_uuid = p.uuid
     WHERE u.uuid = UUID_TO_BIN(?, 1)`,
    [uuid]
  );
  return rows[0];
}

// ---------------------------------------------------------------
// Buscar por UUID
// ---------------------------------------------------------------
async function buscarPorUuid(uuid) {
  const [rows] = await pool.query(
    `SELECT
       BIN_TO_UUID(uuid, 1)      AS uuid,
       nombre,
       correo_electronico,
       BIN_TO_UUID(rol_uuid, 1)  AS rol,
       activo,
       fecha_registro,
       modificado_en,
       eliminado_en
     FROM usuario
     WHERE uuid = UUID_TO_BIN(?, 1)
     LIMIT 1`,
    [uuid]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------
async function listarTodosConRol() {
  const [rows] = await pool.query(`
    SELECT
      BIN_TO_UUID(u.uuid, 1)      AS uuid,
      u.nombre,
      u.correo_electronico,
      u.activo,
      u.fecha_registro,
      BIN_TO_UUID(p.uuid, 1)      AS rol_uuid,
      p.codigo                    AS rol_codigo,
      p.nombre                    AS rol_nombre
    FROM usuario u
    LEFT JOIN parametro p ON u.rol_uuid = p.uuid
    WHERE u.activo = true
    ORDER BY u.nombre ASC
  `);
  return rows;
}


module.exports = {
  buscarPorCorreo,
  obtenerRolPorCodigo,
  obtenerRolUsuario,
  buscarPorUuid,
  actualizarClave,
  crear,
  eliminar,
  actualizar,
  listarTodosConRol,
};
