const { getConnection, sql } = require("../../config/db");

const rowToDto = r => ({
  id: r.id,
  concepto: r.concepto,
  alcance: r.alcance,
  monto: Number(r.monto),
  moneda: r.moneda,
  vigencia_desde: r.vigencia_desde,
  vigencia_hasta: r.vigencia_hasta,
  activo: r.activo,
  tipo_nicho_id: r.tipo_nicho_id,
  manzana_id: r.manzana_id,
  sector_id: r.sector_id,
  created_at: r.created_at,
  updated_at: r.updated_at
});

exports.obtener = async (id)=>{
  const pool = await getConnection();
  const rs = await new sql.Request(pool).input("id", sql.Int, id)
    .query(`SELECT id, concepto, alcance, monto, moneda, vigencia_desde, vigencia_hasta, activo, tipo_nicho_id, manzana_id, sector_id, created_at, updated_at
            FROM dbo.tarifas WHERE id=@id;`);
  return rs.recordset[0] ? rowToDto(rs.recordset[0]) : null;
};

exports.crear = async (dto)=>{
  const pool = await getConnection();
  const tx = new sql.Transaction(pool); await tx.begin();
  try {
    // mapear posibles nombres antiguos a los actuales
    const concepto = dto.concepto;
    const alcance = dto.alcance || 'GLOBAL';
    const vigencia_desde = dto.vigencia_desde || dto.fecha_inicio;
    const vigencia_hasta = (dto.vigencia_hasta !== undefined) ? dto.vigencia_hasta : (dto.fecha_fin !== undefined ? dto.fecha_fin : null);
    const activo = (dto.activo !== undefined) ? (dto.activo ? 1 : 0) : (dto.vigente !== undefined ? (dto.vigente ? 1 : 0) : 1);
    const moneda = dto.moneda || 'GTQ';
    const tipo_nicho_id = dto.tipo_nicho_id || null;
    const manzana_id = dto.manzana_id || null;
    const sector_id = dto.sector_id || null;

    // cerrar anterior abierta del mismo ámbito si esta es activa+abierta
    if ((activo === 1) && (vigencia_hasta == null)) {
      await new sql.Request(tx)
        .input('c', sql.NVarChar(50), concepto)
        .input('a', sql.NVarChar(10), alcance)
        .input('mn', sql.Int, manzana_id)
        .input('sn', sql.Int, sector_id)
        .input('tn', sql.Int, tipo_nicho_id)
        .input('vd', sql.Date, vigencia_desde)
        .query(`
          UPDATE dbo.tarifas
          SET vigencia_hasta = CASE WHEN vigencia_hasta IS NULL OR vigencia_hasta >= @vd THEN DATEADD(day,-1,@vd) ELSE vigencia_hasta END
          WHERE concepto=@c AND alcance=@a
            AND ISNULL(manzana_id,0)=ISNULL(@mn,0)
            AND ISNULL(sector_id,0)=ISNULL(@sn,0)
            AND ISNULL(tipo_nicho_id,0)=ISNULL(@tn,0)
            AND activo=1 AND vigencia_hasta IS NULL;
        `);
    }

    const ins = await new sql.Request(tx)
      .input('concepto', sql.NVarChar(50), concepto)
      .input('alcance', sql.NVarChar(10), alcance)
      .input('monto', sql.Decimal(10,2), dto.monto)
      .input('moneda', sql.NVarChar(10), moneda)
      .input('vd', sql.Date, vigencia_desde)
      .input('vh', sql.Date, vigencia_hasta)
      .input('ac', sql.Bit, activo)
      .input('tn', sql.Int, tipo_nicho_id)
      .input('mn', sql.Int, manzana_id)
      .input('sn', sql.Int, sector_id)
      .query(`
        INSERT INTO dbo.tarifas (concepto, alcance, monto, moneda, vigencia_desde, vigencia_hasta, activo, tipo_nicho_id, manzana_id, sector_id)
        OUTPUT INSERTED.id, INSERTED.concepto, INSERTED.alcance, INSERTED.monto, INSERTED.moneda, INSERTED.vigencia_desde, INSERTED.vigencia_hasta, INSERTED.activo,
               INSERTED.tipo_nicho_id, INSERTED.manzana_id, INSERTED.sector_id, INSERTED.created_at, INSERTED.updated_at
        VALUES (@concepto, @alcance, @monto, @moneda, @vd, @vh, @ac, @tn, @mn, @sn);
      `);
    await tx.commit();
    return rowToDto(ins.recordset[0]);
  } catch (e) {
    try{ await tx.rollback(); }catch(_){ }
    throw e;
  }
};

exports.actualizar = async (id, patch)=>{
  const pool = await getConnection();
  const tx = new sql.Transaction(pool); await tx.begin();
  try {
    const cur = await new sql.Request(tx).input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.tarifas WHERE id=@id;`);
    const t = cur.recordset[0];
    if(!t){ const err=new Error('NOT_FOUND'); err.code='NOT_FOUND'; throw err; }

    if ((patch.activo === true || patch.activo == null) && patch.vigencia_hasta === null && patch.vigencia_desde) {
      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('vd', sql.Date, patch.vigencia_desde)
        .query(`
          DECLARE @c NVARCHAR(50), @a NVARCHAR(10), @mn INT, @sn INT, @tn INT;
          SELECT @c=concepto, @a=alcance, @mn=manzana_id, @sn=sector_id, @tn=tipo_nicho_id
          FROM dbo.tarifas WHERE id=@id;

          UPDATE dbo.tarifas
          SET vigencia_hasta = CASE WHEN vigencia_hasta IS NULL OR vigencia_hasta >= @vd
                                    THEN DATEADD(day,-1,@vd) ELSE vigencia_hasta END
          WHERE concepto=@c AND alcance=@a
            AND ISNULL(manzana_id,0)=ISNULL(@mn,0)
            AND ISNULL(sector_id,0)=ISNULL(@sn,0)
            AND ISNULL(tipo_nicho_id,0)=ISNULL(@tn,0)
            AND activo=1 AND vigencia_hasta IS NULL
            AND id<>@id;
        `);
    }

    const SETS=[], req=new sql.Request(tx).input('id', sql.Int, id);
    if (patch.monto != null)          { SETS.push('monto=@m');            req.input('m',  sql.Decimal(10,2), patch.monto); }
    if (patch.vigencia_desde != null) { SETS.push('vigencia_desde=@vd');  req.input('vd', sql.Date,          patch.vigencia_desde); }
    if (patch.vigencia_hasta != null) { SETS.push('vigencia_hasta=@vh');  req.input('vh', sql.Date,          patch.vigencia_hasta); }
    if (patch.activo != null)         { SETS.push('activo=@ac');          req.input('ac', sql.Bit,           patch.activo ? 1 : 0); }

    if (!SETS.length) { await tx.rollback(); throw Object.assign(new Error('Nada para actualizar'), { code:'BAD_REQUEST' }); }

    await req.query(`UPDATE dbo.tarifas SET ${SETS.join(', ')}, updated_at=GETDATE() WHERE id=@id;`);
    await tx.commit();

    const row = await new sql.Request(pool).input('id', sql.Int, id)
      .query(`SELECT id, concepto, alcance, monto, moneda, vigencia_desde, vigencia_hasta, activo, tipo_nicho_id, manzana_id, sector_id, created_at, updated_at
              FROM dbo.tarifas WHERE id=@id;`);
    return rowToDto(row.recordset[0]);
  } catch(e){
    if (tx._aborted !== true) { try{ await tx.rollback(); }catch(_){ } }
    if(e.code==='NOT_FOUND' || e.code==='BAD_REQUEST') throw e;
    throw e;
  }
};

exports.desactivar = async (id)=>{
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input('id', sql.Int, id)
    .query(`
      UPDATE dbo.tarifas
      SET activo = 0,
          vigencia_hasta = COALESCE(vigencia_hasta, CAST(GETDATE() AS date)),
          updated_at = GETDATE()
      WHERE id=@id;
      SELECT id, concepto, alcance, monto, moneda, vigencia_desde, vigencia_hasta, activo, tipo_nicho_id, manzana_id, sector_id, created_at, updated_at
      FROM dbo.tarifas WHERE id=@id;
    `);
  return rs.recordset[0] ? rowToDto(rs.recordset[0]) : null;
};

exports.eliminar = async (id)=>{
  const pool = await getConnection();
  await new sql.Request(pool).input('id', sql.Int, id)
    .query(`DELETE FROM dbo.tarifas WHERE id=@id;`);
};
