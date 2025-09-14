const service = require("./arrendamientos.service");
const M = require("./arrendamientos.model");

exports.listar = async (req, res) => {
  try {
    const { estado, venceAntesDe, q } = req.query;
    let page = Number(req.query.page)||1; if(page<1) page=1;
    let pageSize = Number(req.query.pageSize)||20; if(pageSize<1||pageSize>100) pageSize=20;
    const sort = req.query.sort || 'fecha_fin';
    const dir = req.query.dir || 'asc';
    const { rows, total } = await service.listar({ estado, venceAntesDe, q, page, pageSize, sort, dir });
    return res.json({ data: rows.map(M.fromDb), page, pageSize, total });
  } catch (err) {
    return res.status(500).json({ message: 'Error al listar arrendamientos', error: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const dto = M.validateCreate(req.body);
    const creado = await service.crear(dto, req.auth?.sub);
    return res.status(201).set('Location', `/api/arrendamientos/${creado.id}`).json(M.fromDb(creado));
  } catch (err) {
    if (err.code === 'PROP_NOT_FOUND') return res.status(404).json({ message: 'Propietario no existe.' });
    if (err.code === 'NICHO_NOT_FOUND') return res.status(404).json({ message: 'Nicho no existe.' });
    if (err.code === 'NICHO_NO_DISPONIBLE') return res.status(409).json({ message: 'El nicho no está Disponible.' });
    if (err.code === 'TRASLAPE_NICHO') return res.status(409).json({ message: 'Existe un arrendamiento traslapado para el nicho.' });
    if (err.code === 'DUP_RECIBO') return res.status(409).json({ message: 'numero_recibo ya existe (idempotencia).', code: 'DUP_RECIBO' });
    const isBad = /obligatorio|formato|entero positivo/i.test(err.message||'');
    return res.status(isBad?400:500).json({ message: isBad?err.message:'Error al crear arrendamiento', error: err.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id<=0) return res.status(400).json({ message: 'Id inválido' });
    const row = await service.obtenerPorId(id);
    if (!row) return res.status(404).json({ message: 'Arrendamiento no encontrado' });
    return res.json(M.fromDb(row));
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener arrendamiento', error: err.message });
  }
};

exports.renovar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id<=0) return res.status(400).json({ message: 'Id inválido' });
    const dto = M.validateRenovar(req.body);
    const actualizado = await service.renovar(id, dto, req.auth?.sub);
    return res.json(M.fromDb(actualizado));
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Arrendamiento no encontrado' });
    if (err.code === 'DUP_RECIBO') return res.status(409).json({ message: 'numero_recibo ya existe (idempotencia).', code: 'DUP_RECIBO' });
    if (err.code === 'TRASLAPE_NICHO') return res.status(409).json({ message: 'Existe un arrendamiento traslapado para el nicho.' });
    const isBad = /obligatorio|formato/i.test(err.message||'');
    return res.status(isBad?400:500).json({ message: isBad?err.message:'Error al renovar arrendamiento', error: err.message });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id<=0) return res.status(400).json({ message: 'Id inválido' });
    const dto = M.validateCancelar(req.body);
    const actualizado = await service.cancelar(id, dto, req.auth?.sub);
    return res.json(M.fromDb(actualizado));
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Arrendamiento no encontrado' });
    const isBad = /obligatorio/i.test(err.message||'');
    return res.status(isBad?400:500).json({ message: isBad?err.message:'Error al cancelar arrendamiento', error: err.message });
  }
};

exports.alertasVencimientos = async (req, res) => {
  try {
    const dias = req.query.dias ? Number(req.query.dias) : 30;
    const data = await service.alertasVencimientos(Number.isInteger(dias) && dias>0 ? dias : 30);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Error al listar alertas de vencimiento', error: err.message });
  }
};
