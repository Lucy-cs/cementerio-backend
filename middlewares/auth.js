// middlewares/auth.js
const { verifyAccessToken } = require("../utils/jwt");

function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: "Token ausente." });
    const decoded = verifyAccessToken(token);
    req.auth = decoded; // {sub, rol_id, correo, name, iat, exp}
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido." });
  }
}

module.exports = { requireAuth };
