// modules/traspasos/traspasos.service.js
const { getConnection, sql } = require("../../config/db");

const SELECT_BASE = `
SELECT t.id, t.fecha_traspaso, t.nicho_id,
       n.numero AS nicho_numero, n.manzana_id, m.nombre AS manzana,
       t.propietario_anterior_id AS prop_anterior_id,
       pa.nombres AS prop_anterior_nombres, pa.apellidos AS prop_anterior_apellidos, pa.dpi AS prop_anterior_dpi,
       t.nuevo_propietario_id AS prop_nuevo_id,
       pn.nombres AS prop_nuevo_nombres, pn.apellidos AS prop_nuevo_apellidos, pn.dpi AS prop_nuevo_dpi,
       r.id AS recibo_id, r.numero_recibo, r.monto, r.fecha_pago
FROM traspasos t
JOIN nichos n ON n.id = t.nicho_id
JOIN manzanas m ON m.id = n.manzana_id
JOIN propietarios pa ON pa.id = t.propietario_anterior_id
JOIN propietarios pn ON pn.id = t.nuevo_propietario_id
JOIN recibos r ON r.id = t.recibo_id`;

exports.listar = async ({ q, page=1, pageSize=20, sort='t.fecha_traspaso', dir='desc' }) => {
  const pool = await getConnection();
  const off = (page-1)*pageSize;
  const where = q ? `WHERE (pn.nombres + ' ' + pn.apellidos LIKE @q OR pa.nombres + ' ' + pa.apellidos LIKE @q OR CAST(n.numero AS varchar(10)) LIKE @q)` : '';
  const rows = await pool.request()
    .input('q', sql.VarChar(100), q ? `%${q}%` : null)
    .query(`${SELECT_BASE} ${where} ORDER BY ${sort} ${dir} OFFSET ${off} ROWS FETCH NEXT ${pageSize} ROWS ONLY;`);
  const total = await pool.request()
    .input('q', sql.VarChar(100), q ? `%${q}%` : null)
    .query(`SELECT COUNT(1) AS total FROM traspasos t
            JOIN nichos n ON n.id=t.nicho_id
            JOIN propietarios pa ON pa.id=t.propietario_anterior_id
            JOIN propietarios pn ON pn.id=t.nuevo_propietario_id ${where};`);
  return { rows: rows.recordset, total: total.recordset[0].total };
};

exports.obtenerPorId = async (id) => {
  const pool = await getConnection();
  const rs = await pool.request().input('id', sql.Int, id).query(`${SELECT_BASE} WHERE t.id=@id;`);
  if (!rs.recordset[0]) { const e = new Error('TRASPASO_NOT_FOUND'); e.code='NOT_FOUND'; throw e; }
  return rs.recordset[0];
};

exports.crear = async (dto, userId) => {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool); await tx.begin();

  try {
    // 1) Lock del nicho (request dedicado)
    await new sql.Request(tx)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .query(`SELECT id FROM nichos WITH (UPDLOCK, HOLDLOCK) WHERE id=@nicho_id;`);

    // 2) Propietario actual (request dedicado)
    const cur = await new sql.Request(tx)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .query(`
        DECLARE @prop_anterior INT;
        SELECT TOP 1 @prop_anterior = nuevo_propietario_id
          FROM traspasos WHERE nicho_id=@nicho_id
          ORDER BY fecha_traspaso DESC, id DESC;

        IF @prop_anterior IS NULL
          SELECT TOP 1 @prop_anterior = propietario_id
          FROM arrendamientos
          WHERE nicho_id=@nicho_id AND CAST(GETDATE() AS date) BETWEEN fecha_inicio AND fecha_fin
          ORDER BY fecha_fin DESC, id DESC;

        IF @prop_anterior IS NULL
          SELECT TOP 1 @prop_anterior = propietario_id
          FROM solicitudes_compra
          WHERE nicho_id=@nicho_id AND estado='Aprobada'
          ORDER BY id DESC;

        SELECT prop_anterior = @prop_anterior;
      `);
    const prop_anterior = cur.recordset[0]?.prop_anterior;
    if (!prop_anterior) { const e = new Error('SIN_PROPIETARIO_ACTUAL'); e.code='CONFLICT'; throw e; }

    // 3) Validar existencia (request dedicado)
    const exist = await new sql.Request(tx)
      .input('prop_anterior', sql.Int, prop_anterior)
      .input('nuevo_prop', sql.Int, dto.nuevo_propietario_id)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .query(`
        SELECT ok_ant   = COUNT(1) FROM propietarios WHERE id=@prop_anterior;
        SELECT ok_new   = COUNT(1) FROM propietarios WHERE id=@nuevo_prop;
        SELECT ok_nicho = COUNT(1) FROM nichos       WHERE id=@nicho_id;
      `);
    // mssql devuelve múltiples recordsets -> usar exist.recordsets
    const ok_ant = exist.recordsets?.[0]?.[0]?.ok_ant ?? 0;
    const ok_new = exist.recordsets?.[1]?.[0]?.ok_new ?? 0;
    const ok_nicho = exist.recordsets?.[2]?.[0]?.ok_nicho ?? 0;
    if (!ok_ant || !ok_new || !ok_nicho) { const e = new Error('FK_NOT_FOUND'); e.code='NOT_FOUND'; throw e; }

    // 4) Insertar recibo (request dedicado)
    let recibo_id;
    try {
      const insR = await new sql.Request(tx)
        .input('numero_recibo', sql.NVarChar(50), dto.recibo.numero_recibo)
        .input('monto', sql.Decimal(18,2), dto.recibo.monto)
        .input('fecha_pago', sql.Date, dto.recibo.fecha_pago)
        .query(`
          INSERT INTO recibos (numero_recibo, monto, fecha_pago)
          OUTPUT INSERTED.id
          VALUES (@numero_recibo, @monto, @fecha_pago);
        `);
      recibo_id = insR.recordset[0].id;
    } catch (err) {
      if (err.number === 2627 || err.number === 2601) { err.code = 'DUP_RECIBO'; throw err; }
      throw err;
    }

    // 5) Insertar traspaso (request dedicado)
    const insT = await new sql.Request(tx)
      .input('prop_anterior', sql.Int, prop_anterior)
      .input('nuevo_prop', sql.Int, dto.nuevo_propietario_id)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .input('recibo_id', sql.Int, recibo_id)
      .input('fecha_traspaso', sql.Date, dto.fecha_traspaso || null)
      .query(`
        INSERT INTO traspasos (propietario_anterior_id, nuevo_propietario_id, nicho_id, recibo_id, fecha_traspaso)
        OUTPUT INSERTED.id
        VALUES (@prop_anterior, @nuevo_prop, @nicho_id, @recibo_id, ISNULL(@fecha_traspaso, CAST(GETDATE() AS date)));
      `);
    const traspaso_id = insT.recordset[0].id;

    // 6) Sincronizar arrendamiento activo (request dedicado)
    await new sql.Request(tx)
      .input('nuevo_prop', sql.Int, dto.nuevo_propietario_id)
      .input('nicho_id',  sql.Int, dto.nicho_id)
      .query(`
        UPDATE a SET propietario_id=@nuevo_prop
        FROM arrendamientos a
        WHERE a.nicho_id=@nicho_id
          AND CAST(GETDATE() AS date) BETWEEN a.fecha_inicio AND a.fecha_fin;
      `);

    // Auditoría (request dedicado)
    const accion = JSON.stringify({ tipo: 'TRASPASO_REALIZADO', nicho_id: dto.nicho_id, de: prop_anterior, a: dto.nuevo_propietario_id, userId, observaciones: dto.observaciones || null });
    await new sql.Request(tx)
      .input('usuario_id', sql.Int, userId || null)
      .input('accion', sql.NVarChar(sql.MAX), accion)
      .query(`INSERT INTO dbo.auditoria(usuario_id, accion, fecha) VALUES(@usuario_id, @accion, SYSDATETIMEOFFSET());`);

    await tx.commit();
    return await exports.obtenerPorId(traspaso_id);
  } catch (err) {
    try { await tx.rollback(); } catch(_) {}
    if (err.number === 2627 || err.number === 2601) { err.code = 'DUP_RECIBO'; }
    throw err;
  }
};
