const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middlewares/auth');
const ctrl = require('./auditoria.controller');

router.get('/', requireAuth, (req,res,next)=>{ /*
  #swagger.tags = ['Auditoria']
  #swagger.summary = 'Listar auditoría con filtros y paginación'
  #swagger.path = '/api/auditoria'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['desde'] = { in:'query', type:'string', format:'date' }
  #swagger.parameters['hasta'] = { in:'query', type:'string', format:'date' }
  #swagger.parameters['usuarioId'] = { in:'query', type:'integer' }
  #swagger.parameters['accion'] = { in:'query', type:'string' }
  #swagger.parameters['q'] = { in:'query', type:'string' }
  #swagger.parameters['page'] = { in:'query', type:'integer', default:1 }
  #swagger.parameters['pageSize'] = { in:'query', type:'integer', default:50 }
*/ return ctrl.listar(req,res,next);});

module.exports = router;
