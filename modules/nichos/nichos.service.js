// modules/nichos/nichos.service.js
const { getConnection, sql } = require("../../config/db");

// ----------------------------------------------
// LISTAR con filtros opcionales
// ----------------------------------------------
exports.listar = async ({ manzana, estado, search }) => {
  const pool = await getConnection();
  const req = pool.request();

  const where = [];
  if (manzana) {
    where.push("m.nombre = @manzana");
    req.input("manzana", sql.NVarChar(50), manzana);
  }
  if (estado) {
    where.push("n.estado = @estado");
    req.input("estado", sql.NVarChar(20), estado);
  }
  if (search) {
    where.push("(CAST(n.numero AS NVARCHAR(20)) LIKE @q OR n.id = TRY_CONVERT(INT, @q))");
    req.input("q", sql.NVarChar(100), `%${search}%`);
  }

  const q = `
    SELECT n.id, n.numero, n.estado,
           m.id AS manzana_id, m.nombre AS manzana
    FROM dbo.nichos n
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY m.nombre, n.numero;
  `;
  const r = await req.query(q);
  return r.recordset;
};

// ----------------------------------------------
// OBTENER por ID
// ----------------------------------------------
exports.obtenerPorId = async (id) => {
  const pool = await getConnection();
  const r = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`
      SELECT n.id, n.numero, n.estado,
             m.id AS manzana_id, m.nombre AS manzana
      FROM dbo.nichos n
      LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
      WHERE n.id = @id;
    `);
  return r.recordset[0];
};

// ----------------------------------------------
// NUEVO: OBTENER por número + manzana (id o nombre)
//   - obtenerPorNumero({ numero, manzana_id })  // exacto
//   - obtenerPorNumero({ numero, manzana: 'A' })
// Retorna 1 fila o undefined
// ----------------------------------------------
exports.obtenerPorNumero = async ({ numero, manzana_id, manzana }) => {
  const pool = await getConnection();
  const req = pool.request().input("numero", sql.Int, numero);

  let q = `
    SELECT TOP 1 n.id, n.numero, n.estado, n.manzana_id, m.nombre AS manzana
    FROM dbo.nichos n
    JOIN dbo.manzanas m ON m.id = n.manzana_id
  `;

  if (Number.isInteger(manzana_id)) {
    req.input("manzana_id", sql.Int, manzana_id);
    q += ` WHERE n.numero = @numero AND n.manzana_id = @manzana_id`;
  } else if (manzana) {
    req.input("manzana", sql.NVarChar(50), manzana);
    q += ` WHERE n.numero = @numero AND m.nombre = @manzana`;
  } else {
    return undefined;
  }

  const r = await req.query(q);
  return r.recordset[0];
};

// ----------------------------------------------
// CREAR
//  - mapea 2601/2627 -> DUP_KEY (duplicado manzana+numero)
//  - mapea 547      -> FK_NOT_FOUND (manzana no existe)
// ----------------------------------------------
exports.crear = async ({ numero, estado, manzana_id }) => {
  const pool = await getConnection();
  try {
    const r = await pool
      .request()
      .input("numero", sql.Int, numero)
      .input("estado", sql.NVarChar(20), estado)
      .input("manzana_id", sql.Int, manzana_id)
      .query(`
        INSERT INTO dbo.nichos (numero, estado, manzana_id)
        VALUES (@numero, @estado, @manzana_id);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const id = Number(r.recordset[0].id);
    return await exports.obtenerPorId(id);
  } catch (err) {
    if (err.number === 547) err.code = "FK_NOT_FOUND";
    if (err.number === 2601 || err.number === 2627) err.code = "DUP_KEY";
    throw err;
  }
};

// ----------------------------------------------
// ACTUALIZAR
//  - mapea 2601/2627 -> DUP_KEY
//  - mapea 547      -> FK_NOT_FOUND
//  - retorna null si no encontró el registro
// ----------------------------------------------
exports.actualizar = async (id, { numero, estado, manzana_id }) => {
  const pool = await getConnection();
  const fields = [];
  const req = pool.request().input("id", sql.Int, id);

  if (numero !== undefined) {
    fields.push("numero = @numero");
    req.input("numero", sql.Int, numero);
  }
  if (estado !== undefined) {
    fields.push("estado = @estado");
    req.input("estado", sql.NVarChar(20), estado);
  }
  if (manzana_id !== undefined) {
    fields.push("manzana_id = @manzana_id");
    req.input("manzana_id", sql.Int, manzana_id);
  }

  if (!fields.length) {
    // por coherencia, devolvemos el registro actual
    return await exports.obtenerPorId(id);
  }

  try {
    const r = await req.query(`
      UPDATE dbo.nichos SET ${fields.join(", ")}
      WHERE id = @id;

      SELECT @@ROWCOUNT AS rows;
    `);

    if (!r.recordset[0].rows) return null;
    return await exports.obtenerPorId(id);
  } catch (err) {
    if (err.number === 547) err.code = "FK_NOT_FOUND";
    if (err.number === 2601 || err.number === 2627) err.code = "DUP_KEY";
    throw err;
  }
};

// ----------------------------------------------
// ELIMINAR
//  - retorna true si borró, false si no existía
// ----------------------------------------------
exports.eliminar = async (id) => {
  const pool = await getConnection();
  const r = await pool
    .request()
    .input("id", sql.Int, id)
    .query("DELETE FROM dbo.nichos WHERE id = @id; SELECT @@ROWCOUNT AS rows;");
  return !!r.recordset[0].rows;
};
