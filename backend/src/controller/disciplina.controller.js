const disciplinaService = require("../services/disciplina.service");
const { exito, error } = require("../utils/respuestaApi");

async function listarDisciplinas(req, res) {
  try {
    const resultado = await disciplinaService.listarDisciplinas();
    return exito(res, resultado, 200);
  } catch (err) {
    console.error("Error en listarDisciplinas:", err.message);
    return error(res, "Error al listar disciplinas", 500);
  }
}

module.exports = {
    listarDisciplinas
}