const { getConnection, sql } = require("../../config/db");

/** GET /nichos-disponibles?manzanaId= */
exports.nichosDisponibles = async ({ manzanaId }) => {
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input("manzanaId", sql.Int, manzanaId)
    .query(`
      SELECT n.id, n.numero, n.estado, m.id AS manzana_id, m.nombre AS manzana
      FROM nichos n
      JOIN manzanas m ON m.id = n.manzana_id
      WHERE n.estado = 'Disponible'
        AND (@manzanaId IS NULL OR n.manzana_id = @manzanaId)
      ORDER BY m.nombre, n.numero;
    `);
  return rs.recordset;
};

/** GET /contratos-por-vencer?dias= */
exports.contratosPorVencer = async ({ dias }) => {
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input("dias", sql.Int, dias)
    .query(`
      DECLARE @today date = CAST(GETDATE() AS date);
      SELECT
        a.id AS arrendamiento_id,
        a.nicho_id,
        n.numero AS nicho_numero,
        m.nombre AS manzana,
        a.propietario_id,
        p.nombres, p.apellidos, p.dpi,
        a.fecha_fin,
        DATEDIFF(day, @today, a.fecha_fin) AS dias_para_vencer
      FROM arrendamientos a
      JOIN nichos n   ON n.id = a.nicho_id
      JOIN manzanas m ON m.id = n.manzana_id
      JOIN propietarios p ON p.id = a.propietario_id
      WHERE a.fecha_fin BETWEEN @today AND DATEADD(day, @dias, @today)
      ORDER BY a.fecha_fin ASC, a.id ASC;
    `);
  return rs.recordset;
};

/** GET /historial-pagos?predioId=  (predio = nicho_id) */
exports.historialPagos = async ({ predioId }) => {
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input("nicho_id", sql.Int, predioId)
    .query(`
      ;WITH pagos_arr AS (
        SELECT r.id AS recibo_id, r.numero_recibo, r.monto, r.fecha_pago,
               a.nicho_id, a.propietario_id,
               'Arrendamiento' AS origen
        FROM arrendamientos a
        JOIN recibos r ON r.id = a.recibo_id
        WHERE a.nicho_id = @nicho_id
      ),
      pagos_tras AS (
        SELECT r.id AS recibo_id, r.numero_recibo, r.monto, r.fecha_pago,
               t.nicho_id, t.nuevo_propietario_id AS propietario_id,
               'Traspaso' AS origen
        FROM traspasos t
        JOIN recibos r ON r.id = t.recibo_id
        WHERE t.nicho_id = @nicho_id
      )
      SELECT X.*, 
             p.nombres, p.apellidos, p.dpi,
             n.numero AS nicho_numero, m.nombre AS manzana
      FROM (SELECT * FROM pagos_arr UNION ALL SELECT * FROM pagos_tras) X
      JOIN propietarios p ON p.id = X.propietario_id
      JOIN nichos n       ON n.id = X.nicho_id
      JOIN manzanas m     ON m.id = n.manzana_id
      ORDER BY X.fecha_pago DESC, X.recibo_id DESC;
    `);
  return rs.recordset;
};

/** GET /traspasos?desde=&hasta=  (si ambos null → últimos 90 días) */
exports.traspasosRango = async ({ desde, hasta }) => {
  const pool = await getConnection();
  const rs = await new sql.Request(pool)
    .input("desde", sql.Date, desde || null)
    .input("hasta", sql.Date, hasta || null)
    .query(`
      DECLARE @d date = COALESCE(@desde, DATEADD(day, -90, CAST(GETDATE() AS date)));
      DECLARE @h date = COALESCE(@hasta, CAST(GETDATE() AS date));

      SELECT
        t.id AS traspaso_id,
        t.fecha_traspaso,
        n.id AS nicho_id, n.numero AS nicho_numero, m.nombre AS manzana,
        pa.id AS propietario_anterior_id, pa.nombres AS ant_nombres, pa.apellidos AS ant_apellidos,
        pn.id AS nuevo_propietario_id, pn.nombres AS nuevo_nombres, pn.apellidos AS nuevo_apellidos,
        r.id AS recibo_id, r.numero_recibo, r.monto, r.fecha_pago
      FROM traspasos t
      JOIN nichos n   ON n.id = t.nicho_id
      JOIN manzanas m ON m.id = n.manzana_id
      JOIN propietarios pa ON pa.id = t.propietario_anterior_id
      JOIN propietarios pn ON pn.id = t.nuevo_propietario_id
      JOIN recibos r ON r.id = t.recibo_id
      WHERE t.fecha_traspaso >= @d
        AND t.fecha_traspaso < DATEADD(day, 1, @h)
      ORDER BY t.fecha_traspaso DESC, t.id DESC;
    `);
  return rs.recordset;
};
