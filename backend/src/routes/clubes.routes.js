// routes/clubes.routes.js
const { Router } = require("express");
const ctrl = require("../controller/clubes.controller");



const router = Router();

// Listado de clubes donde el usuario está vinculado

router.get("/por-usuario/:uuid", ctrl.listarClubesPorUsuario);

// Listado de clubes activos (con usuarios, disciplinas y sedes ya resueltos)
router.get("/", ctrl.listarClubes);

// Detalle de un club por uuid
router.get("/:uuid", ctrl.buscarPorUuid);

// Registrar un club
router.post("/", ctrl.registrar);

// Actualizar parcialmente un club (PATCH)
router.patch("/:uuid", ctrl.actualizar);

// Eliminar lógicamente un club (soft delete)
router.delete("/:uuid", ctrl.eliminar);

module.exports = router;