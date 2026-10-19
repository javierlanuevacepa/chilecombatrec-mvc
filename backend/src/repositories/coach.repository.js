const pool = require("../config/db");

// ===============================================================
// Helpers
// ===============================================================

/** mysql2 normalmente entrega columnas JSON ya parseadas.
 *  Este helper cubre setups con `jsonStrings: true` o Buffers. */
function _json(v) {
  if (v == null) return null;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  if (Buffer.isBuffer(v)) {
    try { return JSON.parse(v.toString("utf8")); } catch { return null; }
  }
  return v;
}

function _normalizarClubs(clubs) {
  if (!clubs) return [];
  return clubs.map((c) =>
    typeof c === "string"
      ? { uuid: c, telefono: null }
      : { uuid: c.uuid, telefono: c.telefono ?? null }
  );
}

function _normalizarDisciplinas(disciplinas) {
  if (!disciplinas) return [];
  return disciplinas.map((d) => (typeof d === "string" ? d : d.uuid));
}

async function _rolUuidPorCodigo(conn, codigo) {
  const [rows] = await conn.query(
    `SELECT p.uuid
     FROM parametro p
     INNER JOIN tipo_parametro tp ON p.tipo_parametro_uuid = tp.uuid
     WHERE tp.codigo = 'ROLES' AND p.codigo = ? AND p.activo = true
     LIMIT 1`,
    [codigo]
  );
  if (!rows[0]) throw new Error(`No se encontró el rol: ${codigo}`);
  return rows[0].uuid;
}

// ===============================================================
// Sincronización de relaciones (upsert + soft-delete)
// ===============================================================

async function _sincronizarClubes(conn, usuarioUuid, clubs) {
  const deseados = _normalizarClubs(clubs);
  const deseadosSet = new Set(deseados.map((c) => c.uuid));

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(club_uuid, 1) AS club_uuid
     FROM usuario_entrenador
     WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [usuarioUuid]
  );

  for (const { club_uuid } of actuales) {
    if (!deseadosSet.has(club_uuid)) {
      await conn.query(
        `UPDATE usuario_entrenador
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE usuario_uuid = UUID_TO_BIN(?, 1)
           AND club_uuid   = UUID_TO_BIN(?, 1)`,
        [usuarioUuid, club_uuid]
      );
    }
  }

  for (const c of deseados) {
    await conn.query(
      `INSERT INTO usuario_entrenador (usuario_uuid, club_uuid, telefono, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), ?, true) AS nuevo
       ON DUPLICATE KEY UPDATE
         telefono      = nuevo.telefono,
         activo        = true,
         eliminado_en  = NULL,
         modificado_en = CURRENT_TIMESTAMP`,
      [usuarioUuid, c.uuid, c.telefono]
    );
  }
}

async function _sincronizarDisciplinas(conn, usuarioUuid, disciplinas) {
  const deseadas = _normalizarDisciplinas(disciplinas);
  const deseadasSet = new Set(deseadas);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(disciplina_uuid, 1) AS disciplina_uuid
     FROM entrenador_disciplina
     WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [usuarioUuid]
  );

  for (const { disciplina_uuid } of actuales) {
    if (!deseadasSet.has(disciplina_uuid)) {
      await conn.query(
        `UPDATE entrenador_disciplina
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE usuario_uuid   = UUID_TO_BIN(?, 1)
           AND disciplina_uuid = UUID_TO_BIN(?, 1)`,
        [usuarioUuid, disciplina_uuid]
      );
    }
  }

  for (const dUuid of deseadas) {
    await conn.query(
      `INSERT INTO entrenador_disciplina (usuario_uuid, disciplina_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true) AS nuevo
       ON DUPLICATE KEY UPDATE
         activo        = true,
         eliminado_en  = NULL,
         modificado_en = CURRENT_TIMESTAMP`,
      [usuarioUuid, dUuid]
    );
  }
}

// ===============================================================
// SELECT reutilizable (MySQL 8.0 construye el JSON completo)
// ===============================================================

const _SELECT_COACH = `
  SELECT JSON_OBJECT(
    'uuid',               BIN_TO_UUID(u.uuid, 1),
    'nombre',             u.nombre,
    'correo_electronico', u.correo_electronico,
    'activo',             u.activo,
    'fecha_registro',     u.fecha_registro,
    'modificado_en',      u.modificado_en,
    'eliminado_en',       u.eliminado_en,
    'rol', JSON_OBJECT(
      'uuid',   BIN_TO_UUID(p.uuid, 1),
      'codigo', p.codigo,
      'nombre', p.nombre
    ),
    'clubes', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',     BIN_TO_UUID(c.uuid, 1),
                'nombre',   c.nombre,
                'telefono', ue.telefono
              ))
       FROM usuario_entrenador ue
       INNER JOIN club c ON c.uuid = ue.club_uuid
       WHERE ue.usuario_uuid = u.uuid AND ue.activo = true),
      JSON_ARRAY()
    ),
    'disciplinas', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',   BIN_TO_UUID(d.uuid, 1),
                'nombre', d.nombre
              ))
       FROM entrenador_disciplina ed
       INNER JOIN disciplina d ON d.uuid = ed.disciplina_uuid
       WHERE ed.usuario_uuid = u.uuid AND ed.activo = true),
      JSON_ARRAY()
    )
  ) AS payload
  FROM usuario u
  INNER JOIN parametro p ON p.uuid = u.rol_uuid
  WHERE p.codigo = 'COACH_CLUB'
`;

// ===============================================================
// LISTAR
// ===============================================================

async function listarTodos() {
  const [rows] = await pool.query(`
    ${_SELECT_COACH}
    AND u.activo = true
    ORDER BY u.nombre ASC
  `);
  return rows.map((r) => _json(r.payload));
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================

async function buscarPorUuid(uuid) {
  const [rows] = await pool.query(
    `${_SELECT_COACH} AND u.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
    [uuid]
  );
  return rows[0] ? _json(rows[0].payload) : null;
}

// ===============================================================
// CREAR
// ===============================================================

/**
 * @param {object}   datos
 * @param {string}   datos.nombre
 * @param {string}   datos.correo_electronico
 * @param {string}  [datos.clave]         contraseña YA hasheada (o null)
 * @param {string}  [datos.rolCodigo]     default 'COACH_CLUB'
 * @param {Array}   [datos.clubs]         [{uuid, telefono?}] | ["uuid"]
 * @param {Array}   [datos.disciplinas]   ["uuid"] | [{uuid}]
 */
async function crear({
  nombre,
  correo_electronico,
  clave,
  rolCodigo = "COACH_CLUB",
  clubs,
  disciplinas = [],
  adminUuid,
}) {
  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!correo_electronico) throw new Error("El correo es obligatorio");

  const correo = correo_electronico.toLowerCase();

  const conn = await pool.getConnection();
  let usuarioUuid;
  try {
    await conn.beginTransaction();

    // ── NUEVO: resolver clubs antes de tocar `usuario` ──
    // Regla: si el caller no envió `clubs`, se derivan del admin logueado.
    // Si tampoco hay admin o el admin no tiene club, se rechaza.
    let clubsFinales = clubs;

    if (!Array.isArray(clubsFinales) || clubsFinales.length === 0) {
      if (!adminUuid) {
        throw new Error("El coach debe pertenecer al menos a un club");
      }

      const [adminClubs] = await conn.query(
        `SELECT BIN_TO_UUID(club_uuid, 1) AS club_uuid
         FROM club_usuario
         WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
        [adminUuid]
      );

      if (adminClubs.length === 0) {
        throw new Error(
          "El coach debe pertenecer al menos a un club (tu usuario no tiene club asignado)"
        );
      }

      clubsFinales = adminClubs.map((c) => ({
        uuid: c.club_uuid,
        telefono: null,
      }));
    }

    // Chequeo de correo existente
    const [existente] = await conn.query(
      `SELECT uuid FROM usuario WHERE correo_electronico = ? LIMIT 1`,
      [correo]
    );
    if (existente.length > 0) {
      throw new Error("Ya existe un usuario registrado con ese correo");
    }

    const rolUuid = await _rolUuidPorCodigo(conn, rolCodigo);

    await conn.query(
      `INSERT INTO usuario (nombre, correo_electronico, clave, rol_uuid)
       VALUES (?, ?, ?, ?)`,
      [nombre, correo, clave ?? null, rolUuid]
    );

    const [creado] = await conn.query(
      `SELECT BIN_TO_UUID(uuid, 1) AS uuid
       FROM usuario WHERE correo_electronico = ? LIMIT 1`,
      [correo]
    );
    usuarioUuid = creado[0].uuid;

    await _sincronizarClubes(conn, usuarioUuid, clubsFinales);
    await _sincronizarDisciplinas(conn, usuarioUuid, disciplinas);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return await buscarPorUuid(usuarioUuid);
}

// ===============================================================
// ACTUALIZAR
// ===============================================================

/**
 * Si `clubs` o `disciplinas` son `undefined`, no se tocan.
 * Si son `[]`, se desactivan todas las relaciones existentes.
 */
async function actualizar({
  uuid,
  nombre,
  correo_electronico,
  clave,
  clubs,
  disciplinas,
}) {
  if (!uuid) throw new Error("El uuid es obligatorio");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.query(
      `SELECT 1
       FROM usuario u
       INNER JOIN parametro p ON p.uuid = u.rol_uuid
       WHERE u.uuid = UUID_TO_BIN(?, 1)
         AND u.activo = true
         AND p.codigo = 'COACH_CLUB'
       LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) throw new Error("Coach no encontrado");

    await conn.query(
      `UPDATE usuario
       SET nombre             = COALESCE(?, nombre),
           correo_electronico = COALESCE(?, correo_electronico),
           clave              = COALESCE(?, clave),
           modificado_en      = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [
        nombre ?? null,
        correo_electronico ? correo_electronico.toLowerCase() : null,
        clave ?? null,
        uuid,
      ]
    );

    if (clubs       !== undefined) await _sincronizarClubes(conn, uuid, clubs);
    if (disciplinas !== undefined) await _sincronizarDisciplinas(conn, uuid, disciplinas);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return await buscarPorUuid(uuid);
}

// ===============================================================
// ELIMINAR (soft delete)
// ===============================================================

async function eliminar({ uuid }) {
  if (!uuid) throw new Error("El uuid es obligatorio");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.query(
      `SELECT 1
       FROM usuario u
       INNER JOIN parametro p ON p.uuid = u.rol_uuid
       WHERE u.uuid = UUID_TO_BIN(?, 1)
         AND u.activo = true
         AND p.codigo = 'COACH_CLUB'
       LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) {
      throw new Error("Coach no encontrado o ya estaba eliminado");
    }

    await conn.query(
      `UPDATE usuario
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [uuid]
    );

    await conn.query(
      `UPDATE usuario_entrenador
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );

    await conn.query(
      `UPDATE entrenador_disciplina
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Devolvemos el registro ya marcado como eliminado
  const [rows] = await pool.query(
    `${_SELECT_COACH} AND u.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
    [uuid]
  );
  return rows[0] ? _json(rows[0].payload) : null;
}

// ===============================================================
// EXPORTS
// ===============================================================

module.exports = {
  listarTodos,
  buscarPorUuid,
  crear,
  actualizar,
  eliminar,
};