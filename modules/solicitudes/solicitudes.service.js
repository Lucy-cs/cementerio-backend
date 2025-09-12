// modules/solicitudes/solicitudes.service.js
const { getConnection, sql } = require("../../config/db");

// LISTAR con filtros + paginación
exports.listar = async ({ estado, manzanaId, q, page=1, pageSize=20, sort, dir }) => {
  const pool = await getConnection();
  const req = pool.request();
  const where = [];
  if(estado){
    where.push("s.estado = @estado");
    req.input("estado", sql.NVarChar(20), estado);
  }
  if(manzanaId){
    where.push("m.id = @manzanaId");
    req.input("manzanaId", sql.Int, manzanaId);
  }
  if(q){
    where.push(`( (p.nombres + ' ' + p.apellidos) LIKE @q
                  OR p.dpi LIKE @q
                  OR CAST(n.numero AS NVARCHAR(20)) LIKE @q )`);
    req.input("q", sql.NVarChar(100), `%${q}%`);
  }
  const sortable = {
    fecha_solicitud: "s.fecha_solicitud",
    estado: "s.estado",
    manzana: "m.nombre",
    nichoNumero: "n.numero",
    propietario: "p.nombres"
  };
  const orderCol = sortable[sort] || "s.id";
  const orderDir = dir && dir.toLowerCase()==='asc' ? 'ASC':'DESC';

  const offset = (page-1) * pageSize;
  req.input("limit", sql.Int, pageSize);
  req.input("offset", sql.Int, offset);

  const whereSql = where.length? 'WHERE ' + where.join(' AND ') : '';

  const query = `
    SELECT s.id, s.estado, s.fecha_solicitud, s.recibo_id,
           p.id AS propietario_id, p.nombres AS propietario_nombres, p.apellidos AS propietario_apellidos, p.dpi AS propietario_dpi,
           n.id AS nicho_id, n.numero AS nicho_numero,
           m.id AS manzana_id, m.nombre AS manzana,
           COUNT(*) OVER() AS total_rows
    FROM dbo.solicitudes_compra s
    LEFT JOIN dbo.propietarios p ON p.id = s.propietario_id
    LEFT JOIN dbo.nichos n ON n.id = s.nicho_id
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    ${whereSql}
    ORDER BY ${orderCol} ${orderDir}
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
  `;
  const r = await req.query(query);
  const total = r.recordset[0]? r.recordset[0].total_rows : 0;
  return { rows: r.recordset, total };
};

// CREAR solicitud con locking del nicho (nueva implementación solicitada)
exports.crear = async ({ propietario_id, nicho_id }) => {
  const pool = await getConnection();
  try {
    const r = await pool.request()
      .input("propietario_id", sql.Int, propietario_id)
      .input("nicho_id", sql.Int, nicho_id)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRAN;

        -- 1) Validar propietario
        IF NOT EXISTS (SELECT 1 FROM dbo.propietarios WHERE id = @propietario_id)
        BEGIN
          ROLLBACK TRAN; THROW 50001, 'PROP_NOT_FOUND', 1;
        END

        -- 2) Lock del nicho y validación de disponibilidad
        IF NOT EXISTS (SELECT 1 FROM dbo.nichos WITH (UPDLOCK, HOLDLOCK) WHERE id=@nicho_id)
        BEGIN
          ROLLBACK TRAN; THROW 50002, 'NICHO_NOT_FOUND', 1;
        END
        IF EXISTS (SELECT 1 FROM dbo.nichos WHERE id=@nicho_id AND estado <> N'Disponible')
        BEGIN
          ROLLBACK TRAN; THROW 50003, 'NICHO_NO_DISPONIBLE', 1;
        END

        -- 3) Crear solicitud y reservar nicho
        INSERT INTO dbo.solicitudes_compra (propietario_id, nicho_id, estado, fecha_solicitud, recibo_id)
        VALUES (@propietario_id, @nicho_id, N'Pendiente', CONVERT(date, GETDATE()), NULL);

        DECLARE @sol_id INT = SCOPE_IDENTITY();

        UPDATE dbo.nichos SET estado = N'Reservado' WHERE id = @nicho_id;

        COMMIT TRAN;

        -- 4) Devolver la solicitud con joins
        SELECT s.id, s.propietario_id, s.nicho_id, s.estado, s.fecha_solicitud, s.recibo_id,
               n.numero AS nicho_numero, n.manzana_id, n.estado AS estado_nicho,
               p.nombres, p.apellidos
        FROM dbo.solicitudes_compra s
        JOIN dbo.nichos n ON n.id = s.nicho_id
        JOIN dbo.propietarios p ON p.id = s.propietario_id
        WHERE s.id = @sol_id;
      `);
    return r.recordset[0];
  } catch (err) {
    if (err.number === 50001) err.code = "PROP_NOT_FOUND";
    else if (err.number === 50002) err.code = "NICHO_NOT_FOUND";
    else if (err.number === 50003) err.code = "NICHO_NO_DISPONIBLE";
    throw err;
  }
};

// OBTENER DETALLE
exports.obtenerDetalle = async (id) => {
  const pool = await getConnection();
  const r = await pool.request().input('id', sql.Int, id).query(`
    SELECT s.id, s.estado, s.fecha_solicitud, s.recibo_id,
           p.id AS propietario_id, p.nombres AS propietario_nombres, p.apellidos AS propietario_apellidos, p.dpi AS propietario_dpi,
           n.id AS nicho_id, n.numero AS nicho_numero,
           m.id AS manzana_id, m.nombre AS manzana,
           rcb.numero_recibo, rcb.fecha_pago, rcb.monto AS monto_recibo
    FROM dbo.solicitudes_compra s
    LEFT JOIN dbo.propietarios p ON p.id = s.propietario_id
    LEFT JOIN dbo.nichos n ON n.id = s.nicho_id
    LEFT JOIN dbo.manzanas m ON m.id = n.manzana_id
    LEFT JOIN dbo.recibos rcb ON rcb.id = s.recibo_id
    WHERE s.id = @id;
  `);
  return r.recordset[0];
};

// APROBAR
exports.aprobar = async (id, usuario_id) => {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const reqSel = new sql.Request(tx).input('id', sql.Int, id);
    const sel = await reqSel.query(`
      SELECT s.id, s.estado, s.nicho_id, n.estado AS nicho_estado, n.manzana_id
      FROM dbo.solicitudes_compra s
      JOIN dbo.nichos n ON n.id = s.nicho_id
      WHERE s.id = @id;`);
    const row = sel.recordset[0];
    if(!row) return { notFound: true };
    if(row.estado !== 'Pendiente') return { conflict: 'SOL_NO_PENDIENTE' };
    if(row.nicho_estado !== 'Reservado') return { conflict: 'NICHO_NO_RESERVADO' };

    // Tarifa vigente
    const tarifaQ = await new sql.Request(tx)
      .input('manzana_id', sql.Int, row.manzana_id)
      .query(`DECLARE @hoy date = CONVERT(date, GETDATE());
        SELECT TOP 1 * FROM dbo.tarifas t
        WHERE t.concepto = 'COMPRA_DERECHO'
          AND t.vigencia_desde <= @hoy AND (t.vigencia_hasta IS NULL OR t.vigencia_hasta > @hoy)
          AND (
            (t.alcance='POR_ZONA' AND t.manzana_id = @manzana_id) OR
            (t.alcance='GLOBAL')
          )
        ORDER BY CASE WHEN t.alcance='POR_ZONA' THEN 0 ELSE 1 END, t.vigencia_desde DESC;`);
    const tarifa = tarifaQ.recordset[0];
    if(!tarifa){
      await tx.rollback();
      return { unprocessable: 'SIN_TARIFA' };
    }

    // Generar recibo
    let reciboId;
    for(let i=0;i<3;i++){
      const numero = generarNumeroRecibo();
      try {
        const insR = await new sql.Request(tx)
          .input('numero_recibo', sql.NVarChar(50), numero)
          .input('monto', sql.Decimal(18,2), tarifa.monto)
          .query(`INSERT INTO dbo.recibos(numero_recibo, monto, fecha_pago) VALUES(@numero_recibo, @monto, CONVERT(date, GETDATE())); SELECT SCOPE_IDENTITY() AS id;`);
        reciboId = Number(insR.recordset[0].id);
        break;
      } catch(e){
        if(!(e.number === 2601 || e.number === 2627)) throw e; // otra cosa
        if(i===2) throw e; // agotados intentos
      }
    }

    // Ocupar nicho
    const updN = await new sql.Request(tx)
      .input('nicho_id', sql.Int, row.nicho_id)
      .query(`UPDATE dbo.nichos SET estado='Ocupado' WHERE id=@nicho_id AND estado='Reservado'; SELECT @@ROWCOUNT AS rows;`);
    if(!updN.recordset[0].rows){
      await tx.rollback();
      return { conflict: 'NICHO_CAMBIO_ESTADO' };
    }

    // Actualizar solicitud
    const updS = await new sql.Request(tx)
      .input('id', sql.Int, id)
      .input('recibo_id', sql.Int, reciboId)
      .query(`UPDATE dbo.solicitudes_compra SET estado='Aprobada', recibo_id=@recibo_id WHERE id=@id AND estado='Pendiente'; SELECT @@ROWCOUNT AS rows;`);
    if(!updS.recordset[0].rows){
      await tx.rollback();
      return { conflict: 'SOL_NO_PENDIENTE' };
    }

    await tx.commit();
    return { ok:true, recibo_id: reciboId };
  } catch(err){
    try { await tx.rollback(); } catch(_){ }
    throw err;
  }
};

function generarNumeroRecibo(){
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.floor(1000 + Math.random()*9000);
  return `RC-${ymd}-${rand}`;
}

// RECHAZAR
exports.rechazar = async (id, usuario_id) => {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const reqSel = new sql.Request(tx).input('id', sql.Int, id);
    const sel = await reqSel.query(`
      SELECT s.id, s.estado, s.nicho_id, n.estado AS nicho_estado
      FROM dbo.solicitudes_compra s
      JOIN dbo.nichos n ON n.id = s.nicho_id
      WHERE s.id = @id;`);
    const row = sel.recordset[0];
    if(!row) return { notFound: true };
    if(row.estado !== 'Pendiente') return { conflict: 'SOL_NO_PENDIENTE' };

    // Liberar nicho (si está Reservado)
    await new sql.Request(tx)
      .input('nicho_id', sql.Int, row.nicho_id)
      .query(`UPDATE dbo.nichos SET estado='Disponible' WHERE id=@nicho_id AND estado='Reservado';`);

    // Marcar solicitud rechazada
    const upd = await new sql.Request(tx)
      .input('id', sql.Int, id)
      .query(`UPDATE dbo.solicitudes_compra SET estado='Rechazada' WHERE id=@id AND estado='Pendiente'; SELECT @@ROWCOUNT AS rows;`);
    if(!upd.recordset[0].rows){
      await tx.rollback();
      return { conflict: 'SOL_NO_PENDIENTE' };
    }

    await tx.commit();
    return { ok:true };
  } catch(err){
    try { await tx.rollback(); } catch(_){ }
    throw err;
  }
};

// DOCUMENTOS - se insertan en solicitudes_documentos (metadatos)
exports.insertarDocumentos = async (solicitud_id, docs=[]) => {
  if(!docs.length) return [];
  const pool = await getConnection();
  const table = new sql.Table('solicitudes_documentos');
  table.create = false; // ya existe
  table.columns.add('solicitud_id', sql.Int, { nullable: false });
  table.columns.add('nombre_archivo', sql.NVarChar(260), { nullable: false });
  table.columns.add('ruta_relativa', sql.NVarChar(500), { nullable: false });
  table.columns.add('mime_type', sql.NVarChar(100), { nullable: true });
  table.columns.add('tamano_bytes', sql.BigInt, { nullable: true });
  table.columns.add('subido_por', sql.Int, { nullable: true });
  docs.forEach(d => table.rows.add(solicitud_id, d.originalname, d.ruta_relativa, d.mimetype, d.size, d.usuario_id || null));
  const request = pool.request();
  await request.bulk(table);
  // Recuperar los recién insertados: (simplificado - se devuelven metadatos locales)
  return docs.map(d => ({ nombre_archivo: d.originalname, ruta_relativa: d.ruta_relativa, mime_type: d.mimetype, tamano_bytes: d.size }));
};
