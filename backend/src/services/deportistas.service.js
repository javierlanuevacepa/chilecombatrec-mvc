const deportistasRepository = require("../repositories/deportista.repository");

const GENEROS_VALIDOS = ["M", "F", "O"];

// ===============================================================
// Validaciones internas
// ===============================================================

function _validarCamposDeportista({
  rut,
  digito_verif,
  p_nombre,
  p_apellido,
  fecha_nacimiento,
  genero,
  peso_en_kg,
}) {
  if (!rut) throw new Error("El RUT es obligatorio");
  if (!digito_verif) throw new Error("El dígito verificador es obligatorio");
  if (!p_nombre) throw new Error("El primer nombre es obligatorio");
  if (!p_apellido) throw new Error("El primer apellido es obligatorio");
  if (!fecha_nacimiento)
    throw new Error("La fecha de nacimiento es obligatoria");
  if (!genero) throw new Error("El género es obligatorio");
  if (!GENEROS_VALIDOS.includes(genero))
    throw new Error("El género debe ser M, F u O");
  if (peso_en_kg == null) throw new Error("El peso (kg) es obligatorio");
  if (peso_en_kg <= 0) throw new Error("El peso debe ser mayor a 0");
}

// ===============================================================
// LISTAR
// ===============================================================
async function listarDeportistas() {
  const deportistas = await deportistasRepository.listarTodos();
  return { deportistas_data: deportistas };
}

// ===============================================================
// BUSCAR POR UUID
// ===============================================================
async function buscarPorUuid(uuid) {
  if (!uuid) throw new Error("El uuid del deportista es obligatorio");

  const deportista = await deportistasRepository.buscarPorUuid(uuid);
  if (!deportista) throw new Error("Deportista no encontrado");

  return deportista;
}

// ===============================================================
// REGISTRAR
// ===============================================================
/**
 * El deportista NO tiene usuario asociado.
 * Solo se registran sus datos personales y sus relaciones
 * (clubes, disciplinas, records).
 */
async function registrar(datos) {
  const {
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
  } = datos;

  _validarCamposDeportista({
    rut,
    digito_verif,
    p_nombre,
    p_apellido,
    fecha_nacimiento,
    genero,
    peso_en_kg,
  });

  const deportista = await deportistasRepository.crear({
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
    clubs: clubs ?? [],
    disciplinas: disciplinas ?? [],
    records: records ?? [],
  });

  return deportista;
}

// ===============================================================
// ACTUALIZAR
// ===============================================================
/**
 * PATCH parcial: `undefined` = no tocar, `[]` = vaciar la relación.
 * - Si `rut` viene y cambia, el repo valida unicidad.
 * - `records` reemplaza los existentes por disciplina (upsert + soft delete).
 */
async function actualizar(datos) {
  const {
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
  } = datos;

  if (!uuid) throw new Error("El uuid del deportista es obligatorio");

  const hayCambios =
    rut !== undefined ||
    digito_verif !== undefined ||
    p_nombre !== undefined ||
    s_nombre !== undefined ||
    p_apellido !== undefined ||
    s_apellido !== undefined ||
    alias !== undefined ||
    nacionalidad !== undefined ||
    fecha_nacimiento !== undefined ||
    genero !== undefined ||
    peso_en_kg !== undefined ||
    estatura_en_cm !== undefined ||
    clubs !== undefined ||
    disciplinas !== undefined ||
    records !== undefined;

  if (!hayCambios) {
    throw new Error("Debes enviar al menos un campo para actualizar");
  }

  // Validaciones de dominio cuando los campos vienen
  if (genero !== undefined && !GENEROS_VALIDOS.includes(genero)) {
    throw new Error("El género debe ser M, F u O");
  }
  if (peso_en_kg !== undefined && peso_en_kg <= 0) {
    throw new Error("El peso debe ser mayor a 0");
  }

  const deportista = await deportistasRepository.actualizar({
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
  });

  return deportista;
}

// ===============================================================
// ELIMINAR
// ===============================================================
async function eliminar({ uuid }) {
  if (!uuid) throw new Error("El uuid del deportista es obligatorio");

  const deportista = await deportistasRepository.eliminar({ uuid });
  return deportista;
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  listarDeportistas,
  buscarPorUuid,
  registrar,
  actualizar,
  eliminar,
};