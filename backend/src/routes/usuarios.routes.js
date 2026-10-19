// routes/usuarios.routes.js
const { Router } = require("express");
const ctrl = require("../controller/usuarios.controller");

const router = Router();

router.post("/login", ctrl.login);
router.post("/registrar", ctrl.registrar);
router.get("/", ctrl.listarUsuarios);             
router.patch("/:uuid", ctrl.actualizar);
router.patch("/:uuid/clave", ctrl.actualizarClave);
router.delete("/:uuid", ctrl.eliminar);

module.exports = router;