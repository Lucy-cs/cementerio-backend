// modules/manzanas/manzanas.controller.js
const service = require("./manzanas.service");
const M = require("./manzanas.model");

exports.listar = async (req, res) => {
  try {
    const { search } = req.query;
    const data = await service.listar({ search });
    res.json(data.map(M.fromDb));
  } catch (err) {
    res.status(500).json({ message: "Error al listar manzanas", error: err.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });
    const item = await service.obtenerPorId(id);
    if (!item) return res.status(404).json({ message: "Manzana no encontrada" });
    res.json(M.fromDb(item));
  } catch (err) {
    res.status(500).json({ message: "Error al obtener manzana", error: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await service.crear(dto);
    res.status(201)
      .set("Location", `/api/manzanas/${creado.id}`)
      .json(M.fromDb(creado));
  } catch (err) {
    if (err.code === "DUP_KEY") {
      return res.status(409).json({ message: "Ya existe una manzana con ese nombre" });
    }
    const isValid = err.message?.toLowerCase().includes("obligatori") || err.message?.includes("vacío");
    res.status(isValid ? 400 : 500).json({ message: isValid ? err.message : "Error al crear manzana", error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });

    const dto = M.validateUpdate(req.body);
    if (Object.keys(dto).length === 0) return res.status(400).json({ message: "No hay campos para actualizar." });

    const actualizado = await service.actualizar(id, dto);
    if (!actualizado) return res.status(404).json({ message: "Manzana no encontrada" });
    res.json(M.fromDb(actualizado));
  } catch (err) {
    if (err.code === "DUP_KEY") {
      return res.status(409).json({ message: "Ya existe una manzana con ese nombre" });
    }
    res.status(500).json({ message: "Error al actualizar manzana", error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });

    const ok = await service.eliminar(id);
    if (!ok) return res.status(404).json({ message: "Manzana no encontrada" });
    res.status(204).send();
  } catch (err) {
    if (err.code === "FK_CONFLICT") {
      return res.status(409).json({ message: "No se puede eliminar: hay nichos asociados a esta manzana." });
    }
    res.status(500).json({ message: "Error al eliminar manzana", error: err.message });
  }
};