// modules/solicitudes/solicitudes.model.js
// Validaciones y mapeos DTO -> DB -> API

const estadosSolicitud = ["Pendiente","Aprobada","Rechazada"]; // flujo actual

function isPosInt(v){ return Number.isInteger(v) && v>0; }

function validateCreate(body={}){
  const propietario_id = Number(body.propietario_id);
  const nicho_id = Number(body.nicho_id);
  if(!isPosInt(propietario_id)) throw new Error("'propietario_id' debe ser entero positivo");
  if(!isPosInt(nicho_id)) throw new Error("'nicho_id' debe ser entero positivo");
  return { propietario_id, nicho_id };
}

function fromDb(row={}){
  return {
    id: row.id,
    estado: row.estado,
    fecha_solicitud: row.fecha_solicitud,
    propietario: row.propietario_id ? {
      id: row.propietario_id,
      nombres: row.propietario_nombres,
      apellidos: row.propietario_apellidos,
      dpi: row.propietario_dpi
    }: null,
    nicho: row.nicho_id ? {
      id: row.nicho_id,
      numero: row.nicho_numero,
      manzana_id: row.manzana_id,
      manzana: row.manzana
    }: null,
    recibo_id: row.recibo_id || null
  };
}

function fromDbDetalle(row={}){
  const base = fromDb(row);
  if(row.recibo_id){
    base.recibo = {
      id: row.recibo_id,
      numero_recibo: row.numero_recibo,
      fecha_pago: row.fecha_pago,
      monto: row.monto_recibo
    };
  }
  return base;
}

module.exports = { estadosSolicitud, validateCreate, fromDb, fromDbDetalle };
