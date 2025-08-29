// modules/propietarios/propietarios.model.js
const {
  normalizeDPI,
  isValidDPISoft,
  normalizePhoneGT,
  isValidPhoneGT,
} = require("../../utils/validators");

const MAX = { nombre: 100, apellido: 100, dpi: 20, tel: 20 };
const clean = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Valida y normaliza los datos para CREAR un propietario.
 * - nombres/apellidos: obligatorios, longitud máxima
 * - dpi: obligatorio, 13 dígitos (normalizado sin guiones/espacios)
 * - telefono: opcional; si viene, debe ser GT válido (8 dígitos, inicia 2–7).
 * Devuelve un DTO listo para guardar en BD.
 */
function validateCreate(payload = {}) {
  const nombres = clean(payload.nombres);
  const apellidos = clean(payload.apellidos);
  const dpiRaw = clean(payload.dpi);
  const telRaw = payload.telefono !== undefined ? clean(payload.telefono) : undefined;

  if (!nombres) throw new Error("El campo 'nombres' es obligatorio.");
  if (nombres.length > MAX.nombre) throw new Error(`'nombres' máx ${MAX.nombre} caracteres.`);

  if (!apellidos) throw new Error("El campo 'apellidos' es obligatorio.");
  if (apellidos.length > MAX.apellido) throw new Error(`'apellidos' máx ${MAX.apellido} caracteres.`);

  if (!dpiRaw) throw new Error("El campo 'dpi' es obligatorio.");
  if (!isValidDPISoft(dpiRaw)) throw new Error("DPI inválido. Debe tener 13 dígitos.");
  const dpi = normalizeDPI(dpiRaw);
  if (dpi.length > MAX.dpi) throw new Error(`'dpi' máx ${MAX.dpi} caracteres.`);

  let telefono = undefined;
  if (telRaw !== undefined && telRaw !== "") {
    if (!isValidPhoneGT(telRaw))
      throw new Error("Teléfono inválido (GT): 8 dígitos (se permite prefijo +502).");
    telefono = normalizePhoneGT(telRaw); // guarda limpio (8 dígitos)
    if (telefono.length > MAX.tel) throw new Error(`'telefono' máx ${MAX.tel} caracteres.`);
  }

  return { nombres, apellidos, dpi, telefono };
}

/**
 * Valida y normaliza los datos para ACTUALIZAR un propietario.
 * - todos los campos son opcionales; si vienen, se validan como en create.
 * - telefono vacío ("") permite limpiarlo.
 */
function validateUpdate(payload = {}) {
  const dto = {};

  if (payload.nombres !== undefined) {
    const v = clean(payload.nombres);
    if (!v) throw new Error("'nombres' no puede ser vacío.");
    if (v.length > MAX.nombre) throw new Error(`'nombres' máx ${MAX.nombre} caracteres.`);
    dto.nombres = v;
  }

  if (payload.apellidos !== undefined) {
    const v = clean(payload.apellidos);
    if (!v) throw new Error("'apellidos' no puede ser vacío.");
    if (v.length > MAX.apellido) throw new Error(`'apellidos' máx ${MAX.apellido} caracteres.`);
    dto.apellidos = v;
  }

  if (payload.dpi !== undefined) {
    const v = clean(payload.dpi);
    if (!isValidDPISoft(v)) throw new Error("DPI inválido. Debe tener 13 dígitos.");
    const dpi = normalizeDPI(v);
    if (dpi.length > MAX.dpi) throw new Error(`'dpi' máx ${MAX.dpi} caracteres.`);
    dto.dpi = dpi;
  }

  if (payload.telefono !== undefined) {
    const v = clean(payload.telefono);
    if (v === "") {
      // Vaciar teléfono (permite quitarlo)
      dto.telefono = "";
    } else {
      if (!isValidPhoneGT(v))
        throw new Error("Teléfono inválido (GT): 8 dígitos (se permite prefijo +502).");
      dto.telefono = normalizePhoneGT(v);
      if (dto.telefono.length > MAX.tel) throw new Error(`'telefono' máx ${MAX.tel} caracteres.`);
    }
  }

  return dto;
}

/** Mapea un registro de BD a objeto de salida uniforme */
function fromDb(r = {}) {
  return {
    id: r.id,
    nombres: r.nombres,
    apellidos: r.apellidos,
    dpi: r.dpi,
    telefono: r.telefono,
  };
}

module.exports = { validateCreate, validateUpdate, fromDb };
