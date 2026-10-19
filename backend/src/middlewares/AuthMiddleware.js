const jwt = require("jsonwebtoken");
const { error } = require("../utils/respuestaApi");

/**
 * Middleware para proteger rutas: exige "Authorization: Bearer <token>".
 * Si el token es válido, agrega el payload decodificado en req.usuario.
 */
function AuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "Token no proporcionado", 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return error(res, "Token no proporcionado", 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;

    next();
  } catch (err) {
    return error(res, "Token inválido o expirado", 401);
  }
}

module.exports = AuthMiddleware;