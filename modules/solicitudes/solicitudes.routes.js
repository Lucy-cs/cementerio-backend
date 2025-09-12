// modules/solicitudes/solicitudes.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('./solicitudes.controller');
const { requireAuth } = require('../../middlewares/auth');
const multer = require('multer');
const os = require('os');
const path = require('path');

// almacenamiento temporal (se moverá luego)
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads_tmp') });

// GET /api/solicitudes
router.get('/', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Listar solicitudes de compra'
  #swagger.path = '/api/solicitudes'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['estado'] = { in:'query', type:'string', enum:['Pendiente','Aprobada','Rechazada'], required:false }
  #swagger.parameters['manzanaId'] = { in:'query', type:'integer', required:false }
  #swagger.parameters['q'] = { in:'query', type:'string', required:false }
  #swagger.parameters['page'] = { in:'query', type:'integer', required:false }
  #swagger.parameters['pageSize'] = { in:'query', type:'integer', required:false }
  #swagger.parameters['sort'] = { in:'query', type:'string', enum:['fecha_solicitud','estado','manzana','nichoNumero','propietario'], required:false }
  #swagger.parameters['dir'] = { in:'query', type:'string', enum:['asc','desc'], required:false }
  #swagger.responses[200] = { description:'OK', schema:{ type:'object', properties:{ data:{ type:'array', items:{ $ref:'#/components/schemas/Solicitud'} }, page:{ type:'integer' }, pageSize:{ type:'integer' }, total:{ type:'integer' } } } }
*/ return ctrl.listar(req,res,next); });

// POST /api/solicitudes
router.post('/', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Crear solicitud de compra'
  #swagger.path = '/api/solicitudes'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.requestBody = { required:true, content: { 'application/json': { schema:{ type:'object', required:['propietario_id','nicho_id'], properties:{ propietario_id:{ type:'integer' }, nicho_id:{ type:'integer'} } } } } }
  #swagger.responses[201] = { description:'Creada', schema:{ $ref:'#/components/schemas/Solicitud'} }
*/ return ctrl.crear(req,res,next); });

// GET /api/solicitudes/{id}
router.get('/:id', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Obtener detalle de solicitud'
  #swagger.path = '/api/solicitudes/{id}'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Solicitud'} }
*/ return ctrl.obtener(req,res,next); });

// PATCH /api/solicitudes/{id}/aprobar
router.patch('/:id/aprobar', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Aprobar solicitud de compra'
  #swagger.path = '/api/solicitudes/{id}/aprobar'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Solicitud'} }
  #swagger.responses[409] = { description:'Conflicto estados', schema:{ $ref:'#/components/schemas/Error'} }
  #swagger.responses[422] = { description:'Sin tarifa vigente', schema:{ $ref:'#/components/schemas/Error'} }
*/ return ctrl.aprobar(req,res,next); });

// PATCH /api/solicitudes/{id}/rechazar
router.patch('/:id/rechazar', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Rechazar solicitud de compra'
  #swagger.path = '/api/solicitudes/{id}/rechazar'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Solicitud'} }
  #swagger.responses[409] = { description:'No está Pendiente', schema:{ $ref:'#/components/schemas/Error'} }
*/ return ctrl.rechazar(req,res,next); });

// POST /api/solicitudes/{id}/documentos
router.post('/:id/documentos', requireAuth, upload.array('file'), (req,res,next)=>{ /*
  #swagger.tags = ['Solicitudes']
  #swagger.summary = 'Subir documentos a una solicitud'
  #swagger.path = '/api/solicitudes/{id}/documentos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.requestBody = { required:true, content: { 'multipart/form-data': { schema:{ type:'object', properties:{ file:{ type:'string', format:'binary' } } } } } }
  #swagger.responses[201] = { description:'Creados', schema:{ type:'array', items:{ $ref:'#/components/schemas/DocumentoSolicitud'} } }
*/ return ctrl.subirDocumentos(req,res,next); });

module.exports = router;
