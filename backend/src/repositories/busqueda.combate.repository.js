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

function _num(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ===============================================================
// Parámetros del algoritmo de emparejamiento
// (ajustables sin tocar la lógica central)
// ===============================================================

/** A partir de esta cantidad de peleas el deportista es "élite". */
const ELITE_PELEAS = 10;

/** Diferencia máxima de peleas para deportistas NO élite. */
const MARGEN_PELEAS_NOVATO = 3;

/**
 * Para un deportista élite (>= ELITE_PELEAS), el rival debe tener
 * al menos este porcentaje de sus peleas. Esto evita que un élite
 * de 20 peleas enfrente a un novato de 0 peleas.
 *
 * Ejemplos (0.5):
 *   - Élite de 10 peleas → mínimo 5 peleas
 *   - Élite de 20 peleas → mínimo 10 peleas
 *   - Élite de 40 peleas → mínimo 20 peleas
 */
const PORCENTAJE_MIN_ELITE = 0.5;

/** Margen de peso (kg) para adultos. */
const MARGEN_PESO_ADULTO_KG = 4;

/** Margen de peso (kg) para menores de edad. */
const MARGEN_PESO_MENOR_KG = 2;

/** Edad tope para aplicar el margen de niño (1 año). */
const EDAD_NINO_HASTA = 12;

/** Margen de edad (años) para niños (hasta EDAD_NINO_HASTA). */
const MARGEN_EDAD_NINO_ANIOS = 1;

/** Margen de edad (años) para adolescentes (EDAD_NINO_HASTA+1 a 17). */
const MARGEN_EDAD_ADOLESCENTE_ANIOS = 2;

/** Edad a partir de la cual se ignora la edad como filtro. */
const EDAD_ADULTO = 18;

/** Límite por defecto de candidatos devueltos. */
const LIMITE_CANDIDATOS = 20;

// ===============================================================
// Cálculo de reglas a partir del deportista solicitante
// ===============================================================

/**
 * @param {{ edad:number, peso_en_kg:number, total_peleas:number }} fighter
 */
function _calcularReglas(fighter) {
  const esMenor = fighter.edad < EDAD_ADULTO;
  const esElite = fighter.total_peleas >= ELITE_PELEAS;

  const margenPeso = esMenor ? MARGEN_PESO_MENOR_KG : MARGEN_PESO_ADULTO_KG;

  let margenEdad = null;
  if (esMenor) {
    margenEdad =
      fighter.edad <= EDAD_NINO_HASTA
        ? MARGEN_EDAD_NINO_ANIOS
        : MARGEN_EDAD_ADOLESCENTE_ANIOS;
  }

  // Regla de peleas:
  // - Novato (< ELITE_PELEAS): ventana ±MARGEN_PELEAS_NOVATO
  // - Élite (>= ELITE_PELEAS): mínimo proporcional, sin tope superior
  let peleasMin, peleasMax;
  if (esElite) {
    peleasMin = Math.ceil(fighter.total_peleas * PORCENTAJE_MIN_ELITE);
    peleasMax = null; // sin tope
  } else {
    peleasMin = Math.max(0, fighter.total_peleas - MARGEN_PELEAS_NOVATO);
    peleasMax = fighter.total_peleas + MARGEN_PELEAS_NOVATO;
  }

  return {
    esMenor,
    esElite,
    margenPeso,
    margenEdad,
    pesoMin: fighter.peso_en_kg - margenPeso,
    pesoMax: fighter.peso_en_kg + margenPeso,
    peleasMin,
    peleasMax,
  };
}

// ===============================================================
// BUSCAR CANDIDATOS DE COMBATE
// ===============================================================

/**
 * Devuelve una lista de deportistas compatibles para combatir contra
 * `deportistaUuid`, aplicando las reglas de matchmaking:
 *
 *  - Mismo género.
 *  - Solo deportistas con `aparecer_busqueda = true`.
 *  - Solo deportistas activos y no eliminados.
 *  - **Excluye deportistas del mismo club que el solicitante.**
 *  - Menores de edad: se filtra por edad (±1 año hasta 12, ±2 años 13-17).
 *  - Adultos: la edad no se usa como filtro.
 *  - Peso: ±2 kg para menores, ±4 kg para adultos.
 *  - Peleas:
 *      · Deportistas con < ELITE_PELEAS peleas: ±3 peleas de diferencia.
 *      · Deportistas con >= ELITE_PELEAS peleas (élite):
 *        el rival debe tener al menos el 50 % de sus peleas.
 *        (Evita que un élite de 20 peleas enfrente a un novato de 0.)
 *  - Si se entrega `disciplinaUuid`, se restringe a deportistas que
 *    practiquen esa disciplina, y las peleas / tiempo de entrenamiento
 *    se calculan solo para esa disciplina.
 *
 * Cada candidato incluye sus clubes activos con datos de contacto
 * (`correo_institucional`, `telefono`) y, dentro de cada club, sus
 * coaches activos con `nombre`, `correo` y `telefono` para que el
 * entrenador pueda comunicarse con el club rival.
 *
 * Si se entrega `disciplinaUuid`, dentro de cada club solo se incluyen
 * los coaches que entrenen esa disciplina.
 *
 * Orden de afinidad: peso, edad, peleas, meses de entrenamiento.
 *
 * @param {object}   opts
 * @param {string}   opts.deportistaUuid   UUID del deportista que busca.
 * @param {string}  [opts.disciplinaUuid]  UUID de la disciplina (opcional).
 * @param {number}  [opts.limite]          Límite de resultados (default 20).
 * @returns {Promise<object[]>}
 */
async function buscarCandidatos({
  deportistaUuid,
  disciplinaUuid = null,
  limite = LIMITE_CANDIDATOS,
}) {
  if (!deportistaUuid) throw new Error("El uuid del deportista es obligatorio");

  // ------------------------------------------------------------------
  // 1) Cargar datos del deportista solicitante
  // ------------------------------------------------------------------
  const [fighterRows] = await pool.query(
    `SELECT
        d.uuid,
        d.genero,
        d.peso_en_kg,
        TIMESTAMPDIFF(YEAR, d.fecha_nacimiento, CURDATE()) AS edad,
        COALESCE((
            SELECT SUM(v + d + e)
            FROM deportista_record_legacy
            WHERE deportista_uuid = d.uuid
              AND activo = true
              AND (? IS NULL OR disciplina_uuid = UUID_TO_BIN(?, 1))
        ), 0) AS total_peleas,
        COALESCE((
            SELECT TIMESTAMPDIFF(MONTH, MIN(fecha_registro), CURDATE())
            FROM deportista_disciplina
            WHERE deportista_uuid = d.uuid
              AND activo = true
              AND (? IS NULL OR disciplina_uuid = UUID_TO_BIN(?, 1))
        ), 0) AS meses_entrenando
     FROM deportista d
     WHERE d.uuid = UUID_TO_BIN(?, 1)
       AND d.activo = true
       AND d.eliminado_en IS NULL
     LIMIT 1`,
    [disciplinaUuid, disciplinaUuid, disciplinaUuid, disciplinaUuid, deportistaUuid]
  );

  if (fighterRows.length === 0) {
    throw new Error("Deportista no encontrado, inactivo o eliminado");
  }

  const fighter = {
    genero: fighterRows[0].genero,
    peso_en_kg: _num(fighterRows[0].peso_en_kg),
    edad: _num(fighterRows[0].edad),
    total_peleas: _num(fighterRows[0].total_peleas),
    meses_entrenando: _num(fighterRows[0].meses_entrenando),
  };
  const reglas = _calcularReglas(fighter);

  // ------------------------------------------------------------------
  // 2) Construir filtros condicionales
  // ------------------------------------------------------------------

  // Si se filtró por disciplina, solo mostramos coaches de esa disciplina
  const coachesDisciplinaFilter = disciplinaUuid
    ? `AND EXISTS (
         SELECT 1 FROM entrenador_disciplina ed
         WHERE ed.usuario_uuid = u.uuid
           AND ed.disciplina_uuid = UUID_TO_BIN(?, 1)
           AND ed.activo = true
       )`
    : "";

  const existsDisciplina = disciplinaUuid
    ? `AND EXISTS (
         SELECT 1 FROM deportista_disciplina dd3
         WHERE dd3.deportista_uuid = d.uuid
           AND dd3.disciplina_uuid = UUID_TO_BIN(?, 1)
           AND dd3.activo = true
       )`
    : "";

  // Excluye candidatos que compartan cualquier club activo con el solicitante.
  // Si el solicitante no tiene clubes activos, dc_src no devuelve filas y
  // el NOT EXISTS es TRUE para todos → no filtra nada.
  const excluirMismoClub = `
    AND NOT EXISTS (
      SELECT 1
      FROM deportista_club dc_src
      INNER JOIN deportista_club dc_cand
        ON dc_cand.club_uuid = dc_src.club_uuid
       AND dc_cand.activo = true
      WHERE dc_src.deportista_uuid = UUID_TO_BIN(?, 1)
        AND dc_src.activo = true
        AND dc_cand.deportista_uuid = d.uuid
    )
  `;

  // Regla de peleas: siempre se filtra (novato → BETWEEN, élite → >= mínimo)
  const havingParts = [];
  if (reglas.margenEdad != null) {
    havingParts.push(
      "ABS(TIMESTAMPDIFF(YEAR, d.fecha_nacimiento, CURDATE()) - ?) <= ?"
    );
  }
  if (reglas.esElite) {
    havingParts.push("COALESCE(SUM(r.v + r.d + r.e), 0) >= ?");
  } else {
    havingParts.push("COALESCE(SUM(r.v + r.d + r.e), 0) BETWEEN ? AND ?");
  }
  const havingClause = `HAVING ${havingParts.join(" AND ")}`;

  // ------------------------------------------------------------------
  // 3) Query de candidatos
  // ------------------------------------------------------------------
  const sql = `
    SELECT JSON_OBJECT(
      'uuid',              BIN_TO_UUID(t.uuid, 1),
      'codigo_interno',    t.codigo_interno,
      'p_nombre',          t.p_nombre,
      's_nombre',          t.s_nombre,
      'p_apellido',        t.p_apellido,
      's_apellido',        t.s_apellido,
      'alias',             t.alias,
      'nacionalidad',      t.nacionalidad,
      'fecha_nacimiento',  t.fecha_nacimiento,
      'genero',            t.genero,
      'peso_en_kg',        t.peso_en_kg,
      'estatura_en_cm',    t.estatura_en_cm,
      'edad',              t.edad,
      'total_peleas',      t.total_peleas,
      'total_v',           t.total_v,
      'total_d',           t.total_d,
      'total_e',           t.total_e,
      'meses_entrenando',  t.meses_entrenando,
      'diferencia_peso',             t.diferencia_peso,
      'diferencia_edad',             t.diferencia_edad,
      'diferencia_peleas',           t.diferencia_peleas,
      'diferencia_meses_entrenando', t.diferencia_meses_entrenando,
      'clubs', COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                  'uuid',                 BIN_TO_UUID(c.uuid, 1),
                  'nombre',               c.nombre,
                  'correo_institucional', c.correo_institucional,
                  'telefono',             c.telefono,
                  'coaches', COALESCE(
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                              'uuid',     BIN_TO_UUID(u.uuid, 1),
                              'nombre',   u.nombre,
                              'correo',   u.correo_electronico,
                              'telefono', ue.telefono))
                     FROM usuario_entrenador ue
                     INNER JOIN usuario u ON u.uuid = ue.usuario_uuid
                     WHERE ue.club_uuid = c.uuid
                       AND ue.activo = true
                       AND u.activo = true
                       AND u.eliminado_en IS NULL
                       ${coachesDisciplinaFilter}),
                    JSON_ARRAY()
                  )))
         FROM deportista_club dc
         INNER JOIN club c ON c.uuid = dc.club_uuid
         WHERE dc.deportista_uuid = t.uuid
           AND dc.activo = true
           AND c.activo = true
           AND c.eliminado_en IS NULL),
        JSON_ARRAY()
      ),
      'disciplinas', COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                  'uuid',   BIN_TO_UUID(di.uuid, 1),
                  'nombre', di.nombre))
         FROM deportista_disciplina dd2
         INNER JOIN disciplina di ON di.uuid = dd2.disciplina_uuid
         WHERE dd2.deportista_uuid = t.uuid AND dd2.activo = true),
        JSON_ARRAY()
      )
    ) AS payload
    FROM (
      SELECT
        d.uuid,
        BIN_TO_UUID(d.codigo_interno, 1) AS codigo_interno,
        d.p_nombre,
        d.s_nombre,
        d.p_apellido,
        d.s_apellido,
        d.alias,
        d.nacionalidad,
        d.fecha_nacimiento,
        d.genero,
        d.peso_en_kg,
        d.estatura_en_cm,
        TIMESTAMPDIFF(YEAR, d.fecha_nacimiento, CURDATE()) AS edad,
        COALESCE(SUM(r.v + r.d + r.e), 0) AS total_peleas,
        COALESCE(SUM(r.v), 0) AS total_v,
        COALESCE(SUM(r.d), 0) AS total_d,
        COALESCE(SUM(r.e), 0) AS total_e,
        COALESCE(TIMESTAMPDIFF(MONTH, MIN(dd.fecha_registro), CURDATE()), 0) AS meses_entrenando,
        ABS(d.peso_en_kg - ?) AS diferencia_peso,
        ABS(TIMESTAMPDIFF(YEAR, d.fecha_nacimiento, CURDATE()) - ?) AS diferencia_edad,
        ABS(COALESCE(SUM(r.v + r.d + r.e), 0) - ?) AS diferencia_peleas,
        ABS(COALESCE(TIMESTAMPDIFF(MONTH, MIN(dd.fecha_registro), CURDATE()), 0) - ?) AS diferencia_meses_entrenando
      FROM deportista d
      LEFT JOIN deportista_record_legacy r
          ON r.deportista_uuid = d.uuid
         AND r.activo = true
         AND (? IS NULL OR r.disciplina_uuid = UUID_TO_BIN(?, 1))
      LEFT JOIN deportista_disciplina dd
          ON dd.deportista_uuid = d.uuid
         AND dd.activo = true
         AND (? IS NULL OR dd.disciplina_uuid = UUID_TO_BIN(?, 1))
      WHERE d.activo = true
        AND d.eliminado_en IS NULL
        AND d.aparecer_busqueda = true
        AND d.uuid <> UUID_TO_BIN(?, 1)
        AND d.genero = ?
        AND d.peso_en_kg BETWEEN ? AND ?
        ${excluirMismoClub}
        ${existsDisciplina}
      GROUP BY d.uuid
      ${havingClause}
    ) AS t
    ORDER BY
      t.diferencia_peso ASC,
      t.diferencia_edad ASC,
      t.diferencia_peleas ASC,
      t.diferencia_meses_entrenando ASC
    LIMIT ?
  `;

  // ------------------------------------------------------------------
  // 4) Armar parámetros en el ORDEN EXACTO en que aparecen en la SQL
  // ------------------------------------------------------------------
  const params = [];

  // (a) Coaches filter — aparece en el JSON_OBJECT del top-level,
  //     ANTES del FROM (...) AS t.
  if (disciplinaUuid) params.push(disciplinaUuid);

  // (b) Subquery interna: columnas de diferencia
  params.push(fighter.peso_en_kg);
  params.push(fighter.edad);
  params.push(fighter.total_peleas);
  params.push(fighter.meses_entrenando);

  // (c) LEFT JOIN record  → (? IS NULL OR r.disciplina_uuid = UUID_TO_BIN(?,1))
  params.push(disciplinaUuid, disciplinaUuid);

  // (d) LEFT JOIN disciplina → (? IS NULL OR dd.disciplina_uuid = UUID_TO_BIN(?,1))
  params.push(disciplinaUuid, disciplinaUuid);

  // (e) WHERE
  params.push(deportistaUuid);              // d.uuid <> UUID_TO_BIN(?,1)
  params.push(fighter.genero);              // d.genero = ?
  params.push(reglas.pesoMin);              // BETWEEN ? AND ?
  params.push(reglas.pesoMax);
  params.push(deportistaUuid);              // excluirMismoClub (dc_src)

  // (f) EXISTS disciplina (opcional)
  if (disciplinaUuid) params.push(disciplinaUuid);

  // (g) HAVING — edad (opcional)
  if (reglas.margenEdad != null) {
    params.push(fighter.edad, reglas.margenEdad);
  }

  // (h) HAVING — peleas (siempre, cambia el shape según élite / novato)
  if (reglas.esElite) {
    params.push(reglas.peleasMin);          // >= ?
  } else {
    params.push(reglas.peleasMin, reglas.peleasMax); // BETWEEN ? AND ?
  }

  // (i) LIMIT
  const limitSeguro = Number(limite) > 0 ? Number(limite) : LIMITE_CANDIDATOS;
  params.push(limitSeguro);

  const [rows] = await pool.query(sql, params);
  return rows.map((r) => _json(r.payload));
}

// ===============================================================
// EXPORTS
// ===============================================================

module.exports = {
  buscarCandidatos,
  // Exportados para tests / debugging
  ELITE_PELEAS,
  MARGEN_PELEAS_NOVATO,
  PORCENTAJE_MIN_ELITE,
  MARGEN_PESO_ADULTO_KG,
  MARGEN_PESO_MENOR_KG,
  EDAD_ADULTO,
  EDAD_NINO_HASTA,
  MARGEN_EDAD_NINO_ANIOS,
  MARGEN_EDAD_ADOLESCENTE_ANIOS,
  LIMITE_CANDIDATOS,
};