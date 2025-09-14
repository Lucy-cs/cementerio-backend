const { getConnection, sql } = require("../../config/db");

function todayDateStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function estadoDerivado(fecha_inicio, fecha_fin, fue_cancelado) {
  if (fue_cancelado) return 'Cancelado';
  const t = todayDateStr();
  if (t >= fecha_inicio && t <= fecha_fin) return 'Activo';
  if (t < fecha_fin) {
    // derivación de PorVencer se calcula fuera con dias_para_vencer
    return 'Activo';
  }
  return 'Vencido';
}

async function existeTraslapeNicho(tx, nicho_id, inicio, fin) {
  const r = await new sql.Request(tx)
    .input('nicho_id', sql.Int, nicho_id)
    .input('inicio', sql.Date, inicio)
    .input('fin', sql.Date, fin)
    .query(`
      -- Traslape si (A.inicio <= B.fin) AND (A.fin >= B.inicio)
      SELECT TOP 1 1 AS hay
      FROM dbo.arrendamientos a
      WHERE a.nicho_id = @nicho_id
        AND a.fecha_inicio <= @fin
        AND a.fecha_fin >= @inicio
    `);
  return !!r.recordset[0];
}

async function crear(dto, usuario_id) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // Validaciones FK básicas
    const val = await new sql.Request(tx)
      .input('propietario_id', sql.Int, dto.propietario_id)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .query(`
        SELECT 
          (SELECT COUNT(1) FROM dbo.propietarios WHERE id=@propietario_id) AS prop_ok,
          (SELECT COUNT(1) FROM dbo.nichos WHERE id=@nicho_id) AS nicho_ok,
          (SELECT estado FROM dbo.nichos WHERE id=@nicho_id) AS nicho_estado
      `);
    const rowVal = val.recordset[0];
    if (!rowVal || !rowVal.prop_ok) { await tx.rollback(); const e = new Error('Propietario no existe'); e.code='PROP_NOT_FOUND'; throw e; }
    if (!rowVal.nicho_ok) { await tx.rollback(); const e = new Error('Nicho no existe'); e.code='NICHO_NOT_FOUND'; throw e; }
    if (rowVal.nicho_estado !== 'Disponible') { await tx.rollback(); const e = new Error('Nicho no disponible'); e.code='NICHO_NO_DISPONIBLE'; throw e; }

    // Calcular fecha_fin = fecha_inicio + 7 años
    const qFecha = await new sql.Request(tx)
      .input('fecha_inicio', sql.Date, dto.fecha_inicio)
      .query(`SELECT CONVERT(date, DATEADD(year, 7, @fecha_inicio)) AS fecha_fin;`);
    const fecha_fin = qFecha.recordset[0].fecha_fin;

    // Exclusividad por nicho (traslape)
    const overlap = await existeTraslapeNicho(tx, dto.nicho_id, dto.fecha_inicio, fecha_fin);
    if (overlap) { await tx.rollback(); const e = new Error('Traslape'); e.code='TRASLAPE_NICHO'; throw e; }

    // 1) Insert recibo
    let reciboId;
    try {
      const insR = await new sql.Request(tx)
        .input('numero_recibo', sql.NVarChar(50), dto.recibo.numero_recibo)
        .input('monto', sql.Decimal(18,2), dto.recibo.monto)
        .input('fecha_pago', sql.Date, dto.recibo.fecha_pago)
        .query(`
          INSERT INTO dbo.recibos(numero_recibo, monto, fecha_pago)
          VALUES(@numero_recibo, @monto, @fecha_pago);
          SELECT SCOPE_IDENTITY() AS id;`);
      reciboId = Number(insR.recordset[0].id);
    } catch(err) {
      if (err.number === 2601 || err.number === 2627) { await tx.rollback(); const e=new Error('DUP_RECIBO'); e.code='DUP_RECIBO'; throw e; }
      throw err;
    }

    // 2) Insert arrendamiento
    const insA = await new sql.Request(tx)
      .input('propietario_id', sql.Int, dto.propietario_id)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .input('recibo_id', sql.Int, reciboId)
      .input('fecha_inicio', sql.Date, dto.fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('nombre_difunto', sql.NVarChar(200), dto.nombre_difunto || null)
      .query(`
        INSERT INTO dbo.arrendamientos(propietario_id, nicho_id, recibo_id, fecha_inicio, fecha_fin, nombre_difunto)
        VALUES(@propietario_id, @nicho_id, @recibo_id, @fecha_inicio, @fecha_fin, @nombre_difunto);
        SELECT SCOPE_IDENTITY() AS id;`);
    const arrId = Number(insA.recordset[0].id);

    // 3) Ocupar nicho
    await new sql.Request(tx)
      .input('nicho_id', sql.Int, dto.nicho_id)
      .query(`UPDATE dbo.nichos SET estado='Ocupado' WHERE id=@nicho_id;`);

    await tx.commit();

    return await obtenerPorId(arrId);
  } catch (err) {
    try { await tx.rollback(); } catch(_) {}
    throw err;
  }
}

async function obtenerPorId(id) {
  const pool = await getConnection();
  const r = await pool.request().input('id', sql.Int, id).query(`
    DECLARE @hoy date = CONVERT(date, GETDATE());
    SELECT a.id, a.propietario_id, a.nicho_id, a.recibo_id, a.fecha_inicio, a.fecha_fin, a.nombre_difunto,
           p.nombres AS propietario_nombres, p.apellidos AS propietario_apellidos, p.dpi AS propietario_dpi,
           n.numero AS nicho_numero, n.manzana_id, m.nombre AS manzana,
           CASE WHEN a.fecha_fin < @hoy THEN 'Vencido'
                WHEN a.fecha_fin >= @hoy AND DATEDIFF(day, @hoy, a.fecha_fin) <= 30 THEN 'PorVencer'
                ELSE 'Activo' END AS estado_derive,
           CASE WHEN EXISTS (
                   SELECT 1 FROM dbo.auditoria au
                   WHERE JSON_VALUE(au.accion,'$.tipo') = 'ARR_CANCELADO'
                     AND TRY_CONVERT(INT, JSON_VALUE(au.accion,'$.arrendamiento_id')) = a.id
                 ) THEN 1 ELSE 0 END AS fue_cancelado,
           CASE WHEN a.fecha_fin >= @hoy THEN DATEDIFF(day, @hoy, a.fecha_fin) ELSE NULL END AS dias_para_vencer
    FROM dbo.arrendamientos a
    JOIN dbo.propietarios p ON p.id = a.propietario_id
    JOIN dbo.nichos n ON n.id = a.nicho_id
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    WHERE a.id = @id;
  `);
  return r.recordset[0];
}

async function listar({ estado, venceAntesDe, q, page=1, pageSize=20, sort='fecha_fin', dir='asc' }) {
  const pool = await getConnection();
  const req = pool.request();
  const where = [];
  const orderCols = { fecha_fin: 'a.fecha_fin', fecha_inicio: 'a.fecha_inicio', id: 'a.id' };
  const orderCol = orderCols[sort] || 'a.fecha_fin';
  const orderDir = String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  req.input('limit', sql.Int, pageSize);
  req.input('offset', sql.Int, (page-1)*pageSize);

  if (venceAntesDe) {
    req.input('vence', sql.Date, venceAntesDe);
    where.push('a.fecha_fin <= @vence');
  }
  if (q) {
    req.input('q', sql.NVarChar(100), `%${q}%`);
    where.push(`(a.propietario_dpi LIKE @q OR a.propietario_nombres LIKE @q OR a.propietario_apellidos LIKE @q OR CAST(a.nicho_numero AS NVARCHAR(20)) LIKE @q)`);
  }
  if (estado) {
    req.input('estado', sql.NVarChar(20), estado);
    where.push(`a.estado_derive = @estado`);
  }

  const r = await req.query(`
    DECLARE @hoy date = CONVERT(date, GETDATE());
    WITH base AS (
      SELECT a.id, a.propietario_id, a.nicho_id, a.recibo_id, a.fecha_inicio, a.fecha_fin, a.nombre_difunto,
             p.nombres AS propietario_nombres, p.apellidos AS propietario_apellidos, p.dpi AS propietario_dpi,
             n.numero AS nicho_numero, n.manzana_id, m.nombre AS manzana,
             CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.auditoria au
                    WHERE JSON_VALUE(au.accion,'$.tipo') = 'ARR_CANCELADO'
                      AND TRY_CONVERT(INT, JSON_VALUE(au.accion,'$.arrendamiento_id')) = a.id
                  ) THEN 'Cancelado'
                  WHEN a.fecha_fin < @hoy THEN 'Vencido'
                  WHEN a.fecha_fin >= @hoy AND DATEDIFF(day, @hoy, a.fecha_fin) <= 30 THEN 'PorVencer'
                  ELSE 'Activo' END AS estado_derive,
             CASE WHEN a.fecha_fin >= @hoy THEN DATEDIFF(day, @hoy, a.fecha_fin) ELSE NULL END AS dias_para_vencer
      FROM dbo.arrendamientos a
      JOIN dbo.propietarios p ON p.id = a.propietario_id
      JOIN dbo.nichos n ON n.id = a.nicho_id
      LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    )
    SELECT *, COUNT(*) OVER() AS total_rows
    FROM base a
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderCol} ${orderDir}
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
  `);
  const rows = r.recordset;
  const total = rows[0] ? rows[0].total_rows : 0;
  return { rows, total };
}

async function renovar(id, dto, usuario_id) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const sel = await new sql.Request(tx).input('id', sql.Int, id).query(`
      SELECT a.id, a.nicho_id, a.fecha_inicio, a.fecha_fin FROM dbo.arrendamientos a WHERE a.id = @id;
    `);
    const a = sel.recordset[0];
    if (!a) { await tx.rollback(); const e=new Error('No existe'); e.code='NOT_FOUND'; throw e; }

    // Insertar recibo (idempotencia por UNIQUE)
    let reciboId;
    try {
      const insR = await new sql.Request(tx)
        .input('numero_recibo', sql.NVarChar(50), dto.recibo.numero_recibo)
        .input('monto', sql.Decimal(18,2), dto.recibo.monto)
        .input('fecha_pago', sql.Date, dto.recibo.fecha_pago)
        .query(`INSERT INTO dbo.recibos(numero_recibo, monto, fecha_pago) VALUES(@numero_recibo, @monto, @fecha_pago); SELECT SCOPE_IDENTITY() AS id;`);
      reciboId = Number(insR.recordset[0].id);
    } catch(err) {
      if (err.number === 2601 || err.number === 2627) { await tx.rollback(); const e=new Error('DUP_RECIBO'); e.code='DUP_RECIBO'; throw e; }
      throw err;
    }

    // Nueva fecha_fin
    const q = await new sql.Request(tx)
      .input('hoy', sql.Date, todayDateStr())
      .input('fecha_fin_actual', sql.Date, a.fecha_fin)
      .query(`
        DECLARE @nueva date;
        IF (@hoy <= @fecha_fin_actual)
          SET @nueva = DATEADD(year, 7, @fecha_fin_actual);
        ELSE
          SET @nueva = DATEADD(year, 7, @hoy);
        SELECT @nueva AS nueva;
      `);
    const nueva = q.recordset[0].nueva;

    // Validar traslape contra otros (para el mismo nicho; del periodo nuevo con otros arrendamientos distintos a este)
    const overlap = await new sql.Request(tx)
      .input('nicho_id', sql.Int, a.nicho_id)
      .input('inicio', sql.Date, a.fecha_inicio)
      .input('fin', sql.Date, nueva)
      .input('id', sql.Int, id)
      .query(`
        SELECT TOP 1 1 AS hay
        FROM dbo.arrendamientos x
        WHERE x.nicho_id=@nicho_id AND x.id<>@id
          AND x.fecha_inicio <= @fin AND x.fecha_fin >= @inicio;
      `);
    if (overlap.recordset[0]) { await tx.rollback(); const e=new Error('TRASLAPE_NICHO'); e.code='TRASLAPE_NICHO'; throw e; }

    // Actualizar arrendamiento
    await new sql.Request(tx)
      .input('id', sql.Int, id)
      .input('nueva', sql.Date, nueva)
      .input('recibo_id', sql.Int, reciboId)
      .query(`UPDATE dbo.arrendamientos SET fecha_fin=@nueva, recibo_id=@recibo_id WHERE id=@id;`);

    // Asegurar nicho ocupado
    await new sql.Request(tx).input('nicho_id', sql.Int, a.nicho_id).query(`UPDATE dbo.nichos SET estado='Ocupado' WHERE id=@nicho_id AND estado <> 'Ocupado';`);

    // Auditoría
    const accion = JSON.stringify({ tipo: 'ARR_RENOVADO', arrendamiento_id: id, usuario_id, observaciones: dto.observaciones || null });
    await new sql.Request(tx)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('accion', sql.NVarChar(sql.MAX), accion)
      .query(`INSERT INTO dbo.auditoria(usuario_id, accion, fecha) VALUES(@usuario_id, @accion, SYSDATETIMEOFFSET());`);

    await tx.commit();
    return await obtenerPorId(id);
  } catch (err) {
    try { await tx.rollback(); } catch(_) {}
    throw err;
  }
}

async function cancelar(id, dto, usuario_id) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const sel = await new sql.Request(tx).input('id', sql.Int, id).query(`SELECT id, nicho_id FROM dbo.arrendamientos WHERE id=@id;`);
    const a = sel.recordset[0];
    if (!a) { await tx.rollback(); const e=new Error('NOT_FOUND'); e.code='NOT_FOUND'; throw e; }

    // Opción mínima: fecha_fin = hoy
    const hoy = todayDateStr();
    await new sql.Request(tx).input('id', sql.Int, id).input('hoy', sql.Date, hoy).query(`UPDATE dbo.arrendamientos SET fecha_fin=@hoy WHERE id=@id;`);

    if (dto.liberarNicho) {
      await new sql.Request(tx).input('nicho_id', sql.Int, a.nicho_id).query(`UPDATE dbo.nichos SET estado='Disponible' WHERE id=@nicho_id;`);
    }

    const accion = JSON.stringify({ tipo: 'ARR_CANCELADO', arrendamiento_id: id, usuario_id, motivo: dto.motivo });
    await new sql.Request(tx)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('accion', sql.NVarChar(sql.MAX), accion)
      .query(`INSERT INTO dbo.auditoria(usuario_id, accion, fecha) VALUES(@usuario_id, @accion, SYSDATETIMEOFFSET());`);

    await tx.commit();
    return await obtenerPorId(id);
  } catch (err) {
    try { await tx.rollback(); } catch(_) {}
    throw err;
  }
}

async function alertasVencimientos(dias = 30) {
  const pool = await getConnection();
  const r = await pool.request().input('dias', sql.Int, dias).query(`
    DECLARE @hoy date = CONVERT(date, GETDATE());
    SELECT a.id AS arrendamiento_id,
           p.id AS propietario_id, p.nombres, p.apellidos, p.dpi,
           n.id AS nicho_id, n.numero AS numero, m.nombre AS manzana,
           a.fecha_fin,
           DATEDIFF(day, @hoy, a.fecha_fin) AS dias_para_vencer
    FROM dbo.arrendamientos a
    JOIN dbo.propietarios p ON p.id=a.propietario_id
    JOIN dbo.nichos n ON n.id=a.nicho_id
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    WHERE a.fecha_fin BETWEEN @hoy AND DATEADD(day, @dias, @hoy)
    ORDER BY a.fecha_fin ASC;
  `);
  return r.recordset.map(row => ({
    arrendamiento_id: row.arrendamiento_id,
    propietario: { id: row.propietario_id, nombres: row.nombres, apellidos: row.apellidos, dpi: row.dpi },
    nicho: { id: row.nicho_id, numero: row.numero, manzana: row.manzana },
    fecha_fin: row.fecha_fin,
    dias_para_vencer: row.dias_para_vencer,
  }));
}

module.exports = { crear, obtenerPorId, listar, renovar, cancelar, alertasVencimientos };
