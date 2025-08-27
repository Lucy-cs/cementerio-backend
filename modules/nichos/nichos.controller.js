const service = require("./nichos.service");
const Nicho = require("./nichos.model");

// GET /api/nichos?manzana=A&estado=Disponible&search=12
exports.listar = async (req, res) => {
  try {
    const { manzana, estado, search } = req.query;

    // valida el filtro "estado" contra el modelo (si viene)
    if (estado && !Nicho.ESTADOS.includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const data = await service.listar({ manzana, estado, search });
    // Normaliza filas desde BD (opcional pero recomendado)
    return res.json(data.map(Nicho.fromDb));
  } catch (err) {
    return res.status(500).json({ message: "Error al listar nichos", error: err.message });
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
    return res.json(Nicho.fromDb(item));
  } catch (err) {
    return res.status(500).json({ message: "Error al obtener nicho", error: err.message });
  }
};

// POST /api/nichos
exports.crear = async (req, res) => {
  try {
    // valida y normaliza el payload con el modelo
    const dto = Nicho.validateCreate(req.body);
    const creado = await service.crear(dto);
    return res.status(201).json(Nicho.fromDb(creado));
  } catch (err) {
    // si la validación del modelo falló, 400; si es otra cosa, 500
    const status = err.message?.toLowerCase().includes("inválid") || err.message?.includes("obligatorio")
      ? 400 : 500;
    return res.status(status).json({ message: status === 400 ? err.message : "Error al crear nicho", error: err.message });
  }
};

// PUT /api/nichos/:id
exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Id inválido" });
    }

    // valida/normaliza solo los campos enviados
    const dto = Nicho.validateUpdate(req.body);
    if (Object.keys(dto).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar." });
    }

    const actualizado = await service.actualizar(id, dto);
    if (!actualizado) return res.status(404).json({ message: "Nicho no encontrado" });
    return res.json(Nicho.fromDb(actualizado));
  } catch (err) {
    const isValidation = err.message?.toLowerCase().includes("inválid") || err.message?.includes("obligatorio");
    return res.status(isValidation ? 400 : 500).json({
      message: isValidation ? err.message : "Error al actualizar nicho",
      error: err.message
    });
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
    return res.status(500).json({ message: "Error al eliminar nicho", error: err.message });
  }
};
