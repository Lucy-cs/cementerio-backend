const { getConnection, sql } = require('../../config/db');

exports.listar = async ({desde, hasta, usuarioId, accion, q, page, pageSize})=>{
  const pool = await getConnection();
  const off = (page-1)*pageSize;

  const listReq = new sql.Request(pool)
    .input('d', sql.Date, desde || null)
    .input('h', sql.Date, hasta || null)
    .input('usuarioId', sql.Int, usuarioId)
    .input('accion', sql.VarChar(30), accion)
    .input('q', sql.NVarChar(200), q ? `%${q}%` : null)
    .input('off', sql.Int, off)
    .input('ps',  sql.Int, pageSize);

  const sqlListado = `
  SELECT a.id, a.fecha, a.usuario_id, a.usuario_nombre, a.accion,
         a.entidad, a.entidad_id, a.detalle, a.ip, a.user_agent
  FROM auditoria a
  WHERE (@d IS NULL OR a.fecha >= @d)
    AND (@h IS NULL OR a.fecha < DATEADD(day,1,@h))
    AND (@usuarioId IS NULL OR a.usuario_id = @usuarioId)
    AND (@accion IS NULL OR a.accion = @accion)
    AND (@q IS NULL OR a.detalle LIKE @q OR a.entidad LIKE @q OR CAST(a.entidad_id AS varchar(50)) LIKE @q)
  ORDER BY a.fecha DESC, a.id DESC
  OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY;`;

  const sqlTotal = `
  SELECT COUNT(1) AS total
  FROM auditoria a
  WHERE (@d IS NULL OR a.fecha >= @d)
    AND (@h IS NULL OR a.fecha < DATEADD(day,1,@h))
    AND (@usuarioId IS NULL OR a.usuario_id = @usuarioId)
    AND (@accion IS NULL OR a.accion = @accion)
    AND (@q IS NULL OR a.detalle LIKE @q OR a.entidad LIKE @q OR CAST(a.entidad_id AS varchar(50)) LIKE @q);`;

  const [rows, tot] = await Promise.all([
    listReq.query(sqlListado),
    new sql.Request(pool)
      .input('d', sql.Date, desde || null)
      .input('h', sql.Date, hasta || null)
      .input('usuarioId', sql.Int, usuarioId)
      .input('accion', sql.VarChar(30), accion)
      .input('q', sql.NVarChar(200), q ? `%${q}%` : null)
      .query(sqlTotal)
  ]);

  return { data: rows.recordset, page, pageSize, total: tot.recordset[0].total };
};
