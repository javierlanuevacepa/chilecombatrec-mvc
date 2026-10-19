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

function _normalizarClubs(clubs) {
  if (!clubs) return [];
  return clubs.map((c) => (typeof c === "string" ? c : c.uuid));
}

function _normalizarDisciplinas(disciplinas) {
  if (!disciplinas) return [];
  return disciplinas.map((d) => (typeof d === "string" ? d : d.uuid));
}

function _normalizarRecords(records) {
  if (!records) return [];
  return records.map((r) => ({
    disciplina_uuid: r.disciplina_uuid,
    v: r.v,
    d: r.d,
    e: r.e,
  }));
}

// ===============================================================
// Sincronización de relaciones
// ===============================================================

async function _sincronizarClubes(conn, deportistaUuid, clubs) {
  const deseados = _normalizarClubs(clubs);
  const deseadosSet = new Set(deseados);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(club_uuid, 1) AS club_uuid
     FROM deportista_club
     WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [deportistaUuid]
  );

  for (const { club_uuid } of actuales) {
    if (!deseadosSet.has(club_uuid)) {
      await conn.query(
        `UPDATE deportista_club
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE deportista_uuid = UUID_TO_BIN(?, 1)
           AND club_uuid       = UUID_TO_BIN(?, 1)`,
        [deportistaUuid, club_uuid]
      );
    }
  }

  for (const clubUuid of deseados) {
    await conn.query(
      `INSERT INTO deportista_club (deportista_uuid, club_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true) AS nuevo
       ON DUPLICATE KEY UPDATE
         activo        = true,
         eliminado_en  = NULL,
         modificado_en = CURRENT_TIMESTAMP`,
      [deportistaUuid, clubUuid]
    );
  }
}

async function _sincronizarDisciplinas(conn, deportistaUuid, disciplinas) {
  const deseadas = _normalizarDisciplinas(disciplinas);
  const deseadasSet = new Set(deseadas);

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(disciplina_uuid, 1) AS disciplina_uuid
     FROM deportista_disciplina
     WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [deportistaUuid]
  );

  for (const { disciplina_uuid } of actuales) {
    if (!deseadasSet.has(disciplina_uuid)) {
      await conn.query(
        `UPDATE deportista_disciplina
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE deportista_uuid = UUID_TO_BIN(?, 1)
           AND disciplina_uuid = UUID_TO_BIN(?, 1)`,
        [deportistaUuid, disciplina_uuid]
      );
    }
  }

  for (const discUuid of deseadas) {
    await conn.query(
      `INSERT INTO deportista_disciplina (deportista_uuid, disciplina_uuid, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), true) AS nuevo
       ON DUPLICATE KEY UPDATE
         activo        = true,
         eliminado_en  = NULL,
         modificado_en = CURRENT_TIMESTAMP`,
      [deportistaUuid, discUuid]
    );
  }
}

async function _sincronizarRecords(conn, deportistaUuid, records) {
  const deseados = _normalizarRecords(records);
  const deseadosSet = new Set(deseados.map((r) => r.disciplina_uuid));

  const [actuales] = await conn.query(
    `SELECT BIN_TO_UUID(disciplina_uuid, 1) AS disciplina_uuid
     FROM deportista_record_legacy
     WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
    [deportistaUuid]
  );

  for (const { disciplina_uuid } of actuales) {
    if (!deseadosSet.has(disciplina_uuid)) {
      await conn.query(
        `UPDATE deportista_record_legacy
         SET activo = false,
             eliminado_en  = CURRENT_TIMESTAMP,
             modificado_en = CURRENT_TIMESTAMP
         WHERE deportista_uuid = UUID_TO_BIN(?, 1)
           AND disciplina_uuid = UUID_TO_BIN(?, 1)`,
        [deportistaUuid, disciplina_uuid]
      );
    }
  }

  for (const r of deseados) {
    await conn.query(
      `INSERT INTO deportista_record_legacy
         (deportista_uuid, disciplina_uuid, v, d, e, activo)
       VALUES (UUID_TO_BIN(?, 1), UUID_TO_BIN(?, 1), ?, ?, ?, true) AS nuevo
       ON DUPLICATE KEY UPDATE
         v             = nuevo.v,
         d             = nuevo.d,
         e             = nuevo.e,
         activo        = true,
         eliminado_en  = NULL,
         modificado_en = CURRENT_TIMESTAMP`,
      [deportistaUuid, r.disciplina_uuid, r.v, r.d, r.e]
    );
  }
}

// ===============================================================
// SELECT reutilizable (MySQL 8.0 arma el JSON completo)
// SIN usuario, SIN rol
// ===============================================================

const _SELECT_DEPORTISTA = `
  SELECT JSON_OBJECT(
    'uuid',            BIN_TO_UUID(d.uuid, 1),
    'rut',             d.rut,
    'digito_verif',    d.digito_verif,
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
    'fecha_registro',  d.fecha_registro,
    'modificado_en',   d.modificado_en,
    'eliminado_en',    d.eliminado_en,
    'clubs', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',   BIN_TO_UUID(c.uuid, 1),
                'nombre', c.nombre
              ))
       FROM deportista_club dc
       INNER JOIN club c ON c.uuid = dc.club_uuid
       WHERE dc.deportista_uuid = d.uuid AND dc.activo = true),
      JSON_ARRAY()
    ),
    'disciplinas', COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'uuid',   BIN_TO_UUID(di.uuid, 1),
                'nombre', di.nombre
              ))
       FROM deportista_disciplina dd
       INNER JOIN disciplina di ON di.uuid = dd.disciplina_uuid
       WHERE dd.deportista_uuid = d.uuid AND dd.activo = true),
      JSON_ARRAY()
    ),
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
  ) AS payload
  FROM deportista d
`;

// ===============================================================
// LISTAR
// ===============================================================

async function listarTodos() {
  const [rows] = await pool.query(`
    ${_SELECT_DEPORTISTA}
    WHERE d.activo = true
    ORDER BY d.p_apellido ASC, d.p_nombre ASC
  `);
  return rows.map((r) => _json(r.payload));
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================

async function buscarPorUuid(uuid) {
  const [rows] = await pool.query(
    `${_SELECT_DEPORTISTA} WHERE d.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
    [uuid]
  );
  return rows[0] ? _json(rows[0].payload) : null;
}

// ===============================================================
// CREAR
// ===============================================================

/**
 * @param {object}  datos
 * @param {string}  datos.rut                 obligatorio (UNIQUE)
 * @param {string}  datos.digito_verif        obligatorio
 * @param {string}  datos.p_nombre            obligatorio
 * @param {string} [datos.s_nombre]
 * @param {string}  datos.p_apellido          obligatorio
 * @param {string} [datos.s_apellido]
 * @param {string} [datos.alias]
 * @param {string} [datos.nacionalidad]
 * @param {string}  datos.fecha_nacimiento    'YYYY-MM-DD'
 * @param {string}  datos.genero              'M' | 'F' | 'O'
 * @param {number}  datos.peso_en_kg
 * @param {number} [datos.estatura_en_cm]
 * @param {Array}  [datos.clubs]              ["uuid"] | [{uuid}]
 * @param {Array}  [datos.disciplinas]        ["uuid"] | [{uuid}]
 * @param {Array}  [datos.records]            [{disciplina_uuid, v, d, e}]
 */
async function crear({
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
  clubs = [],
  disciplinas = [],
  records = [],
}) {
  if (!rut) throw new Error("El RUT es obligatorio");
  if (!digito_verif) throw new Error("El dígito verificador es obligatorio");
  if (!p_nombre) throw new Error("El primer nombre es obligatorio");
  if (!p_apellido) throw new Error("El primer apellido es obligatorio");
  if (!fecha_nacimiento) throw new Error("La fecha de nacimiento es obligatoria");
  if (!genero) throw new Error("El género es obligatorio");
  if (peso_en_kg == null) throw new Error("El peso (kg) es obligatorio");

  const conn = await pool.getConnection();
  let deportistaUuid;
  try {
    await conn.beginTransaction();

    // 1. RUT único
    const [existente] = await conn.query(
      `SELECT 1 FROM deportista WHERE rut = ? LIMIT 1`,
      [rut]
    );
    if (existente.length > 0) {
      throw new Error("Ya existe un deportista registrado con ese RUT");
    }

    // 2. Insertar deportista (UUID lo genera MySQL vía DEFAULT)
    await conn.query(
      `INSERT INTO deportista (
         rut, digito_verif,
         p_nombre, s_nombre, p_apellido, s_apellido,
         alias, nacionalidad, fecha_nacimiento, genero,
         peso_en_kg, estatura_en_cm
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rut,
        digito_verif,
        p_nombre,
        s_nombre ?? null,
        p_apellido,
        s_apellido ?? null,
        alias ?? null,
        nacionalidad ?? null,
        fecha_nacimiento,
        genero,
        peso_en_kg,
        estatura_en_cm ?? null,
      ]
    );

    // 3. Recuperar el uuid recién creado (RUT es UNIQUE → seguro)
    const [creado] = await conn.query(
      `SELECT BIN_TO_UUID(uuid, 1) AS uuid FROM deportista WHERE rut = ? LIMIT 1`,
      [rut]
    );
    deportistaUuid = creado[0].uuid;

    // 4. Sincronizar relaciones
    await _sincronizarClubes(conn, deportistaUuid, clubs);
    await _sincronizarDisciplinas(conn, deportistaUuid, disciplinas);
    await _sincronizarRecords(conn, deportistaUuid, records);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return await buscarPorUuid(deportistaUuid);
}

// ===============================================================
// ACTUALIZAR
// ===============================================================

/**
 * PATCH parcial: `undefined` = no tocar, `[]` = vaciar la relación.
 * Si `rut` cambia, se valida unicidad.
 */
async function actualizar({
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
}) {
  if (!uuid) throw new Error("El uuid es obligatorio");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verificar que exista y esté activo
    const [check] = await conn.query(
      `SELECT rut FROM deportista WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) throw new Error("Deportista no encontrado");

    // 2. Si cambia el RUT, verificar unicidad
    if (rut && rut !== check[0].rut) {
      const [dup] = await conn.query(
        `SELECT 1 FROM deportista WHERE rut = ? AND uuid <> UUID_TO_BIN(?, 1) LIMIT 1`,
        [rut, uuid]
      );
      if (dup.length > 0) {
        throw new Error("Ya existe otro deportista con ese RUT");
      }
    }

    // 3. Update con COALESCE (null = no tocar)
    await conn.query(
      `UPDATE deportista
       SET rut              = COALESCE(?, rut),
           digito_verif     = COALESCE(?, digito_verif),
           p_nombre         = COALESCE(?, p_nombre),
           s_nombre         = COALESCE(?, s_nombre),
           p_apellido       = COALESCE(?, p_apellido),
           s_apellido       = COALESCE(?, s_apellido),
           alias            = COALESCE(?, alias),
           nacionalidad     = COALESCE(?, nacionalidad),
           fecha_nacimiento = COALESCE(?, fecha_nacimiento),
           genero           = COALESCE(?, genero),
           peso_en_kg       = COALESCE(?, peso_en_kg),
           estatura_en_cm   = COALESCE(?, estatura_en_cm),
           modificado_en    = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [
        rut ?? null,
        digito_verif ?? null,
        p_nombre ?? null,
        s_nombre ?? null,
        p_apellido ?? null,
        s_apellido ?? null,
        alias ?? null,
        nacionalidad ?? null,
        fecha_nacimiento ?? null,
        genero ?? null,
        peso_en_kg ?? null,
        estatura_en_cm ?? null,
        uuid,
      ]
    );

    // 4. Sincronizar relaciones SOLO si vinieron en el payload
    if (clubs       !== undefined) await _sincronizarClubes(conn, uuid, clubs);
    if (disciplinas !== undefined) await _sincronizarDisciplinas(conn, uuid, disciplinas);
    if (records     !== undefined) await _sincronizarRecords(conn, uuid, records);

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
      `SELECT 1 FROM deportista WHERE uuid = UUID_TO_BIN(?, 1) AND activo = true LIMIT 1`,
      [uuid]
    );
    if (check.length === 0) {
      throw new Error("Deportista no encontrado o ya estaba eliminado");
    }

    await conn.query(
      `UPDATE deportista
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE uuid = UUID_TO_BIN(?, 1)`,
      [uuid]
    );

    await conn.query(
      `UPDATE deportista_club
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );

    await conn.query(
      `UPDATE deportista_disciplina
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
      [uuid]
    );

    await conn.query(
      `UPDATE deportista_record_legacy
       SET activo = false,
           eliminado_en  = CURRENT_TIMESTAMP,
           modificado_en = CURRENT_TIMESTAMP
       WHERE deportista_uuid = UUID_TO_BIN(?, 1) AND activo = true`,
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
    `${_SELECT_DEPORTISTA} WHERE d.uuid = UUID_TO_BIN(?, 1) LIMIT 1`,
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