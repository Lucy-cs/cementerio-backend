exports.validateCreate = (body = {}) => {
  const errors = [];
  if (!body.numero_recibo || typeof body.numero_recibo !== "string")
    errors.push("'numero_recibo' es obligatorio (string)");
  if (!(typeof body.monto === "number") || body.monto <= 0)
    errors.push("'monto' debe ser número positivo");
  if (body.fecha_pago && !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_pago))
    errors.push("'fecha_pago' debe ser YYYY-MM-DD");

  if (errors.length) {
    const e = new Error(errors.join("; ")); e.code = "BAD_REQUEST"; throw e;
  }
  return {
    numero_recibo: body.numero_recibo.trim(),
    monto: body.monto,
    fecha_pago: body.fecha_pago || new Date().toISOString().slice(0,10)
  };
};
