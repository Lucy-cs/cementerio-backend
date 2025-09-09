// modules/catalogos/catalogos.controller.js
const svc = require("./catalogos.service");
const M = require("./catalogos.model");

/* --------- MANZANAS --------- */
exports.manzanasList = async (req, res) => {
  try {
    const { search, includeInactive } = req.query;
    const list = await svc.manzanasList({ search, includeInactive: String(includeInactive) === "true" });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Error al listar manzanas", error: err.message });
  }
};

exports.manzanasUpsert = async (req, res) => {
  try {
    const dto = M.validateManzanaUpsert(req.body);

    let out;
    if (dto.id) {
      out = await svc.manzanasUpdate(dto.id, dto);
      if (!out) return res.status(404).json({ message: "Manzana no encontrada" });
    } else {
      out = await svc.manzanasCreate(dto);
    }
    res.status(201).json(out);
  } catch (err) {
    if (err.code === "DUP_KEY") return res.status(409).json({ message: "Ya existe una manzana con ese nombre" });
    if (err.code === "FK_CONFLICT_DEACT") return res.status(409).json({ message: err.message });
    const bad = /obligatorio|inválido|booleano|chars/i.test(err.message || "");
    res.status(bad ? 400 : 500).json({ message: bad ? err.message : "Error al guardar manzana", error: err.message });
  }
};

/* --------- TARIFAS --------- */
exports.tarifasList = async (req, res) => {
  try {
    const data = await svc.tarifasList({
      on: req.query.on,
      includeHistory: String(req.query.includeHistory) === "true",
      concepto: req.query.concepto,
      alcance: req.query.alcance,
      tipo_nicho_id: req.query.tipo_nicho_id ? Number(req.query.tipo_nicho_id) : undefined,
      manzana_id: req.query.manzana_id ? Number(req.query.manzana_id) : undefined,
      sector_id: req.query.sector_id ? Number(req.query.sector_id) : undefined,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error al listar tarifas", error: err.message });
  }
};

exports.tarifasCreate = async (req, res) => {
  try {
    const dto = M.validateTarifaCreate(req.body);
    const created = await svc.tarifasCreate(dto);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === "OVERLAP") return res.status(409).json({ message: err.message });
    const bad = /obligatorio|inválido|debe ser|requiere|GLOBAL no admite|POR_/i.test(err.message || "");
    res.status(bad ? 422 : 500).json({ message: bad ? err.message : "Error al crear tarifa", error: err.message });
  }
};

/* --------- ESTADOS --------- */
exports.estadosNicho = async (_req, res) => {
  try {
    res.json(svc.estadosNicho());
  } catch (err) {
    res.status(500).json({ message: "Error al obtener estados", error: err.message });
  }
};
