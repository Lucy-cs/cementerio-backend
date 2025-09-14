const { getConnection, sql } = require("../../config/db");

// GET /api/recibos
exports.listar = async ({ nicho_id, propietario_id, q, page=1, pageSize=20 }) => {
  const pool = await getConnection();
  const off = (page-1) * pageSize;

  const reqList = new sql.Request(pool);
  reqList.input("off", sql.Int, off);
  reqList.input("ps",  sql.Int, pageSize);
  reqList.input("nicho_id",       sql.Int, nicho_id || null);
  reqList.input("propietario_id", sql.Int, propietario_id || null);
  reqList.input("q", sql.VarChar(100), q ? `%${q}%` : null);

  const sqlListado = `
  ;WITH pagos_arr AS (
    SELECT r.id, r.numero_recibo, r.monto, r.fecha_pago,
           a.nicho_id, a.propietario_id, 'Arrendamiento' AS origen
    FROM arrendamientos a
    JOIN recibos r ON r.id = a.recibo_id
  ),
  pagos_tras AS (
    SELECT r.id, r.numero_recibo, r.monto, r.fecha_pago,
           t.nicho_id, t.nuevo_propietario_id AS propietario_id, 'Traspaso' AS origen
    FROM traspasos t
    JOIN recibos r ON r.id = t.recibo_id
  ),
  pagos_sueltos AS (
    SELECT r.id, r.numero_recibo, r.monto, r.fecha_pago,
           NULL AS nicho_id, NULL AS propietario_id, 'Recibo' AS origen
    FROM recibos r
    WHERE r.id NOT IN (SELECT recibo_id FROM arrendamientos WHERE recibo_id IS NOT NULL)
      AND r.id NOT IN (SELECT recibo_id FROM traspasos      WHERE recibo_id IS NOT NULL)
  ),
  base AS (
    SELECT * FROM pagos_arr
    UNION ALL SELECT * FROM pagos_tras
    UNION ALL SELECT * FROM pagos_sueltos
  )
  SELECT *
  FROM base
  WHERE (@nicho_id IS NULL OR nicho_id = @nicho_id)
    AND (@propietario_id IS NULL OR propietario_id = @propietario_id)
    AND (@q IS NULL OR numero_recibo LIKE @q)
  ORDER BY fecha_pago DESC
  OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY;
  `;

  const sqlTotal = `
  ;WITH pagos_arr AS (
    SELECT r.id, a.nicho_id, a.propietario_id, r.numero_recibo, r.fecha_pago
    FROM arrendamientos a JOIN recibos r ON r.id=a.recibo_id
  ),
  pagos_tras AS (
    SELECT r.id, t.nicho_id, t.nuevo_propietario_id AS propietario_id, r.numero_recibo, r.fecha_pago
    FROM traspasos t JOIN recibos r ON r.id=t.recibo_id
  ),
  pagos_sueltos AS (
    SELECT r.id, NULL AS nicho_id, NULL AS propietario_id, r.numero_recibo, r.fecha_pago
    FROM recibos r
    WHERE r.id NOT IN (SELECT recibo_id FROM arrendamientos WHERE recibo_id IS NOT NULL)
      AND r.id NOT IN (SELECT recibo_id FROM traspasos      WHERE recibo_id IS NOT NULL)
  ),
  base AS (SELECT * FROM pagos_arr UNION ALL SELECT * FROM pagos_tras UNION ALL SELECT * FROM pagos_sueltos)
  SELECT COUNT(1) AS total
  FROM base
  WHERE (@nicho_id IS NULL OR nicho_id = @nicho_id)
    AND (@propietario_id IS NULL OR propietario_id = @propietario_id)
    AND (@q IS NULL OR numero_recibo LIKE @q);`;

  const [rows, tot] = await Promise.all([
    reqList.query(sqlListado),
    new sql.Request(pool)
      .input("nicho_id", sql.Int, nicho_id || null)
      .input("propietario_id", sql.Int, propietario_id || null)
      .input("q", sql.VarChar(100), q ? `%${q}%` : null)
      .query(sqlTotal)
  ]);

  return { rows: rows.recordset, total: tot.recordset[0].total };
};

// POST /api/recibos
exports.crear = async (dto) => {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool); await tx.begin();

  try {
    const ins = await new sql.Request(tx)
      .input("numero_recibo", sql.VarChar(50), dto.numero_recibo)
      .input("monto", sql.Decimal(10,2), dto.monto)
      .input("fecha_pago", sql.Date, dto.fecha_pago)
      .query(`
        INSERT INTO recibos (numero_recibo, monto, fecha_pago, anulada, motivo_anulacion)
        OUTPUT INSERTED.id, INSERTED.numero_recibo, INSERTED.monto, INSERTED.fecha_pago
        VALUES (@numero_recibo, @monto, @fecha_pago, 0, NULL);
      `);

    await tx.commit();
    return ins.recordset[0];
  } catch (e) {
    try { await tx.rollback(); } catch(_) {}
    if (e.number === 2627 || e.number === 2601) { e.code = "DUP"; } // UNIQUE numero_recibo
    throw e;
  }
};

// GET /api/recibos/{id}
exports.obtener = async (id) => {
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input("id", sql.Int, id)
    .query(`
      SELECT r.id, r.numero_recibo, r.monto, r.fecha_pago, r.anulada, r.motivo_anulacion
      FROM recibos r WHERE r.id=@id;
    `);
  return rs.recordset[0] || null;
};
