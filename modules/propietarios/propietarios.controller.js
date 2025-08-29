// modules/propietarios/propietarios.controller.js
const service = require("./propietarios.service");
const M = require("./propietarios.model");

exports.listar = async (req, res) => {
  try {
    const data = await service.listar({ search: req.query.search });
    res.json(data.map(M.fromDb));
  } catch (err) {
    res.status(500).json({ message: "Error al listar propietarios", error: err.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });
    const item = await service.obtenerPorId(id);
    if (!item) return res.status(404).json({ message: "Propietario no encontrado" });
    res.json(M.fromDb(item));
  } catch (err) {
    res.status(500).json({ message: "Error al obtener propietario", error: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await service.crear(dto);
    res
      .status(201)
      .set("Location", `/api/propietarios/${creado.id}`)
      .json(M.fromDb(creado));
  } catch (err) {
    if (err.code === "DUP_DPI") {
      return res.status(409).json({ message: "Ya existe un propietario con ese DPI" });
    }
    const isBad = /obligatorio|vacío|máx/i.test(err.message || "");
    res.status(isBad ? 400 : 500).json({ message: isBad ? err.message : "Error al crear propietario", error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });

    const dto = M.validateUpdate(req.body);
    if (Object.keys(dto).length === 0) return res.status(400).json({ message: "No hay campos para actualizar." });

    const actualizado = await service.actualizar(id, dto);
    if (!actualizado) return res.status(404).json({ message: "Propietario no encontrado" });
    res.json(M.fromDb(actualizado));
  } catch (err) {
    if (err.code === "DUP_DPI") {
      return res.status(409).json({ message: "Ya existe un propietario con ese DPI" });
    }
    res.status(500).json({ message: "Error al actualizar propietario", error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Id inválido" });

    const ok = await service.eliminar(id);
    if (!ok) return res.status(404).json({ message: "Propietario no encontrado" });
    res.status(204).send();
  } catch (err) {
    if (err.code === "FK_CONFLICT") {
      return res
        .status(409)
        .json({ message: "No se puede eliminar: existen registros asociados (solicitudes/arrendamientos/traspasos)." });
    }
    res.status(500).json({ message: "Error al eliminar propietario", error: err.message });
  }
};