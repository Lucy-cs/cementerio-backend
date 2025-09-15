exports.validateCreate = (b={})=>{
  const e=[];
  if(!b.concepto || typeof b.concepto!=="string") e.push("'concepto' requerido");
  if(!(typeof b.monto==="number") || b.monto<=0) e.push("'monto' debe ser > 0");
  if(b.fecha_inicio && !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha_inicio)) e.push("'fecha_inicio' YYYY-MM-DD");
  if(b.fecha_fin     && !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha_fin))     e.push("'fecha_fin' YYYY-MM-DD");
  if(e.length){const err=new Error(e.join("; ")); err.code="BAD_REQUEST"; throw err;}
  return {
    concepto: b.concepto.trim().toUpperCase(),
    monto: b.monto,
    fecha_inicio: b.fecha_inicio || new Date().toISOString().slice(0,10),
    fecha_fin: b.fecha_fin || null,
    vigente: b.vigente!==false,
    notas: b.notas || null
  };
};

exports.validateUpdate = (b={})=>{
  const out = {};
  if(b.monto!=null){
    if(!(typeof b.monto==="number") || b.monto<=0) { const err=new Error("'monto' > 0"); err.code="BAD_REQUEST"; throw err; }
    out.monto = b.monto;
  }
  if(b.vigencia_desde!=null){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.vigencia_desde)) { const err=new Error("'vigencia_desde' YYYY-MM-DD"); err.code="BAD_REQUEST"; throw err; }
    out.vigencia_desde = b.vigencia_desde;
  }
  if(b.vigencia_hasta!=null){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.vigencia_hasta)) { const err=new Error("'vigencia_hasta' YYYY-MM-DD"); err.code="BAD_REQUEST"; throw err; }
    out.vigencia_hasta = b.vigencia_hasta;
  }
  if(b.activo!=null) out.activo = !!b.activo;
  // No tocar notas en PUT (ignorada si viene)
  return out;
};
