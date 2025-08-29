// utils/validators.js

// Quita todo lo que no sea dígito
function onlyDigits(s) {
  return String(s ?? "").replace(/\D+/g, "");
}

/* ---------------- DPI (Guatemala) ----------------
   Validación "suave" y segura:
   - Debe tener exactamente 13 dígitos
   - No puede ser todo ceros
*/
function normalizeDPI(s) {
  return onlyDigits(s);
}
function isValidDPISoft(s) {
  const n = normalizeDPI(s);
  return n.length === 13 && !/^0+$/.test(n);
}

/* ---------------- Teléfono (Guatemala) ----------------
   - Acepta "+502 5555-1234", "50255551234", "55551234"
   - Normaliza a 8 dígitos nacionales
   - Regla: exactamente 8 dígitos (0-9), no todos ceros
*/
function normalizePhoneGT(s) {
  let n = onlyDigits(s);
  // Si viene con prefijo de país 502 (11 dígitos), quítalo
  if (n.startsWith("502") && n.length === 11) n = n.slice(3);
  return n;
}
function isValidPhoneGT(s) {
  const n = normalizePhoneGT(s);
  return /^\d{8}$/.test(n) && !/^0{8}$/.test(n);
}

module.exports = {
  onlyDigits,
  normalizeDPI,
  isValidDPISoft,
  normalizePhoneGT,
  isValidPhoneGT,
};
