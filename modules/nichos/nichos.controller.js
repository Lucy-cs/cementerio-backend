// modules/nichos/nichos.controller.js
const service = require("./nichos.service");
const M = require("./nichos.model");

// GET /api/nichos?manzana=A&estado=Disponible&search=12
exports.listar = async (req, res) => {
  try {
    const { manzana, estado, search } = req.query;

    // valida el filtro "estado" si viene
    if (estado && !M.estadosValidos.includes(estado)) {
      return res
        .status(400)
        .json({ message: `Estado inválido. Use: ${M.estadosValidos.join(", ")}` });
    }

    const data = await service.listar({ manzana, estado, search });
    return res.json(data.map(M.fromDb));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error al listar nichos", error: err.message });
  }
};

// GET /api/nichos/:id
exports.obtenerPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Id inválido" });
    }
    const item = await service.obtenerPorId(id);
    if (!item) return res.status(404).json({ message: "Nicho no encontrado" });
    return res.json(M.fromDb(item));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error al obtener nicho", error: err.message });
  }
};

// GET /api/nichos/por-numero?numero=10&manzana_id=1   (o ?numero=10&manzana=A)
exports.obtenerPorNumero = async (req, res) => {
  try {
    const numero = Number(req.query.numero);
    const manzana_id = req.query.manzana_id ? Number(req.query.manzana_id) : undefined;
    const manzana = req.query.manzana;

    if (!Number.isInteger(numero) || numero <= 0) {
      return res.status(400).json({ message: "'numero' debe ser entero positivo" });
    }
    if (!manzana_id && !manzana) {
      return res.status(400).json({ message: "Debes enviar 'manzana_id' o 'manzana'." });
    }
    if (manzana_id !== undefined && (!Number.isInteger(manzana_id) || manzana_id <= 0)) {
      return res.status(400).json({ message: "'manzana_id' debe ser entero positivo" });
    }

    const row = await service.obtenerPorNumero({ numero, manzana_id, manzana });
    if (!row) return res.status(404).json({ message: "Nicho no encontrado" });

    return res.json(M.fromDb(row));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error al buscar nicho", error: err.message });
  }
};

// POST /api/nichos
exports.crear = async (req, res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await service.crear(dto);
    return res.status(201).json(M.fromDb(creado));
  } catch (err) {
    if (err.code === "DUP_KEY") {
      return res
        .status(409)
        .json({ message: "Ya existe un nicho con ese número en esa manzana" });
    }
    if (err.code === "FK_NOT_FOUND") {
      return res
        .status(400)
        .json({ message: "La manzana indicada no existe" });
    }
    const isBad = /entero positivo|inválido|obligatorio/i.test(err.message || "");
    return res
      .status(isBad ? 400 : 500)
      .json({ message: isBad ? err.message : "Error al crear nicho", error: err.message });
  }
};

// PUT /api/nichos/:id
exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ message: "Id inválido" });

    const dto = M.validateUpdate(req.body);
    if (Object.keys(dto).length === 0)
      return res.status(400).json({ message: "No hay campos para actualizar." });

    const actualizado = await service.actualizar(id, dto);
    if (!actualizado) return res.status(404).json({ message: "Nicho no encontrado" });
    return res.json(M.fromDb(actualizado));
  } catch (err) {
    if (err.code === "DUP_KEY") {
      return res
        .status(409)
        .json({ message: "Ya existe un nicho con ese número en esa manzana" });
    }
    if (err.code === "FK_NOT_FOUND") {
      return res
        .status(400)
        .json({ message: "La manzana indicada no existe" });
    }
    return res
      .status(500)
      .json({ message: "Error al actualizar nicho", error: err.message });
  }
};

// DELETE /api/nichos/:id
exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Id inválido" });
    }
    const ok = await service.eliminar(id);
    if (!ok) return res.status(404).json({ message: "Nicho no encontrado" });
    return res.status(204).send();
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error al eliminar nicho", error: err.message });
  }
};
