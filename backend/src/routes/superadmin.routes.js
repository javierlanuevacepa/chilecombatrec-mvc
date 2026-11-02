const express = require("express");
const router = express.Router();
const ctrl = require("../controller/superadmin.controller");

router.get("/", ctrl.listarUsuarios);
router.get("/:uuid", ctrl.buscarUsuarioPorUuid);
router.post("/", ctrl.registrarUsuario);
router.put("/:uuid", ctrl.actualizarUsuario);
router.patch("/:uuid/estado", ctrl.cambiarEstadoUsuario);
router.delete("/:uuid", ctrl.eliminarUsuario);

module.exports = router;