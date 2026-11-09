const busquedaCombateRepository = require("../repositories/busqueda.combate.repository");

// ===============================================================
// Validaciones internas
// ===============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida que un UUID obligatorio venga con formato correcto. */
function _validarUuid(valor, nombreCampo) {
  if (!valor) throw new Error(`${nombreCampo} es obligatorio`);
  if (typeof valor !== "string" || !UUID_REGEX.test(valor)) {
    throw new Error(`${nombreCampo} debe ser un UUID válido`);
  }
}

/** Valida un UUID opcional. Devuelve `null` si no viene. */
function _validarUuidOpcional(valor, nombreCampo) {
  if (valor == null || valor === "") return null;
  if (typeof valor !== "string" || !UUID_REGEX.test(valor)) {
    throw new Error(`${nombreCampo} debe ser un UUID válido`);
  }
  return valor;
}

/**
 * Normaliza el límite de resultados.
 * - `undefined` / `null` / `""` → se deja indefinido (el repo usa su default).
 * - Debe ser entero entre 1 y 100.
 */
function _normalizarLimite(valor) {
  if (valor == null || valor === "") return undefined;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("El límite debe ser un entero positivo");
  }
  if (n > 100) {
    throw new Error("El límite no puede ser mayor a 100");
  }
  return n;
}

// ===============================================================
// BUSCAR CANDIDATOS DE COMBATE
// ===============================================================

/**
 * Busca deportistas compatibles para combatir contra `deportistaUuid`.
 *
 * Reglas aplicadas (en el repositorio):
 *  - Solo deportistas activos, no eliminados y con `aparecer_busqueda = true`.
 *  - Mismo género que el solicitante.
 *  - Menores de 18: filtro por edad (±1 año hasta 12, ±2 años 13-17).
 *  - Adultos (≥18): la edad deja de ser filtro.
 *  - Peso: ±2 kg para menores, ±4 kg para adultos.
 *  - Peleas: ±3 para deportistas con <10 peleas; sin filtro para ≥10 (élite).
 *  - Si se pasa `disciplinaUuid`, el total de peleas y meses entrenando
 *    se calculan solo para esa disciplina y los candidatos deben practicarla.
 *
 * @param {object}   params
 * @param {string}   params.deportistaUuid    UUID del deportista que busca.
 * @param {string}  [params.disciplinaUuid]   UUID de la disciplina (opcional).
 * @param {number}  [params.limite]           Máximo de resultados (1..100).
 * @returns {Promise<{ candidatos: object[] }>}
 */
async function buscarCandidatos({ deportistaUuid, disciplinaUuid, limite } = {}) {
  _validarUuid(deportistaUuid, "El uuid del deportista");
  const disciplinaSegura = _validarUuidOpcional(
    disciplinaUuid,
    "El uuid de la disciplina"
  );
  const limiteSeguro = _normalizarLimite(limite);

  const candidatos = await busquedaCombateRepository.buscarCandidatos({
    deportistaUuid,
    disciplinaUuid: disciplinaSegura,
    limite: limiteSeguro,
  });

  return { candidatos };
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  buscarCandidatos,
};