const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
 res.set("Cache-Control", "no-store");
 // Ignore validators from old cached responses for authenticated data.
 delete req.headers["if-none-match"];
 delete req.headers["if-modified-since"];
 const encabezado = req.headers.authorization;

 if (!encabezado || !encabezado.startsWith("Bearer ")) {
 return res.status(401).json({ error: "Token no proporcionado" });
 }

 const token = encabezado.split(" ")[1];

 try {
 const payload = jwt.verify(token, process.env.JWT_SECRET);
 req.usuario = payload; // { correo, rol, iat, exp }
 next();
 } catch {
 return res.status(401).json({ error: "Token inválido o expirado" });
 }
 }

module.exports = verificarToken;