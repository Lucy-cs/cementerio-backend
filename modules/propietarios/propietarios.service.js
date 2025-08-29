// modules/propietarios/propietarios.service.js
const { getConnection, sql } = require("../../config/db");

async function listar({ search }) {
  const pool = await getConnection();
  const req = pool.request().input("q", sql.NVarChar, search ? `%${search}%` : null);
  const q = `
    SELECT id, nombres, apellidos, dpi, telefono
    FROM propietarios
    WHERE (@q IS NULL OR nombres LIKE @q OR apellidos LIKE @q OR dpi LIKE @q)
    ORDER BY apellidos, nombres`;
  const r = await req.query(q);
  return r.recordset;
}

async function obtenerPorId(id) {
  const pool = await getConnection();
  const r = await pool
    .request()
    .input("id", sql.Int, id)
    .query("SELECT id, nombres, apellidos, dpi, telefono FROM propietarios WHERE id=@id");
  return r.recordset[0];
}

async function crear(dto) {
  const pool = await getConnection();
  try {
    const r = await pool
      .request()
      .input("nombres", sql.NVarChar, dto.nombres)
      .input("apellidos", sql.NVarChar, dto.apellidos)
      .input("dpi", sql.NVarChar, dto.dpi)
      .input("telefono", sql.NVarChar, dto.telefono ?? null)
      .query(
        `INSERT INTO propietarios(nombres, apellidos, dpi, telefono)
         OUTPUT INSERTED.id, INSERTED.nombres, INSERTED.apellidos, INSERTED.dpi, INSERTED.telefono
         VALUES(@nombres,@apellidos,@dpi,@telefono)`
      );
    return r.recordset[0];
  } catch (err) {
    if ([2601, 2627].includes(err.number)) err.code = "DUP_DPI"; // índice único dpi
    throw err;
  }
}

async function actualizar(id, dto) {
  const pool = await getConnection();
  const sets = [];
  const req = pool.request().input("id", sql.Int, id);
  if (dto.nombres !== undefined) {
    sets.push("nombres=@nombres");
    req.input("nombres", sql.NVarChar, dto.nombres);
  }
  if (dto.apellidos !== undefined) {
    sets.push("apellidos=@apellidos");
    req.input("apellidos", sql.NVarChar, dto.apellidos);
  }
  if (dto.dpi !== undefined) {
    sets.push("dpi=@dpi");
    req.input("dpi", sql.NVarChar, dto.dpi);
  }
  if (dto.telefono !== undefined) {
    sets.push("telefono=@telefono");
    req.input("telefono", sql.NVarChar, dto.telefono);
  }
  if (sets.length === 0) return null;

  try {
    const q = `
      UPDATE propietarios SET ${sets.join(", ")} WHERE id=@id;
      SELECT id, nombres, apellidos, dpi, telefono FROM propietarios WHERE id=@id`;
    const r = await req.query(q);
    return r.recordset[0];
  } catch (err) {
    if ([2601, 2627].includes(err.number)) err.code = "DUP_DPI";
    throw err;
  }
}

async function eliminar(id) {
  const pool = await getConnection();
  try {
    const r = await pool.request().input("id", sql.Int, id).query("DELETE FROM propietarios WHERE id=@id");
    return r.rowsAffected[0] > 0;
  } catch (err) {
    if (err.number === 547) err.code = "FK_CONFLICT"; // tiene relaciones (arrendamientos/solicitudes/traspasos)
    throw err;
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };