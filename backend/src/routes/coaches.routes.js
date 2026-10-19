// routes/coaches.routes.js
const { Router } = require("express");
const ctrl = require("../controller/coaches.controller");
const AuthMiddleware = require("../middlewares/AuthMiddleware");


const router = Router();


router.use(AuthMiddleware);

// Listado de coaches activos (con rol, clubes y disciplinas ya resueltos)
router.get("/", ctrl.listarCoaches);

// Detalle de un coach por uuid
router.get("/:uuid", ctrl.buscarPorUuid);

// Registrar un coach
router.post("/", ctrl.registrar);

// Actualizar parcialmente un coach (PATCH)
router.patch("/:uuid", ctrl.actualizar);

// Eliminar lógicamente un coach (soft delete)
router.delete("/:uuid", ctrl.eliminar);

module.exports = router;