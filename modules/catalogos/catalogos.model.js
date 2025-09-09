// modules/catalogos/catalogos.model.js
const MAX = { nombre: 50 };
const clean = v => (typeof v === "string" ? v.trim() : v);

function isBool(x){ return x === true || x === false; }
function isPosInt(n){ return Number.isInteger(n) && n > 0; }
function toDate(s){ return new Date(s); }

exports.validateManzanaUpsert = (payload = {}) => {
  const dto = {};
  if (payload.id !== undefined) {
    const id = Number(payload.id);
    if (!isPosInt(id)) throw new Error("id inválido.");
    dto.id = id;
  }
  if (payload.nombre !== undefined) {
    const nombre = clean(payload.nombre || "");
    if (!nombre) throw new Error("'nombre' es obligatorio.");
    if (nombre.length > MAX.nombre) throw new Error(`'nombre' máx ${MAX.nombre} chars.`);
    dto.nombre = nombre;
  }
  if (payload.activo !== undefined) {
    if (!isBool(payload.activo)) throw new Error("'activo' debe ser booleano.");
    dto.activo = payload.activo;
  }
  if (!dto.id && !dto.nombre) throw new Error("Para crear: 'nombre' es obligatorio.");
  return dto;
};

const ALCANCES = new Set(["GLOBAL", "POR_TIPO", "POR_ZONA"]);

exports.validateTarifaCreate = (p = {}) => {
  const concepto = clean(p.concepto || "");
  const alcance  = clean(p.alcance  || "");
  const monto = Number(p.monto);
  const moneda = clean(p.moneda || "GTQ");
  const vigencia_desde = p.vigencia_desde ? toDate(p.vigencia_desde) : null;
  const vigencia_hasta = p.vigencia_hasta ? toDate(p.vigencia_hasta) : null;

  if (!concepto) throw new Error("'concepto' obligatorio.");
  if (!ALCANCES.has(alcance)) throw new Error("'alcance' inválido. Use GLOBAL|POR_TIPO|POR_ZONA.");
  if (!Number.isFinite(monto) || monto < 0) throw new Error("'monto' debe ser >= 0.");
  if (!vigencia_desde || Number.isNaN(vigencia_desde.getTime())) throw new Error("'vigencia_desde' inválida.");
  if (vigencia_hasta && !(vigencia_hasta > vigencia_desde)) throw new Error("'vigencia_hasta' debe ser > 'vigencia_desde'.");

  const dto = { concepto, alcance, monto, moneda, 
    vigencia_desde: vigencia_desde.toISOString().slice(0,10),
    vigencia_hasta: vigencia_hasta ? vigencia_hasta.toISOString().slice(0,10) : null };

  // Dimensiones por alcance
  if (alcance === "GLOBAL") {
    if (p.tipo_nicho_id || p.manzana_id || p.sector_id) throw new Error("GLOBAL no admite dimensiones.");
    dto.tipo_nicho_id = null; dto.manzana_id = null; dto.sector_id = null;
  } else if (alcance === "POR_TIPO") {
    const id = Number(p.tipo_nicho_id);
    if (!isPosInt(id)) throw new Error("POR_TIPO requiere 'tipo_nicho_id' entero positivo.");
    dto.tipo_nicho_id = id; dto.manzana_id = null; dto.sector_id = null;
  } else if (alcance === "POR_ZONA") {
    const manzana_id = Number(p.manzana_id);
    if (!isPosInt(manzana_id)) throw new Error("POR_ZONA requiere 'manzana_id' entero positivo.");
    dto.manzana_id = manzana_id;
    if (p.sector_id !== undefined && p.sector_id !== null && p.sector_id !== "") {
      const sector_id = Number(p.sector_id);
      if (!isPosInt(sector_id)) throw new Error("'sector_id' debe ser entero positivo.");
      dto.sector_id = sector_id;
    } else dto.sector_id = null;
    dto.tipo_nicho_id = null;
  }
  return dto;
};
