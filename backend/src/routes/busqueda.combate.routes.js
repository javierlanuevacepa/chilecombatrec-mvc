// routes/busqueda.combate.routes.js
const { Router } = require("express");
const ctrl = require("../controller/busqueda.combate.controller");

const router = Router();

// Buscar candidatos de combate para un deportista.
// Query params opcionales: ?disciplinaUuid=<uuid>&limite=<1..100>
router.get("/:deportistaUuid", ctrl.buscarCandidatos);

module.exports = router;