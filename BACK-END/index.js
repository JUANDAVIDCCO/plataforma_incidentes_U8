require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const verificarToken = require("./middleware/verificar_token");
const requiereRol = require("./middleware/requiereRol");
const autenticacionRouter = require("./routers/autenticacion.routes");
const incidentesRouter = require("./routers/incidentes.routes");
const { verificarConexion } = require("./modelos/incidentes.model");

const app = express();

app.use(compression({ threshold: 512 }));
app.use(express.json());

const origenesPermitidos = [
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.ORIGEN_FRONTEND || "").split(",").map((origen) => origen.trim()).filter(Boolean),
];
app.use(cors({ origin: origenesPermitidos }));

app.get("/favicon.ico", (req, res) => res.redirect(302, "/favicon.svg"));
app.get("/salud", async (req, res) => {
    try {
        await verificarConexion();
        res.json({ estado: "ok", baseDeDatos: "conectada" });
    } catch (error) {
        console.error("Fallo en la comprobación de salud:", error.message);
        res.status(503).json({ estado: "error", baseDeDatos: "desconectada" });
    }
});
app.use(express.static(path.join(__dirname, "../FRON_END")));

 function contieneEtiquetasospechosas(texto) {
    return /<[^>]*>/.test(texto);
 }
 
app.post("/comentarios", verificarToken, (req, res) => {
     if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || typeof req.body.texto !== "string") {
         return res.status(400).json({ error: "texto debe ser una cadena" });
     }

     const texto = req.body.texto
         // eslint-disable-next-line no-control-regex -- elimina caracteres de control del comentario
         .replace(/[\u0000-\u001F\u007F]/g, " ")
         .replace(/\s+/g, " ")
         .trim();

     if (texto.length < 3 || texto.length > 1000) {
         return res.status(400).json({ error: "El comentario debe tener entre 3 y 1000 caracteres" });
     }

     if (contieneEtiquetasospechosas(texto)) {
         return res.status(400).json({ error: "El comentario contiene etiquetas HTML" });
    }

    res.status(201).json({ mensaje: "Comentario guardado (simulado)", texto: texto.trim() });   
});
 
app.use(autenticacionRouter);
// Solo un usuario con token válido Y rol "admin" puede llegar aquí. 
app.delete("/usuarios/:id", verificarToken, requiereRol("admin"), (req, res) => {
  res.json({ mensaje: `Usuario ${req.params.id} eliminado (simulado)` });
});
app.use("/incidentes", verificarToken, incidentesRouter);
if (require.main === module) {
    const port = process.env.PORT || 3000;
    const certificatePath = path.join(__dirname, "certs", "localhost.pfx");

    if (!process.env.JWT_SECRET) {
        console.error("Falta JWT_SECRET en BACK-END/.env");
        process.exitCode = 1;
    } else {
        const usarHttpsLocal = process.env.NODE_ENV !== "production"
            && fs.existsSync(certificatePath);
        const server = usarHttpsLocal
            ? https.createServer({
                pfx: fs.readFileSync(certificatePath),
                passphrase: process.env.JWT_SECRET,
            }, app)
            : app;
        server.listen(port, () => console.log(
            `Backend ${usarHttpsLocal ? "HTTPS" : "HTTP"} en puerto ${port}`,
        ));
    }
}

module.exports = app;