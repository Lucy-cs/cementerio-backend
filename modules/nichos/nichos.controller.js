// modules/nichos/nichos.controller.js
const service = require("./nichos.service");
const M = require("./nichos.model");

// GET /api/nichos?manzanaId=&estado=&q=&page=&pageSize=
exports.listar = async (req, res) => {
  try {
    const manzanaId = req.query.manzanaId ? Number(req.query.manzanaId) : null;
    const estado    = req.query.estado?.trim() || null;
    const q         = req.query.q?.trim() || null;
    const page      = Math.max(1, Number(req.query.page||1));
    const pageSize  = Math.min(100, Math.max(1, Number(req.query.pageSize||20)));

    if (estado && !M.estadosValidos.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Use: ${M.estadosValidos.join(", ")}` });
    }

    const out = await service.listar({ manzanaId, estado, q, page, pageSize });
    return res.json(out);
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

// PATCH /api/nichos/:id/estado
exports.cambiarEstado = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ message: "Id inválido" });

    const { nuevo_estado, motivo } = req.body || {};
    if (!nuevo_estado || typeof nuevo_estado !== 'string') {
      return res.status(400).json({ message: "'nuevo_estado' requerido" });
    }
    if (!M.estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({ message: `Estado inválido. Use: ${M.estadosValidos.join(', ')}` });
    }

    // Reglas de transición
    const permitido = await service.obtenerPorId(id);
    if (!permitido) return res.status(404).json({ message: 'Nicho no encontrado' });
    const actual = permitido.estado;
    const transiciones = {
      'Disponible': ['Reservado','Ocupado','Mantenimiento','Bloqueado'],
      'Reservado': ['Disponible','Ocupado','Bloqueado'],
      'Ocupado': ['Mantenimiento','Bloqueado'],
      'Mantenimiento': ['Disponible','Reservado','Ocupado','Bloqueado'],
      'Bloqueado': ['Disponible']
    };
    if (!transiciones[actual] || !transiciones[actual].includes(nuevo_estado)) {
      return res.status(400).json({ message: `Transición no permitida (${actual} -> ${nuevo_estado})` });
    }
    if (['Mantenimiento','Bloqueado'].includes(nuevo_estado) && !motivo) {
      return res.status(400).json({ message: "'motivo' es obligatorio para estados Mantenimiento o Bloqueado" });
    }

    const usuario_id = req.auth?.sub || null;
    const cambiado = await service.cambiarEstado({ id, nuevo_estado, motivo, usuario_id });
    if (!cambiado) return res.status(404).json({ message: 'Nicho no encontrado' });
    if (cambiado.noCambio) return res.status(200).json({ message: 'Sin cambio', ...M.fromDb(cambiado.current) });
    return res.json(M.fromDb(cambiado));
  } catch (err) {
    const isUser = /requerido|inválido|Transición|obligatorio/i.test(err.message||'');
    return res.status(isUser?400:500).json({ message: isUser?err.message:'Error al cambiar estado', error: err.message });
  }
};

// GET /api/nichos/:id/historial
exports.historial = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ message: 'Id inválido' });

    // opcional: validar que el nicho exista (para diferenciar 404 de lista vacía)
    const existe = await service.obtenerPorId(id);
    if (!existe) return res.status(404).json({ message: 'Nicho no encontrado' });

    const data = await service.historialEstado(id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener historial', error: err.message });
  }
};
