const svc = require('./auditoria.service');

exports.listar = async (req,res)=>{
  try{
    const desde = req.query.desde || null;     // 'YYYY-MM-DD'
    const hasta = req.query.hasta || null;     // idem
    const usuarioId = req.query.usuarioId ? Number(req.query.usuarioId) : null;
    const accion = req.query.accion?.trim() || null;  // e.g. 'CREAR','EDITAR','ELIMINAR','LOGIN'
    const q = req.query.q?.trim() || null;
    const page = Math.max(1, Number(req.query.page||1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize||50)));
    const out = await svc.listar({desde, hasta, usuarioId, accion, q, page, pageSize});
    res.json(out);
  }catch(e){ res.status(500).json({message:"Error al consultar auditoría", error:e.message}); }
};
