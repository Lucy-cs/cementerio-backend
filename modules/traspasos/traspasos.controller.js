// modules/traspasos/traspasos.controller.js
const service = require("./traspasos.service");
const M = require("./traspasos.model");

exports.listar = async (req,res) => {
  try {
    const { q } = req.query;
    let page = Number(req.query.page)||1; if(page<1) page=1;
    let pageSize = Number(req.query.pageSize)||20; if(pageSize<1||pageSize>100) pageSize=20;
    const { rows, total } = await service.listar({ q, page, pageSize });
    return res.json({ data: rows.map(M.fromDb), page, pageSize, total });
  } catch (e) { return res.status(500).json({ message:'Error al listar traspasos', error:e.message }); }
};

exports.obtener = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message: 'Id inválido' });
    const row = await service.obtenerPorId(id);
    return res.json(M.fromDb(row));
  } catch (e) {
    if (e.code==='NOT_FOUND') return res.status(404).json({ message:'Traspaso no encontrado' });
    return res.status(500).json({ message:'Error al obtener traspaso', error:e.message });
  }
};

exports.crear = async (req,res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await service.crear(dto, req.auth?.sub);
    return res.status(201).set('Location', `/api/traspasos/${creado.id}`).json(M.fromDb(creado));
  } catch (e) {
    if (e.code==='BAD_REQUEST') return res.status(400).json({ message:'Datos inválidos', error:e.message });
    if (e.code==='NOT_FOUND')  return res.status(404).json({ message:'Relacionado no encontrado', error:e.message });
    if (e.code==='CONFLICT')   return res.status(409).json({ message:'Conflicto', error:e.message });
    if (e.code==='DUP_RECIBO') return res.status(409).json({ message:'Número de recibo duplicado' });
    return res.status(500).json({ message:'Error al crear traspaso', error:e.message });
  }
};
