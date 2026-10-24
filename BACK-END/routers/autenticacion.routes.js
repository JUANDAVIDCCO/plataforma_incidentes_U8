const express = require("express");
const controlador = require("../controllers/autenticacion.controller");
const verificarToken = require("../middleware/verificar_token");

const router = express.Router();

router.post("/login", controlador.iniciarSesion);
router.get("/sesion", verificarToken, controlador.obtenerSesion);

module.exports = router;