// modules/traspasos/traspasos.model.js
exports.validateCreate = (body = {}) => {
  const errors = [];
  if (!Number.isInteger(body.nicho_id) || body.nicho_id <= 0) errors.push("'nicho_id' es obligatorio y > 0");
  if (!Number.isInteger(body.nuevo_propietario_id) || body.nuevo_propietario_id <= 0) errors.push("'nuevo_propietario_id' es obligatorio y > 0");
  const r = body.recibo || {};
  if (!r.numero_recibo || typeof r.numero_recibo !== 'string') errors.push("'recibo.numero_recibo' es obligatorio");
  if (r.monto != null && !(typeof r.monto === 'number' && r.monto > 0)) errors.push("'recibo.monto' debe ser número positivo");
  if (errors.length) {
    const e = new Error(errors.join("; ")); e.code = 'BAD_REQUEST'; throw e;
  }
  return {
    nicho_id: body.nicho_id,
    nuevo_propietario_id: body.nuevo_propietario_id,
    fecha_traspaso: body.fecha_traspaso || null, // opcional; si viene null se usa GETDATE() en SQL
    recibo: {
      numero_recibo: r.numero_recibo,
      monto: r.monto ?? 700,        // default municipal (ajústalo si aplica)
      fecha_pago: r.fecha_pago || new Date().toISOString().slice(0,10)
    },
    observaciones: body.observaciones || null
  };
};

exports.fromDb = (row) => ({
  id: row.id,
  fecha_traspaso: row.fecha_traspaso,
  nicho: { id: row.nicho_id, numero: row.nicho_numero, manzana_id: row.manzana_id, manzana: row.manzana },
  propietario_anterior: { id: row.prop_anterior_id, nombres: row.prop_anterior_nombres, apellidos: row.prop_anterior_apellidos, dpi: row.prop_anterior_dpi },
  nuevo_propietario: { id: row.prop_nuevo_id, nombres: row.prop_nuevo_nombres, apellidos: row.prop_nuevo_apellidos, dpi: row.prop_nuevo_dpi },
  recibo: { id: row.recibo_id, numero_recibo: row.numero_recibo, monto: row.monto, fecha_pago: row.fecha_pago },
});
