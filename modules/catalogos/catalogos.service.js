// modules/catalogos/catalogos.service.js
const { getConnection, sql } = require("../../config/db");

/* ===================== MANZANAS ===================== */

exports.manzanasList = async ({ search, includeInactive }) => {
  const pool = await getConnection();
  const req = pool.request()
    .input("search", sql.NVarChar, search ? `%${search}%` : null)
    .input("onlyActive", sql.Bit, includeInactive ? 0 : 1);

  const q = `
    SELECT id, nombre, activo
    FROM dbo.manzanas
    WHERE (@onlyActive = 0 OR activo = 1)
      AND (@search IS NULL OR nombre LIKE @search)
    ORDER BY nombre ASC;`;

  const r = await req.query(q);
  return r.recordset;
};

exports.manzanasCreate = async ({ nombre, activo = true }) => {
  const pool = await getConnection();
  try {
    const r = await pool.request()
      .input("nombre", sql.NVarChar(50), nombre)
      .input("activo", sql.Bit, !!activo)
      .query(`
        INSERT INTO dbo.manzanas(nombre, activo)
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.activo
        VALUES(@nombre, @activo);
      `);
    return r.recordset[0];
  } catch (err) {
    if ([2601, 2627].includes(err.number)) err.code = "DUP_KEY"; // UQ_manzanas_nombre
    throw err;
  }
};

exports.manzanasUpdate = async (id, { nombre, activo }) => {
  const pool = await getConnection();
  const req = pool.request().input("id", sql.Int, id);
  const sets = [];

  if (nombre !== undefined) { sets.push("nombre=@nombre"); req.input("nombre", sql.NVarChar(50), nombre); }
  if (activo !== undefined)  {
    // Si desactivas, valida que no tenga nichos asociados
    if (activo === false) {
      const check = await pool.request().input("id", sql.Int, id)
        .query("SELECT COUNT(1) AS c FROM dbo.nichos WHERE manzana_id=@id;");
      if (check.recordset[0].c > 0) {
        const e = new Error("No se puede desactivar: hay nichos asociados a esta manzana.");
        e.code = "FK_CONFLICT_DEACT";
        throw e;
      }
    }
    sets.push("activo=@activo"); req.input("activo", sql.Bit, !!activo);
  }
  if (!sets.length) return null;

  try {
    const r = await req.query(`
      UPDATE dbo.manzanas SET ${sets.join(", ")} WHERE id=@id;
      SELECT id, nombre, activo FROM dbo.manzanas WHERE id=@id;`);
    return r.recordset[0];
  } catch (err) {
    if ([2601, 2627].includes(err.number)) err.code = "DUP_KEY";
    throw err;
  }
};

/* ===================== TARIFAS ===================== */

exports.tarifasList = async (qf) => {
  const {
    on, includeHistory, concepto, alcance,
    tipo_nicho_id, manzana_id, sector_id
  } = qf;

  const pool = await getConnection();
  const req = pool.request();
  const where = ["t.activo = 1"];

  if (!includeHistory) {
    const onDate = on ? new Date(on) : new Date(); // hoy
    const s = onDate.toISOString().slice(0,10);
    req.input("on", sql.Date, s);
    where.push("(t.vigencia_desde <= @on AND (t.vigencia_hasta IS NULL OR t.vigencia_hasta > @on))");
  }
  if (concepto)   { where.push("t.concepto = @concepto"); req.input("concepto", sql.NVarChar(50), concepto); }
  if (alcance)    { where.push("t.alcance  = @alcance");  req.input("alcance",  sql.NVarChar(10), alcance); }
  if (tipo_nicho_id !== undefined) { where.push("(t.tipo_nicho_id = @tipo_nicho_id)"); req.input("tipo_nicho_id", sql.Int, tipo_nicho_id); }
  if (manzana_id !== undefined)    { where.push("(t.manzana_id = @manzana_id)"); req.input("manzana_id", sql.Int, manzana_id); }
  if (sector_id !== undefined)     { where.push("(t.sector_id = @sector_id)"); req.input("sector_id", sql.Int, sector_id); }

  const r = await req.query(`
    SELECT t.id, t.concepto, t.alcance, t.monto, t.moneda,
           t.vigencia_desde, t.vigencia_hasta,
           t.tipo_nicho_id, t.manzana_id, t.sector_id,
           t.activo, t.created_at, t.updated_at
    FROM dbo.tarifas t
    WHERE ${where.join(" AND ")}
    ORDER BY t.concepto, t.alcance, t.vigencia_desde DESC, t.id DESC;`);
  return r.recordset;
};

exports.tarifasCreate = async (dto) => {
  const pool = await getConnection();

  // --- Validación de solapamiento por combinación (concepto+alcance+dimensiones)
  const rCheck = await pool.request()
    .input("concepto", sql.NVarChar(50), dto.concepto)
    .input("alcance",  sql.NVarChar(10), dto.alcance)
    .input("tipo_nicho_id", sql.Int, dto.tipo_nicho_id)
    .input("manzana_id", sql.Int, dto.manzana_id)
    .input("sector_id",  sql.Int, dto.sector_id)
    .input("desde", sql.Date, dto.vigencia_desde)
    .input("hasta", sql.Date, dto.vigencia_hasta) // puede venir null
    .query(`
      DECLARE @hastaLocal DATE = @hasta; -- puede ser NULL
      SELECT TOP 1 id
      FROM dbo.tarifas WITH (UPDLOCK, HOLDLOCK)
      WHERE activo = 1
        AND concepto = @concepto
        AND alcance  = @alcance
        AND ISNULL(tipo_nicho_id, 0) = ISNULL(@tipo_nicho_id, 0)
        AND ISNULL(manzana_id,   0) = ISNULL(@manzana_id,   0)
        AND ISNULL(sector_id,    0) = ISNULL(@sector_id,    0)
        AND ( -- solape [desde, hasta)
             (vigencia_desde < ISNULL(@hastaLocal, '9999-12-31'))
         AND (ISNULL(vigencia_hasta, '9999-12-31') > @desde)
        );
    `);
  if (rCheck.recordset[0]) {
    const e = new Error("Existe una tarifa que solapa esa vigencia para la misma combinación.");
    e.code = "OVERLAP";
    throw e;
  }

  // --- Insertar
  const r = await pool.request()
    .input("concepto", sql.NVarChar(50), dto.concepto)
    .input("alcance",  sql.NVarChar(10), dto.alcance)
    .input("monto",    sql.Decimal(10,2), dto.monto)
    .input("moneda",   sql.NVarChar(3), dto.moneda)
    .input("vigencia_desde", sql.Date, dto.vigencia_desde)
    .input("vigencia_hasta", sql.Date, dto.vigencia_hasta)
    .input("tipo_nicho_id", sql.Int, dto.tipo_nicho_id)
    .input("manzana_id", sql.Int, dto.manzana_id)
    .input("sector_id",  sql.Int, dto.sector_id)
    .query(`
      INSERT INTO dbo.tarifas (
        concepto, alcance, monto, moneda,
        vigencia_desde, vigencia_hasta,
        tipo_nicho_id, manzana_id, sector_id, activo
      )
      OUTPUT INSERTED.*
      VALUES(@concepto, @alcance, @monto, @moneda,
             @vigencia_desde, @vigencia_hasta,
             @tipo_nicho_id, @manzana_id, @sector_id, 1);
    `);
  return r.recordset[0];
};

/* ===================== ESTADOS DE NICHO ===================== */

exports.estadosNicho = () => ([
  // Alineado al CHECK CK_nichos_estado en tu BD
  "Disponible","Reservado","Ocupado","Mantenimiento","Bloqueado"
]);
