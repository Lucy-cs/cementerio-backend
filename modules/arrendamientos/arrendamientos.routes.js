const express = require('express');
const router = express.Router();
const ctrl = require('./arrendamientos.controller');
const { requireAuth } = require('../../middlewares/auth');

// GET /api/arrendamientos
router.get('/', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Arrendamientos']
  #swagger.summary = 'Listar arrendamientos'
  #swagger.path = '/api/arrendamientos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['estado'] = { in:'query', type:'string', enum:['Activo','PorVencer','Vencido','Cancelado'] }
  #swagger.parameters['venceAntesDe'] = { in:'query', type:'string', format:'date' }
  #swagger.parameters['q'] = { in:'query', type:'string' }
  #swagger.parameters['page'] = { in:'query', type:'integer' }
  #swagger.parameters['pageSize'] = { in:'query', type:'integer' }
  #swagger.parameters['sort'] = { in:'query', type:'string', enum:['fecha_fin','fecha_inicio','id'] }
  #swagger.parameters['dir'] = { in:'query', type:'string', enum:['asc','desc'] }
  #swagger.responses[200] = { description:'OK', schema:{ type:'object', properties:{ data:{ type:'array', items:{ $ref:'#/components/schemas/Arrendamiento' } }, page:{ type:'integer' }, pageSize:{ type:'integer' }, total:{ type:'integer' } } } }
*/ return ctrl.listar(req,res,next); });

// POST /api/arrendamientos
router.post('/', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Arrendamientos']
  #swagger.summary = 'Crear arrendamiento (7 años)'
  #swagger.path = '/api/arrendamientos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.requestBody = { required:true, content:{ 'application/json': { schema: { $ref:'#/components/schemas/CreateArrendamiento' } } } }
  #swagger.responses[201] = { description:'Creado', schema:{ $ref:'#/components/schemas/Arrendamiento' } }
  #swagger.responses[409] = { description:'Conflicto', schema:{ $ref:'#/components/schemas/Error'} }
*/ return ctrl.crear(req,res,next); });

// GET /api/arrendamientos/{id}
router.get('/:id', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Arrendamientos']
  #swagger.summary = 'Obtener arrendamiento por ID'
  #swagger.path = '/api/arrendamientos/{id}'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Arrendamiento' } }
*/ return ctrl.obtener(req,res,next); });

// PATCH /api/arrendamientos/{id}/renovar
router.patch('/:id/renovar', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Arrendamientos']
  #swagger.summary = 'Renovar arrendamiento (+7 años)'
  #swagger.path = '/api/arrendamientos/{id}/renovar'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.requestBody = { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/RenovacionArrendamiento' } } } }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Arrendamiento' } }
*/ return ctrl.renovar(req,res,next); });

// PATCH /api/arrendamientos/{id}/cancelar
router.patch('/:id/cancelar', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Arrendamientos']
  #swagger.summary = 'Cancelar arrendamiento (opción mínima)'
  #swagger.path = '/api/arrendamientos/{id}/cancelar'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
  #swagger.requestBody = { required:true, content:{ 'application/json': { schema:{ type:'object', required:['motivo'], properties:{ motivo:{ type:'string' }, liberarNicho:{ type:'boolean', default:false } } } } } }
  #swagger.responses[200] = { description:'OK', schema:{ $ref:'#/components/schemas/Arrendamiento' } }
*/ return ctrl.cancelar(req,res,next); });

module.exports = router;
