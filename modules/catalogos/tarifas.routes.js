const express = require("express");
const router = express.Router();
const { requireAuth } = require("../../middlewares/auth");
const ctrl = require("./tarifas.controller");

// Crear tarifa
router.post("/", requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Tarifas']
  #swagger.summary = 'Crear una tarifa'
  #swagger.path = '/api/catalogs/tarifas'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.requestBody = { required:true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTarifa' }, example: { concepto:'ARRIENDO_7A', monto:750, fecha_inicio:'2025-10-01', vigente:true, notas:'Ajuste municipal 2025' } } } }
*/ return ctrl.crear(req,res,next); });

// Actualizar tarifa
router.put("/:id", requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Tarifas']
  #swagger.summary = 'Actualizar una tarifa'
  #swagger.path = '/api/catalogs/tarifas/{id}'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.requestBody = { required:true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTarifa' }, example: { monto:780, fecha_inicio:'2025-11-01', vigente:true, notas:'Revisión Q30' } } } }
*/ return ctrl.actualizar(req,res,next); });

// Desactivar tarifa
router.patch("/:id/desactivar", requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Tarifas']
  #swagger.summary = 'Desactivar una tarifa'
  #swagger.path = '/api/catalogs/tarifas/{id}/desactivar'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
*/ return ctrl.desactivar(req,res,next); });

// (Opcional) eliminar
router.delete("/:id", requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Tarifas']
  #swagger.summary = 'Eliminar una tarifa'
  #swagger.path = '/api/catalogs/tarifas/{id}'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
*/ return ctrl.eliminar(req,res,next); });

module.exports = router;
