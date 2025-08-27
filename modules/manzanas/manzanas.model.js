// modules/manzanas/manzanas.model.js
const MAX = 50;

function toStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function validateCreate(payload = {}) {
  const nombre = toStr(payload.nombre);
  if (!nombre) throw new Error("El campo 'nombre' es obligatorio.");
  if (nombre.length > MAX) throw new Error(`'nombre' no debe pasar de ${MAX} caracteres.`);
  return { nombre };
}

function validateUpdate(payload = {}) {
  const dto = {};
  if (payload.nombre !== undefined) {
    const nombre = toStr(payload.nombre);
    if (!nombre) throw new Error("'nombre' no puede ser vacío.");
    if (nombre.length > MAX) throw new Error(`'nombre' no debe pasar de ${MAX} caracteres.`);
    dto.nombre = nombre;
  }
  return dto;
}

function fromDb(row = {}) {
  return { id: row.id, nombre: row.nombre };
}

module.exports = { validateCreate, validateUpdate, fromDb };
