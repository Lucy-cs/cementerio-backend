const svc = require("./recibos.service");
const M = require("./recibos.model");

exports.listar = async (req,res) => {
  try {
    const { nicho_id, propietario_id, q } = req.query;
    const page = Math.max(1, Number(req.query.page||1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize||20)));
    const { rows, total } = await svc.listar({ 
      nicho_id: nicho_id?Number(nicho_id):null,
      propietario_id: propietario_id?Number(propietario_id):null,
      q, page, pageSize
    });
    res.json({ data: rows, page, pageSize, total });
  } catch (e) {
    res.status(500).json({ message: "Error al listar recibos", error: e.message });
  }
};

exports.crear = async (req,res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await svc.crear(dto);
    res.status(201).set("Location", `/api/recibos/${creado.id}`).json(creado);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return res.status(400).json({ message: "Datos inválidos", error: e.message });
    if (e.code === "DUP") return res.status(409).json({ message: "Número de recibo duplicado" });
    res.status(500).json({ message: "Error al crear recibo", error: e.message });
  }
};

exports.obtener = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message: 'Id inválido' });
    const row = await svc.obtener(id);
    if (!row) return res.status(404).json({ message: "Recibo no encontrado" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: "Error al obtener recibo", error: e.message });
  }
};
