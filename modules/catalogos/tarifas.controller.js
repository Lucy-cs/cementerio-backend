const svc = require("./tarifas.service");
const M = require("./tarifas.model");

exports.crear = async (req,res)=>{
  try{
    const dto = M.validateCreate(req.body);
    const row = await svc.crear(dto);
    res.status(201).set("Location", `/api/catalogs/tarifas/${row.id}`).json(row);
  }catch(e){
    if(e.code==="BAD_REQUEST") return res.status(400).json({message:"Datos inválidos", error:e.message});
    res.status(500).json({message:"Error al crear tarifa", error:e.message});
  }
};

exports.actualizar = async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const patch = M.validateUpdate(req.body);
    const row = await svc.actualizar(id, patch);
    if(!row) return res.status(404).json({message:"Tarifa no encontrada"});
    res.json(row);
  }catch(e){
    if(e.code==="BAD_REQUEST") return res.status(400).json({message:"Datos inválidos", error:e.message});
    if(e.code==="NOT_FOUND") return res.status(404).json({message:"Tarifa no encontrada"});
    res.status(500).json({message:"Error al actualizar tarifa", error:e.message});
  }
};

exports.desactivar = async (req,res)=>{
  try{
    const row = await svc.desactivar(Number(req.params.id));
    if(!row) return res.status(404).json({message:"Tarifa no encontrada"});
    res.json(row);
  }catch(e){ res.status(500).json({message:"Error al desactivar tarifa", error:e.message}); }
};

exports.eliminar = async (req,res)=>{
  try{ await svc.eliminar(Number(req.params.id)); res.status(204).end(); }
  catch(e){ res.status(500).json({message:"Error al eliminar tarifa", error:e.message}); }
};
