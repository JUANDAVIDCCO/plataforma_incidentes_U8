const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const multer = require("multer");
const controlador = require("../controllers/incidentes.controller");
const requiereRol = require("../middleware/requiereRol");

const router = express.Router();
const directorioAdjuntos = path.join(__dirname, "../uploads");
const tiposPermitidos = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"video/mp4",
	"video/webm",
	"video/quicktime",
]);

fs.mkdirSync(directorioAdjuntos, { recursive: true });

const cargarAdjunto = multer({
	storage: multer.diskStorage({
		destination: directorioAdjuntos,
		filename: (req, file, callback) => callback(null, `${randomUUID()}.tmp`),
	}),
	limits: { fileSize: 25 * 1024 * 1024, files: 1 },
	fileFilter: (req, file, callback) => {
		if (!tiposPermitidos.has(file.mimetype)) {
			return callback(new Error("El archivo debe ser una imagen o video compatible"));
		}
		callback(null, true);
	},
});

function procesarAdjunto(req, res, next) {
	cargarAdjunto.single("archivo")(req, res, (error) => {
		if (!error) return next();
		const excedeLimite = error.code === "LIMIT_FILE_SIZE";
		res.status(excedeLimite ? 413 : 400).json({
			error: excedeLimite ? "El archivo no puede superar los 25 MB" : error.message,
		});
	});
}

router.get("/", controlador.listar);
router.get("/:id/archivo", controlador.obtenerArchivo);
router.get("/:id", controlador.obtener);
router.post("/", procesarAdjunto, controlador.crear);
router.put("/:id", controlador.actualizar);
router.delete("/:id", requiereRol("admin"), controlador.eliminar);

module.exports = router;