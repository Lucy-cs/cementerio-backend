// modules/auth/auth.service.js
const { getConnection, sql } = require("../../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

// --------------------- Helpers ---------------------
function nowUtc() { return new Date(); } // mssql driver envía como UTC
function addDays(d, n){ const dt=new Date(d); dt.setUTCDate(dt.getUTCDate()+n); return dt; }

function isBcryptHash(s = "") { return /^\$2[aby]\$/.test(s); }

async function safeCompareRaw(a = "", b = "") {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  // Si longitudes difieren, igual ejecuta compare para evitar timing leaks
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

exports.comparePassword = async (plain, dbValue) => {
  if (!dbValue) return false;
  if (isBcryptHash(dbValue)) {
    try { return await bcrypt.compare(plain, dbValue); }
    catch { return false; }
  }
  // Fallback: DB en texto plano (no recomendado)
  return safeCompareRaw(plain, dbValue);
};

// base64url seguro
function toB64Url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,'');
}
function sha256(s){ return crypto.createHash("sha256").update(s).digest("hex"); }

function newRefreshToken() {
  const raw = toB64Url(crypto.randomBytes(48)); // ~64 chars URL-safe
  const hash = sha256(raw); // Almacenamos HASH, no el token crudo
  return { raw, hash };
}

// --------------------- Usuarios ---------------------
exports.getActiveUserByCorreo = async (correo) => {
  const pool = await getConnection();
  const r = await pool.request()
    .input("correo", sql.NVarChar(100), correo)
    .query(`
      SELECT TOP 1 u.id, u.nombre_completo, u.correo, u.password, u.rol_id, u.activo,
             r.nombre AS rol_nombre
      FROM dbo.usuarios u
      LEFT JOIN dbo.roles r ON r.id = u.rol_id
      WHERE u.correo = @correo AND u.activo = 1;
    `);
  return r.recordset[0];
};

exports.getUserById = async (id) => {
  const pool = await getConnection();
  const r = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT u.id, u.nombre_completo, u.correo, u.password, u.rol_id, u.activo,
             r.nombre AS rol_nombre
      FROM dbo.usuarios u
      LEFT JOIN dbo.roles r ON r.id = u.rol_id
      WHERE u.id = @id;
    `);
  return r.recordset[0];
};

// --------------------- Refresh tokens ---------------------
exports.issueRefreshToken = async (user_id) => {
  const pool = await getConnection();
  const { raw, hash } = newRefreshToken();
  const expires = addDays(nowUtc(), REFRESH_TTL_DAYS);

  await pool.request()
    .input("user_id", sql.Int, user_id)
    .input("token", sql.NVarChar(500), hash)
    .input("expires_at", sql.DateTime2, expires)
    .query(`
      INSERT INTO dbo.refresh_tokens (user_id, token, revoked, expires_at)
      VALUES (@user_id, @token, 0, @expires_at);
    `);

  return { raw, hash, expires_at: expires };
};

exports.findValidRefresh = async (rawToken) => {
  const hash = sha256(String(rawToken));
  const pool = await getConnection();
  const r = await pool.request()
    .input("token", sql.NVarChar(500), hash)
    .query(`
      SELECT TOP 1 token_id, user_id, token, revoked, expires_at
      FROM dbo.refresh_tokens
      WHERE token = @token;
    `);
  const row = r.recordset[0];
  if (!row) return null;
  if (row.revoked) return null;
  if (new Date(row.expires_at) <= nowUtc()) return null;
  return row;
};

exports.rotateRefreshToken = async (rawToken) => {
  const row = await exports.findValidRefresh(rawToken);
  if (!row) throw new Error("Refresh token inválido o expirado.");

  // Revocar el actual y emitir otro (rotación)
  const pool = await getConnection();
  await pool.request()
    .input("token_id", sql.Int, row.token_id)
    .query(`UPDATE dbo.refresh_tokens SET revoked = 1 WHERE token_id = @token_id;`);

  const user = await exports.getUserById(row.user_id);
  if (!user || user.activo !== true && user.activo !== 1) throw new Error("Usuario inactivo o inexistente.");

  const rotated = await exports.issueRefreshToken(user.id);
  return { user, rotated };
};

exports.revokeOne = async (rawToken) => {
  const hash = sha256(String(rawToken));
  const pool = await getConnection();
  await pool.request()
    .input("token", sql.NVarChar(500), hash)
    .query(`UPDATE dbo.refresh_tokens SET revoked = 1 WHERE token = @token;`);
};

exports.revokeAllForUser = async (user_id) => {
  const pool = await getConnection();
  await pool.request()
    .input("user_id", sql.Int, Number(user_id))
    .query(`UPDATE dbo.refresh_tokens SET revoked = 1 WHERE user_id = @user_id AND revoked = 0;`);
};
