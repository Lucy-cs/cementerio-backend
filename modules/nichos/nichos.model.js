// Reglas del dominio
const ESTADOS = ["Disponible", "Reservado", "Ocupado"];

// Normaliza valores (trim y números)
function toInt(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toStr(v) {
  return typeof v === "string" ? v.trim() : v;
}

// ---- Validaciones ----
function validateCreate(payload = {}) {
  const numero = toInt(payload.numero);
  const manzana_id = toInt(payload.manzana_id);
  const estado = toStr(payload.estado) || "Disponible";

  if (!numero || numero <= 0) {
    throw new Error("El campo 'numero' es obligatorio y debe ser un entero > 0.");
  }
  if (!manzana_id || manzana_id <= 0) {
    throw new Error("El campo 'manzana_id' es obligatorio y debe ser un entero > 0.");
  }
  if (!ESTADOS.includes(estado)) {
    throw new Error(`'estado' inválido. Valores: ${ESTADOS.join(", ")}`);
  }

  return { numero, estado, manzana_id };
}

function validateUpdate(payload = {}) {
  const dto = {};
  if (payload.numero !== undefined) {
    const numero = toInt(payload.numero);
    if (!numero || numero <= 0) {
      throw new Error("'numero' debe ser un entero > 0.");
    }
    dto.numero = numero;
  }
  if (payload.manzana_id !== undefined) {
    const manzana_id = toInt(payload.manzana_id);
    if (!manzana_id || manzana_id <= 0) {
      throw new Error("'manzana_id' debe ser un entero > 0.");
    }
    dto.manzana_id = manzana_id;
  }
  if (payload.estado !== undefined) {
    const estado = toStr(payload.estado);
    if (!ESTADOS.includes(estado)) {
      throw new Error(`'estado' inválido. Valores: ${ESTADOS.join(", ")}`);
    }
    dto.estado = estado;
  }
  return dto; // puede venir vacío si no mandaron campos
}

// Mapeo de una fila de BD a objeto de dominio (por si unificás formato)
function fromDb(row = {}) {
  return {
    id: row.id,
    numero: row.numero,
    estado: row.estado,
    manzana_id: row.manzana_id,
    manzana: row.manzana,
  };
}

module.exports = { ESTADOS, validateCreate, validateUpdate, fromDb };
