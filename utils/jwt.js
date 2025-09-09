// utils/jwt.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m"; // ej: 15m, 1h

function parseExpiresToSeconds(v = "15m") {
  const m = String(v).match(/^(\d+)([smhd])$/i);
  if (!m) return 900;
  const n = Number(m[1]); const u = m[2].toLowerCase();
  return u === "s" ? n : u === "m" ? n*60 : u === "h" ? n*3600 : n*86400;
}

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    rol_id: user.rol_id,
    correo: user.correo,
    name: user.nombre_completo,
  };
  const opts = { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" };
  const token = jwt.sign(payload, JWT_SECRET, opts);
  return { token, expiresInSec: parseExpiresToSeconds(JWT_EXPIRES_IN) };
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
}

module.exports = { signAccessToken, verifyAccessToken };
