const pool = require("../config/db");

// ===============================================================
// Helpers
// ===============================================================

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

function _normalizarUuids(arr) {
  if (!arr) return [];
  return arr.map((x) => (typeof x === "string" ? x : x.uuid));
}

/**
 * Busca el UUID (BINARY) de un rol a partir de su código de parámetro.
 * Valida además que pertenezca al tipo_parametro 'ROLES' para no colisionar
 * con otros parámetros del sistema (ej. estados de enfrentamiento).
 */
async function _uuidRol(conn, codigoRol) {
  const [rows] = await conn.query(
    `SELECT p.uuid
       FROM parametro p
       INNER JOIN tipo_parametro tp ON tp.uuid = p.tipo_parametro_uuid
      WHERE p.codigo = ?
        AND tp.codigo = 'ROLES'
        AND p.activo = true
        AND tp.activo = true
      LIMIT 1`,
    [codigoRol]
  );
  if (!rows[0]) throw new Error(`Rol ${codigoRol} no encontrado`);
  return rows[0].uuid;
}

/**
 * Resuelve el UUID de una comuna por nombre (y opcionalmente región).
 * Devuelve null si no se encuentra.
 */
async function _buscarComunaUuid(conn, comunaNombre, regionNombre) {
  if (!comunaNombre) return null;
  let sql = `
    SELECT BIN_TO_UUID(co.uuid, 1) AS uuid
      FROM comuna co
      INNER JOIN region r ON r.uuid = co.region_uuid
     WHERE co.nombre = ? AND co.activo = true`;
  const params = [comunaNombre];
  if (regionNombre) {
    sql += ` AND r.nombre = ?`;
    params.push(regionNombre);
  }
  sql += ` LIMIT 1`;
  const [rows] = await conn.query(sql, params);
  return rows[0]?.uuid ?? null;
}

// ===============================================================
// Escritura de usuario
// ===============================================================

async function _insertarUsuarioEnTx(conn, { nombre, correo_electronico, clave, rolUuid }) {
  const [uuidRow] = await conn.query(`SELECT UUID() AS uuid`);
  const usuarioUuid = uuidRow[0].uuid;

  await conn.query(
    `INSERT INTO usuario (uuid, nombre, correo_electronico, clave, rol_uuid)
     VALUES (UUID_TO_BIN(?, 1), ?, ?, ?, ?)`,
    [
      usuarioUuid,
      nombre,
      correo_electronico,
      clave ?? null,
      rolUuid, // ya viene como BINARY(16)
    ]
  );
  return usuarioUuid;
}

async function _actualizarUsuarioEnTx(conn, uuid, { nombre, correo_electronico, clave, rolUuid, activo }) {
  const sets = [];
  const params = [];

  if (nombre !== undefined) { sets.push("nombre = ?"); params.push(nombre); }
  if (correo_electronico !== undefined) { sets.push("correo_electronico = ?"); params.push(correo_electronico); }
  if (clave !== undefined && clave !== null) { sets.push("clave = ?"); params.push(clave); }
  if (rolUuid !== undefined && rolUuid !== null) { sets.push("rol_uuid = ?"); params.push(rolUuid); }
  if (activo !== undefined) { sets.push("activo = ?"); params.push(activo); }

  if (sets.length === 0) return;

  sets.push("modificado_en = CURRENT_TIMESTAMP");
  params.push(uuid);

  await conn.query(
    `UPDATE usuario SET ${sets.join(", ")} WHERE uuid = UUID_TO_BIN(?, 1)`,
    params
  );
}

// ===============================================================
// Escritura de club (versión con conexión — vive en la transacción
// del superadmin para no salir del patrón atómico)
// ===============================================================

async function _insertarClubEnTx(conn, club) {
  const [uuidRow] = await conn.query(`SELECT UUID() AS uuid`);
  const clubUuid = uuidRow[0].uuid;

  await conn.query(
    `INSERT INTO club (
       uuid, nombre, url_foto, descripcion,
       fecha_fundacion, correo_institucional, telefono
     ) VALUES (UUID_TO_BIN(?, 1), ?, ?, ?, ?, ?, ?)`,
    [
      clubUuid,
      club.nombre,
      club.url_foto ?? null,
      club.descripcion ?? null,
      club.fecha_fundacion ?? null,
      club.correo_institucional ?? null,
      club.telefono ?? null,
    ]
  );

  // Disciplinas
  const disciplinas = _normalizarUuids(club.disciplinas);
  for (const discUuid of disciplinas) {
    await conn.query(
      `INSERT INTO club_disciplina (club_uuid, disciplina_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true)`,
      [clubUuid, discUuid]
    );
  }

  // Sede automática si vino comuna/región (para no perder la ubicación
  // que el frontend captura a nivel "club")
  const comunaUuid = await _buscarComunaUuid(
    conn,
    club.comuna ?? null,
    club.region ?? null
  );
  if (comunaUuid) {
    await conn.query(
      `INSERT INTO sede (club_uuid, nombre, direccion, comuna_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), ?, ?, UUID_TO_BIN(?, 1), true)`,
      [clubUuid, "Sede principal", null, comunaUuid]
    );
  }

  return clubUuid;
}

async function _actualizarClubEnTx(conn, clubUuid, club) {
  await conn.query(
    `UPDATE club
        SET nombre               = COALESCE(?, nombre),
            url_foto             = COALESCE(?, url_foto),
            descripcion          = COALESCE(?, descripcion),
            fecha_fundacion      = COALESCE(?, fecha_fundacion),
            correo_institucional = COALESCE(?, correo_institucional),
            telefono             = COALESCE(?, telefono),
            modificado_en        = CURRENT_TIMESTAMP
      WHERE uuid = UUID_TO_BIN(?, 1)`,
    [
      club.nombre ?? null,
      club.url_foto ?? null,
      club.descripcion ?? null,
      club.fecha_fundacion ?? null,
      club.correo_institucional ?? null,
      club.telefono ?? null,
      clubUuid,
    ]
  );

  // Disciplinas (si vienen, se sincronizan)
  if (club.disciplinas !== undefined) {
    const deseadas = new Set(_normalizarUuids(club.disciplinas));

    const [actuales] = await conn.query(
      `SELECT BIN_TO_UUID(disciplina_uuid, 1) AS disciplina_uuid
         FROM club_disciplina
        WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [clubUuid]
    );

    for (const { disciplina_uuid } of actuales) {
      if (!deseadas.has(disciplina_uuid)) {
        await conn.query(
          `UPDATE club_disciplina
              SET activo = false,
                  eliminado_en  = CURRENT_TIMESTAMP,
                  modificado_en = CURRENT_TIMESTAMP
            WHERE club_uuid = UUID_TO_BIN(?, 1)
              AND disciplina_uuid = UUID_TO_BIN(?, 1)`,
          [clubUuid, disciplina_uuid]
        );
      }
    }

    for (const discUuid of deseadas) {
      await conn.query(
        `INSERT INTO club_disciplina (club_uuid, disciplina_uuid, activo)
         VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true) AS nuevo
         ON DUPLICATE KEY UPDATE
           activo        = true,
           eliminado_en  = NULL,
           modificado_en = CURRENT_TIMESTAMP`,
        [clubUuid, discUuid]
      );
    }
  }

  // Sede automática si el frontend manda comuna/región y aún no existe
  // una sede activa (primera vez que se setea la ubicación del club).
  if (club.comuna) {
    const [sedesActuales] = await conn.query(
      `SELECT BIN_TO_UUID(uuid, 1) AS uuid FROM sede
        WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [clubUuid]
    );
    if (sedesActuales.length === 0) {
      const comunaUuid = await _buscarComunaUuid(conn, club.comuna, club.region);
      if (comunaUuid) {
        await conn.query(
          `INSERT INTO sede (club_uuid, nombre, direccion, comuna_uuid, activo)
           VALUES (UUID_TO_BIN(?, 1), ?, ?, UUID_TO_BIN(?, 1), true)`,
          [clubUuid, "Sede principal", null, comunaUuid]
        );
      }
    }
  }
}

// ===============================================================
// Vínculos usuario ↔ club
// ===============================================================

async function _vincularAdminClubEnTx(conn, clubUuid, usuarioUuid) {
  await conn.query(
    `INSERT INTO club_usuario (club_uuid, usuario_uuid, activo)
     VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true) AS nuevo
     ON DUPLICATE KEY UPDATE
       activo        = true,
       eliminado_en  = NULL,
       modificado_en = CURRENT_TIMESTAMP`,
    [clubUuid, usuarioUuid]
  );
}

async function _vincularCoachEnTx(conn, clubUuid, usuarioUuid, telefono = null) {
  await conn.query(
    `INSERT INTO usuario_entrenador (usuario_uuid, club_uuid, telefono, activo)
     VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), ?, true) AS nuevo
     ON DUPLICATE KEY UPDATE
       telefono      = COALESCE(?, telefono),
       activo        = true,
       eliminado_en  = NULL,
       modificado_en = CURRENT_TIMESTAMP`,
    [usuarioUuid, clubUuid, telefono, telefono]
  );
}

async function _desvincularTodosLosClubesEnTx(conn, usuarioUuid) {
  await conn.query(
    `UPDATE club_usuario
        SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
      WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [usuarioUuid]
  );
  await conn.query(
    `UPDATE usuario_entrenador
        SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
      WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [usuarioUuid]
  );
}

// ===============================================================
// SELECT reutilizable
// ===============================================================

const _SELECT_USUARIO = `
  SELECT JSON_OBJECT(
    'uuid',               BIN_TO_UUID(u.uuid, 1),
    'nombre',             u.nombre,
    'correo_electronico', u.correo_electronico,
    'activo',             u.activo,
    'fecha_registro',     DATE_FORMAT(u.fecha_registro, '%Y-%m-%d'),
    'rol', JSON_OBJECT(
      'uuid',   BIN_TO_UUID(p.uuid, 1),
      'codigo', p.codigo,
      'nombre', p.nombre
    ),
    'clubes', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',                 BIN_TO_UUID(c.uuid, 1),
                'nombre',               c.nombre,
                'url_foto',             c.url_foto,
                'descripcion',          c.descripcion,
                'fecha_fundacion',      c.fecha_fundacion,
                'correo_institucional', c.correo_institucional,
                'telefono',             c.telefono,
                'activo',               c.activo,

                'disciplinas', COALESCE(
                  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                            'uuid',   BIN_TO_UUID(d.uuid, 1),
                            'nombre', d.nombre
                          ))
                   FROM club_disciplina cd
                   INNER JOIN disciplina d ON d.uuid = cd.disciplina_uuid
                   WHERE cd.club_uuid = c.uuid AND cd.activo = true),
                  JSON_ARRAY()
                ),

                'sedes', COALESCE(
                  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                            'uuid',      BIN_TO_UUID(s.uuid, 1),
                            'nombre',    s.nombre,
                            'direccion', s.direccion,
                            'comuna', JSON_OBJECT(
                              'uuid',   BIN_TO_UUID(co.uuid, 1),
                              'nombre', co.nombre
                            ),
                            'region', JSON_OBJECT(
                              'uuid',   BIN_TO_UUID(r.uuid, 1),
                              'nombre', r.nombre
                            )
                          ))
                   FROM sede s
                   INNER JOIN comuna co ON co.uuid = s.comuna_uuid
                   INNER JOIN region r  ON r.uuid  = co.region_uuid
                   WHERE s.club_uuid = c.uuid AND s.activo = true),
                  JSON_ARRAY()
                ),

                'administradores', COALESCE(
                  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                            'uuid',   BIN_TO_UUID(au.uuid, 1),
                            'nombre', au.nombre,
                            'email',  au.correo_electronico
                          ))
                   FROM club_usuario cu
                   INNER JOIN usuario au ON au.uuid = cu.usuario_uuid
                   WHERE cu.club_uuid = c.uuid AND cu.activo = true AND au.activo = true),
                  JSON_ARRAY()
                ),

                'coaches_count', (
                  SELECT COUNT(*) FROM usuario_entrenador uv
                  WHERE uv.club_uuid = c.uuid AND uv.activo = true
                ),
                'deportistas_count', (
                  SELECT COUNT(*) FROM deportista_club dc
                  WHERE dc.club_uuid = c.uuid AND dc.activo = true
                )
              ))
       FROM club c
       WHERE c.activo = true
         AND (
           EXISTS (SELECT 1 FROM club_usuario cu2
                   WHERE cu2.club_uuid = c.uuid
                     AND cu2.usuario_uuid = u.uuid
                     AND cu2.activo = true)
           OR
           EXISTS (SELECT 1 FROM usuario_entrenador uv2
                   WHERE uv2.club_uuid = c.uuid
                     AND uv2.usuario_uuid = u.uuid
                     AND uv2.activo = true)
         )),
      JSON_ARRAY()
    )
  ) AS payload
  FROM usuario u
  INNER JOIN parametro p ON p.uuid = u.rol_uuid
`;

// ===============================================================
// LISTAR
// ===============================================================

async function listarUsuarios() {
  const [rows] = await pool.query(
    `${_SELECT_USUARIO}
     WHERE u.activo = true
     ORDER BY u.fecha_registro DESC`
  );
  return rows.map((r) => _json(r.payload));
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================

async function buscarUsuarioPorUuid(uuid) {
  const [rows] = await pool.query(
    `${_SELECT_USUARIO} WHERE u.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
    [uuid]
  );
  return rows[0] ? _json(rows[0].payload) : null;
}

// ===============================================================
// CREAR — ADMIN_CLUB (usuario + club nuevo en una sola transacción)
// ===============================================================

/**
 * @param {object} datos
 * @param {object} datos.usuario  { nombre, correo_electronico, clave }
 * @param {object} datos.club     { nombre, url_foto?, descripcion?, fecha_fundacion?,
 *                                  correo_institucional?, telefono?,
 *                                  disciplinas?: string[], region?: string, comuna?: string }
 */
async function crearUsuarioConClub({ usuario, club }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rolUuid = await _uuidRol(conn, "ADMIN_CLUB");
    const usuarioUuid = await _insertarUsuarioEnTx(conn, { ...usuario, rolUuid });
    const clubUuid = await _insertarClubEnTx(conn, club);
    await _vincularAdminClubEnTx(conn, clubUuid, usuarioUuid);

    await conn.commit();
    return await buscarUsuarioPorUuid(usuarioUuid);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ===============================================================
// CREAR — COACH_CLUB (usuario + vínculo a club existente)
// ===============================================================

async function crearUsuarioCoach({ usuario, clubUuid, telefono = null }) {
  if (!clubUuid) throw new Error("El club del entrenador es obligatorio");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.query(
      `SELECT 1 FROM club
        WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [clubUuid]
    );
    if (check.length === 0) throw new Error("Club no encontrado");

    const rolUuid = await _uuidRol(conn, "COACH_CLUB");
    const usuarioUuid = await _insertarUsuarioEnTx(conn, { ...usuario, rolUuid });
    await _vincularCoachEnTx(conn, clubUuid, usuarioUuid, telefono);

    await conn.commit();
    return await buscarUsuarioPorUuid(usuarioUuid);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ===============================================================
// CREAR — ADMIN (sin club)
// ===============================================================

async function crearUsuarioAdmin({ usuario }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rolUuid = await _uuidRol(conn, "ADMIN");
    const usuarioUuid = await _insertarUsuarioEnTx(conn, { ...usuario, rolUuid });

    await conn.commit();
    return await buscarUsuarioPorUuid(usuarioUuid);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ===============================================================
// ACTUALIZAR (usuario + opcionalmente su club)
// ===============================================================

/**
 * @param {object} datos
 * @param {string} datos.uuid
 * @param {object} [datos.usuario]            { nombre?, correo_electronico?, clave?, rol?, activo? }
 * @param {object} [datos.club]               datos del club (solo si rol = ADMIN_CLUB)
 * @param {string} [datos.clubExistenteUuid]  uuid del club (solo si rol = COACH_CLUB)
 */
async function actualizarUsuario({ uuid, usuario = {}, club, clubExistenteUuid }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Existencia
    const [check] = await conn.query(
      `SELECT 1 FROM usuario
        WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) throw new Error("Usuario no encontrado");

    // 2. Rol nuevo (si viene)
    const rolUuid = usuario.rol
      ? await _uuidRol(conn, usuario.rol)
      : null;

    // 3. Update escalares de usuario
    await _actualizarUsuarioEnTx(conn, uuid, {
      nombre:             usuario.nombre,
      correo_electronico: usuario.correo_electronico,
      clave:              usuario.clave,
      rolUuid,
      activo:             usuario.activo,
    });

    // 4. Lógica por rol
    const rolFinal = usuario.rol; // "ADMIN" | "ADMIN_CLUB" | "COACH_CLUB" | undefined

    if (rolFinal === "ADMIN_CLUB") {
      // Desvincular vínculos coach que pudiera tener
      await conn.query(
        `UPDATE usuario_entrenador
            SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
          WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
        [uuid]
      );

      // ¿Ya tenía club como admin?
      const [clubesPrevios] = await conn.query(
        `SELECT BIN_TO_UUID(club_uuid, 1) AS club_uuid
           FROM club_usuario
          WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true
          LIMIT 1`,
        [uuid]
      );

      let clubUuid;
      if (clubesPrevios[0]) {
        clubUuid = clubesPrevios[0].club_uuid;
        if (club) await _actualizarClubEnTx(conn, clubUuid, club);
      } else if (club) {
        clubUuid = await _insertarClubEnTx(conn, club);
      } else {
        throw new Error("Debes enviar los datos del club para ADMIN_CLUB");
      }

      await _vincularAdminClubEnTx(conn, clubUuid, uuid);
    } else if (rolFinal === "COACH_CLUB") {
      if (!clubExistenteUuid) {
        throw new Error("Debes asignar un club al entrenador");
      }

      // Desvincular admin que pudiera tener
      await conn.query(
        `UPDATE club_usuario
            SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
          WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
        [uuid]
      );

      const [clubCheck] = await conn.query(
        `SELECT 1 FROM club
          WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
        [clubExistenteUuid]
      );
      if (clubCheck.length === 0) throw new Error("Club no encontrado");

      await _vincularCoachEnTx(conn, clubExistenteUuid, uuid);
    } else if (rolFinal === "ADMIN") {
      await _desvincularTodosLosClubesEnTx(conn, uuid);
    }

    await conn.commit();
    return await buscarUsuarioPorUuid(uuid);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ===============================================================
// CAMBIAR ESTADO
// ===============================================================

async function cambiarEstadoUsuario({ uuid, activo }) {
  if (typeof activo !== "boolean") {
    throw new Error("`activo` debe ser booleano");
  }
  return await actualizarUsuario({
    uuid,
    usuario: { activo },
  });
}

// ===============================================================
// ELIMINAR
// ===============================================================

/**
 * @param {object} datos
 * @param {string} datos.uuid
 * @param {boolean} [datos.eliminarClub]  si true, hace soft-delete del club
 *                                        asociado (útil cuando un ADMIN_CLUB
 *                                        era el único dueño del club).
 */
async function eliminarUsuario({ uuid, eliminarClub = false }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.query(
      `SELECT 1 FROM usuario
        WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) {
      throw new Error("Usuario no encontrado o ya estaba eliminado");
    }

    // Si corresponde, eliminamos los clubes que adminstra
    if (eliminarClub) {
      const [clubes] = await conn.query(
        `SELECT BIN_TO_UUID(club_uuid, 1) AS club_uuid
           FROM club_usuario
          WHERE usuario_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
        [uuid]
      );
      for (const { club_uuid } of clubes) {
        await conn.query(
          `UPDATE club
              SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
            WHERE uuid = UUID_TO_BIN(?, 1)`,
          [club_uuid]
        );
        // Y desvinculamos coaches de ese club
        await conn.query(
          `UPDATE usuario_entrenador
              SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
            WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
          [club_uuid]
        );
      }
    }

    // Soft delete del usuario + vínculos
    await conn.query(
      `UPDATE usuario
          SET activo = false, eliminado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
        WHERE uuid = UUID_TO_BIN(?, 1)`,
      [uuid]
    );
    await _desvincularTodosLosClubesEnTx(conn, uuid);

    await conn.commit();
    return await buscarUsuarioPorUuid(uuid);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ===============================================================
// EXPORTS
// ===============================================================

module.exports = {
  listarUsuarios,
  buscarUsuarioPorUuid,
  crearUsuarioConClub,
  crearUsuarioCoach,
  crearUsuarioAdmin,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
};