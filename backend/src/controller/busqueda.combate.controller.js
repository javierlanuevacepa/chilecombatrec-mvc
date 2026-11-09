const busquedaCombateService = require("../services/busqueda.combate.service");
const { exito, error } = require("../utils/respuestaApi");

// ===============================================================
// BUSCAR CANDIDATOS DE COMBATE
// ===============================================================
async function buscarCandidatos(req, res) {
  try {
    const { deportistaUuid } = req.params;
    const { disciplinaUuid, limite } = req.query;

    if (!deportistaUuid) {
      return error(res, "El uuid del deportista es obligatorio", 400);
    }

    // `disciplinaUuid` y `limite` son opcionales.
    // El service valida formato (UUID) y rango (1..100) antes de ir al repo.
    const resultado = await busquedaCombateService.buscarCandidatos({
      deportistaUuid,
      disciplinaUuid,
      limite,
    });

    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en buscarCandidatos (busqueda combate):", err.message);

    if (err.message.includes("no encontrado")) {
      return error(res, err.message, 404);
    }
    if (err.message.includes("inactivo") || err.message.includes("eliminado")) {
      return error(res, err.message, 404);
    }
    if (
      err.message.includes("obligatorio") ||
      err.message.includes("debe ser") ||
      err.message.includes("no puede ser mayor")
    ) {
      return error(res, err.message, 400);
    }

    return error(res, "Error al buscar candidatos de combate", 500);
  }
}

// ===============================================================
// EXPORTS
// ===============================================================
module.exports = {
  buscarCandidatos,
};