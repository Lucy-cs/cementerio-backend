// modules/traspasos/traspasos.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middlewares/auth');
const ctrl = require('./traspasos.controller');

// Listar
router.get('/', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Traspasos']
  #swagger.summary = 'Listar traspasos'
  #swagger.path = '/api/traspasos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['q'] = { in:'query', type:'string' }
  #swagger.parameters['page'] = { in:'query', type:'integer' }
  #swagger.parameters['pageSize'] = { in:'query', type:'integer' }
*/ return ctrl.listar(req,res,next); });

// Obtener por id
router.get('/:id', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Traspasos']
  #swagger.summary = 'Obtener traspaso por ID'
  #swagger.path = '/api/traspasos/{id}'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
*/ return ctrl.obtener(req,res,next); });

// Crear
router.post('/', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Traspasos']
  #swagger.summary = 'Crear traspaso de nicho'
  #swagger.path = '/api/traspasos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.requestBody = { required:true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTraspaso' }, example: { nicho_id: 9901, nuevo_propietario_id: 25, recibo: { numero_recibo: 'TRAS-7001', monto: 700, fecha_pago: '2025-09-14' }, fecha_traspaso: '2025-09-14', observaciones: 'Traspaso por venta de derechos' } } } }
*/ return ctrl.crear(req,res,next); });

module.exports = router;
