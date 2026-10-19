// routes/deportistas.routes.js
const { Router } = require("express");
const ctrl = require("../controller/deportistas.controller");

const router = Router();

// Listado de deportistas activos (con clubes, disciplinas y records ya resueltos)
router.get("/", ctrl.listarDeportistas);

// Detalle de un deportista por uuid
router.get("/:uuid", ctrl.buscarPorUuid);

// Registrar un deportista
router.post("/", ctrl.registrar);

// Actualizar parcialmente un deportista (PATCH)
router.patch("/:uuid", ctrl.actualizar);

// Eliminar lógicamente un deportista (soft delete)
router.delete("/:uuid", ctrl.eliminar);

module.exports = router;