const svc = require("./reportes.service");

exports.nichosDisponibles = async (req, res) => {
  try {
    const manzanaId = req.query.manzanaId ? Number(req.query.manzanaId) : null;
    const data = await svc.nichosDisponibles({ manzanaId });
    res.json({ data });
  } catch (e) { res.status(500).json({ message: "Error en reporte", error: e.message }); }
};

exports.contratosPorVencer = async (req, res) => {
  try {
    const dias = Math.max(1, Number(req.query.dias || 30));
    const data = await svc.contratosPorVencer({ dias });
    res.json({ data, dias });
  } catch (e) { res.status(500).json({ message: "Error en reporte", error: e.message }); }
};

exports.historialPagos = async (req, res) => {
  try {
    const predioId = req.query.predioId ? Number(req.query.predioId) : null; // = nicho_id
    if (!predioId) return res.status(400).json({ message: "'predioId' (nicho_id) es obligatorio" });
    const data = await svc.historialPagos({ predioId });
    res.json({ data, predioId });
  } catch (e) { res.status(500).json({ message: "Error en reporte", error: e.message }); }
};

exports.traspasosRango = async (req, res) => {
  try {
    const desde = req.query.desde || null; // YYYY-MM-DD
    const hasta = req.query.hasta || null; // YYYY-MM-DD
    const data = await svc.traspasosRango({ desde, hasta });
    res.json({ data, desde, hasta });
  } catch (e) { res.status(500).json({ message: "Error en reporte", error: e.message }); }
};
