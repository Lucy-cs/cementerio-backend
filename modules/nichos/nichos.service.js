const { getConnection, sql } = require("../../config/db");

// Listar con filtros opcionales
exports.listar = async ({ manzana, estado, search }) => {
  const pool = await getConnection();
  const req = pool.request();

  let where = [];
  if (manzana) { where.push("m.nombre = @manzana"); req.input("manzana", sql.NVarChar(50), manzana); }
  if (estado)  { where.push("n.estado = @estado");   req.input("estado",  sql.NVarChar(20), estado); }
  if (search)  {
    where.push("(CAST(n.numero AS NVARCHAR(20)) LIKE @q OR n.id = TRY_CONVERT(INT, @q))");
    req.input("q", sql.NVarChar(100), `%${search}%`);
  }

  const sqlText = `
    SELECT n.id, n.numero, n.estado,
           m.id AS manzana_id, m.nombre AS manzana
    FROM dbo.nichos n
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY m.nombre, n.numero;
  `;
  const result = await req.query(sqlText);
  return result.recordset;
};

exports.obtenerPorId = async (id) => {
  const pool = await getConnection();
  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT n.id, n.numero, n.estado,
             m.id AS manzana_id, m.nombre AS manzana
      FROM dbo.nichos n
      LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
      WHERE n.id = @id;
    `);
  return result.recordset[0];
};

exports.crear = async ({ numero, estado, manzana_id }) => {
  const pool = await getConnection();
  const result = await pool.request()
    .input("numero",     sql.Int, numero)
    .input("estado",     sql.NVarChar(20), estado)
    .input("manzana_id", sql.Int, manzana_id)
    .query(`
      INSERT INTO dbo.nichos (numero, estado, manzana_id)
      VALUES (@numero, @estado, @manzana_id);
      SELECT SCOPE_IDENTITY() AS id;
    `);

  const id = Number(result.recordset[0].id);
  return await this.obtenerPorId(id);
};

exports.actualizar = async (id, { numero, estado, manzana_id }) => {
  const pool = await getConnection();
  const fields = [];
  const req = pool.request().input("id", sql.Int, id);

  if (numero !== undefined)     { fields.push("numero = @numero");         req.input("numero", sql.Int, numero); }
  if (estado !== undefined)     { fields.push("estado = @estado");         req.input("estado", sql.NVarChar(20), estado); }
  if (manzana_id !== undefined) { fields.push("manzana_id = @manzana_id"); req.input("manzana_id", sql.Int, manzana_id); }

  if (!fields.length) return await this.obtenerPorId(id);

  const result = await req.query(`
    UPDATE dbo.nichos SET ${fields.join(", ")}
    WHERE id = @id;

    SELECT @@ROWCOUNT AS rows;
  `);

  if (!result.recordset[0].rows) return null;
  return await this.obtenerPorId(id);
};

exports.eliminar = async (id) => {
  const pool = await getConnection();
  const result = await pool.request()
    .input("id", sql.Int, id)
    .query("DELETE FROM dbo.nichos WHERE id = @id; SELECT @@ROWCOUNT AS rows;");
  return !!result.recordset[0].rows;
};
