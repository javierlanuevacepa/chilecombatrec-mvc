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

function _normalizarSedes(sedes) {
  if (!sedes) return [];
  return sedes.map((s) => ({
    uuid: s.uuid ?? null,
    nombre: s.nombre ?? null,
    direccion: s.direccion ?? null,
    comuna_uuid: s.comuna_uuid ?? null,
  }));
}

// ===============================================================
// Sincronización de relaciones
// ===============================================================

async function _sincronizarUsuarios(conn, clubUuid, usuarios) {
  const deseados = _normalizarUuids(usuarios);
  const deseadosSet = new Set(deseados);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(usuario_uuid, 1) AS usuario_uuid
     FROM club_usuario
     WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [clubUuid]
  );

  for (const { usuario_uuid } of actuales) {
    if (!deseadosSet.has(usuario_uuid)) {
      await conn.query(
        `UPDATE club_usuario
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE club_uuid   = UUID_TO_BIN(?, 1)
           AND usuario_uuid = UUID_TO_BIN(?, 1)`,
        [clubUuid, usuario_uuid]
      );
    }
  }

  for (const usuarioUuid of deseados) {
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
}

async function _sincronizarDisciplinas(conn, clubUuid, disciplinas) {
  const deseadas = _normalizarUuids(disciplinas);
  const deseadasSet = new Set(deseadas);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(disciplina_uuid, 1) AS disciplina_uuid
     FROM club_disciplina
     WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [clubUuid]
  );

  for (const { disciplina_uuid } of actuales) {
    if (!deseadasSet.has(disciplina_uuid)) {
      await conn.query(
        `UPDATE club_disciplina
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE club_uuid      = UUID_TO_BIN(?, 1)
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

/**
 * Sincroniza sedes (1:N con entidad propia).
 *  - Sede con uuid  → UPDATE (y se reactiva si estaba soft-deleted).
 *  - Sede sin uuid  → INSERT nuevo.
 *  - Sede en BD activa que no venga en el payload → soft delete.
 *  - Si el uuid enviado no pertenece al club → throw (seguridad).
 */
async function _sincronizarSedes(conn, clubUuid, sedes) {
  const deseadas = _normalizarSedes(sedes);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(uuid, 1) AS uuid
     FROM sede
     WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [clubUuid]
  );

  const deseadasConUuid = new Map();
  const deseadasSinUuid = [];

  for (const s of deseadas) {
    if (s.uuid) deseadasConUuid.set(s.uuid, s);
    else deseadasSinUuid.push(s);
  }

  // 1. Soft delete de sedes que ya no vienen
  for (const { uuid } of actuales) {
    if (!deseadasConUuid.has(uuid)) {
      await conn.query(
        `UPDATE sede
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE uuid = UUID_TO_BIN(?, 1)`,
        [uuid]
      );
    }
  }

  // 2. Update de sedes existentes (verificando ownership)
  for (const [uuid, s] of deseadasConUuid) {
    const [check] = await conn.query(
      `SELECT 1 FROM sede
       WHERE uuid = UUID_TO_BIN(?, 1)
         AND club_uuid = UUID_TO_BIN(?, 1)
       LIMIT 1`,
      [uuid, clubUuid]
    );
    if (check.length === 0) {
      throw new Error(
        `La sede ${uuid} no existe o no pertenece a este club`
      );
    }

    await conn.query(
      `UPDATE sede
       SET nombre       = COALESCE(?, nombre),
           direccion    = COALESCE(?, direccion),
           comuna_uuid  = COALESCE(UUID_TO_BIN(?, 1), comuna_uuid),
           activo       = true,
           eliminado_en = NULL,
           modificado_en = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [
        s.nombre ?? null,
        s.direccion ?? null,
        s.comuna_uuid ?? null,
        uuid,
      ]
    );
  }

  // 3. Insert de sedes nuevas (requieren nombre y comuna)
  for (const s of deseadasSinUuid) {
    if (!s.nombre) {
      throw new Error("El nombre de la sede es obligatorio");
    }
    if (!s.comuna_uuid) {
      throw new Error("La comuna de la sede es obligatoria");
    }

    await conn.query(
      `INSERT INTO sede (club_uuid, nombre, direccion, comuna_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), ?, ?, UUID_TO_BIN(?, 1), true)`,
      [clubUuid, s.nombre, s.direccion ?? null, s.comuna_uuid]
    );
  }
}

// ===============================================================
// SELECT reutilizable (MySQL 8.0 arma el JSON completo)
// ===============================================================

const _SELECT_CLUB = `
  SELECT JSON_OBJECT(
    'uuid',                 BIN_TO_UUID(c.uuid, 1),
    'nombre',               c.nombre,
    'url_foto',             c.url_foto,
    'descripcion',          c.descripcion,
    'fecha_fundacion',      c.fecha_fundacion,
    'correo_institucional', c.correo_institucional,
    'telefono',             c.telefono,
    'activo',               c.activo,
    'fecha_registro',       c.fecha_registro,
    'modificado_en',        c.modificado_en,
    'eliminado_en',         c.eliminado_en,

    /* ---- administradores del club (via club_usuario) ---- */
    'usuarios', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',               BIN_TO_UUID(u.uuid, 1),
                'nombre',             u.nombre,
                'correo_electronico', u.correo_electronico,
                'rol', JSON_OBJECT(
                  'uuid',   BIN_TO_UUID(p.uuid, 1),
                  'codigo', p.codigo,
                  'nombre', p.nombre
                )
              ))
       FROM club_usuario cu
       INNER JOIN usuario   u ON u.uuid = cu.usuario_uuid
       INNER JOIN parametro p ON p.uuid = u.rol_uuid
       WHERE cu.club_uuid = c.uuid AND cu.activo = true AND u.activo = true),
      JSON_ARRAY()
    ),

    /* ---- disciplinas del club ---- */
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

    /* ---- sedes ---- */
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

    /* ---- entrenadores del club (via usuario_entrenador) ---- */
    'entrenadores', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',               BIN_TO_UUID(ue.uuid, 1),
                'nombre',             ue.nombre,
                'correo_electronico', ue.correo_electronico,
                'telefono',           uv.telefono,
                'rol', JSON_OBJECT(
                  'uuid',   BIN_TO_UUID(pe.uuid, 1),
                  'codigo', pe.codigo,
                  'nombre', pe.nombre
                ),
                'disciplinas', COALESCE(
                  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                            'uuid',   BIN_TO_UUID(di.uuid, 1),
                            'nombre', di.nombre
                          ))
                   FROM entrenador_disciplina ed
                   INNER JOIN disciplina di ON di.uuid = ed.disciplina_uuid
                   WHERE ed.usuario_uuid = ue.uuid AND ed.activo = true),
                  JSON_ARRAY()
                )
              ))
       FROM usuario_entrenador uv
       INNER JOIN usuario   ue ON ue.uuid = uv.usuario_uuid
       INNER JOIN parametro pe ON pe.uuid = ue.rol_uuid
       WHERE uv.club_uuid = c.uuid AND uv.activo = true AND ue.activo = true),
      JSON_ARRAY()
    ),

    /* ---- deportistas del club (via deportista_club) ---- */
    'deportistas', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',            BIN_TO_UUID(d.uuid, 1),
                'rut',             d.rut,
                'digito_verif',    d.digito_verif,
                'codigo_interno',  BIN_TO_UUID(d.codigo_interno, 1),
                'p_nombre',        d.p_nombre,
                's_nombre',        d.s_nombre,
                'p_apellido',      d.p_apellido,
                's_apellido',      d.s_apellido,
                'alias',           d.alias,
                'nacionalidad',    d.nacionalidad,
                'fecha_nacimiento',d.fecha_nacimiento,
                'genero',          d.genero,
                'peso_en_kg',      d.peso_en_kg,
                'estatura_en_cm',  d.estatura_en_cm,
                'activo',          d.activo,
                /* records legacy por disciplina (puede ser []) */
                'records', COALESCE(
                  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                            'disciplina_uuid',   BIN_TO_UUID(drl.disciplina_uuid, 1),
                            'disciplina_nombre', dri.nombre,
                            'v',                 drl.v,
                            'd',                 drl.d,
                            'e',                 drl.e
                          ))
                   FROM deportista_record_legacy drl
                   INNER JOIN disciplina dri ON dri.uuid = drl.disciplina_uuid
                   WHERE drl.deportista_uuid = d.uuid AND drl.activo = true),
                  JSON_ARRAY()
                )
              ))
       FROM deportista_club dc
       INNER JOIN deportista d ON d.uuid = dc.deportista_uuid
       WHERE dc.club_uuid = c.uuid AND dc.activo = true AND d.activo = true),
      JSON_ARRAY()
    )
  ) AS payload
  FROM club c
`;

// ===============================================================
// LISTAR
// ===============================================================

async function listarTodos() {
  const [rows] = await pool.query(`
    ${_SELECT_CLUB}
    WHERE c.activo = true
    ORDER BY c.nombre ASC
  `);
  return rows.map((r) => _json(r.payload));
}
// ===============================================================
// LISTAR POR USUARIO (clubes donde el usuario está vinculado
// vía club_usuario, con sus entrenadores y deportistas)
// ===============================================================

async function listarPorUsuario(usuarioUuid) {
  const [rows] = await pool.query(
    `
    ${_SELECT_CLUB}
    WHERE c.activo = true
      AND (
        /* Admin del club (club_usuario) */
        EXISTS (
          SELECT 1 FROM club_usuario cu
          WHERE cu.club_uuid   = c.uuid
            AND cu.usuario_uuid = UUID_TO_BIN(?, 1)
            AND cu.activo = true
        )
        OR
        /* Coach del club (usuario_entrenador) */
        EXISTS (
          SELECT 1 FROM usuario_entrenador ue
          WHERE ue.club_uuid   = c.uuid
            AND ue.usuario_uuid = UUID_TO_BIN(?, 1)
            AND ue.activo = true
        )
      )
    ORDER BY c.nombre ASC
    `,
    [usuarioUuid, usuarioUuid]
  );
  return rows.map((r) => _json(r.payload));
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================

async function buscarPorUuid(uuid) {
  const [rows] = await pool.query(
    `${_SELECT_CLUB} WHERE c.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
    [uuid]
  );
  return rows[0] ? _json(rows[0].payload) : null;
}

// ===============================================================
// CREAR
// ===============================================================

/**
 * @param {object}  datos
 * @param {string}  datos.nombre               obligatorio
 * @param {string} [datos.url_foto]
 * @param {string} [datos.descripcion]
 * @param {string} [datos.fecha_fundacion]     'YYYY-MM-DD'
 * @param {string} [datos.correo_institucional]
 * @param {string} [datos.telefono]
 * @param {Array}  [datos.usuarios]            ["uuid"] | [{uuid}]
 * @param {Array}  [datos.disciplinas]         ["uuid"] | [{uuid}]
 * @param {Array}  [datos.sedes]               [{nombre, direccion?, comuna_uuid}]
 */
async function crear({
  nombre,
  url_foto,
  descripcion,
  fecha_fundacion,
  correo_institucional,
  telefono,
  usuarios = [],
  disciplinas = [],
  sedes = [],
}) {
  if (!nombre) throw new Error("El nombre del club es obligatorio");

  const conn = await pool.getConnection();
  let clubUuid;
  try {
    await conn.beginTransaction();

    // 1. Generar el UUID en MySQL (v1 con swap flag 1)
    //    No usamos DEFAULT porque club no tiene ningún campo UNIQUE
    //    con el cual recuperar el uuid recién insertado.
    const [uuidRow] = await conn.query(`SELECT UUID() AS uuid`);
    clubUuid = uuidRow[0].uuid;

    // 2. Insertar club
    await conn.query(
      `INSERT INTO club (
         uuid, nombre, url_foto, descripcion,
         fecha_fundacion, correo_institucional, telefono
       ) VALUES (UUID_TO_BIN(?, 1), ?, ?, ?, ?, ?, ?)`,
      [
        clubUuid,
        nombre,
        url_foto ?? null,
        descripcion ?? null,
        fecha_fundacion ?? null,
        correo_institucional ?? null,
        telefono ?? null,
      ]
    );

    // 3. Sincronizar relaciones
    await _sincronizarUsuarios(conn, clubUuid, usuarios);
    await _sincronizarDisciplinas(conn, clubUuid, disciplinas);
    await _sincronizarSedes(conn, clubUuid, sedes);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return await buscarPorUuid(clubUuid);
}

// ===============================================================
// ACTUALIZAR
// ===============================================================

/**
 * PATCH parcial: `undefined` = no tocar, `[]` = vaciar la relación.
 */
async function actualizar({
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
}) {
  if (!uuid) throw new Error("El uuid es obligatorio");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verificar existencia y estado
    const [check] = await conn.query(
      `SELECT 1 FROM club
       WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true
       LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) throw new Error("Club no encontrado");

    // 2. Update de campos escalares
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
        nombre ?? null,
        url_foto ?? null,
        descripcion ?? null,
        fecha_fundacion ?? null,
        correo_institucional ?? null,
        telefono ?? null,
        uuid,
      ]
    );

    // 3. Sincronizar relaciones SOLO si vinieron en el payload
    if (usuarios    !== undefined) await _sincronizarUsuarios(conn, uuid, usuarios);
    if (disciplinas !== undefined) await _sincronizarDisciplinas(conn, uuid, disciplinas);
    if (sedes       !== undefined) await _sincronizarSedes(conn, uuid, sedes);

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
      `SELECT 1 FROM club
       WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true
       LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) {
      throw new Error("Club no encontrado o ya estaba eliminado");
    }

    // Soft delete del club
    await conn.query(
      `UPDATE club
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [uuid]
    );

    // Soft delete de todas las relaciones
    await conn.query(
      `UPDATE club_usuario
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );
    await conn.query(
      `UPDATE club_disciplina
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );
    await conn.query(
      `UPDATE sede
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE club_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(
    `${_SELECT_CLUB} WHERE c.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
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
  listarPorUsuario,
  crear,
  actualizar,
  eliminar,
};