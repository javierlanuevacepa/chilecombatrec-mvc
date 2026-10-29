const { Router } = require("express");
const ctrl = require("../controller/disciplina.controller");

const router = Router();

router.get("/", ctrl.listarDisciplinas);

module.exports = router;