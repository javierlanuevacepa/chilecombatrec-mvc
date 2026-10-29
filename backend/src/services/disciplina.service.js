const disciplinaRepository = require("../repositories/disciplina.repository");

async function listarDisciplinas(){
    const disciplinas = await disciplinaRepository.listarDisciplinas();
    return { disciplinas_data: disciplinas };
}


module.exports = {listarDisciplinas}
