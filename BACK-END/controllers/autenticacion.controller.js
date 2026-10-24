const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const usuariosModelo = require("../modelos/usuarios.model");

async function iniciarSesion(req, res) {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({ error: "Correo y clave son obligatorios" });
    }

    const { correo, clave } = req.body;
    if (typeof correo !== "string" || typeof clave !== "string" || !correo.trim() || !clave) {
        return res.status(400).json({ error: "Correo y clave son obligatorios" });
    }

    const usuario = await usuariosModelo.buscarPorCorreo(correo.trim());
    if (!usuario || !(await bcrypt.compare(clave, usuario.clave))) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "Servicio de autenticación no configurado" });
    }

    const token = jwt.sign(
        { correo: usuario.correo, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
    );

    return res.json({ token });
}

function obtenerSesion(req, res) {
    return res.json({ correo: req.usuario.correo, rol: req.usuario.rol });
}

module.exports = { iniciarSesion, obtenerSesion };