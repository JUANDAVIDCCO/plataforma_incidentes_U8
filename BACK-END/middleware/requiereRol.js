function requiereRol(rolRequerido) {
 return function (req, res, next) {
 if (!req.usuario || req.usuario.rol !== rolRequerido) {
 return res.status(403).json({ error: "No tiene permisos para esta acción" });
 }
 next();
 };
 }

module.exports = requiereRol;