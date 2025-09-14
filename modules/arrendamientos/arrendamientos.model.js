// Validaciones y mapeos para Arrendamientos
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

function isPosInt(n) { return Number.isInteger(n) && n > 0; }

function isISODate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(str));
}

function validateCreate(body = {}) {
  const propietario_id = Number(body.propietario_id);
  const nicho_id = Number(body.nicho_id);
  const fecha_inicio = clean(body.fecha_inicio);
  const nombre_difunto = body.nombre_difunto !== undefined ? clean(body.nombre_difunto) : null;
  const recibo = body.recibo || {};

  if (!isPosInt(propietario_id)) throw new Error("'propietario_id' debe ser entero positivo.");
  if (!isPosInt(nicho_id)) throw new Error("'nicho_id' debe ser entero positivo.");
  if (!isISODate(fecha_inicio)) throw new Error("'fecha_inicio' debe tener formato YYYY-MM-DD.");

  if (!recibo || typeof recibo !== 'object') throw new Error("'recibo' es obligatorio.");
  const numero_recibo = clean(recibo.numero_recibo);
  const monto = Number(recibo.monto);
  const fecha_pago = clean(recibo.fecha_pago);
  if (!numero_recibo) throw new Error("'recibo.numero_recibo' es obligatorio.");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("'recibo.monto' debe ser número positivo.");
  if (!isISODate(fecha_pago)) throw new Error("'recibo.fecha_pago' debe tener formato YYYY-MM-DD.");

  return { propietario_id, nicho_id, fecha_inicio, nombre_difunto, recibo: { numero_recibo, monto, fecha_pago } };
}

function validateRenovar(body = {}) {
  const recibo = body.recibo || {};
  const observaciones = body.observaciones !== undefined ? clean(body.observaciones) : null;
  const numero_recibo = clean(recibo.numero_recibo);
  const monto = Number(recibo.monto);
  const fecha_pago = clean(recibo.fecha_pago);
  if (!numero_recibo) throw new Error("'recibo.numero_recibo' es obligatorio.");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("'recibo.monto' debe ser número positivo.");
  if (!isISODate(fecha_pago)) throw new Error("'recibo.fecha_pago' debe tener formato YYYY-MM-DD.");
  return { recibo: { numero_recibo, monto, fecha_pago }, observaciones };
}

function validateCancelar(body = {}) {
  const motivo = body.motivo !== undefined ? clean(body.motivo) : null;
  const liberarNicho = Boolean(body.liberarNicho);
  if (!motivo) throw new Error("'motivo' es obligatorio.");
  return { motivo, liberarNicho };
}

function fromDb(row = {}) {
  const today = new Date().toISOString().slice(0, 10);
  let estado = row.estado_derive || null;
  if (row.fue_cancelado) estado = 'Cancelado';
  return {
    id: row.id,
    propietario: row.propietario_id ? {
      id: row.propietario_id,
      nombres: row.propietario_nombres,
      apellidos: row.propietario_apellidos,
      dpi: row.propietario_dpi,
    } : null,
    nicho: row.nicho_id ? {
      id: row.nicho_id,
      numero: row.nicho_numero,
      manzana_id: row.manzana_id,
      manzana: row.manzana,
    } : null,
    recibo_id: row.recibo_id || null,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    nombre_difunto: row.nombre_difunto || null,
    estado,
    dias_para_vencer: typeof row.dias_para_vencer === 'number' ? row.dias_para_vencer : null,
  };
}

module.exports = { validateCreate, validateRenovar, validateCancelar, fromDb };
