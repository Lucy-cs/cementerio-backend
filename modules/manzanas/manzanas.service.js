// modules/manzanas/manzanas.service.js
const { getConnection, sql } = require("../../config/db");

async function listar({ search }) {
  const pool = await getConnection();
  const req = pool.request().input("search", sql.NVarChar, search ? `%${search}%` : null);
  const q = `
    SELECT id, nombre
    FROM manzanas
    WHERE (@search IS NULL OR nombre LIKE @search)
    ORDER BY nombre ASC`;
  const r = await req.query(q);
  return r.recordset;
}

async function obtenerPorId(id) {
  const pool = await getConnection();
  const r = await pool.request().input("id", sql.Int, id)
    .query("SELECT id, nombre FROM manzanas WHERE id = @id");
  return r.recordset[0];
}

async function crear({ nombre }) {
  const pool = await getConnection();
  try {
    const r = await pool.request().input("nombre", sql.NVarChar, nombre)
      .query("INSERT INTO manzanas(nombre) OUTPUT INSERTED.id, INSERTED.nombre VALUES(@nombre)");
    return r.recordset[0];
  } catch (err) {
    // 2601/2627 = duplicate key
    if ([2601, 2627].includes(err.number)) err.code = "DUP_KEY";
    throw err;
  }
}

async function actualizar(id, dto) {
  const pool = await getConnection();
  const sets = [];
  const req = pool.request().input("id", sql.Int, id);
  if (dto.nombre !== undefined) { sets.push("nombre = @nombre"); req.input("nombre", sql.NVarChar, dto.nombre); }
  if (sets.length === 0) return null;

  const q = `UPDATE manzanas SET ${sets.join(", ")} WHERE id = @id;
             SELECT id, nombre FROM manzanas WHERE id = @id;`;
  try {
    const r = await req.query(q);
    return r.recordset[0];
  } catch (err) {
    if ([2601, 2627].includes(err.number)) err.code = "DUP_KEY";
    throw err;
  }
}

async function eliminar(id) {
  const pool = await getConnection();
  try {
    const r = await pool.request().input("id", sql.Int, id)
      .query("DELETE FROM manzanas WHERE id = @id");
    return r.rowsAffected[0] > 0;
  } catch (err) {
    // 547 = FK violation (tiene nichos asociados)
    if (err.number === 547) err.code = "FK_CONFLICT";
    throw err;
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };