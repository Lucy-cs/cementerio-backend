// modules/nichos/nichos.model.js
// Estados válidos alineados con constraint CK_nichos_estado
const estadosSet = new Set(["Disponible", "Reservado", "Ocupado", "Mantenimiento", "Bloqueado"]);
const clean = (v) => (typeof v === "string" ? v.trim() : "");

function isPosInt(n) {
  return Number.isInteger(n) && n > 0;
}

function validateCreate(payload = {}) {
  const numero = Number(payload.numero);
  const manzana_id = Number(payload.manzana_id);
  const estado = clean(payload.estado || "Disponible");

  if (!isPosInt(numero)) throw new Error("'numero' debe ser entero positivo.");
  if (!isPosInt(manzana_id)) throw new Error("'manzana_id' debe ser entero positivo.");
  if (!estadosSet.has(estado)) throw new Error(`'estado' inválido. Use: ${[...estadosSet].join(", ")}.`);

  return { numero, estado, manzana_id };
}

function validateUpdate(payload = {}) {
  const dto = {};
  if (payload.numero !== undefined) {
    const n = Number(payload.numero);
    if (!isPosInt(n)) throw new Error("'numero' debe ser entero positivo.");
    dto.numero = n;
  }
  if (payload.manzana_id !== undefined) {
    const m = Number(payload.manzana_id);
    if (!isPosInt(m)) throw new Error("'manzana_id' debe ser entero positivo.");
    dto.manzana_id = m;
  }
  if (payload.estado !== undefined) {
    const e = clean(payload.estado);
    if (!estadosSet.has(e)) throw new Error(`'estado' inválido. Use: ${[...estadosSet].join(", ")}.`);
    dto.estado = e;
  }
  return dto; // puede venir vacío; el controlador decide si rechaza “sin cambios”
}

function fromDb(r = {}) {
  return {
    id: r.id,
    numero: r.numero,
    estado: r.estado,
    manzana_id: r.manzana_id,
    manzana: r.manzana,
  };
}

module.exports = { validateCreate, validateUpdate, fromDb, estadosValidos: [...estadosSet] };
