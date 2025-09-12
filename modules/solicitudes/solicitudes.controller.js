// modules/solicitudes/solicitudes.controller.js
const service = require('./solicitudes.service');
const M = require('./solicitudes.model');
const path = require('path');
const fs = require('fs');

// GET /api/solicitudes
exports.listar = async (req,res) => {
  try {
    const { estado, manzanaId, q, page, pageSize, sort, dir } = req.query;
    let p = Number(page)||1; if(p<1) p=1;
    let ps = Number(pageSize)||20; if(ps<1||ps>100) ps=20;
    if(estado && !M.estadosSolicitud.includes(estado)) return res.status(400).json({ message:`estado inválido` });
    const manzanaIdNum = manzanaId? Number(manzanaId): undefined;
    if(manzanaId && (!Number.isInteger(manzanaIdNum) || manzanaIdNum<=0)) return res.status(400).json({ message:'manzanaId inválido'});

    const { rows, total } = await service.listar({ estado, manzanaId: manzanaIdNum, q, page:p, pageSize:ps, sort, dir });
    return res.json({ data: rows.map(M.fromDb), page:p, pageSize:ps, total });
  } catch(err){
    return res.status(500).json({ message:'Error al listar solicitudes', error: err.message });
  }
};

// POST /api/solicitudes (nueva implementación solicitada)
exports.crear = async (req, res) => {
  try {
    const propietario_id = Number(req.body.propietario_id);
    const nicho_id = Number(req.body.nicho_id);
    if (!Number.isInteger(propietario_id) || propietario_id <= 0)
      return res.status(400).json({ message: "'propietario_id' debe ser entero positivo." });
    if (!Number.isInteger(nicho_id) || nicho_id <= 0)
      return res.status(400).json({ message: "'nicho_id' debe ser entero positivo." });

    const out = await service.crear({ propietario_id, nicho_id });
    return res.status(201).json(out);
  } catch (err) {
    if (err.code === "PROP_NOT_FOUND")
      return res.status(404).json({ message: "Propietario no existe." });
    if (err.code === "NICHO_NOT_FOUND")
      return res.status(404).json({ message: "Nicho no existe." });
    if (err.code === "NICHO_NO_DISPONIBLE")
      return res.status(409).json({ message: "El nicho no está Disponible." });
    return res.status(500).json({ message: "Error al crear solicitud", error: err.message });
  }
};

// GET /api/solicitudes/:id
exports.obtener = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message:'Id inválido' });
    const det = await service.obtenerDetalle(id);
    if(!det) return res.status(404).json({ message:'Solicitud no encontrada' });
    return res.json(M.fromDbDetalle(det));
  } catch(err){
    return res.status(500).json({ message:'Error al obtener solicitud', error: err.message });
  }
};

// PATCH /api/solicitudes/:id/aprobar
exports.aprobar = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message:'Id inválido' });
    const r = await service.aprobar(id, req.auth?.sub);
    if(r.notFound) return res.status(404).json({ message:'Solicitud no encontrada' });
    if(r.conflict==='SOL_NO_PENDIENTE') return res.status(409).json({ message:'Solicitud no está Pendiente' });
    if(r.conflict==='NICHO_NO_RESERVADO') return res.status(409).json({ message:'Nicho no está Reservado' });
    if(r.conflict==='NICHO_CAMBIO_ESTADO') return res.status(409).json({ message:'Estado del nicho cambió' });
    if(r.unprocessable==='SIN_TARIFA') return res.status(422).json({ message:'No hay tarifa vigente' });
    const det = await service.obtenerDetalle(id);
    return res.json(M.fromDbDetalle(det));
  } catch(err){
    return res.status(500).json({ message:'Error al aprobar solicitud', error: err.message });
  }
};

// PATCH /api/solicitudes/:id/rechazar
exports.rechazar = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message:'Id inválido' });
    const r = await service.rechazar(id, req.auth?.sub);
    if(r.notFound) return res.status(404).json({ message:'Solicitud no encontrada' });
    if(r.conflict==='SOL_NO_PENDIENTE') return res.status(409).json({ message:'Solicitud no está Pendiente' });
    const det = await service.obtenerDetalle(id);
    return res.json(M.fromDbDetalle(det));
  } catch(err){
    return res.status(500).json({ message:'Error al rechazar solicitud', error: err.message });
  }
};

// POST /api/solicitudes/:id/documentos (multipart)
exports.subirDocumentos = async (req,res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0) return res.status(400).json({ message:'Id inválido' });
    const det = await service.obtenerDetalle(id);
    if(!det) return res.status(404).json({ message:'Solicitud no encontrada' });
    if(!req.files || !req.files.length) return res.status(400).json({ message:'Archivo(s) requerido(s)' });

    // mover archivos a carpeta final
    const baseDir = path.join(process.cwd(), 'uploads', 'solicitudes', String(id));
    fs.mkdirSync(baseDir, { recursive:true });
    const docsMeta = [];
    for(const f of req.files){
      const dest = path.join(baseDir, f.originalname);
      fs.renameSync(f.path, dest);
      docsMeta.push({
        originalname: f.originalname,
        ruta_relativa: path.join('solicitudes', String(id), f.originalname).replace(/\\/g,'/'),
        mimetype: f.mimetype,
        size: f.size,
        usuario_id: req.auth?.sub || null
      });
    }

    const inserted = await service.insertarDocumentos(id, docsMeta);
    return res.status(201).json(inserted);
  } catch(err){
    return res.status(500).json({ message:'Error al subir documentos', error: err.message });
  }
};
