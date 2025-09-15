// modules/nichos/nichos.service.js
const { getConnection, sql } = require("../../config/db");

// ----------------------------------------------
// LISTAR con filtros y propietario actual + paginación
// ----------------------------------------------
exports.listar = async ({ manzanaId, estado, q, page, pageSize }) => {
  const pool = await getConnection();
  const off = (page - 1) * pageSize;

  const req1 = new sql.Request(pool)
    .input("manzanaId", sql.Int, manzanaId)
    .input("estado", sql.VarChar(20), estado)
    .input("q", sql.VarChar(100), q ? `%${q}%` : null)
    .input("off", sql.Int, off)
    .input("ps", sql.Int, pageSize);

  const sqlListado = `
  DECLARE @today date = CAST(GETDATE() AS date);

  ;WITH owner AS (
    SELECT n.id AS nicho_id,
           COALESCE(t.nuevo_propietario_id, a.propietario_id) AS propietario_id
    FROM nichos n
    OUTER APPLY (
      SELECT TOP 1 nuevo_propietario_id
      FROM traspasos t
      WHERE t.nicho_id = n.id
      ORDER BY t.fecha_traspaso DESC, t.id DESC
    ) t
    OUTER APPLY (
      SELECT TOP 1 propietario_id
      FROM arrendamientos a
      WHERE a.nicho_id = n.id
        AND @today BETWEEN a.fecha_inicio AND a.fecha_fin
      ORDER BY a.fecha_fin DESC, a.id DESC
    ) a
  )
  SELECT n.id, n.numero, n.estado,
         m.id AS manzana_id, m.nombre AS manzana,
         p.id AS propietario_id,
         CONCAT(COALESCE(p.nombres,''),' ',COALESCE(p.apellidos,'')) AS propietario,
         p.dpi
  FROM nichos n
  JOIN manzanas m ON m.id = n.manzana_id
  LEFT JOIN owner ow ON ow.nicho_id = n.id
  LEFT JOIN propietarios p ON p.id = ow.propietario_id
  WHERE (@manzanaId IS NULL OR n.manzana_id = @manzanaId)
    AND (@estado    IS NULL OR n.estado     = @estado)
    AND (
      @q IS NULL OR
      CAST(n.numero AS varchar(10)) LIKE @q OR
      (p.nombres + ' ' + p.apellidos) LIKE @q OR
      p.dpi LIKE @q
    )
  ORDER BY m.nombre, n.numero
  OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY;
  `;

  const sqlTotal = `
  DECLARE @today date = CAST(GETDATE() AS date);
  ;WITH owner AS (
    SELECT n.id AS nicho_id,
           COALESCE(t.nuevo_propietario_id, a.propietario_id) AS propietario_id
    FROM nichos n
    OUTER APPLY (SELECT TOP 1 nuevo_propietario_id FROM traspasos t WHERE t.nicho_id = n.id ORDER BY t.fecha_traspaso DESC, t.id DESC) t
    OUTER APPLY (SELECT TOP 1 propietario_id FROM arrendamientos a WHERE a.nicho_id = n.id AND @today BETWEEN a.fecha_inicio AND a.fecha_fin ORDER BY a.fecha_fin DESC, a.id DESC) a
  )
  SELECT COUNT(1) AS total
  FROM nichos n
  JOIN manzanas m ON m.id = n.manzana_id
  LEFT JOIN owner ow ON ow.nicho_id = n.id
  LEFT JOIN propietarios p ON p.id = ow.propietario_id
  WHERE (@manzanaId IS NULL OR n.manzana_id = @manzanaId)
    AND (@estado    IS NULL OR n.estado     = @estado)
    AND (
      @q IS NULL OR
      CAST(n.numero AS varchar(10)) LIKE @q OR
      (p.nombres + ' ' + p.apellidos) LIKE @q OR
      p.dpi LIKE @q
    );`;

  const [rows, total] = await Promise.all([
    req1.query(sqlListado),
    new sql.Request(pool)
      .input("manzanaId", sql.Int, manzanaId)
      .input("estado", sql.VarChar(20), estado)
      .input("q", sql.VarChar(100), q ? `%${q}%` : null)
      .query(sqlTotal)
  ]);

  return { data: rows.recordset, page, pageSize, total: total.recordset[0].total };
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

// ----------------------------------------------
// CAMBIAR ESTADO con auditoría
//  - Inserta registro en auditoria (accion JSON)
//  - Retorna nicho actualizado o null si no existe
// ----------------------------------------------
exports.cambiarEstado = async ({ id, nuevo_estado, motivo, usuario_id }) => {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const reqSelect = new sql.Request(tx).input("id", sql.Int, id);
    const sel = await reqSelect.query(`SELECT id, numero, estado, manzana_id FROM dbo.nichos WHERE id = @id;`);
    const current = sel.recordset[0];
    if (!current) {
      await tx.rollback();
      return null;
    }
    if (current.estado === nuevo_estado) {
      await tx.rollback();
      return { noCambio: true, current };
    }

    // Actualizar estado
    const reqUpd = new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("estado", sql.NVarChar(20), nuevo_estado);
    await reqUpd.query(`UPDATE dbo.nichos SET estado = @estado WHERE id = @id;`);

    // Auditoría
    const accion = JSON.stringify({
      tipo: "NICHO_ESTADO",
      nicho_id: id,
      de: current.estado,
      a: nuevo_estado,
      motivo: motivo || null,
      usuario_id,
    });
    const reqAud = new sql.Request(tx)
      .input("usuario_id", sql.Int, usuario_id)
      .input("accion", sql.NVarChar(sql.MAX), accion);
    await reqAud.query(`INSERT INTO dbo.auditoria (usuario_id, accion, fecha) VALUES (@usuario_id, @accion, SYSDATETIMEOFFSET());`);

    await tx.commit();
    // devolver con join para mantener consistencia
    return await exports.obtenerPorId(id);
  } catch (err) {
    try { await tx.rollback(); } catch (_) {}
    throw err;
  }
};

// ----------------------------------------------
// HISTORIAL de cambios de estado
// Retorna array [{ fecha, de, a, motivo, usuario_id }]
// ----------------------------------------------
exports.historialEstado = async (id) => {
  const pool = await getConnection();
  const r = await pool.request().input("id", sql.Int, id).query(`
    SELECT a.usuario_id, a.accion, a.fecha
    FROM dbo.auditoria a
    WHERE JSON_VALUE(a.accion, '$.tipo') = 'NICHO_ESTADO'
      AND TRY_CONVERT(INT, JSON_VALUE(a.accion, '$.nicho_id')) = @id
    ORDER BY a.fecha DESC;
  `);
  return r.recordset.map(row => {
    let parsed = {};
    try { parsed = JSON.parse(row.accion || '{}'); } catch (_) {}
    return {
      fecha: row.fecha,
      de: parsed.de,
      a: parsed.a,
      motivo: parsed.motivo,
      usuario_id: row.usuario_id,
    };
  });
};
